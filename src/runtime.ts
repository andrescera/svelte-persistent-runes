import { buildOptions } from "./build-options";
import type {
	PersistentRunesErrorContext,
	PersistentRunesOptions,
	PersistentRunesOptionsOf,
} from "./types";

/**
 * Stable public API consumed by code the preprocessor emits for each `$persist` value.
 * A handle captures storage configuration and protects stored data after a failed read.
 */
export interface Persistence<T> {
	/** Read storage once; return true and fill `value` when a stored value was deserialized. */
	restore(): boolean;
	readonly value: T | undefined;
	/** Persist a value; `undefined` removes the key when storage supports removal. */
	write(value: T): void;
}

/**
 * Create the stable public persistence handle used by emitted preprocessor code.
 * Defaults and per-value options are merged only once, when the handle is created.
 * @param key Storage key to read and write.
 * @param options Optional storage, serializer, and error-handler overrides.
 * @returns A handle for restoration and subsequent writes.
 */
export function createPersistence<T = any>(
	key: string,
	options?:
		| Partial<PersistentRunesOptions>
		| Partial<PersistentRunesOptionsOf<T>>,
): Persistence<T> {
	const config = { ...buildOptions(undefined, undefined), ...options };
	let value: T | undefined;
	let failed = false;
	let skipped = false;

	function report(
		error: unknown,
		operation: PersistentRunesErrorContext["operation"],
	): void {
		const context: PersistentRunesErrorContext = { key, operation };
		if (typeof config.onError === "function") {
			try {
				config.onError(error, context);
			} catch (handlerError) {
				console.warn(handlerError);
			}
		} else {
			console.warn(
				`[svelte-persistent-runes] Failed to ${operation} "${key}"`,
				error,
			);
		}
	}

	return {
		restore(): boolean {
			try {
				const raw = config.storageRead(key);
				if (raw === undefined || raw === null) return false;
				value = config.deserialize(raw);
				return true;
			} catch (error) {
				failed = true;
				report(error, "read");
				return false;
			}
		},
		get value(): T | undefined {
			return value;
		},
		write(next: T): void {
			if (failed && !skipped) {
				skipped = true;
				return;
			}
			if (next === undefined) {
				if (typeof config.storageRemove === "function") {
					try {
						config.storageRemove(key);
					} catch (error) {
						report(error, "remove");
					}
				}
				return;
			}
			try {
				config.storageWrite(key, config.serialize(next));
			} catch (error) {
				report(error, "write");
			}
		},
	};
}

/**
 * Register persistence for code the preprocessor emits; stable public API.
 * If an effect has no owner, retry it inside a root instead.
 * @param handle The persistence handle to write through.
 * @param read Read the current reactive value.
 * @param effect Register a reactive effect.
 * @param root Create a fallback effect root.
 */
export function track<T>(
	handle: Persistence<T>,
	read: () => T,
	effect: (fn: () => void) => void,
	root: (fn: () => void) => () => void,
): void {
	const run = () => {
		handle.write(read());
	};
	try {
		effect(run);
	} catch {
		root(() => {
			effect(run);
		});
	}
}
