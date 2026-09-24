export async function loadLegacy(entry: "" | "/options" | "/plugins") {
	const spec = `svelte-persistent-runes-v210${entry}`;
	return (await import(spec)) as Record<string, any>;
}
