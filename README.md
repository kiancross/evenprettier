# evenprettier

[![npm](https://img.shields.io/npm/v/evenprettier)](https://www.npmjs.com/package/evenprettier)
[![CI](https://github.com/kiancross/evenprettier/actions/workflows/ci.yml/badge.svg)](https://github.com/kiancross/evenprettier/actions/workflows/ci.yml)

Prettier and ESLint configs for spacious, easy-to-scan JavaScript and
TypeScript. They add blank lines that split code into small blocks. The ESLint
config also sorts imports and turns on `typescript-eslint`'s strict type-checked
rules.

## Install

```sh
npm install --save-dev evenprettier eslint prettier typescript
```

Needs ESLint 10, Prettier 3, and Node.js 22.13 or newer, other than Node.js 23.

## Usage

Create `eslint.config.js`:

```js
import evenprettier from "evenprettier";

export default evenprettier({ tsconfigRootDir: import.meta.dirname });
```

Add the Prettier config and these scripts to `package.json`:

```json
{
  "prettier": "evenprettier/prettier",

  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write . && eslint --fix .",
    "format:check": "prettier --check . && eslint ."
  }
}
```

Then `npm run format` formats your code, and `npm run format:check` checks it.

To format on save in VS Code, install the Prettier and ESLint extensions, and
add this to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": ["source.fixAll.eslint"]
}
```

### ESLint options

You can pass any of these options:

- `tsconfigRootDir`: the directory where `typescript-eslint` looks for tsconfig
  files.

- `internalPattern`: regular expressions for imports that sort as internal,
  after package imports and before relative imports.

- `ignores`: paths to ignore, in addition to `**/dist/**`,
  `**/node_modules/**`, and `**/coverage/**`.

- `untypedFiles`: paths to lint without `typescript-eslint`'s type-checked
  rules, such as files that are in no tsconfig, or files whose parser gives no
  type information. The other rules, including the blank-line rules, still
  apply to these files.

For example:

```js
export default evenprettier({
  tsconfigRootDir: import.meta.dirname,
  internalPattern: ["^@myscope/.*"],
  ignores: ["examples/**"],
  untypedFiles: ["scripts/**"],
});
```

## Example

Prettier on its own:

<!-- prettier-ignore -->
```js
import { readFile } from "node:fs/promises";
import {
  formatDuration,
  formatFileSize,
  formatTimestamp,
} from "./formatting-helpers.js";
export async function loadReport(path) {
  const options = {
    encoding: "utf8",
    retry: {
      count: 3,
      delay: 100,
    },
    timeout: 5000,
  };
  try {
    const text = await readFile(path, options);
    return JSON.parse(text);
  } catch (error) {
    console.error(formatTimestamp(Date.now()), error);
    return null;
  }
}
```

With evenprettier:

<!-- prettier-ignore -->
```js
import { readFile } from "node:fs/promises";

import {
  formatDuration,
  formatFileSize,
  formatTimestamp,
} from "./formatting-helpers.js";

export async function loadReport(path) {
  const options = {
    encoding: "utf8",

    retry: {
      count: 3,
      delay: 100,
    },

    timeout: 5000,
  };

  try {
    const text = await readFile(path, options);
    return JSON.parse(text);

  } catch (error) {
    console.error(formatTimestamp(Date.now()), error);
    return null;
  }
}
```

## How it works

The ESLint config adds blank lines around wrapped imports, exports, object
properties, and statements (those that span more than one line), and after
the imports. Prettier keeps any blank line between two statements, imports, or
properties, so it leaves those blank lines alone.

Prettier does remove a blank line just before a closing `}`. So the Prettier
config loads a plugin that adds the blank line before each `} else`, `} catch`,
and `} finally`. This is also why the scripts run Prettier first: ESLint's
fixes then apply to code that Prettier has already formatted.

The plugin works with Prettier's `babel`, `babel-ts`, and `typescript`
parsers, so it pads JavaScript, TypeScript, and the frontmatter of Astro files
formatted with `prettier-plugin-astro`. It does nothing when an editor formats
only a selection. It is also exported on its own as
`evenprettier/prettier-plugin`.

The Prettier config sets `printWidth` to 86. The ESLint config reports lines
longer than 86 columns, other than long strings, URLs, and regular
expressions, since Prettier does not wrap comments. JavaScript files are
linted without the type-checked rules, so `eslint.config.js` does not need to
be in a tsconfig. In test files, which end in `.test.ts` or are in a `test`
directory, non-null assertions such as `value!` are allowed.

## Rules

The ESLint config turns on these rules from this package.

### `evenprettier/wrapped-import-export-padding`

Requires a blank line between a wrapped import or export and the imports and
exports next to it.

<!-- prettier-ignore -->
```js
// before
import { readFile } from "node:fs/promises";
import {
  formatDuration,
  formatFileSize,
} from "./formatting-helpers.js";

// after
import { readFile } from "node:fs/promises";

import {
  formatDuration,
  formatFileSize,
} from "./formatting-helpers.js";
```

### `evenprettier/wrapped-object-property-padding`

Requires a blank line between a wrapped object property and the properties
next to it.

<!-- prettier-ignore -->
```js
// before
const options = {
  encoding: "utf8",
  retry: {
    count: 3,
  },
  timeout: 5000,
};

// after
const options = {
  encoding: "utf8",

  retry: {
    count: 3,
  },

  timeout: 5000,
};
```

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

## License

MIT. See [LICENSE](LICENSE).
