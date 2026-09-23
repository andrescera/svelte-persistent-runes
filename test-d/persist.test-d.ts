import "svelte-persistent-runes";
import type {
	PersistentRunesOptions,
	PersistentRunesSerializerOf,
} from "svelte-persistent-runes";
import {
	BrowserCookieStorage,
	BrowserSessionStorage,
	buildOptions,
	JsonSerializer,
	SuperJsonSerializer,
} from "svelte-persistent-runes/options";
import { type Equal, type Expect, expectType } from "./_assert";

type User = { name: string; age: number };

// --- Value-per-value inference (no options) -------------------------------

const numVal = $persist(0, "k-num");
expectType<number>(numVal);

const maybeUser = $persist<User | null>(null, "k-user-null");
expectType<User | null>(maybeUser);

const maybeUser2 = $persist<User>(undefined, "k-user-undef");
expectType<User | undefined>(maybeUser2);

const justUndefined = $persist(undefined, "k-plain-undef");
expectType<undefined>(justUndefined);

const mapVal = $persist(new Map<string, number>(), "k-map");
expectType<Map<string, number>>(mapVal);

const tupleVal = $persist<[string, number]>(["a", 1], "k-tuple");
expectType<[string, number]>(tupleVal);

// --- Inline typed serializer -----------------------------------------------

const dateVal = $persist(new Date(), "k-date-inline", {
	serialize: (d) => {
		expectType<Date>(d);
		return d.toISOString();
	},
	deserialize: (s) => new Date(s),
});
expectType<Date>(dateVal);

// --- `buildOptions` overloads accepted by `$persist` ------------------------

const optsFromSessionJson = buildOptions(JsonSerializer, BrowserSessionStorage);
const numWithSessionJson = $persist(0, "k-session-json", optsFromSessionJson);
expectType<number>(numWithSessionJson);

const optsFromSuperJson = buildOptions(SuperJsonSerializer);
const numWithSuperJson = $persist(0, "k-superjson", optsFromSuperJson);
expectType<number>(numWithSuperJson);

const optsDefault = buildOptions();
const numWithDefault = $persist(0, "k-default-opts", optsDefault);
expectType<number>(numWithDefault);

// --- Typed serializer via `PersistentRunesSerializerOf<T>` ------------------

const dateSerializer: PersistentRunesSerializerOf<Date> = {
	serialize: (d) => d.toISOString(),
	deserialize: (s) => new Date(s),
};
const dateOpts = buildOptions(dateSerializer);
const dateFromTypedOpts = $persist(new Date(), "k-date-typed", dateOpts);
expectType<Date>(dateFromTypedOpts);

// @ts-expect-error - `dateOpts` is `PersistentRunesOptionsOf<Date>`, not assignable to a number-typed `$persist`
const numWithDateOpts = $persist(0, "k-num-with-date-opts", dateOpts);

// --- Genuine type errors -----------------------------------------------------

// @ts-expect-error - `deserialize` must return `number` for a number-typed `$persist`, not `string`
const badDeserialize = $persist(0, "k-bad-deserialize", {
	deserialize: (s: string) => s,
});

// @ts-expect-error - the storage key must be a `string`, not a `number`
const badKey = $persist(0, 123);

// @ts-expect-error - `serialize` must accept `Date` for a Date-typed `$persist`, not `number`
const badSerialize = $persist(new Date(), "k-bad-serialize", {
	serialize: (v: number) => "",
});

// @ts-expect-error - the tuple literal has an extra element not assignable to `[string, number]`
const badTuple = $persist<[string, number]>(["a", 1, true], "k-bad-tuple");

// @ts-expect-error - `storageRead` must return `string | undefined`, not `number`
const badStorageRead = $persist(0, "k-bad-storage-read", {
	storageRead: () => 123,
});

// --- Storage spreads and `onError` -------------------------------------------

const numWithCookieStorage = $persist(0, "k-cookie-storage", {
	...BrowserCookieStorage,
});
expectType<number>(numWithCookieStorage);

const numWithOnError = $persist(0, "k-on-error", {
	onError: (_error, ctx) => {
		expectType<"read" | "write" | "remove">(ctx.operation);
		return ctx.operation;
	},
});
expectType<number>(numWithOnError);

// --- Class fields ------------------------------------------------------------

class PersistedClass {
	name = $persist("x", "k-class-name");
	count: number = $persist(0, "k-class-count");
}
const instance = new PersistedClass();
expectType<string>(instance.name);
expectType<number>(instance.count);

// --- 2.1.0 shape preservation (Parameters/ReturnType of the last overload) --

type PersistParams = Parameters<typeof $persist>;
type BuildOptionsReturn = ReturnType<typeof buildOptions>;

export type ShapeChecks = [
	Expect<
		Equal<
			PersistParams,
			[unknown, string, (Partial<PersistentRunesOptions> | undefined)?]
		>
	>,
	Expect<Equal<BuildOptionsReturn, PersistentRunesOptions>>,
];

export const persistTestD = {
	numVal,
	maybeUser,
	maybeUser2,
	justUndefined,
	mapVal,
	tupleVal,
	dateVal,
	numWithSessionJson,
	numWithSuperJson,
	numWithDefault,
	dateFromTypedOpts,
	numWithCookieStorage,
	numWithOnError,
	instance,
};
