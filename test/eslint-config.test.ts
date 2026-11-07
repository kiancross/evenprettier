/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ESLint, type Linter } from "eslint";
import { describe, expect, it } from "vitest";

import { evenprettier, type EvenprettierOptions } from "../src/eslint.js";

const TYPE_CHECKED_RULE = "@typescript-eslint/no-unsafe-call";
const PADDING_RULE = "evenprettier/wrapped-object-property-padding";
const OFF = 0;
const ERROR = 2;

async function severityOf(
  ruleName: string,
  fileName: string,
  options: EvenprettierOptions = {},
): Promise<unknown> {
  const eslint = new ESLint({
    overrideConfigFile: true,

    // The `typescript-eslint` config type differs from ESLint's own.
    overrideConfig: evenprettier(options) as unknown as Linter.Config[],
  });

  const config = (await eslint.calculateConfigForFile(fileName)) as Linter.Config;

  // ESLint gives each rule's setting here as an array, with the severity first.
  const setting = config.rules?.[ruleName] as unknown[] | undefined;

  return setting?.[0];
}

describe("evenprettier", () => {
  it("runs the type-checked rules on TypeScript files", async () => {
    expect(await severityOf(TYPE_CHECKED_RULE, "page.ts")).toBe(ERROR);
  });

  it("skips the type-checked rules on JavaScript files", async () => {
    expect(await severityOf(TYPE_CHECKED_RULE, "page.js")).toBe(OFF);
  });

  it("skips only the type-checked rules on untypedFiles", async () => {
    const options = { untypedFiles: ["scripts/**"] };

    expect(await severityOf(TYPE_CHECKED_RULE, "scripts/build.ts", options)).toBe(
      OFF,
    );

    expect(await severityOf(PADDING_RULE, "scripts/build.ts", options)).toBe(ERROR);
  });
});
