import { existsSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "acorn";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const directory = resolve(process.env.DIST_DIR ?? resolve(root, "dist"));
const entries = ["options", "index", "plugins", "preprocessor"];
const rows = [];
const dependencyLink = resolve(directory, "node_modules");
const needsLink =
	process.env.DIST_DIR !== undefined && !existsSync(dependencyLink);
const forbidden = [
	"devalue",
	"superjson",
	"esserializer",
	"next-json",
	"php-serialize",
	"serialize-anything",
	"@macfja/serializer",
	"browser-cookies",
	"sjcl-es",
	"sjcl-codec-hex",
];
const graph = [];
const visited = new Set();
const pending = [resolve(directory, "index.mjs")];

while (pending.length > 0) {
	const file = pending.pop();
	if (visited.has(file)) continue;
	visited.add(file);
	try {
		const module = parse(readFileSync(file, "utf8"), {
			ecmaVersion: "latest",
			sourceType: "module",
		});
		const specifiers = module.body
			.filter(
				(node) =>
					node.type === "ImportDeclaration" ||
					node.type === "ExportNamedDeclaration" ||
					node.type === "ExportAllDeclaration",
			)
			.map((node) => node.source?.value)
			.filter((source) => typeof source === "string");
		const bare = specifiers.filter((source) => !source.startsWith("."));
		graph.push({
			file: relative(directory, file),
			bare: bare.join(", ") || "—",
		});
		if (
			bare.some((source) =>
				forbidden.some((name) => source === name || source.startsWith(name)),
			)
		)
			process.exitCode = 1;
		for (const source of specifiers) {
			if (source.startsWith(".")) pending.push(resolve(file, "..", source));
		}
	} catch (error) {
		graph.push({
			file: relative(directory, file),
			bare: `scan failed: ${error}`,
		});
		process.exitCode = 1;
	}
}

console.log("Static import graph from index.mjs (file → bare specifiers):");
console.table(graph);

// A copied dist outside the package still needs its bare dependencies to resolve.
if (needsLink)
	symlinkSync(resolve(root, "node_modules"), dependencyLink, "dir");
try {
	for (const entry of entries) {
		const legacy = await import(
			`svelte-persistent-runes-v210${entry === "index" ? "" : `/${entry}`}`
		);
		try {
			const current = await import(
				pathToFileURL(resolve(directory, `${entry}.mjs`)).href
			);
			const currentExports = Object.keys(current);
			const missing = Object.keys(legacy).filter(
				(name) => !currentExports.includes(name),
			);
			rows.push({
				entry,
				current: currentExports.length,
				legacy: Object.keys(legacy).length,
				missing: missing.join(", ") || "—",
			});
			if (missing.length > 0) process.exitCode = 1;
		} catch (error) {
			rows.push({
				entry,
				current: "import failed",
				legacy: Object.keys(legacy).length,
				missing: error instanceof Error ? error.message : String(error),
			});
			process.exitCode = 1;
		}
	}
} finally {
	if (needsLink) unlinkSync(dependencyLink);
}

console.table(rows);
