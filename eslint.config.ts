/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import evenprettier from "./src/eslint.js";

export default evenprettier({
  tsconfigRootDir: import.meta.dirname,
  ignores: ["test/fixtures/**"],
});
