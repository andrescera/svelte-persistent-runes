import { Parser } from "acorn";
import def, { type ExecutionContext, type TestFn } from "ava";
import { walk } from "zimmerframe";
import { persistPlugin, persistPreprocessor } from "./plugins";
import { parseScript } from "./transform/parse";
import { transformScript } from "./transform/transform";

const test: TestFn = def as unknown as TestFn;

interface HappyCase {
	readonly name: string;
	readonly source: string;
	readonly binding: string;
	readonly typescript?: boolean;
	readonly module?: boolean;
	readonly markup?: string;
	readonly extraBindings?: readonly string[];
}

const happyCases: readonly HappyCase[] = [
	{ name: "plain let", source: 'let x = $persist(0, "k");', binding: "x" },
	{ name: "const", source: 'const x = $persist(0, "k");', binding: "x" },
	{ name: "var", source: 'var x = $persist(0, "k");', binding: "x" },
	{
		name: "annotated number",
		source: 'let x: number = $persist(0, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "Map type annotation",
		source: 'let m: Map<string, number> = $persist(new Map(), "k");',
		binding: "m",
		typescript: true,
	},
	{
		name: "nested generic annotation",
		source:
			'let x: Map<string, Array<Map<string, number>>> = $persist(new Map(), "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "function type argument",
		source: 'let x = $persist<() => void>(() => {}, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "parameterized function type argument",
		source: 'let x = $persist<(a: string) => number>((a) => a.length, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "generic constructor initial",
		source: 'let x = $persist(new Map<string, number>(), "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "as record wrapper",
		source: 'let x = $persist({}, "k") as Record<string, number>;',
		binding: "x",
		typescript: true,
	},
	{
		name: "satisfies record wrapper",
		source: 'let x = $persist({}, "k") satisfies Record<string, number>;',
		binding: "x",
		typescript: true,
	},
	{
		name: "object type argument",
		source: 'let x = $persist<{ a: number }>({ a: 1 }, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "union type argument",
		source: 'let x = $persist<string | number>(1, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "tuple type argument",
		source: 'let x = $persist<[string, number]>(["a", 1], "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "typed field",
		source: 'class C { name: string = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "private modifier",
		source: 'class C { private name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "readonly modifier",
		source: 'class C { readonly name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "private field",
		source: 'class C { #name = $persist("A", "k"); }',
		binding: "this.#name",
	},
	{
		name: "generic class",
		source: 'class C<T> { name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "generic heritage",
		source: 'class C extends B<string> { name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "implements",
		source: 'class C implements I { name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "call heritage",
		source: 'class C extends mixin(B) { name = $persist("A", "k"); }',
		binding: "this.name",
	},
	{
		name: "default export class",
		source: 'export default class C { name = $persist("A", "k"); }',
		binding: "this.name",
		module: true,
	},
	{
		name: "class expression",
		source: 'const C = class { name = $persist("A", "k"); };',
		binding: "this.name",
	},
	{
		name: "field after method",
		source: 'class C { method() {} name = $persist("A", "k"); }',
		binding: "this.name",
	},
	{
		name: "field after object field",
		source: 'class C { other = { v: 1 }; name = $persist("A", "k"); }',
		binding: "this.name",
	},
	{
		name: "two classes",
		source:
			'class A { constructor() {} name = $persist("A", "a"); } class B { age = $persist(2, "b"); }',
		binding: "this.name",
		extraBindings: ["this.age"],
	},
	{
		name: "parameter properties",
		source:
			'class C { constructor(public x: number) {} name = $persist("A", "k"); }',
		binding: "this.name",
		typescript: true,
	},
	{
		name: "default constructor parameter",
		source: 'class C { constructor(x = 2) {} name = $persist("A", "k"); }',
		binding: "this.name",
	},
	{
		name: "derived existing constructor",
		source:
			'class C extends B { constructor() { super(); } name = $persist("A", "k"); }',
		binding: "this.name",
	},
	{
		name: "dollar-prefixed identifier",
		source: 'let $count = 1; let x = $persist(0, "k");',
		binding: "x",
	},
	{
		name: "unicode binding",
		source: 'let café = $persist(0, "k");',
		binding: "café",
	},
	{
		name: "function body",
		source: 'function f() { let x = $persist(0, "k"); return x; }',
		binding: "x",
	},
	{
		name: "nested block",
		source: 'if (true) { let x = $persist(0, "k"); }',
		binding: "x",
	},
	{
		name: "URL before call",
		source: 'const url = "https://site.test/x"; let x = $persist(0, "k");',
		binding: "x",
	},
	{
		name: "comment delimiter string before call",
		source: 'const delimiter = "/*"; let x = $persist(0, "k");',
		binding: "x",
	},
	{
		name: "unrelated strings and templates",
		source:
			'const str = "$persist(1)"; const tpl = `$persist(2)`; let x = $persist(0, "k");',
		binding: "x",
	},
	{
		name: "template key nested parentheses",
		// biome-ignore lint/suspicious/noTemplateCurlyInString: literal source-code fixture fed to the transform; not a template literal in this test file
		source: 'let x = $persist(0, `key-${fn("a)")}`);',
		binding: "x",
	},
	{
		name: "regex literal with paren and quote",
		source: 'let x = $persist(/[)\x27]/.test("a"), "k");',
		binding: "x",
	},
	{
		name: "multiline trailing comma",
		source: 'let x = $persist(\n  0,\n  "k",\n);',
		binding: "x",
	},
	{
		name: "module exported let",
		source: 'export let x = $persist(0, "k");',
		binding: "x",
		module: true,
	},
	{
		name: "vite module exported let",
		source: 'export let x = $persist(0, "k");',
		binding: "x",
		module: true,
		typescript: true,
	},
	{
		name: "instance exported const",
		source: 'export const x = $persist(0, "k");',
		binding: "x",
	},
	{
		name: "as number wrapper",
		source: 'let x = $persist(0, "k") as number;',
		binding: "x",
		typescript: true,
	},
	{
		name: "satisfies number wrapper",
		source: 'let x = $persist(0, "k") satisfies number;',
		binding: "x",
		typescript: true,
	},
	{
		name: "non-null assertion wrapper",
		source: 'let x = $persist(0, "k")!;',
		binding: "x",
		typescript: true,
	},
	{
		name: "angle bracket assertion wrapper",
		source: 'let x = <number>$persist(0, "k");',
		binding: "x",
		typescript: true,
	},
	{
		name: "occupied alias and handle",
		source:
			'const __persist = 1; const __persist_h0 = 2; class C { #__persist_h0 = 3; x = $persist(0, "k"); }',
		binding: "this.x",
	},
	{
		name: "markup occupied alias",
		source: 'let x = $persist(0, "k");',
		binding: "x",
		markup: "<p>__persist __persist_1</p>",
	},
	{
		name: "multiple declarators",
		source: 'let a = 1, x = $persist(0, "k"), b = 2;',
		binding: "x",
	},
	{
		name: "multiple persisted declarators",
		source: 'let x = $persist(0, "x"), y = $persist(1, "y");',
		binding: "x",
		extraBindings: ["y"],
	},
	{
		name: "constructor assignment",
		source: 'class C { constructor() { this.x = $persist(0, "k"); } }',
		binding: "this.x",
	},
	{
		name: "constructor lowered field",
		source:
			'class C { constructor() { this.x = $persist(0, "k"); this.y = 1; } }',
		binding: "this.x",
	},
	{
		name: "module markup snippet export",
		source: 'export { snippet }; let x = $persist(0, "k");',
		binding: "x",
		module: true,
		markup: "{#snippet snippet()}{/snippet}",
	},
	{
		name: "module alias",
		source: 'let x = $persist(0, "k");',
		binding: "x",
		module: true,
	},
	{
		name: "explicit options",
		source: 'let x = $persist(0, "k", { storageRead: () => "1" });',
		binding: "x",
	},
	{
		name: "switch case",
		source: 'switch (1) { case 1: let x = $persist(0, "k"); break; }',
		binding: "x",
	},
];

