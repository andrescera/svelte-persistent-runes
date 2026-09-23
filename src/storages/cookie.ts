import {
	type CookieOptions,
	get as getCookie,
	set as setCookie,
} from "browser-cookies";
import type { PersistentRunesStorage } from "../types";

export function BrowserCookieStorageFactory(
	cookieOptions?: CookieOptions,
): PersistentRunesStorage {
	return {
		storageWrite(key: string, value: string): void {
			setCookie(key, value, { samesite: "Strict", ...cookieOptions });
		},
		storageRead(key: string): string | undefined {
			return getCookie(key) || undefined;
		},
	};
}

export const BrowserCookieStorage =
	/* @__PURE__ */ BrowserCookieStorageFactory();
