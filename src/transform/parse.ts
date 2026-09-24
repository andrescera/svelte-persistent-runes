import { tsPlugin } from "@sveltejs/acorn-typescript";
import { Parser } from "acorn";

export interface ScriptNode {
	readonly type: string;
	readonly start: number;
	readonly end: number;
	readonly loc?: {
		readonly start: { readonly line: number; readonly column: number };
	};
	readonly [key: string]: unknown;
}

export function isScriptNode(value: unknown): value is ScriptNode {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string" &&
		"start" in value &&
		typeof value.start === "number" &&
		"end" in value &&
		typeof value.end === "number"
	);
}

const TSParser = Parser.extend(tsPlugin());

// Svelte 5.57.1, node_modules/svelte/src/compiler/phases/1-parse/acorn.js:37-48:
// script exports may name markup-only snippets, so clear Acorn's unresolved exports.
function scriptParser(Base: typeof Parser): typeof Parser {
	return class extends Base {
		parseStatement(
			context: unknown,
			topLevel: unknown,
			exports: unknown,
		): unknown {
			const statement = Reflect.apply(
				Reflect.get(Base.prototype, "parseStatement"),
				this,
				[context, topLevel, exports],
			);
			Reflect.set(this, "undefinedExports", {});
			return statement;
		}
	};
}

export function parseScript(
	content: string,
	options: { readonly typescript: boolean; readonly module: boolean },
): ScriptNode {
	const Base = options.typescript ? TSParser : Parser;
	const AstParser = options.module ? scriptParser(Base) : Base;
	const program: unknown = AstParser.parse(content, {
		ecmaVersion: "latest",
		sourceType: "module",
		locations: true,
	});
	if (!isScriptNode(program))
		throw new Error("Acorn returned a non-node program");
	return program;
}
