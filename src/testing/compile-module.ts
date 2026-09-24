import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { compile, compileModule, preprocess } from "svelte/compiler";
import { persistPlugin, persistPreprocessor } from "../plugins";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outputDirectory = join(root, ".tmp/runtime-tests");
const runtimeUrl = pathToFileURL(join(root, "src/index.ts")).href;
const optionsUrl = pathToFileURL(join(root, "src/options.ts")).href;

async function saveCompiled(code: string, name: string): Promise<string> {
	const rewritten = code
		.replaceAll('"svelte-persistent-runes/options"', JSON.stringify(optionsUrl))
		.replaceAll('"svelte-persistent-runes"', JSON.stringify(runtimeUrl));
	const hash = createHash("sha256")
		.update(rewritten)
		.digest("hex")
		.slice(0, 12);
	const destination = join(outputDirectory, `${name}-${hash}.mjs`);
	await mkdir(outputDirectory, { recursive: true });
	await writeFile(destination, rewritten);
	return pathToFileURL(destination).href;
}

export async function compileToFile(
	source: string,
	name: string,
): Promise<string> {
	const hook = persistPlugin().transform;
	if (typeof hook !== "function") {
		throw new Error("Persistence plugin must provide a transform hook");
	}
	const result: unknown = await Reflect.apply(hook, {}, [
		source,
		`/virtual/${name}.svelte.js`,
	]);
	if (
		!result ||
		typeof result !== "object" ||
		!("code" in result) ||
		typeof result.code !== "string"
	) {
		throw new Error("Persistence plugin did not transform the runes module");
	}
	const compiled = compileModule(result.code, {
		filename: `${name}.svelte.js`,
		generate: "client",
		dev: false,
	});
	return saveCompiled(compiled.js.code, name);
}

export async function compileComponentToFile(
	source: string,
	name: string,
): Promise<string> {
	const filename = `${name}.svelte`;
	const processed = await preprocess(source, persistPreprocessor(), {
		filename,
	});
	const compiled = compile(processed.code, { filename, generate: "server" });
	return saveCompiled(compiled.js.code, name);
}
