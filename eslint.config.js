import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[property.name=/^(slice|split|substring)$/] > CallExpression.object > MemberExpression[property.name='toISOString']",
          message:
            "Do not derive a yyyy-MM-dd string from toISOString() — it shifts by a day in non-UTC timezones. Use toISODate() from @/utils/dateFormat.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'] > Identifier[name=/^(dob|dateOfBirth|date_of_birth|studentDob|birthDate)$/]",
          message:
            "Do not parse a date-of-birth string with new Date() — it shifts by a day outside UTC. Use parseDateOnly()/calculateAgeYears() from @/utils/birthDate.",
        },
      ],
    },
  },
  {
    files: ["src/utils/dateFormat.ts", "src/utils/birthDate.ts"],
    rules: { "no-restricted-syntax": "off" },
  }
);