for (const entry of happyCases) {
	test(`transforms ${entry.name}`, (t: ExecutionContext) => {
		const result = transformScript(entry.source, {
			filename: "X.svelte",
			typescript: entry.typescript ?? false,
			module: entry.module ?? false,
			markup: entry.markup,
		});
		if (!result) return t.fail("Expected a transformation");
		const parsed = parseScript(result.code, {
			typescript: entry.typescript ?? false,
			module: entry.module ?? false,
		});
		let remaining = 0;
		walk(parsed, null, {
			Identifier(node, { next }) {
				if (node.name === "$persist") remaining++;
				next();
			},
		});
		t.is(remaining, 0);
		if (!entry.typescript && entry.name !== "module markup snippet export")
			t.notThrows(() =>
				Parser.parse(result.code, {
					ecmaVersion: "latest",
					sourceType: "module",
				}),
			);
		for (const binding of [entry.binding, ...(entry.extraBindings ?? [])])
			t.true(result.code.includes(`$state.snapshot(${binding})`));
		if (entry.module)
			t.true(
				result.code.startsWith(
					'import * as __persist_module from "svelte-persistent-runes";',
				),
			);
		if (entry.name === "markup occupied alias")
			t.true(result.code.startsWith("import * as __persist_2 from"));
		t.snapshot(result.code);
	});
}

