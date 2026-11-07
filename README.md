# evenprettier

[![npm](https://img.shields.io/npm/v/evenprettier)](https://www.npmjs.com/package/evenprettier)
[![CI](https://github.com/kiancross/evenprettier/actions/workflows/ci.yml/badge.svg)](https://github.com/kiancross/evenprettier/actions/workflows/ci.yml)

Prettier and ESLint configs for spacious, easy-to-scan JavaScript and
TypeScript.

The configs add blank lines that split code into small blocks. The ESLint
config also sorts imports and turns on typescript-eslint's strict type-checked
rules.

## How the two configs work together

Prettier reprints each file in its own layout, but it keeps any blank line
between two statements, imports, or properties. So the ESLint rules add those
blank lines, and Prettier leaves them alone. Prettier does remove a blank line
just before a closing `}`, so the blank line before `} else`, `} catch`, and
`} finally` comes from a Prettier plugin in this package instead.

Use both configs, and run Prettier before ESLint's fixes, as in
[Scripts](#scripts).

## Install

```sh
npm install --save-dev evenprettier eslint prettier typescript
```

Needs ESLint 10, Prettier 3, and a version of Node.js that ESLint 10 supports.

## ESLint

```js
// eslint.config.js
import evenprettier from "evenprettier";

export default evenprettier({
  tsconfigRootDir: import.meta.dirname,
  internalPattern: ["^@myscope/.*"],
  ignores: ["examples/**"],
});
```

All options are optional:

- `tsconfigRootDir`: the directory where typescript-eslint looks for tsconfig
  files.

- `internalPattern`: regular expressions for imports that sort as internal,
  after package imports and before relative imports.

- `ignores`: paths to ignore, in addition to `**/dist/**`,
  `**/node_modules/**`, and `**/coverage/**`.

JavaScript files are linted without the type-checked rules, so
`eslint.config.js` does not need to be in a tsconfig. In test files, which end
in `.test.ts` or are in a `test` directory, non-null assertions such as
`value!` are allowed.

## Prettier

In `package.json`:

```json
{
  "prettier": "evenprettier/prettier"
}
```

The config sets `printWidth` to 86 and loads the plugin. The plugin adds a
blank line before each `}` that is followed by `else`, `catch`, or `finally`:

<!-- prettier-ignore -->
```js
// before
try {
  await save();
} catch (error) {
  report(error);
}

// after
try {
  await save();

} catch (error) {
  report(error);
}
```

The plugin works with Prettier's `babel`, `babel-ts`, and `typescript`
parsers, so it pads JavaScript, TypeScript, and the frontmatter of Astro files
formatted with prettier-plugin-astro. It does nothing when an editor formats
only a selection. It is also exported on its own as
`evenprettier/prettier-plugin`.

## Scripts

Run Prettier first, then ESLint's fixes:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write . && eslint --fix .",
    "format:check": "prettier --check . && eslint ."
  }
}
```

## Editor setup

Format on save with Prettier, and run ESLint's fixes on save so that the
ESLint rules apply too. In VS Code, with the Prettier and ESLint extensions,
add this to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": ["source.fixAll.eslint"]
}
```

## Rules

The ESLint config turns on these rules from this package.

### `evenprettier/func-style-multi-statement`

Requires a function declaration in place of an arrow function or function
expression that is assigned to a variable and has more than one statement in
its body. The rule reports these functions but does not fix them.

<!-- prettier-ignore -->
```js
// before
const load = (path) => {
  const raw = read(path);
  return parse(raw);
};

// after
function load(path) {
  const raw = read(path);
  return parse(raw);
}
```

### `evenprettier/wrapped-import-export-padding`

Requires a blank line between a wrapped import or export and the imports and
exports next to it.

<!-- prettier-ignore -->
```js
// before
import { a } from "./a.js";
import {
  b,
  c,
} from "./b.js";

// after
import { a } from "./a.js";

import {
  b,
  c,
} from "./b.js";
```

### `evenprettier/wrapped-object-property-padding`

Requires a blank line between a wrapped object property and the properties
next to it.

<!-- prettier-ignore -->
```js
// before
const options = {
  retries: pick(
    defaults,
  ),
  timeout: 5,
  verbose: true,
};

// after
const options = {
  retries: pick(
    defaults,
  ),

  timeout: 5,
  verbose: true,
};
```

## License

MIT. See [LICENSE](LICENSE).
