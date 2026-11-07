/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURES_DIR = join(import.meta.dirname, "fixtures");

export interface Fixture {
  inputFileName: string;
  inputCode: string;

  // The input code, if the fixture has no output file.
  outputCode: string;

  hasOutputFile: boolean;
}

export const directoriesIn = (parentDir: string): string[] =>
  readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

function findJsOrTsFile(
  fixtureDir: string,
  nameWithoutExtension: string,
): string | undefined {
  return [`${nameWithoutExtension}.js`, `${nameWithoutExtension}.ts`].find(
    (fileName) => existsSync(join(fixtureDir, fileName)),
  );
}

export function readFixture(fixtureDir: string): Fixture {
  const inputFileName = findJsOrTsFile(fixtureDir, "input");
  const outputFileName = findJsOrTsFile(fixtureDir, "output");

  if (!inputFileName) throw new Error(`${fixtureDir} has no input.js or input.ts`);

  const inputCode = readFileSync(join(fixtureDir, inputFileName), "utf8");

  const outputCode = outputFileName
    ? readFileSync(join(fixtureDir, outputFileName), "utf8")
    : inputCode;

  return {
    inputFileName,
    inputCode,
    outputCode,
    hasOutputFile: outputFileName !== undefined,
  };
}

export function readOptionalJson<T>(
  fixtureDir: string,
  fileName: string,
  valueIfMissing: T,
): T {
  const path = join(fixtureDir, fileName);

  return existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as T)
    : valueIfMissing;
}
