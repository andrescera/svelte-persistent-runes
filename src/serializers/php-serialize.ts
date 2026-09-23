import * as PhpSerialize from "php-serialize";
import type { PersistentRunesSerializer } from "../types";

export function PhpSerializeSerializerFactory(options?: {
	givenOptions?: Parameters<typeof PhpSerialize.serialize>[2];
	scope?: Parameters<typeof PhpSerialize.serialize>[1];
}): PersistentRunesSerializer {
	return {
		deserialize<T>(input: string): T {
			return PhpSerialize.unserialize(
				input,
				options?.scope,
				options?.givenOptions,
			);
		},
		serialize<T>(input: T): string {
			return PhpSerialize.serialize(
				input,
				options?.scope,
				options?.givenOptions,
			);
		},
	};
}

export const PhpSerializeSerializer: PersistentRunesSerializer =
	/* @__PURE__ */ PhpSerializeSerializerFactory();
