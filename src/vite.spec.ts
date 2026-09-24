import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import def, { type ExecutionContext, type TestFn } from "ava";
import { build, createLogger } from "vite";
import { persistPlugin, persistPreprocessor } from "./plugins";

const test: TestFn = def as unknown as TestFn;
const fixture = fileURLToPath(
	new URL("../fixtures/vite-app/", import.meta.url),
);
const dist = fileURLToPath(new URL("../dist/index.mjs", import.meta.url));

if (!existsSync(dist))
	throw new Error("dist/index.mjs is missing; run bun run build first");

const forbiddenLibraries = [
	"devalue",
	"superjson",
	"esserializer",
	"next-json",
	"php-serialize",
	"serialize-anything",
	"@macfja/serializer",
	"sjcl-es",
	"browser-cookies",
] as const;

for (const target of ["client", "ssr"] as const) {
	test(`${target} Vite build transforms persisted values and keeps bundle hygiene`, async (t: ExecutionContext) => {
		const warnings: string[] = [];
		const logger = createLogger("warn");
		logger.warn = (message) => warnings.push(message);
		logger.warnOnce = (message) => warnings.push(message);

		const result = await build({
			configFile: false,
			root: fixture,
			logLevel: "warn",
			customLogger: logger,
			plugins: [
				persistPlugin(),
				svelte({ preprocess: [persistPreprocessor()] }),
			],
			resolve: {
				alias: {
					"svelte-persistent-runes": process.env.PERSIST_RUNTIME_ALIAS ?? dist,
				},
			},
			build: {
				write: false,
				minify: false,
				sourcemap: true,
				lib: { entry: "src/main.ts", formats: ["es"] },
				...(target === "ssr" ? { ssr: "src/main.ts" } : {}),
				rollupOptions: { external: [/^svelte($|\/)/] },
			},
		});

		const outputs = Array.isArray(result) ? result : [result];
		const chunks = outputs.flatMap((output) =>
			"output" in output
				? output.output.filter((item) => item.type === "chunk")
				: [],
		);
		t.true(chunks.length > 0);
		t.false(
			warnings.some((warning) =>
				warning.includes("Sourcemap is likely to be incorrect"),
			),
			warnings.join("\n"),
		);
		for (const chunk of chunks) {
			const offenders = chunk.moduleIds.filter((id) =>
				forbiddenLibraries.some((library) =>
					id.includes(`/node_modules/${library}/`),
				),
			);
			t.deepEqual(
				offenders,
				[],
				`${target} ${chunk.fileName}: ${offenders.join(", ")}`,
			);
			t.false(chunk.code.includes("$persist("), chunk.fileName);
			t.true(chunk.code.includes("createPersistence"), chunk.fileName);
		}
	});
}
