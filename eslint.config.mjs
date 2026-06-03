import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".vercel/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // File template DOCX yang di-encode base64 — terlalu besar untuk di-lint
      // dan tidak perlu karena di-generate otomatis dari .docx asli.
      "src/lib/reports/templates/*.base64.ts",
    ],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
