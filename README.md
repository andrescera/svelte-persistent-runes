# Svelte persistent runes

A Svelte reactive rune that keep its value through pages and reloads

![GitHub Repo stars](https://img.shields.io/github/stars/andrescera/svelte-persistent-runes?style=social)
![NPM bundle size](https://img.shields.io/bundlephobia/minzip/svelte-persistent-runes)
![Download per week](https://img.shields.io/npm/dw/svelte-persistent-runes)
![License](https://img.shields.io/npm/l/svelte-persistent-runes)
![NPM version](https://img.shields.io/npm/v/svelte-persistent-runes)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

`$persist` is a `$state` that survives a page reload. You give it an initial value and a storage key; the preprocessor rewrites the call into a regular `$state` plus an effect that writes every change to `localStorage` (or wherever you point it). On the next visit the stored value is read back before the component renders.

```svelte
<script>
import "svelte-persistent-runes";
let count = $persist(0, "counter");
</script>

<button onclick={() => count += 1}>Clicked {count} times</button>
```

## Features

- A single rune, `$persist(initial, key, options?)`, that behaves like `$state` and remembers its value.
- Works in component scripts, `<script module>`, `.svelte.ts` / `.svelte.js` modules, factory functions, class fields (public and `#private`) and constructor assignments.
- Full TypeScript support: annotations, generics, `as`, `satisfies`, non-null assertions and typed serializers are all handled by an AST-based transform.
- Eight built-in serializers (JSON, devalue, superjson, next-json, ESSerializer, @macfja/serializer, php-serialize, serialize-anything) and three built-in storages (localStorage, sessionStorage, cookies), plus an AES-GCM encryption wrapper.
- Bring your own serializer or storage with a small typed interface.
- Errors from storage or serialization never crash your component: they go to an `onError` handler (default: `console.warn`).
- Server-side rendering safe: the built-in storages do nothing on the server.
- Unsupported `$persist` placements fail at build time with a `file:line:column` message instead of breaking at runtime.
- The runtime entry is tiny; serializer libraries are only bundled when you import them.

## Compatibility

| Dependency | Supported | Notes |
| --- | --- | --- |
| Svelte | `^5.0.0` | Constructor-field assignment (`this.x = $persist(...)`) is verified on Svelte 5.57.1; general reactivity, restore and effect cleanup are verified on Svelte 5.0.0. |
| Vite | 6, 7, 8 | Vite 5 is no longer supported. Projects on Vite 5 should stay on `svelte-persistent-runes@2.1.x`. |
| TypeScript | `>=5.0` | The published types are checked against TypeScript 5.0 and the current 5.x release. |

## Installation

```sh
npm install --save-dev svelte-persistent-runes
```

```sh
pnpm add -D svelte-persistent-runes
```

```sh
yarn add --dev svelte-persistent-runes
```

```sh
bun add -d svelte-persistent-runes
```

```sh
deno add --dev npm:svelte-persistent-runes
```

## Setup

The library has two parts: a preprocessor that turns `$persist(...)` into real Svelte code, and a set of options that decide how and where the value is stored. The preprocessor is required; without it `$persist` doesn't exist.

### 1. Register the preprocessor

Add `persistPreprocessor` (a named export of `svelte-persistent-runes/plugins`) to the `preprocess` array of your `svelte.config.js`. It can go before or after `vitePreprocess()`: `vitePreprocess` leaves `<script>` blocks alone by default (Svelte 5 understands TypeScript on its own), so the order between the two doesn't matter.

```js
// svelte.config.js
import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { persistPreprocessor } from "svelte-persistent-runes/plugins";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), persistPreprocessor()],
	kit: {
		adapter: adapter(),
	},
};

export default config;
```

> [!NOTE]
> Older versions documented `import persist from "svelte-persistent-runes/preprocessor"` (a default import). That entry point is **deprecated**. It still works and points at the same code, but new projects should use the named `persistPreprocessor` export from `svelte-persistent-runes/plugins` shown above.

### 2. Register the Vite plugin (for `.svelte.ts` / `.svelte.js` files)

Svelte preprocessors only see `.svelte` files. If you want `$persist` inside `.svelte.ts` or `.svelte.js` modules, also add `persistPlugin` to your Vite config:

```ts
// vite.config.ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { persistPlugin } from "svelte-persistent-runes/plugins";

export default defineConfig({
	plugins: [persistPlugin(), sveltekit()],
});
```

### 3. Tell TypeScript about `$persist`

`$persist` is declared as a global in the package's types. Import the package once in an ambient declaration file and every file in your project will know about it:

```ts
// src/app.d.ts
import "svelte-persistent-runes";
```

You can also write `import "svelte-persistent-runes";` at the top of each file that uses the rune, which is what the examples below do so that they work standalone.

## Usage

`$persist(initial, key, options?)` can appear anywhere `$state` can, as long as it directly initializes a variable, a class field or a `this.<field>` assignment in a constructor. The examples in this section cover every supported shape.

### In a component

```svelte
<script>
import "svelte-persistent-runes";
let count = $persist(0, "counter");
</script>

<div class="counter">
	<button onclick={() => (count -= 1)} aria-label="Decrease the counter by one">-</button>
	<strong>{count}</strong>
	<button onclick={() => (count += 1)} aria-label="Increase the counter by one">+</button>
</div>
```

### In `<script module>`

A value declared in a module script is shared by every instance of the component and lives for the whole page.

```svelte
<script module>
import "svelte-persistent-runes";
let visits = $persist(0, "visits");
visits += 1;
</script>

<script>
let name = $persist("anonymous", "display-name");
</script>

<p>{name}, this component was mounted {visits} times.</p>
<input bind:value={name} />
```

### In a `.svelte.ts` module

Needs the Vite plugin from the Setup section.

`src/lib/settings.svelte.ts`:

```ts
import "svelte-persistent-runes";

export const settings = $persist({ theme: "light", fontSize: 16 }, "settings");
```

### In a factory function

```svelte
<script>
import "svelte-persistent-runes";

function persistedToggle(key) {
	let on = $persist(false, key);
	return {
		get on() {
			return on;
		},
		toggle() {
			on = !on;
		},
	};
}

const sidebar = persistedToggle("sidebar-open");
</script>

<button onclick={sidebar.toggle}>Sidebar is {sidebar.on ? "open" : "closed"}</button>
```

### As class fields

Public fields, TypeScript-annotated fields and `#private` fields all work.

`src/lib/person.svelte.ts`:

```ts
import "svelte-persistent-runes";

export class Person {
	name = $persist("John", "user-name");
	age: number = $persist(33, "user-age");
	#nickname = $persist("", "user-nickname");

	get nickname(): string {
		return this.#nickname || this.name;
	}

	set nickname(value: string) {
		this.#nickname = value;
	}

	birthday(): string {
		this.age += 1;
		return `Happy birthday ${this.name}!`;
	}
}

export const currentUser = new Person();
```

### Assigned in a constructor

`this.<field> = $persist(...)` is supported when it is a top-level statement of the constructor body. This lets the storage key depend on constructor arguments.

`src/lib/draft.svelte.ts`:

```ts
import "svelte-persistent-runes";

export class Draft {
	text: string;

	constructor(documentId: string) {
		this.text = $persist("", `draft:${documentId}`);
	}
}
```

## TypeScript

The rune is generic: `$persist<T>(initial: T, key, options?): T`. The type parameter is inferred from `initial`, and can be given explicitly when `initial` doesn't say enough.

```svelte
<script lang="ts">
import "svelte-persistent-runes";

type User = { id: number; name: string };

// Annotations and generics are preserved.
let count: number = $persist(0, "count");
let scores: Map<string, number> = $persist(new Map<string, number>(), "scores");
let tags = $persist<string[]>([], "tags");

// Function types work too.
let formatter = $persist<(value: number) => string>((value) => value.toFixed(2), "formatter");

// `null` as the initial value with a wider type.
let user = $persist<User | null>(null, "current-user");

// `undefined` as the initial value: the result is `User | undefined`.
let lastSeen = $persist<User>(undefined, "last-seen");
</script>

<p>{count} {scores.size} {tags.length} {formatter(1)} {user?.name ?? "nobody"} {lastSeen?.name ?? "nobody"}</p>
```

### Typed custom serializers

A serializer passed in `options` is checked against the value's type. `PersistentRunesSerializerOf<T>` describes a serializer for exactly one type; `buildOptions` keeps that type when you combine it with a storage.

```svelte
<script lang="ts">
import "svelte-persistent-runes";
import { BrowserSessionStorage, buildOptions } from "svelte-persistent-runes/options";
import type { PersistentRunesSerializerOf } from "svelte-persistent-runes";

const DateSerializer: PersistentRunesSerializerOf<Date> = {
	serialize: (date) => date.toISOString(),
	deserialize: (text) => new Date(text),
};

// Inline: the options are typed for `Date`.
let since = $persist(new Date(), "since", DateSerializer);

// Combined with a storage: `buildOptions` returns `PersistentRunesOptionsOf<Date>`.
let lastVisit = $persist(new Date(), "last-visit", buildOptions(DateSerializer, BrowserSessionStorage));
</script>

<p>Since {since.toLocaleDateString()}, last visit {lastVisit.toLocaleDateString()}</p>
```

Passing a serializer for the wrong type (say a `Date` serializer on a `number` value) is a compile-time error.

## Behavior

Things worth knowing before you rely on the rune.

**Initial write.** When a value is created and nothing is stored under its key yet, the initial value is written to storage on the first run of the effect (in a component, that is the first mount). From then on every change is written.

**`null` is a value.** A stored `null` is restored as `null`. Only a missing key (or a storage that returns `undefined`) falls back to `initial`.

**`undefined` clears the key.** Assigning `undefined` to a persisted value removes the stored entry, provided the storage implements `storageRemove`. All built-in storages do. A custom storage without `storageRemove` simply skips the write.

**Key and options are read once.** The `key` and `options` expressions are evaluated exactly once, when the value is created. Changing a variable used in the key afterwards has no effect.

**Errors are reported, not thrown.** Any error thrown by `storageRead`, `storageWrite`, `storageRemove`, `serialize` or `deserialize` is caught and passed to `options.onError(error, { key, operation })`. Without a handler the library calls `console.warn` with the key and the failed operation. A throwing `onError` is itself caught and warned about.

**Unreadable data is not overwritten.** If the stored value can't be read or deserialized (corrupted data, wrong encryption key, changed serializer), the value starts from `initial` and the very first automatic write is skipped. The stored data stays as it was until you actually change the value, so a bad deploy doesn't silently wipe what users had.

**Lifetime.** The effect that writes changes is owned by the component or effect root that created the value and is cleaned up with it. Values declared in `<script module>` or at the top level of a `.svelte.ts` module have no owner; they get their own effect root and live for the whole page.

**Server-side rendering and hydration.** Storage isn't available on the server, so the server always renders `initial`. On the client the stored value is read synchronously while the component initializes, before the first render. If your markup shows the persisted value, the server HTML and the client's first render can differ, and Svelte will report a hydration mismatch. This is a deliberate tradeoff: reading synchronously means the correct value is shown from the very first client render, with no intermediate state. If the mismatch matters for a piece of UI, either design it so a brief flash of `initial` is acceptable, or render that part only after mount (for example behind a `$state` flag set in `onMount` or `$effect`).

**Serializers must not return an empty string.** The built-in storages treat an empty string the same as a missing key (it has been that way since 2.1.0), so a serializer whose output is `""` would look absent on the next load. Serialize to something non-empty, even for "nothing".

**Supported placements.** `$persist` must directly initialize one of:

- a `let`, `const` or `var` declaration (`let x = $persist(...)`, including `export const` in a module and inside functions and blocks);
- a non-static, non-computed class field, public or `#private`;
- a `this.<field> = $persist(...)` assignment written as a top-level statement of a constructor.

Wrapping the call in `as`, `satisfies`, `!` or an angle-bracket assertion is fine. Anything else (destructuring, spreading, `static` fields, computed keys, calling `$persist` from a nested expression, passing it around as a value) is rejected at build time with a message like `[svelte-persistent-runes] src/App.svelte:12:9 $persist cannot initialize a destructuring pattern`. The Usage section shows the supported shapes.

**svelte-check without the preprocessor.** Svelte's compiler rejects any bare `$`-prefixed identifier it doesn't recognize. If `svelte-check` (or the compiler) ever analyzes a file that calls `$persist(...)` **without** the preprocessor registered, it reports:

```
Error: `$persist` is an illegal variable name. To reference a global variable called `$persist`, use `globalThis.$persist`
https://svelte.dev/e/global_reference_invalid (svelte)
```

This doesn't happen in a normal project, where `svelte.config.js` registers the preprocessor and `svelte-check` picks it up from there. It only shows up when a file is checked in isolation, with no `svelte.config.js` in reach. Don't work around it with `globalThis.$persist`: the transform only recognizes the bare identifier, and `$persist` has no runtime implementation of its own.

## Options

The third argument of `$persist` customizes how the value is serialized and where it is stored. It's a `Partial<PersistentRunesOptions>` (or `Partial<PersistentRunesOptionsOf<T>>` for a typed serializer), so you can pass only the parts you want to change; the rest falls back to JSON in `localStorage`.

```ts
type PersistentRunesOptions = {
	serialize<T>(input: T): string;
	deserialize<T>(input: string): T;
	storageWrite(key: string, value: string): void;
	storageRead(key: string): string | undefined;
	/** Optional since 2.2.0: remove a stored value by key. */
	storageRemove?(key: string): void;
	/** Optional since 2.2.0: called instead of `console.warn` when an operation fails. */
	onError?(error: unknown, context: { key: string; operation: "read" | "write" | "remove" }): void;
};
```

Related types exported from `svelte-persistent-runes` and `svelte-persistent-runes/options`:

- `PersistentRunesSerializer`: the `serialize` / `deserialize` pair (generic over every type).
- `PersistentRunesStorage`: `storageWrite`, `storageRead` and the optional `storageRemove`.
- `PersistentRunesSerializerOf<T>`: a serializer for exactly one type `T`.
- `PersistentRunesOptionsOf<T>`: `PersistentRunesSerializerOf<T>` plus a storage and `onError`.
- `PersistentRunesErrorContext`: the `{ key, operation }` object given to `onError`.

### `buildOptions`

`buildOptions(serializer?, storage?)`, from `svelte-persistent-runes/options`, merges a serializer and a storage into one options object. Both arguments are optional: a missing serializer means `JsonSerializer`, a missing storage means `BrowserLocalStorage`.

```ts
function buildOptions(serializer?: PersistentRunesSerializer, storage?: PersistentRunesStorage): PersistentRunesOptions;
function buildOptions<T>(serializer: PersistentRunesSerializerOf<T>, storage?: PersistentRunesStorage): PersistentRunesOptionsOf<T>;
```

The 2.1.0 signature (`buildOptions(serializer | undefined, storage | undefined)`) is still accepted.

```svelte
<script>
import "svelte-persistent-runes";
import { buildOptions, MacfjaSerializer, BrowserSessionStorage } from "svelte-persistent-runes/options";

let count = $persist(0, "counter", buildOptions(MacfjaSerializer, BrowserSessionStorage));
let notes = $persist([], "notes", buildOptions(undefined, BrowserSessionStorage));
let draft = $persist("", "draft", {
	onError(error, { key, operation }) {
		console.error(`could not ${operation} ${key}`, error);
	},
});
</script>

<p>{count} {notes.length} {draft}</p>
```

### Serializers

A serializer converts the value to a string (`serialize`) and back (`deserialize`). Every entry below is exported from `svelte-persistent-runes/options`. Factories take the underlying library's own options; the plain constant next to each factory is the same serializer with no options.

| Factory | Ready-made constant | Backed by | Notes |
| --- | --- | --- | --- |
| `JsonSerializerFactory({ replacer?, reviver?, space? })` | `JsonSerializer` (default) | `JSON` | Plain JSON. `Date`, `Map`, `Set` and `undefined` properties don't round-trip; `BigInt` throws. |
| `DevalueSerializerFactory({ reducers?, revivers? })` | `DevalueSerializer` | [devalue] | Handles `Date`, `Map`, `Set`, `BigInt`, `undefined` and cycles. |
| none | `SuperJsonSerializer` | [superjson] | Handles `Date`, `Map`, `Set`, `BigInt`, `undefined` and `RegExp`. |
| `NextJsonSerializerFactory({ stringifyOptionsOrReplacer?, space?, parseOptionsOrReviver? })` | `NextJsonSerializer` | [next-json] | JSON superset that keeps `Date`, `Map`, `Set`, `BigInt`, `undefined`, `RegExp`, errors and shared references. |
| `ESSerializerSerializerFactory({ serializeOption?, classes? })` | `ESSerializerSerializer` | [ESSerializer] | Restores class instances when the classes are listed. `Map` isn't supported by the library. |
| `MacfjaSerializerFactory({ allowedClasses? })` | `MacfjaSerializer` | [@macfja/serializer] | Restores class instances. `undefined` properties are dropped. |
| `PhpSerializeSerializerFactory({ scope?, givenOptions? })` | `PhpSerializeSerializer` | [php-serialize] | PHP `serialize()` format. `Date`, `Map`, `Set`, `BigInt` and `undefined` properties don't round-trip. |
| `SerializeAnythingSerializerFactory({ maxDepth?, pretty? })` | `SerializeAnythingSerializer` | [serialize-anything] | Handles most built-in types. |

`devalue` is intentionally kept on its 5.x line. devalue 6 doesn't promise to read strings written by earlier versions, and data that users already have in `localStorage` has to stay readable across upgrades of this library.

[ESSerializer]: https://www.npmjs.com/package/esserializer
[devalue]: https://www.npmjs.com/package/devalue
[@macfja/serializer]: https://www.npmjs.com/package/@macfja/serializer
[superjson]: https://www.npmjs.com/package/superjson
[next-json]: https://www.npmjs.com/package/next-json
[php-serialize]: https://www.npmjs.com/package/php-serialize
[serialize-anything]: https://www.npmjs.com/package/serialize-anything

### Storages

A storage reads, writes and (optionally) removes strings by key. Every built-in storage implements `storageRemove` and is safe to import and call on the server, where it does nothing.

| Export | Backed by | Notes |
| --- | --- | --- |
| `BrowserLocalStorage` (default) | `window.localStorage` | Persists until cleared. |
| `BrowserSessionStorage` | `window.sessionStorage` | Persists for the tab's lifetime. |
| `BrowserCookieStorageFactory(cookieOptions?)` / `BrowserCookieStorage` | `document.cookie` via [browser-cookies] | `samesite: "Strict"` by default; pass `{ expires, path, domain, secure, ... }` to the factory to override. `storageRemove` expires the cookie. |
| `addEncryptionStorage(storage, hexKey)` | Wraps another storage | AES-GCM encryption of the stored string, see below. |

[browser-cookies]: https://www.npmjs.com/package/browser-cookies

To write your own, implement `storageRead` and `storageWrite` (and ideally `storageRemove`) and pass it to `buildOptions` or directly in the options object:

```svelte
<script lang="ts">
import "svelte-persistent-runes";
import type { PersistentRunesStorage } from "svelte-persistent-runes/options";

const memory = new Map<string, string>();
const MemoryStorage: PersistentRunesStorage = {
	storageRead: (key) => memory.get(key),
	storageWrite: (key, value) => void memory.set(key, value),
	storageRemove: (key) => void memory.delete(key),
};

let scratch = $persist("", "scratch", MemoryStorage);
</script>

<input bind:value={scratch} />
```

### Encryption

`addEncryptionStorage(storage, hexKey)` wraps any storage so that the stored string is encrypted with AES-GCM before it is written and decrypted after it is read. The key is a hex string (32 hex characters for AES-128, 64 for AES-256).

```svelte
<script>
import "svelte-persistent-runes";
import {
	buildOptions,
	SuperJsonSerializer,
	BrowserLocalStorage,
	addEncryptionStorage,
} from "svelte-persistent-runes/options";

let count = $persist(
	0,
	"counter",
	buildOptions(SuperJsonSerializer, addEncryptionStorage(BrowserLocalStorage, "12345678901234567890123456879012")),
);
</script>

<button onclick={() => (count += 1)}>{count}</button>
```

Details:

- Since 2.2.0 every write uses a fresh random 96-bit IV from `crypto.getRandomValues`, stored next to the ciphertext. Writing throws (and is reported through `onError`) if `crypto.getRandomValues` isn't available.
- Data written by 2.1.0 (which used a fixed IV) is still readable; only the write side changed.
- The third `iv` argument that 2.1.0 accepted is **deprecated**. It's still accepted so existing calls keep compiling, but it is ignored.
- Rotating the key makes everything previously stored unreadable. Reads then fail with a GCM authentication error, which goes to `onError`, and the value falls back to `initial` (the old data isn't overwritten until you change the value, see Behavior).
- A key that ships in client-side JavaScript is not a secret. Anyone can open the bundle and read it, so this wrapper only obfuscates the stored data against casual inspection of `localStorage` or cookies. Don't rely on it to protect anything sensitive.

## API reference and migration from 2.1.0

Entry points:

| Import from | Exports |
| --- | --- |
| `svelte-persistent-runes` | The global `$persist` declaration; `load(key, options?)` and `save(key, value, options?)` to read or write a persisted value outside a rune; `createPersistence` and `track` (the runtime the generated code calls); the types `PersistentRunesOptions`, `PersistentRunesOptionsOf`, `PersistentRunesSerializerOf`, `PersistentRunesErrorContext`. |
| `svelte-persistent-runes/plugins` | `persistPreprocessor()` and `persistPlugin()`. |
| `svelte-persistent-runes/options` | `buildOptions`, every serializer and storage listed above, `addEncryptionStorage`, and the option types. |
| `svelte-persistent-runes/preprocessor` | Deprecated default export, identical to `persistPreprocessor`. |

**Upgrading from 2.1.0 is a drop-in change.** Every export still exists with the same name, every type keeps its shape (2.2.0 only adds optional members and overloads), and stored data written by 2.1.0 is read back unchanged. The notable differences are that unsupported `$persist` placements now fail at build time instead of producing broken code, the `iv` argument of `addEncryptionStorage` is ignored, and Vite 5 is no longer supported. See the [CHANGELOG](CHANGELOG.md) for the full list.

## Contributing

The repository uses [Bun](https://bun.sh):

```sh
bun install --frozen-lockfile
bun run lint        # Biome
bun run typecheck   # tsc --noEmit
bun run build       # pkgroll
bun run test        # AVA unit and runtime tests
bun run test:types  # type-level tests and svelte-check
```

Bug reports and pull requests are welcome on [GitHub](https://github.com/andrescera/svelte-persistent-runes/issues).

## License

[MIT](LICENSE.md)
