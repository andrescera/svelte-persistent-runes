import MagicString from "magic-string";
import type { PreprocessorGroup, Processed } from "svelte/compiler";
import type { Plugin } from "vite";

type PersistMatch = {
	start: number;
	end: number;
	varName: string;
	initial: string;
	key: string;
	options: string;
	isClassProperty: boolean;
};

const PERSIST_CALL_REGEX = /\$persist\s*\(/g;
const IMPORT_STATEMENT = 'import * as __persist from "svelte-persistent-runes";\n';

/**
 * Find the matching closing parenthesis for a $persist call
 */
function findMatchingParen(content: string, start: number): number {
	let depth = 1;
	let i = start;
	let inString: string | null = null;
	let escaped = false;

	while (i < content.length && depth > 0) {
		const char = content[i];

		if (escaped) {
			escaped = false;
			i++;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			i++;
			continue;
		}

		if (inString) {
			if (char === inString) {
				inString = null;
			}
		} else {
			if (char === '"' || char === "'" || char === "`") {
				inString = char;
			} else if (char === "(") {
				depth++;
			} else if (char === ")") {
				depth--;
			}
		}
		i++;
	}

	return i;
}

/**
 * Split arguments respecting nested structures
 */
function splitArguments(argsStr: string): string[] {
	const args: string[] = [];
	let current = "";
	let depth = 0;
	let inString: string | null = null;
	let escaped = false;

	for (let i = 0; i < argsStr.length; i++) {
		const char = argsStr[i];

		if (escaped) {
			escaped = false;
			current += char;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			current += char;
			continue;
		}

		if (inString) {
			current += char;
			if (char === inString) {
				inString = null;
			}
		} else {
			if (char === '"' || char === "'" || char === "`") {
				inString = char;
				current += char;
			} else if (char === "(" || char === "[" || char === "{") {
				depth++;
				current += char;
			} else if (char === ")" || char === "]" || char === "}") {
				depth--;
				current += char;
			} else if (char === "," && depth === 0) {
				args.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
	}

	if (current.trim()) {
		args.push(current.trim());
	}

	return args;
}

/**
 * Find the variable name for a $persist call (works for both let/const and class properties)
 */
function findVarName(
	content: string,
	persistStart: number,
): { varName: string; isClassProperty: boolean } | null {
	// Look backwards from $persist to find the assignment
	const before = content.slice(0, persistStart);
	
	// Match: varName = (potentially with let/const/var before it)
	const assignMatch = before.match(
		/(?:(?:let|const|var)\s+)?(\w+)\s*=\s*$/,
	);
	if (assignMatch) {
		// Check if this is a class property by looking for class context
		const classMatch = before.match(/class\s+\w+[^{]*\{[^}]*$/);
		return {
			varName: assignMatch[1],
			isClassProperty: !!classMatch,
		};
	}

	return null;
}

/**
 * Find all $persist calls in the content
 */
function findPersistCalls(content: string): PersistMatch[] {
	const matches: PersistMatch[] = [];
	let match: RegExpExecArray | null;

	PERSIST_CALL_REGEX.lastIndex = 0;

	while ((match = PERSIST_CALL_REGEX.exec(content)) !== null) {
		const callStart = match.index;
		const argsStart = callStart + match[0].length;
		const argsEnd = findMatchingParen(content, argsStart);
		const argsStr = content.slice(argsStart, argsEnd - 1);
		const args = splitArguments(argsStr);

		if (args.length < 2) {
			continue;
		}

		const varInfo = findVarName(content, callStart);
		if (!varInfo) {
			continue;
		}

		matches.push({
			start: callStart,
			end: argsEnd,
			varName: varInfo.varName,
			initial: args[0],
			key: args[1],
			options: args[2] || "undefined",
			isClassProperty: varInfo.isClassProperty,
		});
	}

	return matches;
}

/**
 * Transform the content by replacing $persist calls
 */
function transformContent(
	content: string,
	filename: string,
): { code: string; map: ReturnType<MagicString["generateMap"]> } | null {
	if (!content.includes("$persist")) {
		return null;
	}

	const matches = findPersistCalls(content);
	if (matches.length === 0) {
		return null;
	}

	const s = new MagicString(content);

	// Add import at the beginning
	s.prepend(IMPORT_STATEMENT);

	// Group matches by class vs non-class
	const classMatches: Map<string, PersistMatch[]> = new Map();
	const varMatches: PersistMatch[] = [];

	for (const match of matches) {
		if (match.isClassProperty) {
			// Try to find which class this belongs to
			const beforeMatch = content.slice(0, match.start);
			const classNameMatch = beforeMatch.match(/class\s+(\w+)[^{]*\{[^}]*$/);
			if (classNameMatch) {
				const className = classNameMatch[1];
				if (!classMatches.has(className)) {
					classMatches.set(className, []);
				}
				classMatches.get(className)!.push(match);
			}
		} else {
			varMatches.push(match);
		}

		// Replace $persist(...) with $state(__persist.load(...) ?? initial)
		const replacement = `$state(__persist.load(${match.key}, ${match.options}) ?? ${match.initial})`;
		s.overwrite(match.start, match.end, replacement);
	}

	// Add effects for variable declarations
	if (varMatches.length > 0) {
		const effects = varMatches
			.map(
				(m) =>
					`$effect(() => __persist.save(${m.key}, $state.snapshot(${m.varName}), ${m.options}));`,
			)
			.join("\n");
		s.append(`\n$effect.root(() => {\n${effects}\n});\n`);
	}

	// For class properties, we need to find constructors and add effects there
	// This is more complex - for now we'll add a note that classes need manual handling
	// or we can inject into existing constructors
	for (const [className, classProps] of classMatches) {
		// Find the class and its constructor
		const classRegex = new RegExp(
			`class\\s+${className}(?:\\s+extends\\s+\\w+)?\\s*\\{`,
		);
		const classMatch = classRegex.exec(content);

		if (classMatch) {
			const classStart = classMatch.index + classMatch[0].length;
			const constructorMatch = content
				.slice(classStart)
				.match(/constructor\s*\([^)]*\)\s*\{/);

			const effects = classProps
				.map(
					(m) =>
						`$effect(() => __persist.save(${m.key}, $state.snapshot(this.${m.varName}), ${m.options}));`,
				)
				.join("\n");
			const effectBlock = `$effect.root(() => {\n${effects}\n});`;

			if (constructorMatch) {
				// Add to existing constructor
				const constructorBodyStart =
					classStart + constructorMatch.index + constructorMatch[0].length;
				s.appendLeft(constructorBodyStart, `\n${effectBlock}\n`);
			} else {
				// Need to add a constructor
				// Check if class extends something
				const extendsMatch = content
					.slice(classMatch.index)
					.match(/class\s+\w+\s+extends\s+(\w+)/);
				const superCall = extendsMatch ? "super(...args);\n" : "";
				const constructorParams = extendsMatch ? "...args: any[]" : "";
				const newConstructor = `\nconstructor(${constructorParams}) {\n${superCall}${effectBlock}\n}\n`;
				s.appendLeft(classStart, newConstructor);
			}
		}
	}

	return {
		code: s.toString(),
		map: s.generateMap({
			source: filename,
			file: filename,
			includeContent: true,
			hires: true,
		}),
	};
}

export function persistPlugin(): Plugin {
	const preprocess = persistPreprocessor();
	return {
		name: "svelte-persistent-runes",
		transform(src: string, id: string) {
			if (!/\.svelte\.(c|m)?[jt]s$/.test(id)) {
				return null;
			}

			const result = preprocess.script?.({
				content: src,
				filename: id,
				attributes: {},
				markup: "",
			}) as Processed | undefined;

			if (!result || result.code === src) {
				return null;
			}

			return {
				code: result.code,
				map: result.map,
			};
		},
	};
}

export function persistPreprocessor(): PreprocessorGroup {
	return {
		name: "svelte-persistent-runes",
		script({ content, filename = "unknown.js" }) {
			const result = transformContent(content, filename);

			if (!result) {
				return { code: content };
			}

			return {
				code: result.code,
				map: result.map,
			};
		},
	};
}
