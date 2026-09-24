/**
 * How and where a persisted value is stored: a serializer pair, a storage
 * and optional removal and error handling. Every `$persist` call, `load` and
 * `save` accepts a `Partial` of this shape; missing members fall back to
 * JSON in `localStorage`.
 */
export type PersistentRunesOptions = {
	/**
	 * Convert the source data into its string representation
	 * @param input The source data
	 * @return The string representation of data
	 */
	serialize<T>(input: T): string;
	/**
	 * Convert back the string representation into the source data
	 * @param input The string representation of the date
	 * @return The new data based on its string representation
	 */
	deserialize<T>(input: string): T;
	/**
	 * Write data into the store
	 * @param key The storage key to write
	 * @param value The data to write
	 */
	storageWrite(key: string, value: string): void;
	/**
	 * Read data from the storage
	 * @param key The storage key to read
	 * @returns The data or `undefined` if the data don't exist in the storage
	 */
	storageRead(key: string): string | undefined;
	/** Optional in 2.2.0: remove a value from the storage by key. */
	storageRemove?(key: string): void;
	/** Optional in 2.2.0: report a persistence error with its key and operation. */
	onError?(error: unknown, context: PersistentRunesErrorContext): void;
};

/**
 * The storage half of {@link PersistentRunesOptions}: `storageWrite`,
 * `storageRead` and the optional `storageRemove`. Implement it to persist
 * strings somewhere other than the built-in browser storages.
 */
export type PersistentRunesStorage = Pick<
	PersistentRunesOptions,
	"storageWrite" | "storageRead" | "storageRemove"
>;
/**
 * The serializer half of {@link PersistentRunesOptions}: a `serialize` /
 * `deserialize` pair that is generic over every value type. For a serializer
 * bound to one type, see {@link PersistentRunesSerializerOf}.
 */
export type PersistentRunesSerializer = Pick<
	PersistentRunesOptions,
	"serialize" | "deserialize"
>;

/**
 * The context given to `onError`: the storage key involved and which
 * operation (`read`, `write` or `remove`) failed.
 */
export type PersistentRunesErrorContext = {
	key: string;
	operation: "read" | "write" | "remove";
};

/**
 * A serializer for exactly one type `T`. Passing it to `$persist` makes the
 * compiler check that the persisted value is a `T`.
 */
export type PersistentRunesSerializerOf<T> = {
	serialize(input: T): string;
	deserialize(input: string): T;
};

/**
 * {@link PersistentRunesOptions} typed for a single value type `T`:
 * a {@link PersistentRunesSerializerOf} plus a storage and `onError`.
 * This is what `buildOptions` returns when given a typed serializer.
 */
export type PersistentRunesOptionsOf<T> = PersistentRunesSerializerOf<T> &
	PersistentRunesStorage &
	Pick<PersistentRunesOptions, "onError">;

export type NoInferCompat<T> = [T][T extends any ? 0 : never];
