import type { PersistentRunesSerializer } from "../types";

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

export const JsonSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ JsonSerializerFactory();
