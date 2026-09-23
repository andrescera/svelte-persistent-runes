import { NJSON } from "next-json";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by
 * [next-json](https://www.npmjs.com/package/next-json), a superset of JSON that
 * keeps `Date`, `Map`, `Set`, `BigInt`, `undefined`, `RegExp`, errors and shared
 * references.
 *
 * @param options - Optional next-json customization. `stringifyOptionsOrReplacer`
 * and `space` are passed as the second and third arguments of `NJSON.stringify`
 * (the library accepts either a replacer function/array or a
 * `NjsonStringifyOptions` object there, followed by the indentation), and
 * `parseOptionsOrReviver` is passed as the second argument of `NJSON.parse`.
 * @returns A `PersistentRunesSerializer` backed by next-json.
 */
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

/**
 * Default next-json serializer: {@link NextJsonSerializerFactory} with no
 * replacer, reviver or indentation, and `undefined` values preserved.
 */
export const NextJsonSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ NextJsonSerializerFactory();
