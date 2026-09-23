import type { PersistentRunesStorage } from "../types";

/**
 * A {@link PersistentRunesStorage} backed by the browser's `localStorage`.
 *
 * Every method first checks that `window` exists and exposes `localStorage`,
 * so reads, writes and removals are silently skipped during server-side
 * rendering instead of throwing. Genuine browser errors (for example a quota
 * overflow on `setItem`) are allowed to propagate to the caller.
 */
export const BrowserLocalStorage: PersistentRunesStorage = {
	storageWrite(key: string, value: string) {
		globalThis?.window &&
			"localStorage" in globalThis.window &&
			globalThis.window.localStorage.setItem(key, value);
	},
	storageRead(key: string): string | undefined {
		return (
			(globalThis?.window &&
				"localStorage" in globalThis.window &&
				globalThis.window.localStorage.getItem(key)) ||
			undefined
		);
	},
	storageRemove(key: string) {
		globalThis?.window &&
			"localStorage" in globalThis.window &&
			globalThis.window.localStorage.removeItem(key);
	},
};
/**
 * A {@link PersistentRunesStorage} backed by the browser's `sessionStorage`.
 *
 * Every method first checks that `window` exists and exposes `sessionStorage`,
 * so reads, writes and removals are silently skipped during server-side
 * rendering instead of throwing. Genuine browser errors (for example a quota
 * overflow on `setItem`) are allowed to propagate to the caller.
 */
export const BrowserSessionStorage: PersistentRunesStorage = {
	storageWrite(key: string, value: string) {
		globalThis?.window &&
			"sessionStorage" in globalThis.window &&
			globalThis.window.sessionStorage.setItem(key, value);
	},
	storageRead(key: string): string | undefined {
		return (
			(globalThis?.window &&
				"sessionStorage" in globalThis.window &&
				globalThis.window.sessionStorage.getItem(key)) ||
			undefined
		);
	},
	storageRemove(key: string) {
		globalThis?.window &&
			"sessionStorage" in globalThis.window &&
			globalThis.window.sessionStorage.removeItem(key);
	},
};
