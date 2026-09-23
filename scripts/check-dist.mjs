import { existsSync, symlinkSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const directory = resolve(process.env.DIST_DIR ?? resolve(root, "dist"));
const entries = ["options", "index", "plugins", "preprocessor"];
const rows = [];
const dependencyLink = resolve(directory, "node_modules");
const needsLink =
	process.env.DIST_DIR !== undefined && !existsSync(dependencyLink);

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
