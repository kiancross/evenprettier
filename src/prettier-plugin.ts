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
 * when it puts the code in another file, such as in an HTML `<script>`.
 * `printToDoc` returns a doc, which Prettier can indent. Prettier exports it in
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
 * evenprettier marks each place for a blank line with this comment, on a line
 * of its own. Prettier keeps the comment on its own line, and evenprettier
 * then removes the comment, which leaves the line blank.
 */
const MARKER_COMMENT = "// evenprettier-blank-line";
const MARKER_WITH_LINE_BREAKS = `\n${MARKER_COMMENT}\n`;

/*
 * Puts a marker on its own line, straight after the last code or comment
 * before each `}` at `braceOffsets`. If a blank line came before the marker,
 * Prettier would keep it, and print two blank lines.
 */
function insertMarkers(text: string, braceOffsets: number[]): string {
  const pieces: string[] = [];
  let start = 0;

  for (const braceOffset of [...braceOffsets].sort((a, b) => a - b)) {
    const contentEnd = start + text.slice(start, braceOffset).trimEnd().length;

    pieces.push(text.slice(start, contentEnd), MARKER_WITH_LINE_BREAKS);
    start = contentEnd;
  }

  pieces.push(text.slice(start));

  return pieces.join("");
}

/*
 * Prettier does not format code under a `prettier-ignore` comment, so the doc
 * holds that code as one string, exactly as evenprettier gave it, markers
 * included. Cutting out each marker, with the line breaks that evenprettier
 * added around it, gives back the code as written. For example,
 * "{ a();\n// evenprettier-blank-line\n }" becomes "{ a(); }".
 */
function removeMarkersFrom(text: string): string {
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
  return {
    ...options,
    parser: parserName,

    /*
     * With evenprettier left in, Prettier would call evenprettier's parser
     * again, and so on forever.
     */
    plugins: options.plugins.filter((plugin) => !isEvenprettier(plugin)),

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

      const braceOffsets = [...nodesIn(ast)]
        .flatMap(blocksFollowedByBranch)
        .map((block) => baseParser.locEnd(block) - 1);

      const markedText = insertMarkers(text, braceOffsets);

      const printed = await printToDoc(
        markedText,
        optionsWithoutEvenprettier(options, parserName),
      );

      return {
        type: "PaddedDoc",
        doc: removeMarkers(printed),
      } satisfies PaddedDocNode;
    },
  };
}

/*
 * These parsers replace Prettier's own. Prettier has no option to keep a blank
 * line before a closing brace. So each parser adds a marker comment before
 * each `}` that is followed by `else`, `catch`, or `finally`, has Prettier
 * turn the text into a doc, and removes each marker from the doc, which leaves
 * a blank line. It returns the doc as one node, which the printer outputs
 * unchanged.
 */
export const parsers: Record<string, Parser> = {
  babel: wrapParser(babelPlugin.parsers.babel, "babel"),
  "babel-ts": wrapParser(babelPlugin.parsers["babel-ts"], "babel-ts"),
  typescript: wrapParser(typescriptPlugin.parsers.typescript, "typescript"),
};

export const printers: Record<string, Printer<PaddedDocNode>> = {
  [AST_FORMAT]: {
    print: (path) => path.node.doc,

    // The node holds a doc, not child nodes.
    getVisitorKeys: () => [],
  },
};

// Lets `optionsWithoutEvenprettier` find evenprettier in the list of plugins.
export const isEvenprettierPlugin = true;
