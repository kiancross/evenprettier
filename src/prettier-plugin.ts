/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as prettier from "prettier";

import {
  doc,
  type Doc,
  type Options,
  type Parser,
  type ParserOptions,
  type Printer,
} from "prettier";

import * as babelPlugin from "prettier/plugins/babel";
import * as typescriptPlugin from "prettier/plugins/typescript";

const AST_FORMAT = "evenprettier-padded";

interface PaddedDocNode {
  type: "PaddedDoc";
  doc: Doc;
}

/*
 * `format` returns a string, and Prettier cannot indent the lines of a string
 * when it embeds the code, such as in an HTML `<script>`. `printToDoc`
 * returns a doc, which Prettier can indent. Prettier exports it in
 * `__debug`, but leaves it out of its types.
 */
const { printToDoc } = (
  prettier as unknown as {
    __debug: { printToDoc: (text: string, options: Options) => Promise<Doc> };
  }
).__debug;

/*
 * The babel and typescript parsers return different AST types, so the code
 * below checks only the fields it reads.
 */
type AstNode = Record<string, unknown>;

function isObject(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null;
}

function isBlockStatement(node: unknown): node is AstNode {
  return isObject(node) && node.type === "BlockStatement";
}

/*
 * Returns every object that `node` holds, directly or in an array. These are
 * its child nodes, and also objects that are not nodes, such as `loc`, which
 * holds its position. The code that looks for `if` and `try` statements skips
 * those, since they have no `type`.
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
function blocksFollowedByBranch(node: AstNode): AstNode[] {
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
 * Marks where evenprettier adds a blank line. Prettier keeps a line comment on
 * its own line, so removing the comment from the doc leaves a blank line.
 */
const MARKER_COMMENT = "// evenprettier-blank-line";

/*
 * The line break before the comment puts it on its own line, and the one after
 * keeps the comment from swallowing the `}`.
 */
const MARKER_WITH_LINE_BREAKS = `\n${MARKER_COMMENT}\n`;

const ascending = (a: number, b: number): number => a - b;

// Returns the offset just after the last code or comment before `offset`.
function contentEndBefore(text: string, offset: number): number {
  return text.slice(0, offset).trimEnd().length;
}

// Splits `text` at each of `offsets`, which must be in ascending order.
function splitAt(text: string, offsets: number[]): string[] {
  const pieces: string[] = [];
  let pieceStart = 0;

  for (const offset of offsets) {
    pieces.push(text.slice(pieceStart, offset));
    pieceStart = offset;
  }

  pieces.push(text.slice(pieceStart));

  return pieces;
}

// Puts a marker on its own line before each `}` at `closingBraceOffsets`.
function insertMarkers(text: string, closingBraceOffsets: number[]): string {
  /*
   * Put each marker before any blank lines that come before the `}`. Prettier
   * keeps a blank line before a comment, which would give two blank lines, but
   * removes blank lines between the comment and the `}`.
   */
  const markerOffsets = closingBraceOffsets
    .map((offset) => contentEndBefore(text, offset))
    .sort(ascending);

  return splitAt(text, markerOffsets).join(MARKER_WITH_LINE_BREAKS);
}

function removeMarkersFrom(text: string): string {
  /*
   * Prettier formats a marker into a string of its own, which becomes a blank
   * line once emptied. But Prettier does not format code under a
   * `prettier-ignore` comment, so a marker there stays inside a longer string,
   * exactly as inserted. In that case, strip exactly what was inserted: the
   * marker with its line breaks.
   */
  return text === MARKER_COMMENT ? "" : text.replaceAll(MARKER_WITH_LINE_BREAKS, "");
}

function removeMarkers(printed: Doc): Doc {
  return doc.utils.mapDoc(printed, (part) =>
    typeof part === "string" ? removeMarkersFrom(part) : part,
  );
}

const isEvenprettier = (plugin: unknown): boolean =>
  isObject(plugin) && plugin.isEvenprettierPlugin === true;

function optionsWithoutEvenprettier(
  options: ParserOptions,
  parserName: string,
): Options {
  // Leave out evenprettier, or its parser would recurse infinitely.
  const otherPlugins = options.plugins.filter((plugin) => !isEvenprettier(plugin));

  return {
    ...options,
    parser: parserName,
    plugins: otherPlugins,

    // The cursor and range offsets are for the text without markers.
    cursorOffset: undefined,
    rangeStart: undefined,
    rangeEnd: undefined,
  };
}

function wrapParser(baseParser: Parser, parserName: string): Parser {
  return {
    ...baseParser,
    astFormat: AST_FORMAT,

    async parse(text, options) {
      const ast = (await baseParser.parse(text, options)) as AstNode;

      const closingBraceOffsets = [...nodesIn(ast)]
        .flatMap(blocksFollowedByBranch)
        // A block ends just after its `}`.
        .map((block) => baseParser.locEnd(block) - 1);

      const markedText = insertMarkers(text, closingBraceOffsets);

      const printed = await printToDoc(
        markedText,
        optionsWithoutEvenprettier(options, parserName),
      );

      const paddedDoc = removeMarkers(printed);

      return { type: "PaddedDoc", doc: paddedDoc } satisfies PaddedDocNode;
    },
  };
}

/*
 * These wrap Prettier's `babel`, `babel-ts`, and `typescript` parsers, since
 * Prettier has no option to keep a blank line before a closing brace. Each
 * wrapper marks every `}` that is followed by `else`, `catch`, or `finally`,
 * has Prettier print the marked text to a doc, and removes the markers. The
 * printer outputs that doc unchanged.
 */
export const parsers: Record<string, Parser> = {
  babel: wrapParser(babelPlugin.parsers.babel, "babel"),
  "babel-ts": wrapParser(babelPlugin.parsers["babel-ts"], "babel-ts"),
  typescript: wrapParser(typescriptPlugin.parsers.typescript, "typescript"),
};

export const printers: Record<string, Printer<PaddedDocNode>> = {
  [AST_FORMAT]: {
    print: (path) => path.node.doc,
  },
};

// Lets `optionsWithoutEvenprettier` find evenprettier in the list of plugins.
export const isEvenprettierPlugin = true;
