/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  format,
  type Options,
  type Parser,
  type ParserOptions,
  type Printer,
} from "prettier";

import * as babelPlugin from "prettier/plugins/babel";
import * as typescriptPlugin from "prettier/plugins/typescript";

const AST_FORMAT = "evenprettier-padded";

interface FormattedTextNode {
  type: "FormattedText";
  body: string;
}

/*
 * The babel and typescript parsers return different AST types, so the code
 * below checks only the fields it reads.
 */
type AstNode = Record<string, unknown>;

interface BlockStatement {
  type: "BlockStatement";
  loc: { end: { line: number } };
}

function isObject(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null;
}

function isBlockStatement(node: unknown): node is BlockStatement {
  return isObject(node) && node.type === "BlockStatement";
}

/*
 * Returns the objects that `node` holds, directly or in an array. These are its
 * child nodes, plus objects such as its position, which hold no `if` or `try`.
 */
function childrenOf(node: AstNode): AstNode[] {
  return Object.values(node)
    .flatMap((value) => (Array.isArray(value) ? (value as unknown[]) : [value]))
    .filter(isObject);
}

function* nodesIn(node: AstNode): Generator<AstNode> {
  yield node;

  for (const child of childrenOf(node)) {
    yield* nodesIn(child);
  }
}

// Returns the blocks of `node` that are followed by `else`, `catch`, or `finally`.
function blocksFollowedByBranch(node: AstNode): BlockStatement[] {
  const blocks: unknown[] = [];

  if (node.type === "IfStatement") {
    const ifBlock = node.consequent;
    const elseBranch = node.alternate;

    if (elseBranch) blocks.push(ifBlock);
  }

  if (node.type === "TryStatement") {
    const tryBlock = node.block;
    const catchClause = node.handler;
    const finallyBlock = node.finalizer;
    const blockBeforeFinally = isObject(catchClause) ? catchClause.body : tryBlock;

    if (catchClause) blocks.push(tryBlock);
    if (finallyBlock) blocks.push(blockBeforeFinally);
  }

  // An `if` without braces, as in `if (a) b(); else c();`, has no block to pad.
  return blocks.filter(isBlockStatement);
}

/*
 * Returns the lines to add a blank line after. Prettier removes any blank line
 * before a `}`, so the line before it always holds the block's last code or
 * comment, or its `{`.
 */
function collectPaddingLines(ast: AstNode): number[] {
  return [...nodesIn(ast)]
    .flatMap(blocksFollowedByBranch)
    .map((block) => block.loc.end.line - 1);
}

function insertBlankLines(text: string, paddingLines: number[]): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const linesToPad = new Set(paddingLines);

  return text
    .split(eol)
    .flatMap((line, index) => {
      const lineNumber = index + 1;

      return linesToPad.has(lineNumber) ? [line, ""] : [line];
    })
    .join(eol);
}

async function addBlankLinesBeforeBranches(
  formatted: string,
  baseParser: Parser,
): Promise<string> {
  // Parsing for line numbers needs no options.
  const ast = (await baseParser.parse(formatted, {} as ParserOptions)) as AstNode;

  return insertBlankLines(formatted, collectPaddingLines(ast));
}

const isThisPlugin = (plugin: unknown): boolean =>
  isObject(plugin) && plugin.isEvenprettierPlugin === true;

function nestedFormatOptions(options: ParserOptions, parserName: string): Options {
  return {
    ...options,
    parser: parserName,

    // Leave out this plugin, or the nested format calls this parser forever.
    plugins: options.plugins.filter((plugin) => !isThisPlugin(plugin)),
  };
}

function wrapParser(baseParser: Parser, parserName: string): Parser {
  return {
    ...baseParser,
    astFormat: AST_FORMAT,

    async parse(text, options) {
      const formatted = await format(text, nestedFormatOptions(options, parserName));

      return {
        type: "FormattedText",
        body: await addBlankLinesBeforeBranches(formatted, baseParser),
      } satisfies FormattedTextNode;
    },
  };
}

/*
 * Prettier has no option to keep a blank line before a closing brace. So each
 * of these parsers formats the text with Prettier (without this plugin),
 * parses the result for its line numbers, and adds a blank line before each
 * `}` that is followed by `else`, `catch`, or `finally`. It returns the text
 * as one node, which the printer outputs unchanged.
 */
export const parsers: Record<string, Parser> = {
  babel: wrapParser(babelPlugin.parsers.babel, "babel"),
  "babel-ts": wrapParser(babelPlugin.parsers["babel-ts"], "babel-ts"),
  typescript: wrapParser(typescriptPlugin.parsers.typescript, "typescript"),
};

export const printers: Record<string, Printer<FormattedTextNode>> = {
  [AST_FORMAT]: {
    print: (path) => path.node.body,
  },
};

// Lets `nestedFormatOptions` find this plugin in the list of plugins.
export const isEvenprettierPlugin = true;
