import { writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import type { PersistentRunesSerializer } from "../src/options";
import {
	addEncryptionStorage,
	BrowserCookieStorage,
	DevalueSerializer,
	ESSerializerSerializer,
	JsonSerializer,
	MacfjaSerializer,
	NextJsonSerializer,
	PhpSerializeSerializer,
	SerializeAnythingSerializer,
	SuperJsonSerializer,
} from "../src/options";
import { installFakeDocument } from "../src/testing/fake-dom";
import {
	GOLDEN_ENCRYPTION_KEY,
	GOLDEN_PLAINTEXTS,
	GOLDEN_VALUES,
} from "../src/testing/golden-values";

const serializers: Record<string, PersistentRunesSerializer> = {
	JsonSerializer,
	DevalueSerializer,
	ESSerializerSerializer,
	MacfjaSerializer,
	NextJsonSerializer,
	PhpSerializeSerializer,
	SerializeAnythingSerializer,
	SuperJsonSerializer,
};

const serialized: Record<
	string,
	Record<string, { record: string } | { skipped: string }>
> = {};
for (const [name, serializer] of Object.entries(serializers)) {
	const cases: Record<string, { record: string } | { skipped: string }> = {};
	for (const [caseName, value] of Object.entries(GOLDEN_VALUES)) {
		try {
			const record = serializer.serialize(value);
			cases[caseName] =
				typeof record === "string" &&
				isDeepStrictEqual(serializer.deserialize(record), value)
					? { record }
					: { skipped: "round trip mismatch" };
		} catch (error) {
			cases[caseName] = {
				skipped: error instanceof Error ? error.message : String(error),
			};
		}
	}
	serialized[name] = cases;
}
writeFileSync(
	"fixtures/golden/serializers.json",
	`${JSON.stringify(serialized, null, "\t")}\n`,
);

const memory = new Map<string, string>();
const memoryStorage = {
	storageRead(key: string): string | undefined {
		return memory.get(key);
	},
	storageWrite(key: string, value: string): void {
		memory.set(key, value);
	},
};
const encrypted = addEncryptionStorage(memoryStorage, GOLDEN_ENCRYPTION_KEY);
let roundTripOk = true;
const encryptionCases = GOLDEN_PLAINTEXTS.map((plaintext, index) => {
	const key = `golden-${index}`;
	encrypted.storageWrite(key, plaintext);
	const record = memory.get(key);
	if (record === undefined)
		throw new Error(`Missing encrypted record for ${key}`);
	try {
		roundTripOk = encrypted.storageRead(key) === plaintext && roundTripOk;
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		roundTripOk = false;
	}
	return { plaintext, record };
});
const customIvStorage = addEncryptionStorage(
	memoryStorage,
	GOLDEN_ENCRYPTION_KEY,
	"custom-iv",
);
customIvStorage.storageWrite("golden-custom", "42");
const customRecord = memory.get("golden-custom");
if (customRecord === undefined) throw new Error("Missing custom IV record");
try {
	roundTripOk =
		customIvStorage.storageRead("golden-custom") === "42" && roundTripOk;
} catch (error) {
	if (!(error instanceof Error)) throw error;
	roundTripOk = false;
}
writeFileSync(
	"fixtures/golden/encryption.json",
	`${JSON.stringify(
		{
			key: GOLDEN_ENCRYPTION_KEY,
			roundTripOk,
			cases: encryptionCases,
			customIv: { iv: "custom-iv", plaintext: "42", record: customRecord },
		},
		null,
		"\t",
	)}\n`,
);

const document = installFakeDocument();
try {
	BrowserCookieStorage.storageWrite("golden", "v 1;=é");
	writeFileSync(
		"fixtures/golden/cookie.json",
		`${JSON.stringify(
			{
				assignment: document.assignments[0],
				read: BrowserCookieStorage.storageRead("golden") ?? null,
			},
			null,
			"\t",
		)}\n`,
	);
} finally {
	document.restore();
}
