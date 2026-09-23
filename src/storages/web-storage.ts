import type { PersistentRunesStorage } from "../types";

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
};
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
};
