import type { PreprocessorGroup } from "svelte/compiler";
import type { Plugin } from "vite";
import { transformScript } from "./transform/transform";

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
