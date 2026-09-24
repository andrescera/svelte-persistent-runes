import "svelte-persistent-runes";

export class Profile {
	name: string = $persist<string>("Ada", "vite-profile-name");
	#secret = $persist<string>("hidden", "vite-profile-secret");

	reveal(): string {
		return `${this.name}:${this.#secret}`;
	}
}

export class Box<T> {
	value: T;

	constructor(initial: T) {
		this.value = $persist<T>(initial, "vite-box-value");
	}
}

export function makeCounter(initial: number): () => number {
	let count: number = $persist<number>(initial, "vite-factory-count");
	return () => ++count;
}

export const profile = new Profile();
export const box = new Box<number>(42);
export const nextCount = makeCounter(0);
