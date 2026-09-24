import { JsonSerializer } from "./serializers/json";
import { BrowserLocalStorage } from "./storages/web-storage";
import type {
	PersistentRunesOptions,
	PersistentRunesOptionsOf,
	PersistentRunesSerializer,
	PersistentRunesSerializerOf,
	PersistentRunesStorage,
} from "./types";

/**
 * Create a `PersistentRunesOptions` from a serializer and a storage
 * @param serializer The serializer to use (if `undefined` then `JsonSerializer` will be used)
 * @param storage The storage to use (if `undefined` then `BrowserLocalStorage` will be used)
 */
export function buildOptions(
	serializer?: PersistentRunesSerializer,
	storage?: PersistentRunesStorage,
): PersistentRunesOptions;
/**
 * Create a `PersistentRunesOptionsOf<T>` from a typed serializer and a storage
 * @param serializer The typed serializer to use, fixing the resulting options to `T`
 * @param storage The storage to use (if `undefined` then `BrowserLocalStorage` will be used)
 */
export function buildOptions<T>(
	serializer: PersistentRunesSerializerOf<T>,
	storage?: PersistentRunesStorage,
): PersistentRunesOptionsOf<T>;
/**
 * Create a `PersistentRunesOptions` from a serializer and a storage
 * @param serializer The serializer to use (if `undefined` then `JsonSerializer` will be used)
 * @param storage The storage to use (if `undefined` then `BrowserLocalStorage` will be used)
 */
export function buildOptions(
	serializer: PersistentRunesSerializer | undefined,
	storage: PersistentRunesStorage | undefined,
): PersistentRunesOptions;
export function buildOptions(
	serializer?: PersistentRunesSerializer | PersistentRunesSerializerOf<any>,
	storage?: PersistentRunesStorage,
): PersistentRunesOptions | PersistentRunesOptionsOf<any> {
	return {
		...(serializer ?? JsonSerializer),
		...(storage ?? BrowserLocalStorage),
	};
}
