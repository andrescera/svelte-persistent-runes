import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import def, { type ExecutionContext, type TestFn } from "ava";
import { compile, compileModule, VERSION } from "svelte/compiler";
import * as vite from "vite";
import { persistPlugin, persistPreprocessor } from "./plugins";

const test: TestFn = def as unknown as TestFn;

const README = join(dirname(fileURLToPath(import.meta.url)), "..", "README.md");

interface Block {
	readonly index: number;
	readonly line: number;
	readonly lang: string;
	readonly code: string;
	/** The `.svelte.ts` / `.svelte.js` file name the block is presented as, if any. */
	readonly moduleFile: string | undefined;
}

/**
 * Every fenced code block of the README, in document order. A block is
 * "presented as" a module file when one of the three non-blank lines right
 * above the fence mentions a `.svelte.ts` / `.svelte.js` path.
 */
function extractBlocks(markdown: string): Block[] {
	const lines = markdown.split("\n");
	const blocks: Block[] = [];
	let open: { lang: string; line: number; code: string[] } | undefined;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const fence = /^\s*```([A-Za-z0-9_-]*)\s*$/.exec(line);
		if (fence && !open) {
			open = { lang: fence[1], line: i + 1, code: [] };
			continue;
		}
		if (fence && open) {
			const above: string[] = [];
			for (let j = open.line - 2; j >= 0 && above.length < 3; j--) {
				if (lines[j].trim() !== "") above.push(lines[j]);
			}
			const label = above
				.map((l) => /([\w./-]+\.svelte\.[cm]?[jt]s)\b/.exec(l)?.[1])
				.find((m) => m !== undefined);
			blocks.push({
				index: blocks.length,
				line: open.line,
				lang: open.lang,
				code: open.code.join("\n"),
				moduleFile: label,
			});
			open = undefined;
			continue;
		}
		if (open) open.code.push(line);
	}
	if (open)
		throw new Error(`README.md: unclosed code fence at line ${open.line}`);
	return blocks;
}

interface Script {
	readonly attributes: Record<string, string | boolean>;
	readonly content: string;
	readonly start: number;
	readonly end: number;
}

function parseAttributes(raw: string): Record<string, string | boolean> {
	const attributes: Record<string, string | boolean> = {};
	const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
	for (const match of raw.matchAll(pattern)) {
		attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? true;
	}
	return attributes;
}

function findScripts(markup: string): Script[] {
	const scripts: Script[] = [];
	const pattern = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
	for (const match of markup.matchAll(pattern)) {
		scripts.push({
			attributes: parseAttributes(match[1] ?? ""),
			content: match[2],
			start: (match.index ?? 0) + match[0].indexOf(match[2]),
			end: (match.index ?? 0) + match[0].indexOf(match[2]) + match[2].length,
		});
	}
	return scripts;
}

/** Run every `<script>` of a component through the preprocessor, as Svelte would. */
async function preprocessComponent(
	markup: string,
	filename: string,
): Promise<string> {
	const group = persistPreprocessor();
	if (typeof group.script !== "function") throw new Error("no script hook");
	let output = markup;
	const scripts = findScripts(markup).reverse();
	for (const script of scripts) {
		const result = await group.script({
			content: script.content,
			filename,
			attributes: script.attributes,
			markup,
		});
		const code = result?.code ?? script.content;
		output = output.slice(0, script.start) + code + output.slice(script.end);
	}
	return output;
}

async function stripTypeScript(
	code: string,
	filename: string,
): Promise<string> {
	const transformed =
		typeof vite.transformWithOxc === "function"
			? await vite.transformWithOxc(code, filename)
			: await vite.transformWithEsbuild(code, filename);
	return transformed.code;
}

const blocks = extractBlocks(readFileSync(README, "utf8"));

const components = blocks.filter(
	(block) =>
		(block.lang === "svelte" || block.lang === "html") &&
		block.code.includes("<script"),
);

const modules = blocks.filter(
	(block) =>
		(block.lang === "ts" || block.lang === "js") &&
		/\$persist\s*[(<]/.test(block.code) &&
		!/declare\s+function\s+\$persist/.test(block.code),
);

test("README.md contains component and module samples", (t: ExecutionContext) => {
	t.true(
		components.length >= 6,
		`found ${components.length} component samples`,
	);
	t.true(modules.length >= 3, `found ${modules.length} module samples`);
});

for (const block of components) {
	for (const generate of ["client", "server"] as const) {
		test(`README line ${block.line} (${block.lang}) compiles with Svelte ${VERSION} for ${generate}`, async (t: ExecutionContext) => {
			const filename = `Readme${block.index}.svelte`;
			const preprocessed = await preprocessComponent(block.code, filename);
			const compiled = compile(preprocessed, { filename, generate });
			t.truthy(compiled.js.code);
		});
	}
}

for (const block of modules) {
	for (const generate of ["client", "server"] as const) {
		test(`README line ${block.line} (${block.lang}) compiles as a module with Svelte ${VERSION} for ${generate}`, async (t: ExecutionContext) => {
			t.truthy(
				block.moduleFile,
				`a ${block.lang} block calling $persist must be presented as a .svelte.ts/.svelte.js file`,
			);
			const id = `/src/${block.moduleFile ?? `readme${block.index}.svelte.ts`}`;
			const plugin = persistPlugin();
			if (typeof plugin.transform !== "function") {
				return t.fail("persistPlugin().transform is not a function");
			}
			const result = await plugin.transform.call(
				undefined as never,
				block.code,
				id,
			);
			const transformed =
				typeof result === "string"
					? result
					: result && typeof result === "object" && "code" in result
						? result.code
						: undefined;
			if (typeof transformed !== "string") {
				return t.fail(`transform returned nothing for ${id}`);
			}
			const code = /\.[cm]?ts$/.test(id)
				? await stripTypeScript(transformed, id)
				: transformed;
			const compiled = compileModule(code, { filename: id, generate });
			t.truthy(compiled.js.code);
		});
	}
}
