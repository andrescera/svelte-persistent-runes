/**
 * Compile-time type-equality check.
 *
 * This is the same shape used in `test-d/legacy-usage.ts`: a distributive
 * conditional wrapped in a 0-argument generic-function comparison, which
 * (unlike a plain `A extends B ? B extends A : never`) treats `any` and
 * unions correctly and is `false` for merely-assignable-but-not-identical
 * types.
 */
export type Equal<A, B> =
	(<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
		? true
		: false;

/** Fails to compile unless `T` is exactly the literal type `true`. */
export type Expect<T extends true> = T;

/**
 * Runtime no-op that pins the compile-time type of `value` to `T`.
 *
 * Useful where a bare `Expect<Equal<...>>` type is inconvenient (e.g. to
 * assert the type of a value produced by a statement that must also run),
 * without needing `Equal`/`Expect` at every call site.
 */
export function expectType<T>(value: T): void {
	void value;
}
