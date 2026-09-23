export function installFakeWindow(opts?: { throwOnSet?: boolean }): {
	local: Map<string, string>;
	session: Map<string, string>;
	restore(): void;
} {
	const original = Object.getOwnPropertyDescriptor(globalThis, "window");
	const local = new Map<string, string>();
	const session = new Map<string, string>();
	const storage = (data: Map<string, string>) => ({
		getItem(key: string): string | null {
			return data.get(key) ?? null;
		},
		setItem(key: string, value: string): void {
			if (opts?.throwOnSet) throw new Error("Storage setItem failed");
			data.set(key, value);
		},
		removeItem(key: string): void {
			data.delete(key);
		},
	});
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: { localStorage: storage(local), sessionStorage: storage(session) },
	});
	return {
		local,
		session,
		restore(): void {
			if (original) Object.defineProperty(globalThis, "window", original);
			else Reflect.deleteProperty(globalThis, "window");
		},
	};
}

export function installFakeDocument(): {
	assignments: string[];
	jar: Map<string, string>;
	restore(): void;
} {
	const original = Object.getOwnPropertyDescriptor(globalThis, "document");
	const assignments: string[] = [];
	const jar = new Map<string, string>();
	Object.defineProperty(globalThis, "document", {
		configurable: true,
		value: {
			get cookie(): string {
				return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
			},
			set cookie(assignment: string) {
				assignments.push(assignment);
				const pair = assignment.split(";", 1)[0];
				const separator = pair.indexOf("=");
				const name = pair.slice(0, separator).trim();
				const value = pair.slice(separator + 1);
				const expires = /(?:^|;)\s*expires=([^;]*)/i.exec(assignment);
				const maxAge = /(?:^|;)\s*max-age=([^;]*)/i.exec(assignment);
				if (
					(expires && Date.parse(expires[1]) < Date.now()) ||
					(maxAge && Number(maxAge[1]) <= 0)
				) {
					jar.delete(name);
				} else {
					jar.set(name, value);
				}
			},
		},
	});
	return {
		assignments,
		jar,
		restore(): void {
			if (original) Object.defineProperty(globalThis, "document", original);
			else Reflect.deleteProperty(globalThis, "document");
		},
	};
}
