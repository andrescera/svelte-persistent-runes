import { NJSON } from "next-json";
import type { PersistentRunesSerializer } from "../types";

export function NextJsonSerializerFactory(options?: {
	stringifyOptionsOrReplacer?: Parameters<typeof NJSON.stringify>[1];
	space?: Parameters<typeof NJSON.stringify>[2];
	parseOptionsOrReviver?: Parameters<typeof NJSON.parse>[1];
}): PersistentRunesSerializer {
	return {
		serialize<T>(data: T): string {
			return NJSON.stringify(
				data,
				options?.stringifyOptionsOrReplacer,
				options?.space,
			);
		},
		deserialize<T>(input: string): T {
			return NJSON.parse(input, options?.parseOptionsOrReviver);
		},
	};
}

export const NextJsonSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ NextJsonSerializerFactory();
