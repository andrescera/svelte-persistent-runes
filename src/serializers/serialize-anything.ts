import SerAny from "serialize-anything";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by
 * [serialize-anything](https://www.npmjs.com/package/serialize-anything), which
 * encodes `Date`, `Map`, `Set`, `BigInt`, `undefined`, `RegExp`, `Buffer`,
 * typed arrays and cyclic references into a JSON wrapper.
 *
 * @param options - Optional `{ maxDepth?, pretty? }` passed straight to
 * `serialize-anything`'s `serialize`. `maxDepth` defaults to 20 and throws when
 * exceeded; `pretty` switches the wrapper to two-space-indented JSON.
 * @returns A `PersistentRunesSerializer` backed by serialize-anything.
 */
export function SerializeAnythingSerializerFactory(options?: {
	maxDepth?: number;
	pretty?: boolean;
}): PersistentRunesSerializer {
	return {
		deserialize<T>(input: string): T {
			return SerAny.deserialize(input);
		},
		serialize<T>(input: T): string {
			return SerAny.serialize(input, options);
		},
	};
}

/**
 * Default serialize-anything serializer:
 * {@link SerializeAnythingSerializerFactory} with no options (default
 * `maxDepth` of 20, compact JSON).
 */
export const SerializeAnythingSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ SerializeAnythingSerializerFactory();
