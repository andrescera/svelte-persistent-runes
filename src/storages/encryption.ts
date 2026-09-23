// @ts-expect-error
import toHex from "sjcl-codec-hex/from-bits";
// @ts-expect-error
import fromHex from "sjcl-codec-hex/to-bits";
// @ts-expect-error
import sjcl from "sjcl-es";
import type { PersistentRunesStorage } from "../types";

export function addEncryptionStorage(
	onStorage: PersistentRunesStorage,
	encryptionKey: string,
	iv = "spr",
): PersistentRunesStorage {
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
			const encodedIv = sjcl.codec.utf8String.toBits(iv);
			const data = `${toHex(sjcl.mode.gcm.encrypt(cipher, sjcl.codec.utf8String.toBits(value), encodedIv, [], 256))}:${toHex(encodedIv)}`;
			onStorage.storageWrite(key, data);
		},
	};
}
