import ESSerializer from "esserializer";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by
 * [ESSerializer](https://www.npmjs.com/package/esserializer), which serializes
 * class instances together with their class name.
 *
 * @param options - Optional ESSerializer customization. `serializeOption` is
 * passed as the second argument of `ESSerializer.serialize` (ESSerializer's own
 * `SerializeOptions`), and `classes` as the second argument of
 * `ESSerializer.deserialize` (the list of class constructors used to rebuild
 * instances). A deserialized class must be supplied here or registered globally
 * with ESSerializer, otherwise deserialization throws `Class <name> not found`.
 * @returns A `PersistentRunesSerializer` backed by ESSerializer.
 */
export function ESSerializerSerializerFactory(options?: {
	serializeOption?: Parameters<typeof ESSerializer.serialize>[1];
	classes?: Parameters<typeof ESSerializer.deserialize>[1];
}): PersistentRunesSerializer {
	return {
		serialize<T>(data: T): string {
			return ESSerializer.serialize(data, options?.serializeOption);
		},
		deserialize<T>(input: string): T {
			return ESSerializer.deserialize(input, options?.classes);
		},
	};
}

/**
 * Default ESSerializer serializer: {@link ESSerializerSerializerFactory} with no
 * serialize options and no class list, so only globally registered classes can be
 * rebuilt.
 */
export const ESSerializerSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ ESSerializerSerializerFactory();
