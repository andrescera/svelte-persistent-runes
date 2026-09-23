import MagicString from "magic-string";
import { walk } from "zimmerframe";
import { isScriptNode, parseScript, type ScriptNode } from "./parse";

export interface TransformOptions {
	readonly filename: string;
	readonly typescript: boolean;
	readonly module: boolean;
	readonly markup?: string;
	readonly afterTranspilation?: boolean;
}

export interface TransformResult {
	readonly code: string;
	readonly map: {
		readonly version: number;
		readonly file: string;
		readonly sources: string[];
		readonly sourcesContent?: string[];
		readonly names: string[];
		readonly mappings: string;
	};
}

function child(node: ScriptNode, key: string): ScriptNode | undefined {
	const value = node[key];
	return isScriptNode(value) ? value : undefined;
}

function text(node: ScriptNode, key: string): string | undefined {
	const value = node[key];
	return typeof value === "string" ? value : undefined;
}

function position(
	content: string,
	offset: number,
): { line: number; column: number } {
	const before = content.slice(0, offset);
	const lastNewline = before.lastIndexOf("\n");
	return { line: before.split("\n").length, column: offset - lastNewline };
}

function errorAt(
	content: string,
	options: TransformOptions,
	index: number,
	message: string,
): Error {
	const location = position(content, index);
	const start = options.markup?.indexOf(content) ?? -1;
	const line =
		start >= 0
			? location.line + position(options.markup ?? "", start).line - 1
			: location.line;
	const qualifier =
		options.markup === undefined || start >= 0 ? "" : " (in <script>)";
	const suffix = options.afterTranspilation
		? " (after TypeScript transpilation)"
		: "";
	return new Error(
		`[svelte-persistent-runes] ${options.filename}:${line}:${location.column}${qualifier} ${message}${suffix}`,
	);
}

function statementList(node: ScriptNode | undefined): boolean {
	return (
		node?.type === "Program" ||
		node?.type === "BlockStatement" ||
		node?.type === "StaticBlock" ||
		node?.type === "SwitchCase"
	);
}

function container(path: ScriptNode[]): {
	parent: ScriptNode | undefined;
	statement: ScriptNode | undefined;
} {
	const parent = path.at(-1);
	const statement =
		parent?.type === "ExportNamedDeclaration" ? parent : undefined;
	return { parent, statement };
}

