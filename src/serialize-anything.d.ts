declare module "serialize-anything" {
	// biome-ignore lint/suspicious/noExplicitAny: Original type
	export function serialize(
		source: unknown,
		options?: {
			maxDepth?: number;
			pretty?: boolean;
		},
	): string;
	// biome-ignore lint/suspicious/noExplicitAny: Original type
	export function deserialize(source: string): any;
}
