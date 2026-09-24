import "svelte-persistent-runes";
import {
	load,
	type PersistentRunesOptions,
	save,
} from "svelte-persistent-runes";
import {
	addEncryptionStorage,
	BrowserCookieStorage,
	BrowserCookieStorageFactory,
	BrowserLocalStorage,
	BrowserSessionStorage,
	buildOptions,
	DevalueSerializer,
	DevalueSerializerFactory,
	ESSerializerSerializer,
	ESSerializerSerializerFactory,
	JsonSerializer,
	JsonSerializerFactory,
	MacfjaSerializer,
	MacfjaSerializerFactory,
	NextJsonSerializer,
	NextJsonSerializerFactory,
	type PersistentRunesSerializer,
	type PersistentRunesStorage,
	PhpSerializeSerializer,
	PhpSerializeSerializerFactory,
	SerializeAnythingSerializer,
	SerializeAnythingSerializerFactory,
	SuperJsonSerializer,
} from "svelte-persistent-runes/options";
import {
	persistPlugin,
	persistPreprocessor,
} from "svelte-persistent-runes/plugins";
import def from "svelte-persistent-runes/preprocessor";

let a = $persist(0, "a");
let b = $persist<string>("x", "b", { storageRead: () => undefined });
a += 1;
b += "x";
class Person {
	name = $persist("J", "n");
}
const loaded: number | undefined = load<number>("k");
save("k", 1);
save("k", { a: 1 }, buildOptions(JsonSerializer, BrowserLocalStorage));

const serializers: PersistentRunesSerializer[] = [
	JsonSerializer,
	JsonSerializerFactory({ space: 2 }),
	DevalueSerializer,
	DevalueSerializerFactory({ reducers: {}, revivers: {} }),
	ESSerializerSerializer,
	ESSerializerSerializerFactory({ classes: [] }),
	MacfjaSerializer,
	MacfjaSerializerFactory({ allowedClasses: {} }),
	NextJsonSerializer,
	NextJsonSerializerFactory({ space: 2 }),
	PhpSerializeSerializer,
	PhpSerializeSerializerFactory({}),
	SerializeAnythingSerializer,
	SerializeAnythingSerializerFactory({ maxDepth: 5, pretty: true }),
	SuperJsonSerializer,
];
const defaults: PersistentRunesOptions = buildOptions(undefined, undefined);
const session: PersistentRunesOptions = buildOptions(
	MacfjaSerializer,
	BrowserSessionStorage,
);
const key = "12345678901234567890123456879012";
const encrypted = addEncryptionStorage(BrowserLocalStorage, key);
const encryptedWithIv = addEncryptionStorage(BrowserLocalStorage, key, "iv");
const cookies = BrowserCookieStorageFactory({ expires: 7 });

const s: PersistentRunesSerializer = {
	serialize<T>(i: T) {
		return JSON.stringify(i);
	},
	deserialize<T>(i: string) {
		return JSON.parse(i) as T;
	},
};
const storage: PersistentRunesStorage = {
	storageRead: () => undefined,
	storageWrite: (_key, _value) => {},
};
const o: PersistentRunesOptions = buildOptions(s, storage);
const persisted = $persist(0, "k", o);
const vitePlugin: import("vite").Plugin = persistPlugin();
const preprocessor: import("svelte/compiler").PreprocessorGroup =
	persistPreprocessor();
const defaultPreprocessor: import("svelte/compiler").PreprocessorGroup = def();

type Equal<A, B> =
	(<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;
export type LegacyShape = [
	Expect<
		Equal<
			Parameters<typeof buildOptions>,
			[
				PersistentRunesSerializer | undefined,
				PersistentRunesStorage | undefined,
			]
		>
	>,
	Expect<Equal<ReturnType<typeof buildOptions>, PersistentRunesOptions>>,
	Expect<Equal<ReturnType<typeof $persist<number>>, number>>,
];

export const legacyUsage = {
	a,
	b,
	Person,
	loaded,
	serializers,
	defaults,
	session,
	encrypted,
	encryptedWithIv,
	cookies,
	BrowserCookieStorage,
	persisted,
	vitePlugin,
	preprocessor,
	defaultPreprocessor,
};
