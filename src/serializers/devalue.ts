import * as dv from "devalue";
import type { PersistentRunesSerializer } from "../types";

export function DevalueSerializerFactory(options?: {
	reducers?: Parameters<typeof dv.stringify>[1];
	revivers?: Parameters<typeof dv.parse>[1];
}): PersistentRunesSerializer {
	return {
		serialize<T>(data: T): string {
			return dv.stringify(data, options?.reducers);
		},
		deserialize<T>(input: string): T {
			return dv.parse(input, options?.revivers);
		},
	};
}

export const DevalueSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ DevalueSerializerFactory();
