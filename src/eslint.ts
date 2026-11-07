/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { TSESLint } from "@typescript-eslint/utils";

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import perfectionist from "eslint-plugin-perfectionist";
import globals from "globals";
import tseslint from "typescript-eslint";

import { plugin } from "./eslint-plugin.js";

export interface EvenprettierOptions {
  tsconfigRootDir?: string;
  internalPattern?: string[];
  ignores?: string[];
  untypedFiles?: string[];
}

const JAVASCRIPT_FILES = ["**/*.js", "**/*.mjs", "**/*.cjs"];

const padAround = (kind: string) => [
  { blankLine: "always", prev: kind, next: "*" },
  { blankLine: "always", prev: "*", next: kind },
];

export function evenprettier({
  tsconfigRootDir,
  internalPattern = [],
  ignores = [],
  untypedFiles = [],
}: EvenprettierOptions = {}): TSESLint.FlatConfig.ConfigArray {
  /*
   * `tseslint.config` is deprecated, but the types of ESLint's own
   * `defineConfig` reject the `typescript-eslint` plugin types used here.
   */
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return tseslint.config(
    {
      ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", ...ignores],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },

      plugins: {
        "@stylistic": stylistic,
        perfectionist,
        evenprettier: plugin,
      },

      rules: {
        "perfectionist/sort-imports": [
          "error",
          {
            type: "natural",
            order: "asc",
            ignoreCase: true,
            partitionByNewLine: true,
            newlinesBetween: "ignore",
            newlinesInside: "ignore",

            groups: [
              "builtin",
              "external",
              "internal",
              ["parent", "sibling", "index"],
            ],

            internalPattern,
          },
        ],

        "perfectionist/sort-named-imports": [
          "error",
          { type: "natural", order: "asc", ignoreCase: true },
        ],

        "perfectionist/sort-exports": [
          "error",
          {
            type: "natural",
            order: "asc",
            ignoreCase: true,
            partitionByNewLine: true,
            newlinesBetween: "ignore",
            newlinesInside: "ignore",
          },
        ],

        "perfectionist/sort-named-exports": [
          "error",
          { type: "natural", order: "asc", ignoreCase: true },
        ],

        "@typescript-eslint/consistent-type-imports": "error",

        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],

        "@typescript-eslint/restrict-template-expressions": [
          "error",
          { allowNumber: true },
        ],

        "@typescript-eslint/no-unnecessary-condition": [
          "error",
          { allowConstantLoopConditions: true },
        ],

        "evenprettier/func-style-multi-statement": "error",
        "evenprettier/wrapped-import-export-padding": "error",
        "evenprettier/wrapped-object-property-padding": "error",
        "@stylistic/no-extra-semi": "error",
        "@stylistic/spaced-comment": ["error", "always"],

        "@stylistic/lines-between-class-members": [
          "error",
          "always",
          { exceptAfterSingleLine: true },
        ],

        "@stylistic/multiline-comment-style": ["error", "starred-block"],

        "@stylistic/padding-line-between-statements": [
          "error",
          {
            blankLine: "always",
            prev: ["case", "default"],
            next: ["case", "default"],
          },
          ...padAround("multiline-expression"),
          ...padAround("multiline-const"),
          ...padAround("multiline-let"),
          ...padAround("function"),
          ...padAround("multiline-block-like"),
          { blankLine: "always", prev: "import", next: "*" },
          { blankLine: "any", prev: "import", next: "import" },
        ],

        // Matches `printWidth` in the Prettier config.
        "@stylistic/max-len": [
          "error",
          {
            code: 86,
            tabWidth: 2,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
          },
        ],
      },
    },
    /*
     * JavaScript files, such as `eslint.config.js`, are usually in no
     * tsconfig, so the type-checked rules cannot run on them. `untypedFiles`
     * adds other files that the type-checked rules cannot run on.
     */
    {
      files: [...JAVASCRIPT_FILES, ...untypedFiles],
      extends: [tseslint.configs.disableTypeChecked],
    },
    /*
     * JavaScript files, such as `astro.config.mjs`, usually run in Node.
     * Without its globals, `no-undef` reports names such as `process`.
     */
    {
      files: JAVASCRIPT_FILES,

      languageOptions: {
        globals: globals.node,
      },
    },
    {
      files: ["**/*.test.ts", "**/test/**/*.ts"],

      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
  );
}

export default evenprettier;
export { plugin };
