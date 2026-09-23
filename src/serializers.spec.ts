import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import test from "ava";
import {
	DevalueSerializer,
	DevalueSerializerFactory,
} from "./serializers/devalue";
import {
	ESSerializerSerializer,
	ESSerializerSerializerFactory,
} from "./serializers/esserializer";
import { JsonSerializer, JsonSerializerFactory } from "./serializers/json";
import {
	MacfjaSerializer,
	MacfjaSerializerFactory,
} from "./serializers/macfja";
import {
	NextJsonSerializer,
	NextJsonSerializerFactory,
} from "./serializers/next-json";
import {
	PhpSerializeSerializer,
	PhpSerializeSerializerFactory,
} from "./serializers/php-serialize";
import {
	SerializeAnythingSerializer,
	SerializeAnythingSerializerFactory,
} from "./serializers/serialize-anything";
import { SuperJsonSerializer } from "./serializers/superjson";
import { GOLDEN_VALUES } from "./testing/golden-values";
import type { PersistentRunesSerializer } from "./types";

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

const golden = JSON.parse(
	readFileSync(
		new URL("../fixtures/golden/serializers.json", import.meta.url),
		"utf8",
	),
) as Record<string, Record<string, { record?: string; skipped?: string }>>;

/* ------------------------------------------------------------------ *
 * Each factory is exercised with at least one non-default option, to  *
 * prove the option is forwarded to the underlying library.            *
 * ------------------------------------------------------------------ */

test("JsonSerializerFactory forwards space and reviver", (t) => {
	const serializer = JsonSerializerFactory({
		space: 2,
		reviver: (key, value) => (key === "n" ? (value as number) * 2 : value),
	});
	const value = { n: 21, nested: { ok: true } };
	const record = serializer.serialize(value);
	t.true(record.includes('\n  "n": 21'));
	const restored = serializer.deserialize(record) as {
		n: number;
		nested: { ok: boolean };
	};
	t.is(restored.n, 42);
	t.deepEqual(restored.nested, { ok: true });
	t.not(record, JsonSerializer.serialize(value));
});

class DevalueVector {
	constructor(
		public x: number,
		public y: number,
	) {}
}

test("DevalueSerializerFactory forwards reducers and revivers", (t) => {
	const serializer = DevalueSerializerFactory({
		reducers: {
			DevalueVector: (value) =>
				value instanceof DevalueVector ? [value.x, value.y] : undefined,
		},
		revivers: {
			DevalueVector: ([x, y]) => new DevalueVector(x as number, y as number),
		},
	});
	const restored = serializer.deserialize<DevalueVector>(
		serializer.serialize(new DevalueVector(3, 4)),
	);
	t.true(restored instanceof DevalueVector);
	t.is(restored.x, 3);
	t.is(restored.y, 4);
});

class EsWidget {
	name = "widget";
	size = 3;
}

test("ESSerializerSerializerFactory forwards classes", (t) => {
	const serializer = ESSerializerSerializerFactory({ classes: [EsWidget] });
	const restored = serializer.deserialize<EsWidget>(
		serializer.serialize(new EsWidget()),
	);
	t.true(restored instanceof EsWidget);
	t.is(restored.name, "widget");
	t.is(restored.size, 3);
});

class MacWidget {
	label = "hi";
}

test("MacfjaSerializerFactory forwards allowedClasses", (t) => {
	const serializer = MacfjaSerializerFactory({ allowedClasses: { MacWidget } });
	const restored = serializer.deserialize<MacWidget>(
		serializer.serialize(new MacWidget()),
	);
	t.true(restored instanceof MacWidget);
	t.is(restored.label, "hi");
});

test("NextJsonSerializerFactory forwards space", (t) => {
	const serializer = NextJsonSerializerFactory({ space: 2 });
	const value = { a: 1, nested: { b: 2 } };
	const record = serializer.serialize(value);
	t.true(record.includes('\n  "a": 1'));
	t.deepEqual(serializer.deserialize(record), value);
	t.not(record, NextJsonSerializer.serialize(value));
});

class PhpWidget {
	value = "v";
}

test("PhpSerializeSerializerFactory forwards scope", (t) => {
	const serializer = PhpSerializeSerializerFactory({ scope: { PhpWidget } });
	const restored = serializer.deserialize<PhpWidget>(
		serializer.serialize(new PhpWidget()),
	);
	t.true(restored instanceof PhpWidget);
	t.is(restored.value, "v");
});

test("SerializeAnythingSerializerFactory forwards pretty", (t) => {
	const value = { a: 1, nested: { b: 2 } };
	const pretty = SerializeAnythingSerializerFactory({ pretty: true });
	const record = pretty.serialize(value);
	t.true(record.includes("\n  "));
	t.not(record, SerializeAnythingSerializer.serialize(value));
	t.deepEqual(pretty.deserialize(record), value);
});

/* ------------------------------------------------------------------ *
 * Every serializer round-trips every GOLDEN_VALUES case that the      *
 * frozen golden fixture did not mark as skipped.                      *
 * ------------------------------------------------------------------ */

for (const [name, serializer] of Object.entries(serializers)) {
	for (const [valueName, fixture] of Object.entries(golden[name])) {
		if (fixture.record === undefined) continue;
		test(`${name} round-trips live golden ${valueName}`, (t) => {
			const value = GOLDEN_VALUES[valueName];
			const restored = serializer.deserialize(serializer.serialize(value));
			t.true(isDeepStrictEqual(restored, value));
		});
	}
}
