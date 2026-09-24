import * as macfja from "@macfja/serializer";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by
 * [@macfja/serializer](https://www.npmjs.com/package/@macfja/serializer),
 * which records constructor names and object references so class instances,
 * `Map`, `Set`, `Date` and `BigInt` survive a round trip.
 *
 * @param options - Optional `allowedClasses` map, passed as the second argument
 * of `@macfja/serializer`'s `deserialize`. The entries are merged with the
 * library's global allow list; a class that is neither in the global list nor in
 * this map is not rebuilt on deserialization.
 * @returns A `PersistentRunesSerializer` backed by `@macfja/serializer`.
 */
export function MacfjaSerializerFactory(options?: {
	allowedClasses?: Parameters<typeof macfja.deserialize>[1];
}): PersistentRunesSerializer {
	return {
		serialize<T>(data: T): string {
			return macfja.serialize(data);
		},
		deserialize<T>(input: string): T {
			return macfja.deserialize(input, options?.allowedClasses);
		},
	};
}

/**
 * Default `@macfja/serializer` serializer: {@link MacfjaSerializerFactory} with no
 * extra allowed classes beyond the library's built-ins.
 */
export const MacfjaSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ MacfjaSerializerFactory();
