import test from "ava";
import type { Persistence } from "./runtime";
import { createPersistence, track } from "./runtime";

function memory(map: Map<string, string>) {
	return {
		storageRead: (key: string) => map.get(key),
		storageWrite: (key: string, value: string) => {
			map.set(key, value);
		},
		storageRemove: (key: string) => {
			map.delete(key);
		},
	};
}

test("writes initial state when the key is absent", (t) => {
	const map = new Map<string, string>();
	const handle = createPersistence("k", memory(map));

	t.false(handle.restore());
	handle.write(7);

	t.is(map.get("k"), "7");
});

test("restores stored null as a present value", (t) => {
	const handle = createPersistence("k", memory(new Map([["k", "null"]])));

	t.true(handle.restore());
	t.is(handle.value, null);
});

test("restores a stored number", (t) => {
	const handle = createPersistence<number>("k", memory(new Map([["k", "42"]])));

	t.true(handle.restore());
	t.is(handle.value, 42);
});

test("treats a null storage read as an absent key", (t) => {
	const handle = createPersistence("k", {
		...memory(new Map()),
		storageRead: () => JSON.parse("null"),
	});

	t.false(handle.restore());
	t.is(handle.value, undefined);
});

test("skips the first write after malformed stored data but permits the next", (t) => {
	const map = new Map([["k", "{"]]);
	const reports: Array<{ error: unknown; context: unknown }> = [];
	let writes = 0;
	const handle = createPersistence("k", {
		...memory(map),
		storageWrite: (key, value) => {
			writes++;
			map.set(key, value);
		},
		onError: (error, context) => reports.push({ error, context }),
	});

	t.false(handle.restore());
	t.is(reports.length, 1);
	t.true(reports[0]?.error instanceof SyntaxError);
	t.deepEqual(reports[0]?.context, { key: "k", operation: "read" });
	handle.write(1);
	t.is(writes, 0);
	t.is(map.get("k"), "{");
	handle.write(2);
	t.is(writes, 1);
	t.is(map.get("k"), "2");
});

test("skips the first write after storageRead throws", (t) => {
	const map = new Map([["k", "older"]]);
	const reports: unknown[] = [];
	const handle = createPersistence("k", {
		...memory(map),
		storageRead: () => {
			throw new Error("unavailable");
		},
		onError: (_error, context) => reports.push(context),
	});

	t.false(handle.restore());
	handle.write("initial");
	t.is(map.get("k"), "older");
	t.deepEqual(reports, [{ key: "k", operation: "read" }]);
});

test("removes a key when writing undefined and removal is supported", (t) => {
	const map = new Map([["k", "previous"]]);
	let removals = 0;
	const handle = createPersistence<string | undefined>("k", {
		...memory(map),
		storageRemove: (key) => {
			removals++;
			map.delete(key);
		},
	});

	handle.write(undefined);
	t.is(removals, 1);
	t.false(map.has("k"));
});

test("does not write or throw for undefined when removal is unsupported", (t) => {
	const map = new Map([["k", "previous"]]);
	const { storageRemove: _unused, ...withoutRemove } = memory(map);
	const handle = createPersistence<string | undefined>("k", withoutRemove);

	t.notThrows(() => handle.write(undefined));
	t.is(map.get("k"), "previous");
});

test("reports storageWrite errors without throwing", (t) => {
	const reports: unknown[] = [];
	const handle = createPersistence("k", {
		...memory(new Map()),
		storageWrite: () => {
			throw new Error("quota");
		},
		onError: (_error, context) => reports.push(context),
	});

	t.notThrows(() => handle.write(3));
	t.deepEqual(reports, [{ key: "k", operation: "write" }]);
});

test("reports serialize errors as write failures", (t) => {
	const reports: unknown[] = [];
	const handle = createPersistence("k", {
		...memory(new Map()),
		serialize: () => {
			throw new Error("serializer");
		},
		onError: (_error, context) => reports.push(context),
	});

	t.notThrows(() => handle.write(3));
	t.deepEqual(reports, [{ key: "k", operation: "write" }]);
});

test("reports removal errors without throwing", (t) => {
	const reports: unknown[] = [];
	const handle = createPersistence<string | undefined>("k", {
		...memory(new Map()),
		storageRemove: () => {
			throw new Error("remove denied");
		},
		onError: (_error, context) => reports.push(context),
	});

	t.notThrows(() => handle.write(undefined));
	t.deepEqual(reports, [{ key: "k", operation: "remove" }]);
});

test.serial("warns about the handler error without letting it escape", (t) => {
	const handlerError = new Error("broken reporter");
	const warnings: unknown[][] = [];
	const originalWarn = console.warn;
	console.warn = (...args) => warnings.push(args);
	t.teardown(() => {
		console.warn = originalWarn;
	});
	const handle = createPersistence("k", {
		...memory(new Map([["k", "{"]])),
		onError: () => {
			throw handlerError;
		},
	});

	t.notThrows(() => handle.restore());
	t.deepEqual(warnings, [[handlerError]]);
});

test.serial("warns with the library prefix when no handler exists", (t) => {
	const warnings: unknown[][] = [];
	const originalWarn = console.warn;
	console.warn = (...args) => warnings.push(args);
	t.teardown(() => {
		console.warn = originalWarn;
	});
	const handle = createPersistence("k", memory(new Map([["k", "{"]])));

	t.false(handle.restore());
	t.true(
		typeof warnings[0]?.[0] === "string" &&
			warnings[0][0].startsWith("[svelte-persistent-runes]"),
	);
	t.true(warnings[0]?.[1] instanceof SyntaxError);
});

test("captures getter-backed options once for all later writes", (t) => {
	const map = new Map<string, string>();
	const reads = {
		serialize: 0,
		deserialize: 0,
		storageRead: 0,
		storageWrite: 0,
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
			return (key: string) => map.get(key);
		},
		get storageWrite() {
			reads.storageWrite++;
			return (key: string, value: string) => {
				map.set(key, value);
			};
		},
	};
	const handle = createPersistence("k", options);

	handle.write(1);
	handle.write(2);
	handle.write(3);
	t.deepEqual(reads, {
		serialize: 1,
		deserialize: 1,
		storageRead: 1,
		storageWrite: 1,
	});
	t.is(map.get("k"), "3");
});

test("retries a synchronous orphan effect inside a root", (t) => {
	const values: number[] = [];
	const handle: Persistence<number> = {
		restore: () => false,
		value: undefined,
		write: (value) => {
			values.push(value);
		},
	};
	let effects = 0;
	let roots = 0;
	const effect = (run: () => void) => {
		effects++;
		if (effects === 1) throw new Error("effect_orphan");
		run();
	};
	const root = (run: () => void) => {
		roots++;
		run();
		return () => {};
	};

	track(handle, () => 42, effect, root);
	t.is(roots, 1);
	t.is(effects, 2);
	t.deepEqual(values, [42]);
});

test("keeps an owned effect without creating a root", (t) => {
	const map = new Map<string, string>();
	const handle = createPersistence("k", memory(map));
	let roots = 0;
	let effects = 0;

	track(
		handle,
		() => 21,
		(run) => {
			effects++;
			run();
		},
		() => {
			roots++;
			return () => {};
		},
	);
	t.is(effects, 1);
	t.is(roots, 0);
	t.is(map.get("k"), "21");
});
