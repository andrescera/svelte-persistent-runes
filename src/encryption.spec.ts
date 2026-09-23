import { readFileSync } from "node:fs";
import test from "ava";
import { addEncryptionStorage } from "./storages/encryption";
import {
	GOLDEN_ENCRYPTION_KEY,
	GOLDEN_PLAINTEXTS,
} from "./testing/golden-values";
import { loadLegacy } from "./testing/legacy";
import type { PersistentRunesStorage } from "./types";

const golden: {
	key: string;
	cases: { plaintext: string; record: string }[];
	customIv: { iv: string; plaintext: string; record: string };
} = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/encryption.json", import.meta.url),
		"utf8",
	),
);

function memoryStorage(records: Map<string, string>): PersistentRunesStorage {
	return {
		storageRead: (key) => records.get(key),
		storageWrite: (key, value) => records.set(key, value),
	};
}

for (const [index, plaintext] of GOLDEN_PLAINTEXTS.entries()) {
	test(`new encryption round-trips golden plaintext ${index}`, (t) => {
		const records = new Map<string, string>();
		const storage = addEncryptionStorage(
			memoryStorage(records),
			GOLDEN_ENCRYPTION_KEY,
		);
		storage.storageWrite("value", plaintext);
		t.regex(records.get("value") ?? "", /^[0-9a-f]+:[0-9a-f]{24}$/);
		t.is(storage.storageRead("value"), plaintext);
	});
}

test("100 writes of the same plaintext have distinct 96-bit random IVs", (t) => {
	const records = new Map<string, string>();
	const storage = addEncryptionStorage(
		memoryStorage(records),
		GOLDEN_ENCRYPTION_KEY,
	);
	const ivs = new Set<string>();
	const ciphertexts = new Set<string>();
	for (let i = 0; i < 100; i++) {
		storage.storageWrite("value", "same plaintext");
		const record = records.get("value") ?? "";
		const [ciphertext, iv] = record.split(":");
		t.regex(iv ?? "", /^[0-9a-f]{24}$/);
		ivs.add(iv ?? "");
		ciphertexts.add(ciphertext ?? "");
	}
	t.is(ivs.size, 100);
	t.is(ciphertexts.size, 100);
	t.is(storage.storageRead("value"), "same plaintext");
});

for (const [index, { plaintext, record }] of [
	...golden.cases,
	golden.customIv,
].entries()) {
	test(`2.1.0 encrypted record ${index} still decrypts`, (t) => {
		const records = new Map([["value", record]]);
		const storage = addEncryptionStorage(memoryStorage(records), golden.key);
		t.is(storage.storageRead("value"), plaintext);
	});
}

for (const [index, plaintext] of GOLDEN_PLAINTEXTS.entries()) {
	test(`2.1.0 can read new encrypted record ${index}`, async (t) => {
		const legacy = await loadLegacy("/options");
		const records = new Map<string, string>();
		const memory = memoryStorage(records);
		addEncryptionStorage(memory, GOLDEN_ENCRYPTION_KEY).storageWrite(
			"value",
			plaintext,
		);
		t.regex(records.get("value") ?? "", /^[0-9a-f]+:[0-9a-f]{24}$/);
		t.is(
			legacy
				.addEncryptionStorage(memory, GOLDEN_ENCRYPTION_KEY)
				.storageRead("value"),
			plaintext,
		);
	});
}

test("deprecated explicit IV cannot force nonce reuse", (t) => {
	const records = new Map<string, string>();
	const storage = addEncryptionStorage(
		memoryStorage(records),
		GOLDEN_ENCRYPTION_KEY,
		golden.customIv.iv,
	);
	storage.storageWrite("value", "42");
	const first = records.get("value") ?? "";
	storage.storageWrite("value", "42");
	const second = records.get("value") ?? "";
	const firstIv = first.split(":")[1] ?? "";
	const secondIv = second.split(":")[1] ?? "";
	t.regex(firstIv, /^[0-9a-f]{24}$/);
	t.regex(secondIv, /^[0-9a-f]{24}$/);
	t.not(firstIv, secondIv);
	t.is(storage.storageRead("value"), "42");
});

test("modified ciphertext fails GCM authentication", (t) => {
	const records = new Map<string, string>();
	const storage = addEncryptionStorage(
		memoryStorage(records),
		GOLDEN_ENCRYPTION_KEY,
	);
	storage.storageWrite("value", "secret");
	const record = records.get("value") ?? "";
	const [ciphertext, iv] = record.split(":");
	const tampered = `${ciphertext?.replace(/^./, (c) => (c === "0" ? "1" : "0"))}:${iv}`;
	const original = storage.storageRead("value");
	records.set("value", tampered);
	t.is(original, "secret");
	let failure: unknown;
	try {
		storage.storageRead("value");
	} catch (error) {
		failure = error;
	}
	t.regex(String(failure), /CORRUPT: gcm: tag doesn't match/);
});

test("incorrect decryption key fails GCM authentication", (t) => {
	const records = new Map<string, string>();
	const memory = memoryStorage(records);
	const storage = addEncryptionStorage(memory, GOLDEN_ENCRYPTION_KEY);
	storage.storageWrite("value", "secret");
	const wrongKey = addEncryptionStorage(
		memory,
		"00000000000000000000000000000000",
	);
	t.is(storage.storageRead("value"), "secret");
	let failure: unknown;
	try {
		wrongKey.storageRead("value");
	} catch (error) {
		failure = error;
	}
	t.regex(String(failure), /CORRUPT: gcm: tag doesn't match/);
});

test("storageRemove delegates to underlying removal", (t) => {
	const records = new Map<string, string>();
	const memory = {
		...memoryStorage(records),
		storageRemove: (key: string) => {
			records.delete(key);
		},
	};
	const storage = addEncryptionStorage(memory, GOLDEN_ENCRYPTION_KEY);
	storage.storageWrite("value", "secret");
	storage.storageRemove?.("value");
	t.is(records.has("value"), false);
	t.is(storage.storageRead("value"), undefined);
});

test("storageRemove without underlying removal is a silent no-op", (t) => {
	const records = new Map<string, string>();
	const storage = addEncryptionStorage(
		memoryStorage(records),
		GOLDEN_ENCRYPTION_KEY,
	);
	storage.storageWrite("value", "secret");
	t.notThrows(() => storage.storageRemove?.("value"));
	t.is(storage.storageRead("value"), "secret");
});

test.serial(
	"writes fail closed when secure random generation is unavailable",
	(t) => {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
		Object.defineProperty(globalThis, "crypto", {
			configurable: true,
			value: undefined,
		});
		try {
			const records = new Map<string, string>();
			const storage = addEncryptionStorage(
				memoryStorage(records),
				GOLDEN_ENCRYPTION_KEY,
			);
			t.is(
				t.throws(() => storage.storageWrite("value", "secret"))?.message,
				"[svelte-persistent-runes] addEncryptionStorage needs crypto.getRandomValues",
			);
			t.is(records.size, 0);
		} finally {
			if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
			else Reflect.deleteProperty(globalThis, "crypto");
		}
	},
);
