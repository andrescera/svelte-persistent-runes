import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import test from "ava";
import { load, save } from "./index";
import * as options from "./options";
import { installFakeDocument } from "./testing/fake-dom";
import { GOLDEN_VALUES } from "./testing/golden-values";
import { loadLegacy } from "./testing/legacy";

const serializerExports = {
	JsonSerializer: options.JsonSerializer,
	DevalueSerializer: options.DevalueSerializer,
	ESSerializerSerializer: options.ESSerializerSerializer,
	MacfjaSerializer: options.MacfjaSerializer,
	NextJsonSerializer: options.NextJsonSerializer,
	PhpSerializeSerializer: options.PhpSerializeSerializer,
	SerializeAnythingSerializer: options.SerializeAnythingSerializer,
	SuperJsonSerializer: options.SuperJsonSerializer,
};

const serializers = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/serializers.json", import.meta.url),
		"utf8",
	),
) as Record<string, Record<string, { record?: string; skipped?: string }>>;
const encryption = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/encryption.json", import.meta.url),
		"utf8",
	),
) as {
	key: string;
	roundTripOk: boolean;
	cases: { plaintext: string; record: string }[];
	customIv: { iv: string; plaintext: string; record: string };
};
const cookie = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/cookie.json", import.meta.url),
		"utf8",
	),
) as { assignment: string; read: string };

for (const [name, cases] of Object.entries(serializers)) {
	for (const [valueName, fixture] of Object.entries(cases)) {
		if (fixture.record === undefined) continue;
		const record = fixture.record;
		test(`${name} decodes golden ${valueName}`, (t) => {
			const serializer =
				serializerExports[name as keyof typeof serializerExports];
			t.true(
				isDeepStrictEqual(
					serializer.deserialize(record),
					GOLDEN_VALUES[valueName],
				),
			);
			if (name === "JsonSerializer") {
				t.is(serializer.serialize(GOLDEN_VALUES[valueName]), record);
			}
		});
	}
}

for (const { plaintext, record, iv } of [
	...encryption.cases.map((item) => ({ ...item, iv: undefined })),
	encryption.customIv,
]) {
	test(`encrypted golden record ${record} decodes like 2.1.0`, async (t) => {
		const legacy = await loadLegacy("/options");
		const memory = {
			storageRead: () => record,
			storageWrite: (_key: string, _value: string) => {},
		};
		const currentRead = () =>
			options
				.addEncryptionStorage(memory, encryption.key, iv)
				.storageRead("golden");
		const legacyRead = () =>
			legacy
				.addEncryptionStorage(memory, encryption.key, iv)
				.storageRead("golden");
		if (encryption.roundTripOk) {
			t.is(currentRead(), plaintext);
			t.is(legacyRead(), plaintext);
		} else {
			t.is(t.throws(currentRead)?.message, t.throws(legacyRead)?.message);
		}
	});
}

test("cookie storage retains the 2.1.0 assignment and readback", (t) => {
	const dom = installFakeDocument();
	try {
		options.BrowserCookieStorage.storageWrite("golden", "v 1;=é");
		t.deepEqual(dom.assignments, [cookie.assignment]);
		t.is(options.BrowserCookieStorage.storageRead("golden"), cookie.read);
	} finally {
		dom.restore();
	}
});

for (const [title, initial] of [
	["absent", undefined],
	["null", "null"],
	["number", "42"],
	["malformed", "{"],
] as const) {
	test(`load ${title} matches published 2.1.0`, async (t) => {
		const legacy = await loadLegacy("");
		const values = new Map<string, string>();
		if (initial !== undefined) values.set("k", initial);
		const storage = {
			storageRead: (key: string) => values.get(key),
			storageWrite: (key: string, value: string) => values.set(key, value),
		};
		if (title === "malformed") {
			t.is(
				t.throws(() => load("k", storage))?.message,
				t.throws(() => legacy.load("k", storage))?.message,
			);
		} else {
			t.deepEqual(load("k", storage), legacy.load("k", storage));
			t.deepEqual(
				load("k", storage),
				initial === undefined ? undefined : JSON.parse(initial),
			);
		}
	});
}

for (const [title, value] of [
	["undefined", undefined],
	["object", { a: 1 }],
] as const) {
	test(`save ${title} matches published 2.1.0`, async (t) => {
		const legacy = await loadLegacy("");
		const currentValues = new Map<string, string>();
		const legacyValues = new Map<string, string>();
		const storage = (values: Map<string, string>) => ({
			storageRead: (key: string) => values.get(key),
			storageWrite: (key: string, record: string) => values.set(key, record),
		});
		save("k", value, storage(currentValues));
		legacy.save("k", value, storage(legacyValues));
		t.deepEqual([...currentValues], [...legacyValues]);
		t.deepEqual(
			[...currentValues],
			value === undefined ? [] : [["k", '{"a":1}']],
		);
	});
}
