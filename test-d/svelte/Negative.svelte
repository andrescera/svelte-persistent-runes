<script lang="ts">
// `$persist("text", "k")` assigned to `let n: number` cannot be exercised
// directly here: Svelte's own parser rejects any bare, un-transformed
// `$`-prefixed identifier it doesn't recognize as a rune
// (`global_reference_invalid`, see `Counter.svelte`), before TypeScript
// ever gets to check the call's argument types. The same generic-per-value
// enforcement is asserted exhaustively (including this exact case) in
// `test-d/persist.test-d.ts`. Here we assert the equivalent failure through
// the exported `PersistentRunesOptionsOf<T>` type instead, to keep a real
// `@ts-expect-error` inside this svelte-check fixture.
import type { PersistentRunesOptionsOf } from "svelte-persistent-runes";

const badOptions: Partial<PersistentRunesOptionsOf<number>> = {
	// @ts-expect-error - a `string`-returning `serialize` is not assignable to a `number`-typed options serializer
	serialize: (v: string) => v,
};

let n: number = 0;
</script>

<p>{n}</p>
