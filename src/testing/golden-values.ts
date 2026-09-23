export const GOLDEN_VALUES: Record<string, unknown> = {
	number: 42,
	negative: -1.5,
	zero: 0,
	emptyString: "",
	string: 'héllo "quoted" ✓',
	true: true,
	false: false,
	null: null,
	array: [1, "a", null, [2]],
	object: { a: 1, b: { c: "d" }, e: [true] },
	date: new Date("2020-01-02T03:04:05.000Z"),
	map: new Map([["a", 1]]),
	set: new Set([1, 2]),
	bigint: 10n,
	undefinedProp: { a: undefined },
};

export const GOLDEN_ENCRYPTION_KEY = "12345678901234567890123456879012";
export const GOLDEN_PLAINTEXTS = ["42", '"héllo"', '{"a":[1,2]}', ""];
