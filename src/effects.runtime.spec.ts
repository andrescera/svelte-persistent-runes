import test from "ava";
import { flushSync } from "svelte";
import { compileToFile } from "./testing/compile-module";
import type { PersistentRunesOptions } from "./types";

// allow: SIZE_OK — ten required end-to-end scenarios share this compiled fixture.
const source = `
export function createCounter(options) { let count = $persist(0, "count", options); return { get count() { return count; }, set count(v) { count = v; } }; }
export function createKeyed(keySource, options) { let count = $persist(0, keySource.key, options); return { get count() { return count; }, set count(v) { count = v; } }; }
export function createLazy(options, make) { let v = $persist(make(), "lazy", options); return { get v() { return v; } }; }
let STORE_OPTIONS;
export function setStoreOptions(o) { STORE_OPTIONS = o; }
export class Store { value = $persist(1, "store", STORE_OPTIONS); }
export function root(fn) { return $effect.root(fn); }
`;

interface Counter {
	count: number | null | undefined;
}

interface Fixture {
	createCounter(options: Partial<PersistentRunesOptions>): Counter;
	createKeyed(
		keySource: { readonly key: string },
		options: Partial<PersistentRunesOptions>,
	): Counter;
	createLazy(
		options: Partial<PersistentRunesOptions>,
		make: () => number,
	): { readonly v: number };
	setStoreOptions(options: Partial<PersistentRunesOptions>): void;
	Store: new () => { value: number };
	root(fn: () => void): () => void;
}

const fixture: Promise<Fixture> = compileToFile(source, "effects").then(
	(url) => import(url),
);

function memory(entries: readonly (readonly [string, string])[] = []) {
	const map = new Map(entries);
	const writes: string[] = [];
	const removals: string[] = [];
	return {
		map,
		writes,
		removals,
		storageRead: (key: string) => map.get(key),
		storageWrite: (key: string, value: string) => {
			writes.push(value);
			map.set(key, value);
		},
		storageRemove: (key: string) => {
			removals.push(key);
			map.delete(key);
		},
	};
}

test.serial(
	"GUARD: client flushSync runs the initial persistence effect",
	async (t) => {
		const { createCounter, root } = await fixture;
		const storage = memory();
		const dispose = root(() => {
			createCounter(storage);
		});
		flushSync();
		t.true(storage.writes.length > 0);
		dispose();
	},
);

test.serial(
	"OWNED: writes initial and changed values, then stops on dispose",
	async (t) => {
		const { createCounter, root } = await fixture;
		const storage = memory();
		const scope: { counter?: Counter } = {};
		const dispose = root(() => {
			scope.counter = createCounter(storage);
		});
		flushSync();
		const counter = scope.counter;
		if (!counter) return t.fail("Root did not create counter");
		t.is(storage.writes[0], "0");
		counter.count = 5;
		flushSync();
		t.is(storage.writes.at(-1), "5");
		dispose();
		const before = storage.writes.length;
		counter.count = 6;
		flushSync();
		t.is(storage.writes.length, before);
	},
);

test.serial(
	"ORPHAN: fallback root keeps the unowned effect reactive",
	async (t) => {
		const { createCounter } = await fixture;
		const storage = memory();
		const counter = createCounter(storage);
		flushSync();
		t.is(storage.writes[0], "0");
		counter.count = 7;
		flushSync();
		t.is(storage.writes.at(-1), "7");
	},
);

test.serial("CLASS: field effect is owned and disposed", async (t) => {
	const module = await fixture;
	const storage = memory();
	module.setStoreOptions(storage);
	const scope: { store?: { value: number } } = {};
	const dispose = module.root(() => {
		scope.store = new module.Store();
	});
	flushSync();
	const store = scope.store;
	if (!store) return t.fail("Root did not create store");
	t.is(storage.writes[0], "1");
	store.value = 5;
	flushSync();
	t.is(storage.writes.at(-1), "5");
	dispose();
	const before = storage.writes.length;
	store.value = 6;
	flushSync();
	t.is(storage.writes.length, before);
});

test.serial("RESTORE: stored number seeds state and first write", async (t) => {
	const { createCounter, root } = await fixture;
	const storage = memory([["count", "42"]]);
	const scope: { counter?: Counter } = {};
	const dispose = root(() => {
		scope.counter = createCounter(storage);
	});
	flushSync();
	t.is(scope.counter?.count, 42);
	t.is(storage.writes[0], "42");
	dispose();
});

