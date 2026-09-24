<script module lang="ts">
import "svelte-persistent-runes";

let moduleCount: number = $persist<number>(1, "vite-module-count");
let moduleScores: Map<string, number> = $persist<Map<string, number>>(
	new Map([["module", 2]]),
	"vite-module-scores",
);
</script>

<script lang="ts">
	let count: number = $persist<number>(3, "vite-instance-count");
	let scores: Map<string, number> = $persist<Map<string, number>>(
		new Map([["instance", 4]]),
		"vite-instance-scores",
	);
</script>

<p>{moduleCount}: {moduleScores.get("module")}</p>
<button onclick={() => (count += 1)}>{count}: {scores.get("instance")}</button>
