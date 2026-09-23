export default {
	files: ["src/**/*.spec.ts", "!src/**/*.runtime.spec.ts"],
	extensions: ["ts"],
	nodeArguments: ["--import=tsx"],
	timeout: "60s",
};
