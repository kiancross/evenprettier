/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { join } from "node:path";

import { type ESLint, Linter } from "eslint";
import { format } from "prettier";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

import { plugin } from "../src/eslint-plugin.js";
import * as prettierPlugin from "../src/prettier-plugin.js";
import { prettierConfig } from "../src/prettier.js";

import {
  directoriesIn,
  FIXTURES_DIR,
  readFixture,
  readOptionalJson,
} from "./read-fixture.js";

const PLUGIN_DIR = join(FIXTURES_DIR, "eslint-plugin");

const linter = new Linter();

interface ReportedError {
  line: number;
  messageId: string | undefined;
}

function configFor(ruleName: string, fileName: string): Linter.Config[] {
  return [
    {
      files: ["**"],
      languageOptions: fileName.endsWith(".ts") ? { parser: tseslint.parser } : {},

      // The `typescript-eslint` plugin type differs from ESLint's own.
      plugins: { evenprettier: plugin as unknown as ESLint.Plugin },

      rules: { [`evenprettier/${ruleName}`]: "error" },
    },
  ];
}

function errorsIn(
  code: string,
  config: Linter.Config[],
  fileName: string,
): ReportedError[] {
  const messages = linter.verify(code, config, fileName);
  const parseError = messages.find((message) => message.fatal);

  if (parseError) throw new Error(`${fileName}: ${parseError.message}`);

  return messages.map((message) => ({
    line: message.line,
    messageId: message.messageId,
  }));
}

// Prettier picks the parser from the file name's extension.
const formatWithPrettier = (code: string, fileName: string): Promise<string> =>
  format(code, { ...prettierConfig, plugins: [prettierPlugin], filepath: fileName });

function testFixture(ruleName: string, fixtureDir: string): void {
  const { inputFileName, inputCode, outputCode, hasOutputFile } =
    readFixture(fixtureDir);

  const expectedErrors = readOptionalJson<ReportedError[]>(
    fixtureDir,
    "errors.json",
    [],
  );

  const config = configFor(ruleName, inputFileName);

  it("reports the errors in errors.json", () => {
    expect(errorsIn(inputCode, config, inputFileName)).toEqual(expectedErrors);
  });

  it("fixes the input to the output", () => {
    const fixResult = linter.verifyAndFix(inputCode, config, inputFileName);

    expect(fixResult.output).toBe(outputCode);
  });

  if (hasOutputFile) {
    it("reports no errors in the output", () => {
      expect(errorsIn(outputCode, config, inputFileName)).toEqual([]);
    });
  }

  /*
   * If Prettier undid a fix, Prettier and ESLint would each change the file
   * back on every format, and `prettier --check` would fail on fixed code.
   */
  it("reports the same errors after Prettier formats the output", async () => {
    const prettierFormattedOutput = await formatWithPrettier(
      outputCode,
      inputFileName,
    );

    // Prettier can move code to other lines, so compare only the message IDs.
    const messageIdsIn = (code: string): (string | undefined)[] =>
      errorsIn(code, config, inputFileName).map((error) => error.messageId);

    expect(messageIdsIn(prettierFormattedOutput)).toEqual(messageIdsIn(outputCode));
  });
}

for (const ruleName of directoriesIn(PLUGIN_DIR)) {
  const ruleDir = join(PLUGIN_DIR, ruleName);

  describe(ruleName, () => {
    for (const fixtureName of directoriesIn(ruleDir)) {
      describe(fixtureName, () => {
        testFixture(ruleName, join(ruleDir, fixtureName));
      });
    }
  });
}
