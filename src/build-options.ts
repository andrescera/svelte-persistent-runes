import { JsonSerializer } from "./serializers/json";
import { BrowserLocalStorage } from "./storages/web-storage";
import type {
	PersistentRunesOptions,
	PersistentRunesSerializer,
	PersistentRunesStorage,
} from "./types";

/**
 * Create a `PersistentRunesOptions` from a serializer and a storage
 * @param serializer The serializer to use (if `undefined` then `JsonSerializer` will be used)
 * @param storage The storage to use (if `undefined` then `BrowserLocalStorage` will be used)
 */
export function buildOptions(
	serializer: PersistentRunesSerializer | undefined,
	storage: PersistentRunesStorage | undefined,
): PersistentRunesOptions {
	return {
		...(serializer ?? JsonSerializer),
		...(storage ?? BrowserLocalStorage),
	};
}
