# v2.2.0: full TypeScript support in the transform, typed serializers, and a random AES-GCM IV

## Vite 5 support removed

Read this first. The `vite` peer range is now `^6 || ^7 || ^8`. Vite 5 is no longer supported and is not tested. **Projects on Vite 5 should stay on 2.1.x.**

This is the only removal in the release and it is a deliberate maintainer decision, not a side effect. Vite 6, 7 and 8 are each verified with a real client and SSR build of a Svelte app in the test suite.

## What's new

### Full TypeScript syntax support in the `$persist` transform

The regex-based transform is gone. `$persist` calls are now located on a real AST (acorn with `@sveltejs/acorn-typescript`), so every TypeScript form that Svelte accepts is transformed correctly, and forms that can't be persisted fail the build with a file, line and column.

#### Before (2.1.0)

```ts
let count: number = $persist(0, 'count');          // saved under the name "number"
let m: Map<string, number> = $persist(new Map(), 'm'); // never transformed
let cb = $persist<() => void>(() => {}, 'cb');       // skipped: parentheses in the type argument

class Store<T> extends Base<T> {
  #secret: string = $persist('', 'secret');          // saved under the PUBLIC name "string"
  static shared = $persist(0, 'shared');             // silently got an instance effect
}
```

#### After (2.2.0)

```ts
let count: number = $persist(0, 'count');            // ok
let m: Map<string, number> = $persist(new Map(), 'm'); // ok
let cb = $persist<() => void>(() => {}, 'cb');       // ok

class Store<T> extends Base<T> implements Persisted {
  #secret: string = $persist('', 'secret');          // ok, keeps the private name
  static shared = $persist(0, 'shared');
  // build error: src/store.svelte.ts:7:19 $persist cannot be used on static class fields
}
```

Annotated declarations, nested and function-type generics, class fields with modifiers, `#private` names, generic classes, `extends`/`implements`/mixin heritage clauses, anonymous and default-exported classes, class expressions, and constructor-lowered fields are all handled. The key and options arguments are evaluated exactly once.

### Typed custom serializers

`PersistentRunesSerializerOf<T>` and `PersistentRunesOptionsOf<T>` describe a serializer for a concrete value type, and `$persist<T>(...)` checks its options against `T`.

#### Before (2.1.0)

```ts
const dateSerializer: PersistentRunesSerializer = {
  serialize: (input) => (input as Date).toISOString(),   // input is a naked generic, casts everywhere
  deserialize: (input) => new Date(input) as any,
};
```

#### After (2.2.0)

```ts
import type { PersistentRunesSerializerOf } from 'svelte-persistent-runes/options';

const dateSerializer: PersistentRunesSerializerOf<Date> = {
  serialize: (input) => input.toISOString(),  // input: Date
  deserialize: (input) => new Date(input),    // must return Date
};

let lastSeen = $persist(new Date(), 'last-seen', buildOptions(dateSerializer));
// $persist<Date>: a serializer that returns string here is a type error
```

Other additions: `$persist<T>(undefined, key)` returns `T | undefined`; `buildOptions()` takes no required arguments; the optional `storageRemove` and `onError` options; the `createPersistence` and `track` runtime exports that the transform now emits.

### AES-GCM: a fresh random IV on every write

`addEncryptionStorage` used the fixed IV `"spr"` for every write under a given key. AES-GCM must never reuse an IV under the same key: doing so leaks the XOR of plaintexts and weakens the authentication tag. 2.2.0 generates a random 12-byte IV from `crypto.getRandomValues` per write.

#### Before (2.1.0)

```ts
addEncryptionStorage(BrowserLocalStorage, key)          // every write: IV "spr"
addEncryptionStorage(BrowserLocalStorage, key, 'my-iv') // every write: IV "my-iv"
```

#### After (2.2.0)

```ts
addEncryptionStorage(BrowserLocalStorage, key)          // every write: new random IV
addEncryptionStorage(BrowserLocalStorage, key, 'my-iv') // third argument deprecated and ignored
```

The stored record format (`<ciphertext-hex>:<iv-hex>`) is unchanged. Data written by 2.1.0 is still readable by 2.2.0, and the test suite confirms that records written by 2.2.0 decrypt with the published 2.1.0 package. If secure random bytes are unavailable, encryption fails instead of falling back to a predictable IV.

## Why this is a minor bump

- The type surface is purely additive. New members (`storageRemove`, `onError`) are optional. `$persist` and `buildOptions` gain typed overloads, and the last overload of each is byte-for-byte the 2.1.0 signature, so `Parameters<typeof $persist>` and `ReturnType<typeof buildOptions>` resolve to exactly what they did before. Type tests pin this from TypeScript 5.0 upward.
- Every runtime behavior change is a bug fix: the transform now produces correct output where 2.1.0 produced broken output, and the storage layer stops losing or clobbering data.
- The only removal, Vite 5, is an explicit maintainer decision and is called out at the top of these notes.

## Behavior changes

- Unsupported `$persist` placements fail at build time with `file:line:column`. Previously they produced code that failed at runtime or silently persisted the wrong thing.
- `$persist`'s key and options are evaluated once at declaration time, not on every write.
- `svelte-persistent-runes` (the runtime entry) no longer imports every serializer library. Consumer bundles only include the serializers and storages they import from `svelte-persistent-runes/options`. `"sideEffects": false` is set to let bundlers tree-shake.
- `dist/` is no longer minified.
- A `null` value read from storage is now restored as `null` instead of being treated as missing.
- Assigning `undefined` calls `storageRemove` when the storage provides it, so the key is actually cleared.
- If the stored value can't be read or deserialized, the first automatic write after load is skipped instead of overwriting the data. Later writes proceed normally. Failures are routed to `onError` or a `console.warn`.
- Cookie and web storages are inert during server-side rendering; no per-request throw or warning.
- The `iv` argument of `addEncryptionStorage` is deprecated and ignored.
- The unused `cookie` dependency is removed. `devalue` stays on 5.x on purpose (upstream disclaims cross-major serialization stability).
- Repository tooling uses bun; CI runs on Node 24; npm publishing uses provenance. None of this affects consumers.

Full details, including the itemized list of 2.1.0 transform bugs that are fixed, are in [CHANGELOG.md](../CHANGELOG.md#220---2026-09-23).

## Verification

The same gate chain that CI runs. Clone the tag, then:

```sh
bun install --frozen-lockfile \
  && bun run lint \
  && bun run typecheck \
  && bun run build \
  && bun run check:dist \
  && bun run test \
  && bun run test:types \
  && bun run lint:package
```

What each step proves:

- `lint`: Biome check, zero errors.
- `typecheck`: `tsc --noEmit` on the sources.
- `build`: `pkgroll` emits `dist/` with types.
- `check:dist`: the built `dist/index.mjs` graph has no bare serializer imports and every published entry keeps its 2.1.0 export set.
- `test`: the AVA suite, including golden fixtures captured from the published 2.1.0 package, differential tests against that package, the AST transform snapshots and error locations, real Svelte 5 client effects and SSR renders, and in-memory Vite 6/7/8 consumer builds.
- `test:types`: the `test-d/` overload and shape checks plus `svelte-check` on a Svelte fixture.
- `lint:package`: `publint` and `@arethetypeswrong/cli` on the packed tarball.
