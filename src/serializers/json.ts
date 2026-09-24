import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer that persists values as plain JSON text using the standard
 * `JSON.stringify` / `JSON.parse` pair.
 *
 * @param options - Optional JSON options forwarded verbatim to the standard
 * library: `replacer` and `space` are passed to `JSON.stringify`, and `reviver`
 * is passed to `JSON.parse`.
 * @returns A `PersistentRunesSerializer` backed by JSON.
 */
export function JsonSerializerFactory(options?: {
	replacer?: Parameters<typeof JSON.stringify>[1];
	reviver?: Parameters<typeof JSON.parse>[1];
	space?: Parameters<typeof JSON.stringify>[2];
}): PersistentRunesSerializer {
	return {
		serialize<T>(input: T): string {
			return JSON.stringify(input, options?.replacer, options?.space);
		},
		deserialize<T>(input: string): T {
			return JSON.parse(input, options?.reviver) as T;
		},
	};
}

/**
 * Default JSON serializer: {@link JsonSerializerFactory} with no replacer,
 * reviver or indentation. Its output is byte-identical to `JSON.stringify(value)`.
 * JSON cannot represent `Date`, `Map`, `Set`, `BigInt` or `undefined` values.
 */
export const JsonSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ JsonSerializerFactory();
