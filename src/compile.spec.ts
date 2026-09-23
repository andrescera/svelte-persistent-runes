import def, { type ExecutionContext, type TestFn } from "ava";
import { compile, compileModule, VERSION } from "svelte/compiler";
import * as vite from "vite";
import { transformScript } from "./transform/transform";

const test: TestFn = def as unknown as TestFn;

interface CompileCase {
	readonly name: string;
	readonly source: string;
	readonly typescript?: boolean;
	readonly module?: boolean;
	readonly markup?: string;
	readonly constructorAssignment?: boolean;
}

const cases: readonly CompileCase[] = [
	{ name: "plain let", source: 'let x = $persist(0, "k");' },
	{ name: "const", source: 'const x = $persist(0, "k");' },
	{ name: "var", source: 'var x = $persist(0, "k");' },
	{
		name: "annotated number",
		source: 'let x: number = $persist(0, "k");',
		typescript: true,
	},
	{
		name: "Map type annotation",
		source: 'let m: Map<string, number> = $persist(new Map(), "k");',
		typescript: true,
	},
	{
		name: "nested generic annotation",
		source:
			'let x: Map<string, Array<Map<string, number>>> = $persist(new Map(), "k");',
		typescript: true,
	},
	{
		name: "function type argument",
		source: 'let x = $persist<() => void>(() => {}, "k");',
		typescript: true,
	},
	{
		name: "parameterized function type argument",
		source: 'let x = $persist<(a: string) => number>((a) => a.length, "k");',
		typescript: true,
	},
	{
		name: "generic constructor initial",
		source: 'let x = $persist(new Map<string, number>(), "k");',
		typescript: true,
	},
	{
		name: "as record wrapper",
		source: 'let x = $persist({}, "k") as Record<string, number>;',
		typescript: true,
	},
	{
		name: "satisfies record wrapper",
		source: 'let x = $persist({}, "k") satisfies Record<string, number>;',
		typescript: true,
	},
	{
		name: "object type argument",
		source: 'let x = $persist<{ a: number }>({ a: 1 }, "k");',
		typescript: true,
	},
	{
		name: "union type argument",
		source: 'let x = $persist<string | number>(1, "k");',
		typescript: true,
	},
	{
		name: "tuple type argument",
		source: 'let x = $persist<[string, number]>(["a", 1], "k");',
		typescript: true,
	},
	{
		name: "typed field",
		source: 'class C { name: string = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "private modifier",
		source: 'class C { private name = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "readonly modifier",
		source: 'class C { readonly name = $persist("A", "k"); }',
		typescript: true,
	},
	{ name: "private field", source: 'class C { #name = $persist("A", "k"); }' },
	{
		name: "generic class",
		source: 'class C<T> { name = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "generic heritage",
		source: 'class C extends B<string> { name = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "implements",
		source: 'class C implements I { name = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "call heritage",
		source: 'class C extends mixin(B) { name = $persist("A", "k"); }',
	},
	{
		name: "default export class",
		source: 'export default class C { name = $persist("A", "k"); }',
		module: true,
	},
	{
		name: "class expression",
		source: 'const C = class { name = $persist("A", "k"); };',
	},
	{
		name: "field after method",
		source: 'class C { method() {} name = $persist("A", "k"); }',
	},
	{
		name: "field after object field",
		source: 'class C { other = { v: 1 }; name = $persist("A", "k"); }',
	},
	{
		name: "two classes",
		source:
			'class A { constructor() {} name = $persist("A", "a"); } class B { age = $persist(2, "b"); }',
	},
	{
		name: "parameter properties",
		source:
			'class C { constructor(public x: number) {} name = $persist("A", "k"); }',
		typescript: true,
	},
	{
		name: "default constructor parameter",
		source: 'class C { constructor(x = 2) {} name = $persist("A", "k"); }',
	},
	{
		name: "derived existing constructor",
		source:
			'class C extends B { constructor() { super(); } name = $persist("A", "k"); }',
	},
	{
		name: "dollar-prefixed identifier",
		source: 'let $count = 1; let x = $persist(0, "k");',
	},
	{ name: "unicode binding", source: 'let café = $persist(0, "k");' },
	{
		name: "function body",
		source: 'function f() { let x = $persist(0, "k"); return x; }',
	},
	{ name: "nested block", source: 'if (true) { let x = $persist(0, "k"); }' },
	{
		name: "URL before call",
		source: 'const url = "https://site.test/x"; let x = $persist(0, "k");',
	},
	{
		name: "comment delimiter string before call",
		source: 'const delimiter = "/*"; let x = $persist(0, "k");',
	},
	{
		name: "unrelated strings and templates",
		source:
			'const str = "$persist(1)"; const tpl = `$persist(2)`; let x = $persist(0, "k");',
	},
	{
		name: "template key nested parentheses",
		source: 'let x = $persist(0, `key-${fn("a)")}`);',
	},
	{
		name: "regex literal with paren and quote",
		source: 'let x = $persist(/[)\x27]/.test("a"), "k");',
	},
	{
		name: "multiline trailing comma",
		source: 'let x = $persist(\n  0,\n  "k",\n);',
	},
	{
		name: "module exported let",
		source: 'export let x = $persist(0, "k");',
		module: true,
	},
	{
		name: "vite module exported let",
		source: 'export let x = $persist(0, "k");',
		module: true,
		typescript: true,
	},
	{
		name: "instance exported const",
		source: 'export const x = $persist(0, "k");',
	},
	{
		name: "as number wrapper",
		source: 'let x = $persist(0, "k") as number;',
		typescript: true,
	},
	{
		name: "satisfies number wrapper",
		source: 'let x = $persist(0, "k") satisfies number;',
		typescript: true,
	},
	{
		name: "non-null assertion wrapper",
		source: 'let x = $persist(0, "k")!;',
		typescript: true,
	},
	{
		name: "angle bracket assertion wrapper",
		source: 'let x = <number>$persist(0, "k");',
		typescript: true,
	},
	{
		name: "occupied alias and handle",
		source:
			'const __persist = 1; const __persist_h0 = 2; class C { #__persist_h0 = 3; x = $persist(0, "k"); }',
	},
	{
		name: "markup occupied alias",
		source: 'let x = $persist(0, "k");',
		markup: "<p>__persist __persist_1</p>",
	},
	{
		name: "multiple declarators",
		source: 'let a = 1, x = $persist(0, "k"), b = 2;',
	},
	{
		name: "multiple persisted declarators",
		source: 'let x = $persist(0, "x"), y = $persist(1, "y");',
	},
	{
		name: "constructor assignment",
		source: 'class C { constructor() { this.x = $persist(0, "k"); } }',
		constructorAssignment: true,
	},
	{
		name: "constructor lowered field",
		source:
			'class C { constructor() { this.x = $persist(0, "k"); this.y = 1; } }',
		constructorAssignment: true,
	},
	{
		name: "module markup snippet export",
		source: 'export { snippet }; let x = $persist(0, "k");',
		module: true,
		markup: "{#snippet snippet()}{/snippet}",
	},
	{ name: "module alias", source: 'let x = $persist(0, "k");', module: true },
	{
		name: "explicit options",
		source: 'let x = $persist(0, "k", { storageRead: () => "1" });',
	},
	{
		name: "switch case",
		source: 'switch (1) { case 1: let x = $persist(0, "k"); break; }',
	},
];

