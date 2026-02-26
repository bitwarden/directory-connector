// @ts-check
import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import rxjsX from "eslint-plugin-rxjs-x";
import rxjsAngularX from "eslint-plugin-rxjs-angular-x";
import angularEslint from "@angular-eslint/eslint-plugin-template";
import angularParser from "@angular-eslint/template-parser";
import globals from "globals";

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      "dist/**",
      "dist-cli/**",
      "build/**",
      "build-cli/**",
      "coverage/**",
      "**/*.cjs",
      "eslint.config.mjs",
      "scripts/**/*.js",
      "**/node_modules/**",
    ],
  },

  // Base config for all JavaScript/TypeScript files
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      "rxjs-x": rxjsX,
      "rxjs-angular-x": rxjsAngularX,
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // ESLint recommended rules
      ...eslint.configs.recommended.rules,

      // TypeScript ESLint recommended rules
      ...tsPlugin.configs.recommended.rules,

      // Import plugin recommended rules
      ...importPlugin.flatConfigs.recommended.rules,

      // RxJS recommended rules
      ...rxjsX.configs.recommended.rules,

      // Custom project rules
      "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
      "@typescript-eslint/no-explicit-any": "off", // TODO: This should be re-enabled
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/no-this-alias": ["error", { allowedNames: ["self"] }],
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      "no-console": "error",
      "import/no-unresolved": "off", // TODO: Look into turning on once each package is an actual package.
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
          },
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "@/libs/**",
              group: "external",
              position: "after",
            },
            {
              pattern: "@/jslib/**",
              group: "external",
              position: "after",
            },
            {
              pattern: "@/src-gui/**",
              group: "external",
              position: "after",
            },
            {
              pattern: "@/src-cli/**",
              group: "external",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "rxjs-angular-x/prefer-takeuntil": "error",
      "rxjs-x/no-exposed-subjects": ["error", { allowProtected: true }],
      "no-restricted-syntax": [
        "error",
        {
          message: "Calling `svgIcon` directly is not allowed",
          selector: "CallExpression[callee.name='svgIcon']",
        },
        {
          message: "Accessing FormGroup using `get` is not allowed, use `.value` instead",
          selector:
            "ChainExpression[expression.object.callee.property.name='get'][expression.property.name='value']",
        },
      ],
      curly: ["error", "all"],
      "import/namespace": ["off"], // This doesn't resolve namespace imports correctly, but TS will throw for this anyway
      "no-restricted-imports": ["error", { patterns: ["src/**/*"] }],
    },
  },

  // Jest test files (includes any test-related files)
  {
    files: ["**/*.spec.ts", "**/test.setup.ts", "**/spec/**/*.ts", "**/utils/**/*fixtures*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // Angular HTML templates
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: angularParser,
    },
    plugins: {
      "@angular-eslint/template": angularEslint,
    },
    rules: {
      "@angular-eslint/template/button-has-type": "error",
    },
  },

  // Prettier config (must be last to override other configs)
  prettierConfig,
];