const errors = [
	{
		name: "destructuring",
		source: 'let { x } = $persist({ x: 1 }, "k");',
		message: "$persist cannot initialize a destructuring pattern",
		column: 13,
	},
	{
		name: "static field",
		source: 'class C { static x = $persist(0, "k"); }',
		message: "$persist cannot be used on static class fields",
		column: 22,
	},
	{
		name: "computed field",
		source: 'class C { ["x"] = $persist(0, "k"); }',
		message: "$persist cannot be used on computed class fields",
		column: 19,
	},
	{
		name: "for init",
		source: 'for (let x = $persist(0, "k");;) break;',
		message:
			'$persist must initialize a variable, a non-static class field, or a "this.<field> = ..." assignment at the top level of a constructor',
		column: 14,
	},
	{
		name: "wrong arity",
		source: "let x = $persist(0);",
		message: "$persist expects (initial, key, options?)",
		column: 9,
	},
	{
		name: "too many args",
		source: 'let x = $persist(0, "k", {}, 4);',
		message: "$persist expects (initial, key, options?)",
		column: 9,
	},
	{
		name: "spread arg",
		source: "let x = $persist(0, ...args);",
		message: "$persist expects (initial, key, options?)",
		column: 9,
	},
	{
		name: "bare reference",
		source: "const f = $persist;",
		message: "$persist must be called directly",
		column: 11,
	},
	{
		name: "expression position",
		source: '$persist(0, "k");',
		message:
			'$persist must initialize a variable, a non-static class field, or a "this.<field> = ..." assignment at the top level of a constructor',
		column: 1,
	},
	{
		name: "instance export let",
		source: 'export let x = $persist(0, "k");',
		message:
			'$persist cannot be used with "export let" in a component instance script; use $props() for props or move it to <script module>',
		column: 16,
	},
	{
		name: "instance export var",
		source: 'export var x = $persist(0, "k");',
		message:
			'$persist cannot be used with "export let" in a component instance script; use $props() for props or move it to <script module>',
		column: 16,
	},
];

for (const entry of errors) {
	test(`rejects ${entry.name} at source location`, (t: ExecutionContext) => {
		const thrown = t.throws(() =>
			transformScript(entry.source, {
				filename: "X.svelte",
				typescript: false,
				module: false,
				markup: "",
			}),
		);
		t.is(
			thrown?.message,
			`[svelte-persistent-runes] X.svelte:1:${entry.column} (in <script>) ${entry.message}`,
		);
	});
}

test("ignores TypeScript type-only references", (t: ExecutionContext) => {
	const source = 'type T = typeof $persist; let x = $persist(0, "k");';
	const result = transformScript(source, {
		filename: "X.svelte",
		typescript: true,
		module: false,
	});
	t.true(result?.code.includes("type T = typeof $persist;"));
	t.true(result?.code.includes("$state.snapshot(x)"));
});

test("locates parse errors", (t: ExecutionContext) => {
	const error = t.throws(() =>
		transformScript('let x = $persist(0, "k";', {
			filename: "X.svelte",
			typescript: false,
			module: false,
		}),
	);
	t.true(error?.message.startsWith("[svelte-persistent-runes] X.svelte:1:"));
	t.true(error?.message.includes("failed to parse script: Unexpected token"));
});

test("offsets preprocessor error into original markup", async (t: ExecutionContext) => {
	const content = '\nlet { a } = $persist({ a: 1 }, "k");\n';
	const markup = `<p>x</p>\n<script lang="ts">${content}</script>`;
	const error = await t.throwsAsync(async () =>
		persistPreprocessor().script?.({
			content,
			markup,
			filename: "C.svelte",
			attributes: { lang: "ts" },
		}),
	);
	t.is(
		error?.message,
		"[svelte-persistent-runes] C.svelte:3:13 $persist cannot initialize a destructuring pattern",
	);
});

test("leaves no-call content byte identical and map absent", async (t: ExecutionContext) => {
	const content = 'const s = "$persist";\nlet n = $state(1);';
	const result = await persistPreprocessor().script?.({
		content,
		filename: "X.svelte",
		markup: "",
		attributes: {},
	});
	t.deepEqual(result, { code: content });
});

test("Vite strips query parameters before matching", async (t: ExecutionContext) => {
	const hook = persistPlugin().transform;
	if (typeof hook !== "function")
		return t.fail("Expected a function transform hook");
	const result = await Reflect.apply(hook, {}, [
		'let x = $persist(0, "k");',
		"/x/a.svelte.ts?v=1",
	]);
	t.truthy(result);
});

test("Vite annotates errors after TypeScript transpilation", async (t: ExecutionContext) => {
	const hook = persistPlugin().transform;
	if (typeof hook !== "function")
		return t.fail("Expected a function transform hook");
	const error = await t.throwsAsync(async () =>
		Reflect.apply(hook, {}, ['$persist(0, "k");', "/x/a.svelte.ts"]),
	);
	t.true(error?.message.endsWith(" (after TypeScript transpilation)"));
});

test("skips non-JavaScript language scripts", async (t: ExecutionContext) => {
	const content = 'let x = $persist(0, "k")';
	const result = await persistPreprocessor().script?.({
		content,
		filename: "X.svelte",
		markup: "",
		attributes: { lang: "coffee" },
	});
	t.deepEqual(result, { code: content });
});
