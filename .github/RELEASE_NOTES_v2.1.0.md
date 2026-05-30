# v2.1.0 — TypeScript generic syntax support for `$persist(...)`

## What's new

The Vite plugin's transform regex now recognizes `$persist(...)` calls with TypeScript generic type arguments. Previously, calls like `$persist<MyType>('default', 'key')` were silently skipped by the transform, leading to runtime breakage in TypeScript projects.

### Before

```ts
let count = $persist<number>(0, 'count'); // ❌ silently NOT transformed; runtime error
```

### After

```ts
let count = $persist<number>(0, 'count'); // ✅ transformed to use load/save
```

## Why this is a minor bump

The change is purely additive — existing `$persist(...)` calls without generics continue to match the same way. No call site needs migration.

## Known limitations

Nested angle brackets in generic arguments are not yet supported. For example:

```ts
let m = $persist<Map<string, number>>('m', 'mkey'); // ❌ NOT matched
```

Workaround: extract a type alias.

```ts
type MyMap = Map<string, number>;
let m = $persist<MyMap>('m', 'mkey'); // ✅ matched
```

Tracking issue: (file one if desired in a follow-up release).

## Diff

Single line change in `src/plugins.ts`:

```diff
-const PERSIST_CALL_REGEX = /\$persist\s*\(/g;
+const PERSIST_CALL_REGEX = /\$persist\s*(?:<[^()]*>)?\s*\(/g;
```

## Verification

- Regression test added: `src/plugin.spec.ts` → "Transform variable with TypeScript generic"
- Lint: ✅
- Build: ✅
- All tests: ✅
