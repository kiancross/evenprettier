/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  AST_NODE_TYPES,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";

import { reportMissingPadding } from "./helpers.js";

export const wrappedImportExportPadding: TSESLint.RuleModule<"blankLineRequired"> = {
  meta: {
    type: "layout",
    fixable: "whitespace",

    docs: {
      description: "Require blank lines around wrapped import and export statements.",
    },

    schema: [],

    messages: {
      blankLineRequired:
        "Expected a blank line between a wrapped import or export and the statement next to it.",
    },
  },

  create(context) {
    const isImportOrExport = (node: TSESTree.ProgramStatement): boolean =>
      node.type === AST_NODE_TYPES.ImportDeclaration ||
      node.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      node.type === AST_NODE_TYPES.ExportAllDeclaration ||
      node.type === AST_NODE_TYPES.ExportDefaultDeclaration;

    return {
      Program(program) {
        reportMissingPadding(context, program.body.filter(isImportOrExport));
      },
    };
  },
};
