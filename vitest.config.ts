import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "tests/obsidian-mock.ts"),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		include: ["tests/**/*.test.ts"],
	},
});
