import def, { type ExecutionContext, type TestFn } from "ava";
import { persistPreprocessor } from "./plugins";

const test: TestFn = def as unknown as TestFn;

const scenarios = [
	{
		name: "variable",
		source: "let name = $persist('John', 'name');",
		read: "name",
		key: "'name'",
	},
	{
		name: "generic variable",
		source: "let name = $persist<string>('John', 'name');",
		read: "name",
		key: "'name'",
		typescript: true,
	},
	{
		name: "options",
		source:
			"let name = $persist('John', 'name', {serialize: (v) => JSON.stringify(v)});",
		read: "name",
		key: "'name'",
		options: "{serialize: (v) => JSON.stringify(v)}",
	},
	{
		name: "class",
		source: "class Test { name = $persist('John', 'name'); }",
		read: "this.name",
		key: "'name'",
	},
	{
		name: "class several props",
		source:
			"class Test { name = $persist('John', 'name'); age = $persist(0, 'user-age'); }",
		read: "this.name",
		key: "'name'",
		second: "this.age",
	},
	{
		name: "class parent",
		source: "class Test extends Base { name = $persist('John', 'name'); }",
		read: "this.name",
		key: "'name'",
	},
	{
		name: "class existing constructor",
		source:
			"class Test { name = $persist('John', 'name'); constructor() { console.log('test'); } }",
		read: "this.name",
		key: "'name'",
	},
];

for (const scenario of scenarios) {
	test(`preprocessor transforms ${scenario.name}`, async (t: ExecutionContext) => {
		const result = await persistPreprocessor().script?.({
			content: scenario.source,
			filename: "test.js",
			attributes: scenario.typescript ? { lang: "ts" } : {},
			markup: "",
		});
		t.true(
			result?.code.startsWith(
				'import * as __persist from "svelte-persistent-runes";\n',
			),
		);
		t.true(
			result?.code.includes(
				`__persist.createPersistence(${scenario.key}, ${scenario.options ?? "undefined"})`,
			),
		);
		t.true(result?.code.includes(`$state.snapshot(${scenario.read})`));
		t.true(result?.code.includes("__persist.track("));
		t.true(result?.code.includes("(f) => $effect.root(f)"));
		if (scenario.second)
			t.true(result?.code.includes(`$state.snapshot(${scenario.second})`));
		if (scenario.name === "class parent")
			t.false(result?.code.includes("constructor("));
		if (scenario.name === "class existing constructor")
			t.true(result?.code.includes("console.log('test')"));
		t.truthy(result?.map);
	});
}

test("preprocessor leaves an unrelated script unchanged", async (t: ExecutionContext) => {
	const content = "let name = $state('John');";
	const result = await persistPreprocessor().script?.({
		content,
		filename: "test.js",
		attributes: {},
		markup: "",
	});
	t.deepEqual(result, { code: content });
});

test("preprocessor emits a valid source map", async (t: ExecutionContext) => {
	const result = await persistPreprocessor().script?.({
		content: "let name = $persist('John', 'name');",
		filename: "test.js",
		attributes: {},
		markup: "",
	});
	const map = result?.map;
	if (!map || typeof map === "string")
		return t.fail("Expected a source map object");
	const data = JSON.parse(JSON.stringify(map));
	t.is(data.version, 3);
	t.deepEqual(data.sources, ["test.js"]);
	t.deepEqual(data.sourcesContent, ["let name = $persist('John', 'name');"]);
	t.true(typeof data.mappings === "string" && data.mappings.length > 0);
});
