import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";

export default [
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/out/**", "docs/**"],
  },
  js.configs.recommended,
  ...nextVitals.map((config) => ({ ...config, files: ["apps/web/**/*.{js,jsx,mjs}"] })),
  {
    files: ["apps/web/**/*.{js,jsx,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: { next: { rootDir: "apps/web/" } },
  },
  {
    files: ["apps/api/**/*.js", "*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "prefer-const": "warn",
      eqeqeq: ["error", "always"],
    },
  },
];
