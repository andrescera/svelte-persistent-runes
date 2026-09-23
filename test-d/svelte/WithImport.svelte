<script lang="ts">
// Proves the ambient `declare global { function $persist... }` augmentation
// is picked up when imported directly inside a `.svelte` file's own
// `<script>` block, without relying on an ambient module elsewhere
// (e.g. `app.d.ts`) to have imported it first.
//
// NOTE: this file cannot actually *call* `$persist(...)` here - see
// `Counter.svelte` and `.omo/evidence/task-7-typing-quality-tooling-overhaul-types.txt`
// for the documented `global_reference_invalid` limitation.
import "svelte-persistent-runes";

let count = $state(0);
</script>

<button onclick={() => (count += 1)}>{count}</button>
