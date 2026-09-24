import test from "ava";
import type { Component } from "svelte";
import { render } from "svelte/server";
import { compileComponentToFile } from "./testing/compile-module";

const components = [
	{
		name: "cookie",
		source:
			'<script>import { buildOptions, BrowserCookieStorage } from "svelte-persistent-runes/options"; let count = $persist(3, "ssr-cookie", buildOptions(undefined, BrowserCookieStorage));</script><p>{count}</p>',
	},
	{
		name: "local",
		source:
			'<script>let count = $persist(3, "ssr-local");</script><p>{count}</p>',
	},
] as const;

for (const { name, source } of components) {
	test.serial(
		`SSR: ${name} storage silently renders the initial value`,
		async (t) => {
			t.is(typeof globalThis.window, "undefined");
			t.is(typeof globalThis.document, "undefined");
			const url = await compileComponentToFile(source, `ssr-${name}`);
			const module: { default: Component } = await import(url);
			const originalWarn = console.warn;
			let warnings = 0;
			console.warn = () => {
				warnings++;
			};
			t.teardown(() => {
				console.warn = originalWarn;
			});
			const { body } = render(module.default);
			t.true(body.includes(">3<"));
			t.is(warnings, 0);
		},
	);
}
