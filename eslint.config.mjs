import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Override default ignores of eslint-config-next (and add our own).
  // Put this first so it applies regardless of later config ordering.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Local scripts (dev/debug) are not part of the app bundle.
    "scripts/**",
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
