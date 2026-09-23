import * as superjson from "superjson";
import type { PersistentRunesSerializer } from "../types";

export const SuperJsonSerializer: PersistentRunesSerializer = {
	serialize<T>(input: T): string {
		return superjson.stringify(input);
	},
	deserialize<T>(input: string): T {
		return superjson.parse(input) as T;
	},
};
