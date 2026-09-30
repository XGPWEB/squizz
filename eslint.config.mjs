import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    ".next-build/**",
    "deploy/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      // Vendored shadcn components: keep the registry source intact.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["components/squizz/media.tsx", "components/squizz/question-play.tsx"],
    rules: {
      // Quiz media are uploaded files or arbitrary https links added by authors: next/image cannot
      // optimise unknown remote hosts, and these images are not the page's LCP.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
