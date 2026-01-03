import def, { type ExecutionContext, type TestFn } from "ava";
import { persistPreprocessor } from "./plugins";

const test: TestFn = def as unknown as TestFn;

test("Transform variable", async (t: ExecutionContext) => {
	const input = "let name = $persist('John', 'name');";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.is(
		actual?.code,
		`import * as __persist from "svelte-persistent-runes";
let name = $state(__persist.load('name', undefined) ?? 'John');
$effect.root(() => {
$effect(() => __persist.save('name', $state.snapshot(name), undefined));
});
`,
	);
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("Transform variable with options", async (t: ExecutionContext) => {
	const input =
		"let name = $persist('John', 'name', {serialize: (v) => JSON.stringify(v)});";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.is(
		actual?.code,
		`import * as __persist from "svelte-persistent-runes";
let name = $state(__persist.load('name', {serialize: (v) => JSON.stringify(v)}) ?? 'John');
$effect.root(() => {
$effect(() => __persist.save('name', $state.snapshot(name), {serialize: (v) => JSON.stringify(v)}));
});
`,
	);
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("Transform class", async (t: ExecutionContext) => {
	const input = "class Test { name = $persist('John', 'name'); }";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.truthy(actual?.code?.includes('$state(__persist.load'), "Should transform $persist to $state");
	t.truthy(actual?.code?.includes('$effect.root'), "Should add effect root");
	t.truthy(actual?.code?.includes('__persist.save'), "Should save state changes");
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("Transform class with several props", async (t: ExecutionContext) => {
	const input = `class Test {
  name = $persist('John', 'name');
  age = $persist(0, 'user-age');
}`;
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.truthy(actual?.code?.includes("__persist.load('name'"), "Should transform name property");
	t.truthy(actual?.code?.includes("__persist.load('user-age'"), "Should transform age property");
	t.truthy(actual?.code?.includes("__persist.save('name'"), "Should save name changes");
	t.truthy(actual?.code?.includes("__persist.save('user-age'"), "Should save age changes");
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("Transform class with parent", async (t: ExecutionContext) => {
	const input = "class Test extends Base { name = $persist('John', 'name'); }";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.truthy(actual?.code?.includes('extends Base'), "Should preserve extends");
	t.truthy(actual?.code?.includes('super('), "Should call super in constructor");
	t.truthy(actual?.code?.includes('$state(__persist.load'), "Should transform $persist");
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("Transform class with constructor", async (t: ExecutionContext) => {
	const input =
		"class Test { name = $persist('John', 'name'); constructor() { console.log('test'); } }";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.truthy(actual?.code?.includes('console.log'), "Should preserve constructor body");
	t.truthy(actual?.code?.includes('$effect.root'), "Should add effect root in constructor");
	t.truthy(actual?.map, "Should generate a sourcemap");
});

test("No transformation when no $persist", async (t: ExecutionContext) => {
	const input = "let name = $state('John');";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.is(actual?.code, input, "Should not modify code without $persist");
});

test("Sourcemap is valid", async (t: ExecutionContext) => {
	const input = "let name = $persist('John', 'name');";
	const actual = await persistPreprocessor().script?.({
		content: input,
		filename: "test.js",
		attributes: {},
		markup: "",
	});

	t.truthy(actual?.map, "Should have a map");
	
	// Check that the map is a valid object with required properties
	const map = actual?.map as { version?: number; sources?: string[]; mappings?: string };
	t.is(map?.version, 3, "Should be sourcemap v3");
	t.truthy(map?.sources?.includes("test.js"), "Should reference source file");
	t.truthy(map?.mappings, "Should have mappings");
});