for (const scenario of cases) {
	for (const generate of ["client", "server"] as const) {
		test(`Svelte ${VERSION} compiles ${scenario.name} for ${generate}`, async (t: ExecutionContext) => {
			const result = transformScript(scenario.source, {
				filename: "X.svelte",
				typescript: scenario.typescript ?? false,
				module: scenario.module ?? false,
				markup: scenario.markup,
			});
			if (!result) return t.fail("Expected transformed source");
			const code = scenario.typescript
				? (
						await (typeof vite.transformWithOxc === "function"
							? vite.transformWithOxc(result.code, "X.ts")
							: vite.transformWithEsbuild(result.code, "X.ts"))
					).code
				: result.code;
			try {
				const compiled =
					scenario.module && scenario.name !== "module markup snippet export"
						? compileModule(code, { filename: "x.svelte.js", generate })
						: compile(
								scenario.module
									? `<script module>${code}</script><script>let mounted = $state(true);</script>${scenario.markup ?? ""}`
									: `<script>${code}</script>${scenario.markup ?? ""}`,
								{ filename: "X.svelte", generate },
							);
				t.truthy(compiled.js.code);
			} catch (error) {
				if (
					scenario.name === "dollar-prefixed identifier" &&
					error instanceof Error &&
					"code" in error
				) {
					t.is(error.code, "dollar_prefix_invalid");
					return;
				}
				if (
					scenario.constructorAssignment &&
					error instanceof Error &&
					"code" in error &&
					error.code === "state_invalid_placement"
				) {
					t.pass();
					return;
				}
				throw error;
			}
		});
	}
}
