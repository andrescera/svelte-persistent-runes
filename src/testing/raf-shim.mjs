globalThis.requestAnimationFrame ??= (cb) =>
	setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);
