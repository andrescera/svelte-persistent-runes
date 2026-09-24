import * as PhpSerialize from "php-serialize";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by
 * [php-serialize](https://www.npmjs.com/package/php-serialize), producing the
 * same `PHP serialize()` string format.
 *
 * @param options - Optional php-serialize customization. Both `scope` and
 * `givenOptions` are passed in that order as the second and third arguments of
 * `PhpSerialize.serialize` / `PhpSerialize.unserialize` (their signatures are
 * `(item, scope?, givenOptions?)`). `scope` is the map used to resolve class
 * names when building or rebuilding objects; `givenOptions` carries the
 * `encoding` used by the string conversions.
 * @returns A `PersistentRunesSerializer` backed by php-serialize.
 */
export function PhpSerializeSerializerFactory(options?: {
	givenOptions?: Parameters<typeof PhpSerialize.serialize>[2];
	scope?: Parameters<typeof PhpSerialize.serialize>[1];
}): PersistentRunesSerializer {
	return {
		deserialize<T>(input: string): T {
			return PhpSerialize.unserialize(
				input,
				options?.scope,
				options?.givenOptions,
			);
		},
		serialize<T>(input: T): string {
			return PhpSerialize.serialize(
				input,
				options?.scope,
				options?.givenOptions,
			);
		},
	};
}

/**
 * Default php-serialize serializer: {@link PhpSerializeSerializerFactory} with no
 * scope and no options, so class instances outside the built-ins cannot be
 * rebuilt.
 */
export const PhpSerializeSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ PhpSerializeSerializerFactory();
