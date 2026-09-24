import { buildOptions } from "./build-options";
import type { PersistentRunesOptions } from "./types";

/**
 * Read a persisted value from storage outside of a `$persist` rune.
 * This is the imperative counterpart of the rune, kept compatible with 2.1.0:
 * no reactive state is created and nothing is written back.
 * @param key The storage key to read
 * @param options Optional storage and serializer overrides (defaults to JSON in `localStorage`)
 * @returns The deserialized value, or `undefined` if nothing is stored under `key`
 */
export function load<T>(
	key: string,
	options?: Partial<PersistentRunesOptions>,
): T | undefined {
	const config = { ...buildOptions(undefined, undefined), ...options };
	const raw = config.storageRead(key);
	if (typeof raw !== "string") {
		return undefined;
	}
	return config.deserialize(raw);
}

/**
 * Write a value to storage outside of a `$persist` rune.
 * This is the imperative counterpart of the rune, kept compatible with 2.1.0:
 * the value is serialized and written once, with no reactive tracking.
 * An `undefined` value is skipped and leaves the storage untouched.
 * @param key The storage key to write
 * @param value The value to serialize and store
 * @param options Optional storage and serializer overrides (defaults to JSON in `localStorage`)
 */
export function save<T>(
	key: string,
	value: T,
	options?: Partial<PersistentRunesOptions>,
): void {
	if (value === undefined) {
		return;
	}
	const config = { ...buildOptions(undefined, undefined), ...options };

	const serialized = config.serialize(value);
	config.storageWrite(key, serialized);
}
