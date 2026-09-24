import * as superjson from "superjson";
import type { PersistentRunesSerializer } from "../types";

/**
 * Serializer backed by [superjson](https://github.com/blitz-js/superjson), which
 * stores values such as `Date`, `Map`, `Set`, `BigInt`, `undefined` and
 * `RegExp` in a `{ json, meta }` envelope.
 *
 * There is no factory for this serializer: superjson is configured through a
 * module-level singleton, so the constant is created directly here.
 */
export const SuperJsonSerializer: PersistentRunesSerializer = {
	serialize<T>(input: T): string {
		return superjson.stringify(input);
	},
	deserialize<T>(input: string): T {
		return superjson.parse(input) as T;
	},
};
