# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-09-23

### Added

- Full TypeScript syntax support in the `$persist` transform. The regex-based transform has been replaced with a real AST transform (acorn + `@sveltejs/acorn-typescript`) that handles annotated declarations (`let x: T = $persist(...)`), generic call forms including nested and function-type arguments (`$persist<Map<string, () => void>>(...)`), class fields with modifiers, `#private` names, generic classes, `extends`/`implements`/mixin heritage clauses, anonymous and default-exported classes, and constructor-lowered fields.
- Typed serializers and options. New `PersistentRunesSerializerOf<T>` and `PersistentRunesOptionsOf<T>` types let a serializer be written against a concrete value type, and `$persist<T>(initial, key, options)` now type-checks the options against `T`. The untyped 2.1.0 signatures are kept as the last overload, so existing code compiles unchanged.
- `$persist<T>(undefined, key)` now returns `T | undefined` instead of `T`.
- `buildOptions()` can be called with no arguments; both parameters are optional and default to the JSON serializer and browser `localStorage`.
- New optional `storageRemove(key)` storage member. All built-in storages implement it; `addEncryptionStorage` delegates to the wrapped storage when it is present.
- New optional `onError(error, { key, operation })` option. Read, deserialize, serialize, write and remove failures are contained and reported to this handler instead of crashing the component. Without a handler, a `console.warn` prefixed with `[svelte-persistent-runes]` is emitted.
- New `createPersistence(key, options?)` and `track(handle, read, effect, root)` runtime exports. The transform emits calls to these instead of the previous `load`/`save` pair.
- Vite 8 support. The Vite plugin is verified against Vite 6, 7 and 8 with `@sveltejs/vite-plugin-svelte` 5, 6 and 7.

### Changed

- Unsupported `$persist` placements (a call that is not the direct initializer of a `let`/`const`/`var` declaration, class field, or `this.x = ...` constructor assignment; destructuring targets; static or computed class fields; `export let` in a component instance script; a wrong argument count) now fail at build time with a `file:line:column` location instead of silently producing broken output.
- The key and options arguments of `$persist` are evaluated exactly once, at declaration time. Previously the generated code re-evaluated them on every write.
- The runtime entry point (`svelte-persistent-runes`) no longer statically imports every serializer library. `devalue`, `superjson`, `esserializer`, `@macfja/serializer`, `next-json`, `php-serialize`, `serialize-anything`, `browser-cookies` and `sjcl-es` are only pulled into a consumer bundle when the matching export of `svelte-persistent-runes/options` is actually imported.
- `"sideEffects": false` is declared in `package.json` so bundlers can tree-shake unused serializers and storages.
- The published `dist/` output is no longer minified. Stack traces and breakpoints now point at readable code.
- Dependencies updated to their latest compatible versions. `devalue` stays on 5.x on purpose: upstream disclaims cross-major serialization stability, and moving would risk breaking data already in users' storage.
- Repository tooling moved from pnpm to bun (`bun.lock` replaces `pnpm-lock.yaml`). Consumers are unaffected.
- CI runs on Node 24, and npm publishing uses provenance.

### Deprecated

- The `iv` argument of `addEncryptionStorage(storage, key, iv)`. It is silently ignored since 2.2.0: a random IV is now generated on every write (see Security below).

### Removed

- Vite 5 support. The `vite` peer range is now `^6 || ^7 || ^8`. Projects on Vite 5 should stay on 2.1.x.
- The unused `cookie` npm dependency. Cookie storage has always used `browser-cookies`.

### Fixed

