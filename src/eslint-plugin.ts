/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from "node:fs";

import type { TSESLint } from "@typescript-eslint/utils";

import { funcStyleMultiStatement } from "./rules/func-style-multi-statement.js";
import { wrappedImportExportPadding } from "./rules/wrapped-import-export-padding.js";
import { wrappedObjectPropertyPadding } from "./rules/wrapped-object-property-padding.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string; version: string };

export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: packageJson.name,
    version: packageJson.version,
  },

  rules: {
    "func-style-multi-statement": funcStyleMultiStatement,
    "wrapped-import-export-padding": wrappedImportExportPadding,
    "wrapped-object-property-padding": wrappedObjectPropertyPadding,
  },
};
