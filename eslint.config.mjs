import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const reactHookBaselineRules = {
  "react-hooks/immutability": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/static-components": "warn",
  "react-hooks/refs": "warn",
};

const nextVitalsWithBaseline = nextVitals.map((config) => {
  if (!config.plugins?.["react-hooks"]) return config;

  return {
    ...config,
    rules: {
      ...config.rules,
      ...reactHookBaselineRules,
    },
  };
});

const eslintConfig = defineConfig([
  ...nextVitalsWithBaseline,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
