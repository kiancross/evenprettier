/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { TSESLint } from "@typescript-eslint/utils";

import { reportMissingPadding } from "./helpers.js";

export const wrappedObjectPropertyPadding: TSESLint.RuleModule<"blankLineRequired"> =
  {
    meta: {
      type: "layout",
      fixable: "whitespace",

      docs: {
        description: "Require blank lines around wrapped object properties.",
      },

      schema: [],

      messages: {
        blankLineRequired:
          "Expected a blank line between a wrapped object property and the property next to it.",
      },
    },

    create(context) {
      return {
        ObjectExpression(node) {
          reportMissingPadding(context, node.properties);
        },
      };
    },
  };
