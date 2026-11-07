/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { join } from "node:path";

import { format, type Options } from "prettier";
import { describe, expect, it } from "vitest";

import * as prettierPlugin from "../src/prettier-plugin.js";
import { prettierConfig } from "../src/prettier.js";

import {
  directoriesIn,
  FIXTURES_DIR,
  readFixture,
  readOptionalJson,
} from "./read-fixture.js";

const PLUGIN_DIR = join(FIXTURES_DIR, "prettier-plugin");

function testFixture(fixtureDir: string): void {
  const { inputFileName, inputCode, outputCode } = readFixture(fixtureDir);
  const options = readOptionalJson<Options>(fixtureDir, "options.json", {});

  const formatWithPlugin = (code: string): Promise<string> =>
    format(code, {
      ...prettierConfig,
      ...options,
      plugins: [prettierPlugin],

      // Prettier picks the parser from the file name's extension.
      filepath: inputFileName,
    });

  it("formats the input to the output", async () => {
    expect(await formatWithPlugin(inputCode)).toBe(outputCode);
  });

  it("leaves the output unchanged", async () => {
    expect(await formatWithPlugin(outputCode)).toBe(outputCode);
  });
}

describe("prettier-plugin", () => {
  for (const fixtureName of directoriesIn(PLUGIN_DIR)) {
    describe(fixtureName, () => {
      testFixture(join(PLUGIN_DIR, fixtureName));
    });
  }
});
