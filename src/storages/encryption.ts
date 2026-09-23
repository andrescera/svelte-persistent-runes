import toHex from "sjcl-codec-hex/from-bits";
import fromHex from "sjcl-codec-hex/to-bits";
import sjcl from "sjcl-es";
import type { PersistentRunesStorage } from "../types";

export function addEncryptionStorage(
	onStorage: PersistentRunesStorage,
	encryptionKey: string,
	/** @deprecated Ignored since 2.2.0: a random IV is generated for every write. */
	iv?: string,
): PersistentRunesStorage {
	void iv;
	const cipher = new sjcl.cipher.aes(fromHex(encryptionKey));
	return {
		storageRead(key: string): string | undefined {
			const data = onStorage.storageRead(key);
			if (data === undefined) return undefined;
			return sjcl.codec.utf8String.fromBits(
				sjcl.mode.gcm.decrypt(
					cipher,
					fromHex(data.split(":")[0]),
					fromHex(data.split(":")[1]),
				),
			);
		},
		storageWrite(key: string, value: string): void {
			if (!globalThis.crypto?.getRandomValues) {
				throw new Error(
					"[svelte-persistent-runes] addEncryptionStorage needs crypto.getRandomValues",
				);
			}
			const bytes = globalThis.crypto.getRandomValues(new Uint8Array(12));
			const ivBits = fromHex(
				Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
					"",
				),
			);
			const data = `${toHex(sjcl.mode.gcm.encrypt(cipher, sjcl.codec.utf8String.toBits(value), ivBits, [], 128))}:${toHex(ivBits)}`;
			onStorage.storageWrite(key, data);
		},
		storageRemove(key: string): void {
			onStorage.storageRemove?.(key);
		},
	};
}
