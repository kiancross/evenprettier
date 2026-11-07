# evenprettier

Rules for anyone changing this package. For what it does, see the
[README](README.md).

## Layout

- `src/rules/` has one file per ESLint rule, and `helpers.ts`, which the two
  padding rules share. `src/eslint-plugin.ts` is the ESLint plugin that holds
  the rules.

- `src/eslint.ts` exports the ESLint config factory, `src/prettier.ts` the
  Prettier config, and `src/prettier-plugin.ts` the Prettier plugin.

- The test cases are in `test/fixtures/eslint-plugin/<rule>/<case>/` and
  `test/fixtures/prettier-plugin/<case>/`, and `test/eslint-plugin.test.ts`
  and `test/prettier-plugin.test.ts` run them. ESLint, Prettier, and `tsc` skip
  `test/fixtures/`, so that they do not change the cases.

- `test/eslint-config.test.ts` tests the ESLint config factory.

- `tsconfig.json` type-checks every TypeScript file outside `test/fixtures/`,
  and the editor and `typescript-eslint` use it. `tsconfig.build.json` builds
  `src/` into `dist/`, which is all that the published package contains.

- This repository lints and formats itself with its own configs.

## Rules

- Rule messages and fixes are part of the package's interface. Change them
  only on purpose.

- The ESLint rules must be a subset of what Prettier, with the plugin, keeps:
  Prettier must keep every change that an ESLint fix makes. If Prettier would
  undo a fix, make the Prettier plugin make the same change instead, as it
  does for the blank line before `} else`. The rule tests check this for
  every case.

- The ESLint config contains nothing specific to one project. The default
  ignores are only `dist`, `node_modules`, and `coverage`, and
  `internalPattern` is empty by default. Projects pass their own settings as
  options.

- The Prettier plugin uses `__debug.printToDoc`, which Prettier leaves out of
  its documentation and types, so the `prettier` peer range covers only the
  major versions that CI has tested. When a Dependabot pull request moves
  Prettier to a new major version and CI passes, widen the range in that pull
  request.

- Examples of formatted code in the README start with
  `<!-- prettier-ignore -->`. This repository runs Prettier with the plugin,
  which would otherwise change them.

## Code

- Use TypeScript as ESM with NodeNext, and give relative imports a `.js`
  extension.

- Do not use `any`. Where AST types differ, as in the Prettier plugin, use
  `unknown` with type guards.

- Use named exports. Use a default export only where a tool needs one: the
  ESLint config factory and the Prettier config.

- Put a blank line before a computed `return`, and declare helpers above the
  code that calls them.

- Prefer an `if` block with a positive condition to an early `return` or
  `continue`. Give a compound condition, or a check used more than once, a
  name, such as `isOnSameLine`.

- Comment only what a reader cannot quickly work out from the code, such as
  why a line is needed. Keep comments short and in ASCII. Give the reason in
  the comment itself, and do not refer to other documents, such as this one,
  or to other repositories.

- Put comments on a function's interface above it, and comments on its
  implementation inside it, next to the lines they explain.

- Every change in the behaviour of a rule or the Prettier plugin comes with a
  test case. A case is a directory, named after what it checks, that holds an
  `input.js` or `input.ts` file, or for a plugin case an `input.html` file, and
  these optional files:

  - `output.js`, `output.ts`, or `output.html`: the code after `eslint --fix`,
    or after Prettier. Leave it out if the code must not change.

  - `errors.json`: the errors that a rule reports in the input, with their
    line and message ID. Leave it out if there are none.

  - `options.json`: Prettier options for a plugin case, such as the parser.

## Commands

- `npm run build` builds `dist/`.

- `npm test` runs the tests on the TypeScript sources, with no build.

- `npm run lint` lints this repository, with no build. It must pass.

- `npm run format` and `npm run format:check` build, then run Prettier and
  ESLint.

Prettier cannot load a TypeScript config, so this repository's Prettier config
is `dist/prettier.js`, which loads the plugin from `dist/`. After you change
`src/prettier-plugin.ts`, run `npm run build` before you format, including
with format on save in an editor.

CI (continuous integration) runs `npm test`, `npm run format:check`, and
`npm pack --dry-run` on each Node major version that `engines` in
`package.json` allows. Keep the two in step.

## Commits

Write a short subject that starts with an imperative verb and a capital
letter, with no full stop, such as `Add Dependabot for npm and GitHub Actions`.
If the reason for the change is not obvious, add a body that explains it. Make
one logical change per commit. Do not add a GitHub remote or publish to npm
without Kian's approval.

## Releases

The release workflow publishes to npm when a GitHub release is published, by
npm's trusted publishing, so no npm token is stored. To release:

1. On a new branch, run `npm version <patch|minor|major> --no-git-tag-version`,
   which updates the version in `package.json` and `package-lock.json`.

2. Commit the change as `Release 1.2.3`, and merge it into `master` through a
   pull request.

3. Publish a GitHub release for the new version, for example with
   `gh release create v1.2.3 --target master --generate-notes`. This creates
   the tag on `master`.

The workflow fails if the tag does not match the version in `package.json`.

## License

MIT. Every `.ts` file outside `test/fixtures/` starts with this header,
followed by one blank line:

```js
/*
 * Copyright (c) 2026 Kian Cross.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
```
