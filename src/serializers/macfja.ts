import * as macfja from "@macfja/serializer";
import type { PersistentRunesSerializer } from "../types";

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

export const MacfjaSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ MacfjaSerializerFactory();
