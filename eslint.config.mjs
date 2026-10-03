import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{ ignores: ["node_modules/", "dist/", ".wrangler/"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.mjs", "**/*.cjs"],
		languageOptions: { globals: globals.node },
	},
	{
		files: ["**/*.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
);
