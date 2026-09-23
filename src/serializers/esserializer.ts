import ESSerializer from "esserializer";
import type { PersistentRunesSerializer } from "../types";

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

export const ESSerializerSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ ESSerializerSerializerFactory();
