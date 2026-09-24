import type { PreprocessorGroup } from "svelte/compiler";
import type { Plugin } from "vite";
import { transformScript } from "./transform/transform";

/**
 * Create the Vite plugin that rewrites `$persist(...)` in `.svelte.ts`,
 * `.svelte.js`, `.svelte.mts`, `.svelte.cts`, `.svelte.mjs` and `.svelte.cjs` modules.
 *
 * Svelte preprocessors only see `.svelte` files, so this plugin is required
 * for `$persist` to work in standalone module files. Register it in the
 * `plugins` array of `vite.config.ts`; `.svelte` components are left to
 * {@link persistPreprocessor}.
 * @returns A Vite plugin named `svelte-persistent-runes`
 */
export function persistPlugin(): Plugin {
	return {
		name: "svelte-persistent-runes",
		// biome-ignore lint/complexity/useArrowFunction: Keep the Vite hook as a plain function-valued property.
		transform: function (src: string, id: string) {
			const file = id.split("?")[0];
			if (!/\.svelte\.[cm]?[jt]s$/.test(file)) return null;
			const typescript = /\.[cm]?ts$/.test(file);
			return transformScript(src, {
				filename: file,
				typescript,
				module: true,
				afterTranspilation: typescript,
			});
		},
	};
}

/**
 * Create the Svelte preprocessor that rewrites `$persist(...)` into a regular
 * `$state` plus an effect that writes every change to storage.
 *
 * It handles the `<script>` and `<script module>` blocks of `.svelte` files,
 * in JavaScript or TypeScript (`lang="ts"`); scripts in any other language
 * are passed through unchanged. Register it in the `preprocess` array of
 * `svelte.config.js`. Without it `$persist` does not exist. Module files
 * (`.svelte.ts` / `.svelte.js`) need {@link persistPlugin} instead.
 * @returns A Svelte preprocessor group named `svelte-persistent-runes`
 */
export function persistPreprocessor(): PreprocessorGroup {
	return {
		name: "svelte-persistent-runes",
		script({ content, filename = "unknown.js", attributes, markup }) {
			const lang = attributes.lang;
			if (
				lang &&
				!["ts", "typescript", "js", "javascript"].includes(String(lang))
			) {
				return { code: content };
			}
			const result = transformScript(content, {
				filename,
				typescript: lang === "ts" || lang === "typescript",
				module: attributes.module === true || attributes.context === "module",
				markup,
			});
			return result ?? { code: content };
		},
	};
}
