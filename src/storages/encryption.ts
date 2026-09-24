import toHex from "sjcl-codec-hex/from-bits";
import fromHex from "sjcl-codec-hex/to-bits";
import sjcl from "sjcl-es";
import type { PersistentRunesStorage } from "../types";

/**
 * Wrap a {@link PersistentRunesStorage} so that the stored string is encrypted
 * with AES-GCM before it is written and decrypted after it is read.
 *
 * Since 2.2.0 every write uses a fresh random 96-bit IV from
 * `crypto.getRandomValues`, stored next to the ciphertext as `cipher:iv` (both hex).
 * Writing throws if `crypto.getRandomValues` is not available. Data written by
 * 2.1.0 with a fixed IV is still readable. Removal is delegated to the wrapped storage.
 *
 * A key that ships in client-side JavaScript is not a secret: this wrapper only
 * obfuscates the stored data against casual inspection.
 * @param onStorage The storage to wrap; it receives the encrypted strings
 * @param encryptionKey The AES key as a hex string (32 hex characters for AES-128, 64 for AES-256)
 * @param iv Deprecated and ignored; kept so 2.1.0 calls keep compiling
 * @returns A storage that encrypts on write and decrypts on read
 */
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
