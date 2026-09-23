import {
	type CookieOptions,
	erase as eraseCookie,
	get as getCookie,
	set as setCookie,
} from "browser-cookies";
import type { PersistentRunesStorage } from "../types";

/**
 * Create a {@link PersistentRunesStorage} backed by browser cookies.
 *
 * The factory returns a storage whose three operations are no-ops (read
 * returns `undefined`) when `document` is unavailable, so a server-side render
 * never touches `document.cookie` and never warns. Every cookie uses
 * `samesite: "Strict"` unless overridden through {@link cookieOptions}.
 *
 * @param cookieOptions Optional `browser-cookies` options merged over the
 * `samesite: "Strict"` default for writes and removals.
 */
export function BrowserCookieStorageFactory(
	cookieOptions?: CookieOptions,
): PersistentRunesStorage {
	return {
		storageWrite(key: string, value: string): void {
			if (typeof document === "undefined") {
				return;
			}
			setCookie(key, value, { samesite: "Strict", ...cookieOptions });
		},
		storageRead(key: string): string | undefined {
			if (typeof document === "undefined") {
				return undefined;
			}
			return getCookie(key) || undefined;
		},
		storageRemove(key: string): void {
			if (typeof document === "undefined") {
				return;
			}
			eraseCookie(key, { samesite: "Strict", ...cookieOptions });
		},
	};
}

/**
 * A shared {@link PersistentRunesStorage} backed by browser cookies with the
 * default options (`samesite: "Strict"`). Safe to call during server-side
 * rendering: without a `document`, reads return `undefined` and writes and
 * removals do nothing.
 */
export const BrowserCookieStorage =
	/* @__PURE__ */ BrowserCookieStorageFactory();