export function transformScript(
	content: string,
	options: TransformOptions,
): TransformResult | null {
	if (!content.includes("$persist")) return null;

	let ast: ScriptNode;
	try {
		ast = parseScript(content, options);
	} catch (cause) {
		const offset =
			typeof cause === "object" &&
			cause !== null &&
			"pos" in cause &&
			typeof cause.pos === "number"
				? cause.pos
				: 0;
		throw errorAt(
			content,
			options,
			offset,
			`failed to parse script: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
	}

	const identifiers = new Set<string>();
	const privateNames = new Map<ScriptNode, Set<string>>();
	walk(ast, null, {
		_(node, { path, next }) {
			if (node.type === "Identifier") {
				const name = text(node, "name");
				if (name) identifiers.add(name);
			}
			if (node.type === "PrivateIdentifier") {
				const body = [...path]
					.reverse()
					.find((entry) => entry.type === "ClassBody");
				const name = text(node, "name");
				if (body && name) {
					const names = privateNames.get(body) ?? new Set<string>();
					names.add(name);
					privateNames.set(body, names);
				}
			}
			next();
		},
	});

	function free(base: string, occupied: Set<string>): string {
		let name = base;
		for (
			let suffix = 1;
			identifiers.has(name) ||
			occupied.has(name) ||
			options.markup?.includes(name);
			suffix++
		) {
			name = `${base}_${suffix}`;
		}
		occupied.add(name);
		return name;
	}

	const reserved = new Set<string>();
	const alias = free(
		options.module ? "__persist_module" : "__persist",
		reserved,
	);
	const edits = new MagicString(content);
	let count = 0;
	const placementError =
		'$persist must initialize a variable, a non-static class field, or a "this.<field> = ..." assignment at the top level of a constructor';

	walk(ast, null, {
		_(node, { path, next }) {
			if (
				node.type.startsWith("TS") &&
				![
					"TSAsExpression",
					"TSSatisfiesExpression",
					"TSNonNullExpression",
					"TSTypeAssertion",
				].includes(node.type)
			)
				return;
			if (node.type === "Identifier" && text(node, "name") === "$persist") {
				const parent = path.at(-1);
				if (
					parent?.type !== "CallExpression" ||
					child(parent, "callee") !== node
				) {
					if (
						parent?.type !== "MemberExpression" ||
						child(parent, "property") !== node ||
						parent["computed"] === true
					) {
						throw errorAt(
							content,
							options,
							node.start,
							"$persist must be called directly",
						);
					}
				}
			}
			if (
				node.type !== "CallExpression" ||
				child(node, "callee")?.type !== "Identifier" ||
				text(child(node, "callee") ?? node, "name") !== "$persist"
			) {
				next();
				return;
			}

			const args = node["arguments"];
			if (
				!Array.isArray(args) ||
				(args.length !== 2 && args.length !== 3) ||
				!args.every(isScriptNode) ||
				args.some((arg: ScriptNode) => arg.type === "SpreadElement")
			) {
				throw errorAt(
					content,
					options,
					node.start,
					"$persist expects (initial, key, options?)",
				);
			}
			const initial = content.slice(args[0].start, args[0].end);
			const key = content.slice(args[1].start, args[1].end);
			const opts = args[2]
				? content.slice(args[2].start, args[2].end)
				: "undefined";
			let index = path.length - 1;
			while (
				[
					"TSAsExpression",
					"TSSatisfiesExpression",
					"TSNonNullExpression",
					"TSTypeAssertion",
				].includes(path[index]?.type ?? "") &&
				child(path[index], "expression") ===
					(index === path.length - 1 ? node : path[index + 1])
			)
				index--;
			const consumer = path[index];
			const outer = index === path.length - 1 ? node : path[index + 1];
			const handle = free(`${alias}_h${count}`, reserved);
			const classBody = [...path]
				.reverse()
				.find((entry) => entry.type === "ClassBody");
			const classPrivate = classBody
				? (privateNames.get(classBody) ?? new Set<string>())
				: reserved;
			const state = (reference: string) =>
				`$state(${reference}.restore() ? ${reference}.value : (${initial}))`;
			const track = (reference: string, binding: string) =>
				`${alias}.track(${reference}, () => $state.snapshot(${binding}), (f) => { $effect(f); }, (f) => $effect.root(f));`;

			if (
				consumer?.type === "VariableDeclarator" &&
				child(consumer, "init") === outer
			) {
				const declaration = path[index - 1];
				const { parent, statement: exported } = container(
					path.slice(0, index - 1),
				);
				const statement = exported ?? declaration;
				const list = exported ? path[index - 3] : parent;
				if (child(consumer, "id")?.type !== "Identifier")
					throw errorAt(
						content,
						options,
						node.start,
						"$persist cannot initialize a destructuring pattern",
					);
				if (declaration?.type !== "VariableDeclaration" || !statementList(list))
					throw errorAt(content, options, node.start, placementError);
				if (
					exported &&
					!options.module &&
					options.markup !== undefined &&
					declaration["kind"] !== "const"
				)
					throw errorAt(
						content,
						options,
						node.start,
						'$persist cannot be used with "export let" in a component instance script; use $props() for props or move it to <script module>',
					);
				const name = text(child(consumer, "id") ?? consumer, "name");
				edits.appendLeft(statement.start, `let ${handle};\n`);
				edits.overwrite(
					node.start,
					node.end,
					`$state((${handle} = ${alias}.createPersistence(${key}, ${opts})).restore() ? ${handle}.value : (${initial}))`,
				);
				edits.appendLeft(
					statement.end,
					`${content[statement.end - 1] === ";" ? "" : ";"}\n${track(handle, name ?? "")}`,
				);
			} else if (
				consumer?.type === "PropertyDefinition" &&
				child(consumer, "value") === outer &&
				classBody
			) {
				if (consumer["static"] === true)
					throw errorAt(
						content,
						options,
						node.start,
						"$persist cannot be used on static class fields",
					);
				if (consumer["computed"] === true)
					throw errorAt(
						content,
						options,
						node.start,
						"$persist cannot be used on computed class fields",
					);
				const field = child(consumer, "key");
				if (field?.type !== "Identifier" && field?.type !== "PrivateIdentifier")
					throw errorAt(content, options, node.start, placementError);
				const privateHandle = free(`${alias}_h${count}`, classPrivate);
				const effectField = free(`${alias}_e${count}`, classPrivate);
				const binding = `this.${field.type === "PrivateIdentifier" ? "#" : ""}${text(field, "name")}`;
				edits.appendLeft(
					consumer.start,
					`#${privateHandle} = ${alias}.createPersistence(${key}, ${opts});\n`,
				);
				edits.overwrite(node.start, node.end, state(`this.#${privateHandle}`));
				edits.appendLeft(
					consumer.end,
					`${content[consumer.end - 1] === ";" ? "" : ";"}\n#${effectField} = ${track(`this.#${privateHandle}`, binding)}`,
				);
			} else if (
				consumer?.type === "AssignmentExpression" &&
				consumer["operator"] === "=" &&
				child(consumer, "right") === outer
			) {
				const left = child(consumer, "left");
				const statement = path[index - 1];
				const body = path[index - 2];
				const method = path[index - 4];
				const property = left && child(left, "property");
				if (
					left?.type !== "MemberExpression" ||
					child(left, "object")?.type !== "ThisExpression" ||
					left["computed"] === true ||
					(property?.type !== "Identifier" &&
						property?.type !== "PrivateIdentifier") ||
					statement?.type !== "ExpressionStatement" ||
					body?.type !== "BlockStatement" ||
					path[index - 3]?.type !== "FunctionExpression" ||
					method?.type !== "MethodDefinition" ||
					method["kind"] !== "constructor" ||
					child(method, "value") !== path[index - 3]
				)
					throw errorAt(content, options, node.start, placementError);
				const binding = `this.${property.type === "PrivateIdentifier" ? "#" : ""}${text(property, "name")}`;
				edits.appendLeft(
					statement.start,
					`const ${handle} = ${alias}.createPersistence(${key}, ${opts});\n`,
				);
				edits.overwrite(node.start, node.end, state(handle));
				edits.appendLeft(statement.end, `\n${track(handle, binding)}`);
			} else {
				throw errorAt(content, options, node.start, placementError);
			}
			count++;
		},
	});
	if (!count) return null;
	edits.prepend(`import * as ${alias} from "svelte-persistent-runes";\n`);
	const map = edits.generateMap({
		source: options.filename,
		file: options.filename,
		includeContent: true,
		hires: true,
	});
	return {
		code: edits.toString(),
		map: {
			version: map.version,
			file: map.file ?? options.filename,
			sources: map.sources,
			sourcesContent: map.sourcesContent?.filter(
				(item): item is string => item !== null,
			),
			names: map.names,
			mappings: map.mappings,
		},
	};
}
