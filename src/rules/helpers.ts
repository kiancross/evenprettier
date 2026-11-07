/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  AST_TOKEN_TYPES,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";

type Positioned = TSESTree.Node | TSESTree.Token;
type SourceCode = Readonly<TSESLint.SourceCode>;
type PaddingRuleContext = Readonly<TSESLint.RuleContext<"blankLineRequired", []>>;

const isCommaOrComment = (token: TSESTree.Token): boolean =>
  token.value === "," ||
  token.type === AST_TOKEN_TYPES.Line ||
  token.type === AST_TOKEN_TYPES.Block;

const spansMultipleLines = (node: Positioned): boolean =>
  node.loc.end.line > node.loc.start.line;

const isOnSameLine = (previous: Positioned, next: Positioned): boolean =>
  next.loc.start.line === previous.loc.end.line;

function hasBlankLineBetween(
  sourceCode: SourceCode,
  before: Positioned,
  after: Positioned,
): boolean {
  /*
   * Line numbers count from 1 but `lines` counts from 0, so this slice holds
   * every line between the end of `before` and the start of `after`.
   */
  const linesBetween = sourceCode.lines.slice(
    before.loc.end.line,
    after.loc.start.line - 1,
  );

  return linesBetween.some((line) => line.trim() === "");
}

/*
 * Returns `node`, unless commas or comments follow `node` on the same line.
 * Then it returns the last of those commas and comments, so that a line break
 * after the result does not move a comma or comment to the next line. In
 * `f(), // Note.`, it returns the comment.
 */
function tokenToBreakAfter(sourceCode: SourceCode, node: Positioned): Positioned {
  const tokenAfter = (token: Positioned): TSESTree.Token | null =>
    sourceCode.getTokenAfter(token, { includeComments: true });

  let last = node;
  let next = tokenAfter(last);

  while (next && isOnSameLine(last, next) && isCommaOrComment(next)) {
    last = next;
    next = tokenAfter(last);
  }

  return last;
}

/*
 * Reports two neighbouring nodes that have no blank line between them, if
 * either node is wrapped.
 */
export function reportMissingPadding(
  context: PaddingRuleContext,
  nodes: TSESTree.Node[],
): void {
  const sourceCode = context.sourceCode;

  for (let i = 0; i < nodes.length - 1; i += 1) {
    const current = nodes[i];
    const next = nodes[i + 1];

    const isEitherWrapped = spansMultipleLines(current) || spansMultipleLines(next);

    if (isEitherWrapped && !hasBlankLineBetween(sourceCode, current, next)) {
      context.report({
        node: next,
        messageId: "blankLineRequired",

        fix(fixer) {
          return fixer.insertTextAfter(tokenToBreakAfter(sourceCode, current), "\n");
        },
      });
    }
  }
}
