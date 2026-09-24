export default {
	files: ["src/**/*.runtime.spec.ts"],
	extensions: ["ts"],
	nodeArguments: [
		"--import=tsx",
		"--conditions=browser",
		"--import=./src/testing/raf-shim.mjs",
	],
	timeout: "60s",
};
