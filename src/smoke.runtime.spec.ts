import test from "ava";

test("requestAnimationFrame is available in the runtime worker", (t) => {
	t.is(typeof globalThis.requestAnimationFrame, "function");
});

test("Svelte client runtime imports under browser conditions", async (t) => {
	const clientRuntime = "svelte/internal/client";
	await import(clientRuntime);
	const { flushSync } = await import("svelte");
	t.is(typeof flushSync, "function");
});
