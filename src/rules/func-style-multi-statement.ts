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

/*
 * Replaces the built-in `func-style: declaration` rule, which also flags
 * short arrow functions that read better as expressions.
 */
export const funcStyleMultiStatement: TSESLint.RuleModule<"declaration"> = {
  meta: {
    type: "suggestion",

    docs: {
      description:
        "Require function declarations when the body has more than one statement; allow arrow expressions otherwise.",
    },

    schema: [],

    messages: {
      declaration:
        "Expected a function declaration (the body has more than one statement).",
    },
  },

  create(context) {
    const isFunctionInitialiser = (
      init: TSESTree.Expression | null,
    ): init is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression =>
      init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      init?.type === AST_NODE_TYPES.FunctionExpression;

    const isMultiStatementBlock = (
      body: TSESTree.BlockStatement | TSESTree.Expression,
    ): boolean => body.type === AST_NODE_TYPES.BlockStatement && body.body.length > 1;

    return {
      VariableDeclarator(declarator) {
        const init = declarator.init;

        if (isFunctionInitialiser(init) && isMultiStatementBlock(init.body)) {
          context.report({ node: init, messageId: "declaration" });
        }
      },
    };
  },
};
