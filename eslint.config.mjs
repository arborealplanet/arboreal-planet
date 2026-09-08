import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/components/ChondroBreederGame.tsx",
      "src/components/ChondroBreederGameV3.tsx",
    ],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  {
    files: [
      "src/components/ChondroBreederSocial.tsx",
      "src/components/ChondroBreederFacility.tsx",
      "src/components/ChondroBreederExpandedShop.tsx",
      "src/components/ChondroBreederLines.tsx",
      "src/components/ChondroConservationPartnerships.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
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
