import { defineConfig } from "tsdown";

export default defineConfig({
	entry: {
		index: "./src/index.ts",
		lambda: "./src/lambda.ts",
		migrate: "./src/migrate.ts",
	},
	format: "esm",
	loader: {
		".sql": "text",
	},
	outDir: "./dist",
	clean: true,
	deps: {
		alwaysBundle: [/./],
		onlyBundle: false,
	},
});
