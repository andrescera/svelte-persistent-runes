<script module lang="ts">
// A bare, un-transformed `$persist(...)` call cannot appear here (or
// anywhere else in this file): Svelte's parser treats any unrecognized
// `$`-prefixed identifier as an illegal global/store reference and rejects
// it (`global_reference_invalid`) before TypeScript checks it, regardless
// of declaration position (module script, instance script, or class
// field). This is orthogonal to the type system exercised exhaustively in
// `test-d/persist.test-d.ts`; the transform added by a later todo rewrites
// `$persist(...)` before Svelte's compiler ever sees it, which is why real
// consumers never hit this. See the type-overload todo's recorded
// verification evidence for the exact diagnostic text.
let moduleCount = $state(0);
</script>

<script lang="ts">
	import type {
		PersistentRunesOptionsOf,
		PersistentRunesSerializerOf,
	} from "svelte-persistent-runes";
	import { buildOptions } from "svelte-persistent-runes/options";

	type User = { name: string };

	// Annotated type.
	let count: number = $state(0);
	// Generic (explicit type argument on a reactive tuple).
	let pair: [string, number] = $state(["a", 1]);
	// Map.
	let scores: Map<string, number> = $state(new Map());
	// Union-with-null.
	let user = $state<User | null>(null);

	// Custom typed serializer: `PersistentRunesSerializerOf<Date>` fixes both
	// `serialize`'s parameter and `deserialize`'s return type to `Date`, and
	// `buildOptions` preserves that through to `PersistentRunesOptionsOf<Date>`.
	const dateSerializer: PersistentRunesSerializerOf<Date> = {
		serialize: (d) => d.toISOString(),
		deserialize: (s) => new Date(s),
	};
	const dateOptions: PersistentRunesOptionsOf<Date> =
		buildOptions(dateSerializer);
	let since: Date = $state(new Date());

	// Class field.
	class Settings {
		theme: string = $state("light");
	}
	const settings = new Settings();
</script>

<div>
	<button onclick={() => (count += 1)}>{count}</button>
	<p>{pair[0]}:{pair[1]}</p>
	<p>{scores.size}</p>
	<p>{user?.name ?? "anonymous"}</p>
	<p>{dateOptions.serialize(since)}</p>
	<p>{settings.theme}</p>
	<p>{moduleCount}</p>
</div>
