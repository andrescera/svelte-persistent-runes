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

export type PersistentRunesStorage = Pick<
	PersistentRunesOptions,
	"storageWrite" | "storageRead" | "storageRemove"
>;
export type PersistentRunesSerializer = Pick<
	PersistentRunesOptions,
	"serialize" | "deserialize"
>;

export type PersistentRunesErrorContext = {
	key: string;
	operation: "read" | "write" | "remove";
};

export type PersistentRunesSerializerOf<T> = {
	serialize(input: T): string;
	deserialize(input: string): T;
};

export type PersistentRunesOptionsOf<T> = PersistentRunesSerializerOf<T> &
	PersistentRunesStorage &
	Pick<PersistentRunesOptions, "onError">;

export type NoInferCompat<T> = [T][T extends any ? 0 : never];
