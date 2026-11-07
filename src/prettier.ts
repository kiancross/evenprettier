/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { fileURLToPath, URL } from "node:url";

import type { Config } from "prettier";

export const prettierConfig: Config = {
  printWidth: 86,

  /*
   * Prettier resolves a relative plugin path from the config file of the
   * project that imports this config, not from this file, so make the path
   * absolute.
   */
  plugins: [fileURLToPath(new URL("./prettier-plugin.js", import.meta.url))],
};

export default prettierConfig;
