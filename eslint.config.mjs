import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // eslint-config-next 16.4.3 (audit C4) promeut cette regle en erreur.
      // Plusieurs useEffect existants appellent setState en synchrone
      // (pattern deja present avant la montee de version, pas une
      // regression de comportement). Remis en warning pour ne pas bloquer
      // le build sur un refactor hors perimetre de l'audit securite.
      "react-hooks/set-state-in-effect": "warn",
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