- `let x: T = $persist(...)` saved the state under the type annotation's name instead of the variable's real name.
- Annotated generic declarations such as `let m: Map<K, V> = $persist(...)` were never transformed at all.
- Type arguments containing parentheses, such as `$persist<() => void>(...)`, were skipped by the transform.
- A comma inside angle brackets in any argument position (`new Map<K, V>()`, `x as Record<K, V>`, `satisfies` expressions) split the call's arguments in the wrong place.
- Annotated class fields (`name: string = $persist(...)`) saved the type name instead of the field name.
- `#private` class fields saved the public name instead of the private one.
- `static` fields were given instance-level effects. They are now rejected at build time with a clear message.
- Generic classes (`class A<T>`), `extends Base<T>`, `implements`, and mixin heritage clauses were never handled.
- Anonymous classes, default-exported classes, class expressions, and fields declared after a method or after an object-literal-valued field referenced an undefined variable at runtime.
- Effects could be inserted into the wrong class's constructor, before `super()`, or twice when constructor parameters contained parentheses.
- `$`-prefixed and Unicode identifiers were mishandled by the transform.
- A `$persist` call inside a plain function never had its effect attached in the right scope.
- The AES-GCM encryption helper reused a single fixed initialization vector across every write (see Security below).
- A `null` value read from storage was treated as "not found" and the initial value was used instead.
- Assigning `undefined` never cleared the stored key, even when the storage could remove it. `storageRemove` is now called when it exists.
- A corrupted or unreadable stored value could be silently overwritten by the first automatic write after page load. That first write is now skipped so the data can be inspected or recovered; later writes proceed normally.
- Server-side rendering with cookie storage configured could throw or warn on every request. Cookie and web storages are now inert when `document`/`window` are absent.

### Security

- `addEncryptionStorage` previously used the fixed IV `"spr"` for every write under a given key. Reusing an IV with AES-GCM weakens both the confidentiality and the tamper-detection guarantees of the mode. 2.2.0 generates a fresh random 12-byte IV from `crypto.getRandomValues` for every write. The stored record format is unchanged (`<ciphertext-hex>:<iv-hex>`), so data encrypted by 2.1.0 remains readable, and records written by 2.2.0 can still be decrypted by 2.1.0. If secure random bytes are unavailable, encryption now fails instead of falling back to a predictable IV.

## [2.1.0] - 2026-05-30

### Fixed

- Vite plugin regex now matches `$persist<T>(...)` calls with TypeScript generic type arguments. Previously these calls were silently skipped by the transform, causing runtime breakage. (`src/plugins.ts`)

### Known Limitations

- Nested angle brackets in generic arguments are not yet supported. Example: `$persist<Map<string, number>>('key')` will NOT be matched because the regex's `[^()]*` negation does not handle nested `<>`. Workaround: use a type alias.

## [2.0.0]

### Changed

- **BREAKING**: Package renamed from `@macfja/svelte-persistent-runes` to `svelte-persistent-runes`
- **BREAKING**: Complete rewrite of preprocessor using `magic-string` instead of `ts-morph`
- Modernized tsconfig for ESM (NodeNext, ES2022)
- Internal import alias changed from `dyn___persistent_runes` to `__persist`

### Fixed

- Sourcemap warning: "Sourcemap is likely to be incorrect: a plugin was used to transform files, but didn't generate a sourcemap"
- Proper sourcemap generation with hires column mappings

### Removed

- Removed `ts-morph` dependency (heavy TypeScript compiler)
- Removed `source-map` dependency (manual sourcemap generation)

### Added

- Added `magic-string` for simpler transforms with automatic sourcemap generation

## [1.1.0]

### Fixed

- Class that don't only contains `$persist` are not transformed
- `.svelte.ts`/`.svelte.js` file not transformed ([Issue#2])
- Unit test are not up to date with the code

### Added

- New serializer ([php-serialize](https://www.npmjs.com/package/php-serialize))
- New serializer ([serialize-anything](https://www.npmjs.com/package/serialize-anything))
- Add a new Vite plugin to handle svelte module (`.svelte.ts`/`.svelte.js` file) ([Issue#2])

### Deprecated

- Deprecate the default import of `svelte-persistent-runes/preprocessor`

## [1.0.0]

First version

[unreleased]: https://github.com/andrescera/svelte-persistent-runes/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/andrescera/svelte-persistent-runes/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/andrescera/svelte-persistent-runes/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/andrescera/svelte-persistent-runes/releases/tag/v2.0.0
[1.1.0]: https://github.com/MacFJA/svelte-persistent-runes/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/MacFJA/svelte-persistent-runes/releases/tag/1.0.0

[Issue#2]: https://github.com/MacFJA/svelte-persistent-runes/issues/2
