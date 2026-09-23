import SerAny from "serialize-anything";
import type { PersistentRunesSerializer } from "../types";

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

export const SerializeAnythingSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ SerializeAnythingSerializerFactory();
