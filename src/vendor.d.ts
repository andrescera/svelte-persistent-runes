declare module "sjcl-es" {
	class AesCipher {
		constructor(key: number[]);
		encrypt(block: number[]): number[];
		decrypt(block: number[]): number[];
	}

	const sjcl: {
		cipher: { aes: typeof AesCipher };
		mode: {
			gcm: {
				encrypt(
					cipher: AesCipher,
					plaintext: number[],
					iv: number[],
					adata?: number[],
					tlen?: number,
				): number[];
				decrypt(
					cipher: AesCipher,
					ciphertext: number[],
					iv: number[],
				): number[];
			};
		};
		codec: {
			utf8String: {
				toBits(value: string): number[];
				fromBits(bits: number[]): string;
			};
		};
	};
	export default sjcl;
}

declare module "sjcl-codec-hex/from-bits" {
	export default function toHex(bits: number[]): string;
}

declare module "sjcl-codec-hex/to-bits" {
	export default function fromHex(hex: string): number[];
}
