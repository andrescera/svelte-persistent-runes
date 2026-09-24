import type {
	NoInferCompat,
	PersistentRunesOptions,
	PersistentRunesOptionsOf,
} from "./types";

export type {
	PersistentRunesErrorContext,
	PersistentRunesOptions,
	PersistentRunesOptionsOf,
	PersistentRunesSerializerOf,
} from "./types";

declare global {
	/**
	 * A reactive state, that can restore its state upon page reload.
	 *
	 * The options are typed for the given value: a custom `serialize`/`deserialize`
	 * pair must produce and consume the same type as `initial`.
	 * @param initial The initial value of the state
	 * @param key The storage key of the state. Must be unique in your application
	 * @param options The persistence options (how and where), typed for `T`
	 * @returns The persisted, reactive value
	 * @example
	 * ```ts
	 * let count = $persist(0, "counter");
	 * let user = $persist(new Date(), "since", {
	 *   serialize: (d) => d.toISOString(),
	 *   deserialize: (s) => new Date(s),
	 * });
	 * ```
	 */
	export function $persist<T>(
		initial: T,
		key: string,
		options?: Partial<PersistentRunesOptionsOf<NoInferCompat<T>>>,
	): T;
	/**
	 * A reactive state, initialized to `undefined`, that can restore its state
	 * upon page reload.
	 *
	 * Use an explicit type parameter (`$persist<User>(undefined, "key")`) to
	 * tell the compiler what the restored value's type will be.
	 * @param initial Always `undefined`; the state starts empty until restored
	 * @param key The storage key of the state. Must be unique in your application
	 * @param options The persistence options (how and where), typed for `T`
	 * @returns The persisted, reactive value, or `undefined` while unset
	 * @example
	 * ```ts
	 * let user = $persist<User>(undefined, "current-user");
	 * ```
	 */
	export function $persist<T>(
		initial: undefined,
		key: string,
		options?: Partial<PersistentRunesOptionsOf<NoInferCompat<T | undefined>>>,
	): T | undefined;
	/**
	 * A reactive state, that can restore its state upon page reload.
	 *
	 * This is the untyped-options overload kept for compatibility with 2.1.0:
	 * `options` accepts the generic `PersistentRunesOptions` shape (its
	 * `serialize`/`deserialize` methods are generic over every type), so it is
	 * not checked against `T`. Prefer the typed overload above when passing a
	 * custom serializer.
	 * @param initial The initial value of the state
	 * @param key The storage key of the state. Must be unique in your application
	 * @param options The persistence options (how and where)
	 * @returns The persisted, reactive value
	 * @example
	 * ```ts
	 * let count = $persist(0, "counter", { onError: (e, ctx) => console.warn(ctx.operation, e) });
	 * ```
	 */
	export function $persist<T>(
		initial: T,
		key: string,
		options?: Partial<PersistentRunesOptions>,
	): T;
}

export { load, save } from "./load-save";
export * from "./runtime";
