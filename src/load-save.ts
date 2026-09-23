import { buildOptions } from "./build-options";
import type { PersistentRunesOptions } from "./types";

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
