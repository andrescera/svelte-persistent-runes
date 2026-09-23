import type { PersistentRunesOptions } from "./types";

export type {
	PersistentRunesErrorContext,
	PersistentRunesOptions,
	PersistentRunesOptionsOf,
	PersistentRunesSerializerOf,
} from "./types";

declare global {
	/**
	 * A reactive state, that can restore its state upon page reload
	 * @param initial The initial value of the state
	 * @param key The storage key of the state. Must be unique in your application
	 * @param options The persistence options (how and where)
	 */
	export function $persist<T>(
		initial: T,
		key: string,
		options?: Partial<PersistentRunesOptions>,
	): T;
}

export { load, save } from "./load-save";
export * from "./runtime";
