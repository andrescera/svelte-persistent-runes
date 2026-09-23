import { readFileSync } from "node:fs";
import test from "ava";
import { BrowserCookieStorage } from "./storages/cookie";
import {
	BrowserLocalStorage,
	BrowserSessionStorage,
} from "./storages/web-storage";
import { installFakeDocument, installFakeWindow } from "./testing/fake-dom";

const cookie = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/cookie.json", import.meta.url),
		"utf8",
	),
) as { assignment: string; read: string };

function withoutGlobal(name: "window" | "document"): () => void {
	const original = Object.getOwnPropertyDescriptor(globalThis, name);
	Reflect.deleteProperty(globalThis, name);
	return () => {
		if (original) Object.defineProperty(globalThis, name, original);
		else Reflect.deleteProperty(globalThis, name);
	};
}

test.serial("BrowserLocalStorage read/write/remove round-trips", (t) => {
	const dom = installFakeWindow();
	try {
		t.is(typeof BrowserLocalStorage.storageRemove, "function");
		BrowserLocalStorage.storageWrite("key", "value");
		t.is(BrowserLocalStorage.storageRead("key"), "value");
		t.true(dom.local.has("key"));

		BrowserLocalStorage.storageRemove?.("key");
		t.false(dom.local.has("key"));
		t.is(BrowserLocalStorage.storageRead("key"), undefined);
	} finally {
		dom.restore();
	}
});

test.serial("BrowserSessionStorage read/write/remove round-trips", (t) => {
	const dom = installFakeWindow();
	try {
		t.is(typeof BrowserSessionStorage.storageRemove, "function");
		BrowserSessionStorage.storageWrite("key", "value");
		t.is(BrowserSessionStorage.storageRead("key"), "value");
		t.true(dom.session.has("key"));

		BrowserSessionStorage.storageRemove?.("key");
		t.false(dom.session.has("key"));
		t.is(BrowserSessionStorage.storageRead("key"), undefined);
	} finally {
		dom.restore();
	}
});

test.serial("web storages are inert without a window", (t) => {
	const restoreWindow = withoutGlobal("window");
	try {
		t.is(BrowserLocalStorage.storageRead("key"), undefined);
		t.notThrows(() => BrowserLocalStorage.storageWrite("key", "value"));
		t.notThrows(() => BrowserLocalStorage.storageRemove?.("key"));

		t.is(BrowserSessionStorage.storageRead("key"), undefined);
		t.notThrows(() => BrowserSessionStorage.storageWrite("key", "value"));
		t.notThrows(() => BrowserSessionStorage.storageRemove?.("key"));
	} finally {
		restoreWindow();
	}
});

test.serial("BrowserCookieStorage read/write/remove round-trips", (t) => {
	const dom = installFakeDocument();
	try {
		t.is(typeof BrowserCookieStorage.storageRemove, "function");
		BrowserCookieStorage.storageWrite("key", "v 1;=é");
		t.is(BrowserCookieStorage.storageRead("key"), "v 1;=é");
		t.true(dom.jar.has("key"));

		BrowserCookieStorage.storageRemove?.("key");
		t.false(dom.jar.has("key"));
		t.is(BrowserCookieStorage.storageRead("key"), undefined);

		const eraseAssignment = dom.assignments[dom.assignments.length - 1];
		t.truthy(eraseAssignment);
		const expires = /(?:^|;)\s*expires=([^;]*)/i.exec(
			eraseAssignment as string,
		);
		const maxAge = /(?:^|;)\s*max-age=([^;]*)/i.exec(eraseAssignment as string);
		t.true(
			(expires !== null && Date.parse(expires[1] as string) < Date.now()) ||
				(maxAge !== null && Number(maxAge[1]) <= 0),
		);
	} finally {
		dom.restore();
	}
});

test.serial("cookie storage is silent and inert without a document", (t) => {
	const restoreDocument = withoutGlobal("document");
	const originalWarn = console.warn;
	const warnings: unknown[][] = [];
	console.warn = (...args: unknown[]): void => {
		warnings.push(args);
	};
	try {
		t.is(BrowserCookieStorage.storageRead("x"), undefined);
		t.notThrows(() => BrowserCookieStorage.storageWrite("x", "1"));
		t.notThrows(() => BrowserCookieStorage.storageRemove?.("x"));
		t.deepEqual(warnings, []);
	} finally {
		console.warn = originalWarn;
		restoreDocument();
	}
});

test.serial(
	"cookie storage keeps the frozen golden assignment byte-identical",
	(t) => {
		const dom = installFakeDocument();
		try {
			BrowserCookieStorage.storageWrite("golden", "v 1;=é");
			t.deepEqual(dom.assignments, [cookie.assignment]);
			t.is(BrowserCookieStorage.storageRead("golden"), cookie.read);
		} finally {
			dom.restore();
		}
	},
);
