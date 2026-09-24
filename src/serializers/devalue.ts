import * as dv from "devalue";
import type { PersistentRunesSerializer } from "../types";

/**
 * Create a serializer backed by [devalue](https://github.com/sveltejs/devalue),
 * which preserves `Date`, `Map`, `Set`, `BigInt`, `undefined` and cyclic
 * references.
 *
 * @param options - Optional devalue customization. `reducers` are passed as the
 * second argument of `devalue.stringify` and `revivers` as the second argument of
 * `devalue.parse`. A devalue reducer runs for *every* value it encounters, so it
 * must return a falsy value (e.g. `undefined`) for values it does not handle, or
 * serialization will recurse forever.
 * @returns A `PersistentRunesSerializer` backed by devalue.
 */
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

/**
 * Default devalue serializer: {@link DevalueSerializerFactory} with no reducers
 * or revivers. Format-stable within devalue 5.x, which is why this library holds
 * devalue at that major.
 */
export const DevalueSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ DevalueSerializerFactory();