test.serial(
	"RESTORE: stored null is present, not a missing value",
	async (t) => {
		const { createCounter, root } = await fixture;
		const storage = memory([["count", "null"]]);
		const scope: { counter?: Counter } = {};
		const dispose = root(() => {
			scope.counter = createCounter(storage);
		});
		flushSync();
		t.is(scope.counter?.count, null);
		t.is(storage.writes[0], "null");
		dispose();
	},
);

test.serial("LAZY: restored data skips the initial expression", async (t) => {
	const { createLazy, root } = await fixture;
	const stored = memory([["lazy", "42"]]);
	let calls = 0;
	const make = () => {
		calls++;
		return 9;
	};
	const scope: { value?: { readonly v: number } } = {};
	const dispose = root(() => {
		scope.value = createLazy(stored, make);
	});
	flushSync();
	t.is(calls, 0);
	t.is(scope.value?.v, 42);
	t.is(stored.writes[0], "42");
	dispose();

	const absent = memory();
	const other: { value?: { readonly v: number } } = {};
	const disposeOther = root(() => {
		other.value = createLazy(absent, make);
	});
	flushSync();
	t.is(calls, 1);
	t.is(other.value?.v, 9);
	t.is(absent.writes[0], "9");
	disposeOther();
});

test.serial(
	"UNDEFINED: assigning undefined removes the stored key",
	async (t) => {
		const { createCounter, root } = await fixture;
		const storage = memory();
		const scope: { counter?: Counter } = {};
		const dispose = root(() => {
			scope.counter = createCounter(storage);
		});
		flushSync();
		if (!scope.counter) return t.fail("Root did not create counter");
		scope.counter.count = undefined;
		flushSync();
		t.deepEqual(storage.removals, ["count"]);
		t.false(storage.map.has("count"));
		dispose();
	},
);

test.serial(
	"FAILED READ: preserves malformed data until state changes",
	async (t) => {
		const { createCounter, root } = await fixture;
		const storage = memory([["count", "{"]]);
		const reports: Array<{ error: unknown; context: unknown }> = [];
		const scope: { counter?: Counter } = {};
		const dispose = root(() => {
			scope.counter = createCounter({
				...storage,
				onError: (error, context) => reports.push({ error, context }),
			});
		});
		flushSync();
		const counter = scope.counter;
		if (!counter) return t.fail("Root did not create counter");
		t.is(counter.count, 0);
		t.true(reports[0]?.error instanceof SyntaxError);
		t.deepEqual(reports[0]?.context, { key: "count", operation: "read" });
		t.deepEqual(storage.writes, []);
		t.is(storage.map.get("count"), "{");
		counter.count = 8;
		flushSync();
		t.deepEqual(storage.writes, ["8"]);
		dispose();
	},
);

test.serial(
	"KEY ONCE: getter-backed options are captured across updates",
	async (t) => {
		const { createKeyed, root } = await fixture;
		const storage = memory();
		const reads = {
			key: 0,
			serialize: 0,
			deserialize: 0,
			storageRead: 0,
			storageWrite: 0,
		};
		const keySource = {
			get key() {
				reads.key++;
				return "count";
			},
		};
		const options = {
			get serialize() {
				reads.serialize++;
				return JSON.stringify;
			},
			get deserialize() {
				reads.deserialize++;
				return JSON.parse;
			},
			get storageRead() {
				reads.storageRead++;
				return storage.storageRead;
			},
			get storageWrite() {
				reads.storageWrite++;
				return storage.storageWrite;
			},
		};
		const scope: { counter?: Counter } = {};
		const dispose = root(() => {
			scope.counter = createKeyed(keySource, options);
		});
		flushSync();
		const counter = scope.counter;
		if (!counter) return t.fail("Root did not create counter");
		for (const value of [1, 2, 3]) {
			counter.count = value;
			flushSync();
		}
		t.deepEqual(reads, {
			key: 1,
			serialize: 1,
			deserialize: 1,
			storageRead: 1,
			storageWrite: 1,
		});
		t.deepEqual(storage.writes, ["0", "1", "2", "3"]);
		dispose();
	},
);
