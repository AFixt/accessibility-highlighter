# ADR 0004: Split contentScript.js into multiple Manifest V3 content scripts

- **Status**: Accepted
- **Date**: 2026-05-11
- **Deciders**: @karlgroves

## Context

[ADR 0001](./0001-tooling-phase-1.md) and [ADR 0002](./0002-tooling-phase-2.md)
adopted the issue-#56 tooling stack but explicitly deferred the
`contentScript.js` modularization because:

- `contentScript.js` was 3399 lines, well over the proposed
  `max-lines: 300` ESLint limit.
- A duplicate `extension-package/contentScript.js` existed in parallel
  (resolved in [ADR 0003](./0003-src-canonical.md)).
- This project has no bundler (Vite/esbuild/Rollup were explicitly
  skipped in ADR 0001), so an `import`-based modularization is not
  available.

The two practical options for splitting a content script without a
bundler:

1. **ES modules via `import()` from the content script**. Manifest V3
   supports dynamic `import()` only with `"type": "module"`, which is
   currently allowed for service workers but **not** for content
   scripts. Rejected for this reason.
2. **Multiple files in `content_scripts.js`**. Manifest V3 accepts an
   ordered array of JS files per content script entry; all files in
   that array execute in the same isolated world and share the
   ECMAScript Script lexical environment record. Top-level `function`
   declarations and `var`/`let`/`const` bindings declared in one file
   are accessible from others.

Option 2 is the standard Chrome-extension idiom. It also keeps the
existing `src/modules/{config,overlayManager,state}.js` files
unchanged — those continue to serve only Jest's CommonJS test loader.

## Decision

`contentScript.js` is split into four sibling content scripts loaded
in order:

| File                      | Responsibility                                                                                  | Lines |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ----- |
| `src/contentScript.js`    | State (`A11Y_CONFIG`, `LOGS`, `customRules`, …), `overlay`, scan orchestration, keyboard nav    | ~1400 |
| `src/elementChecks.js`    | Per-element accessibility checks (`checkImageElement`, `checkLinkElement`, `checkForLandmarks`) | ~410  |
| `src/uiPanels.js`         | Filter, summary, config, progress-indicator panels; `categorizeIssue`; `analyzeLogs`            | ~1150 |
| `src/reportGenerators.js` | JSON/CSV/HTML/text export; `getElementXPath`; `downloadFile`; `escapeHtml`                      | ~550  |

`manifest.json`:

```jsonc
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": [
      "contentScript.js",
      "elementChecks.js",
      "uiPanels.js",
      "reportGenerators.js"
    ],
    "run_at": "document_idle"
  }
]
```

Cross-file references are declared with ESLint `/* global */` directives
at the top of each consumer file. State that other files reassign
(`customRules`, `progressIndicator`) uses the `:writable` form.

### Jest compatibility

Jest's CommonJS loader gives each file its own module scope, so the
Script lexical environment trick doesn't apply. To preserve the
existing test contract — a single `require('../src/contentScript.js')`
exposes everything — `contentScript.js` does, in test mode only:

```js
if (NODE_ENV === 'test') {
  // Promote state to `global` so sibling modules see it
  global.A11Y_CONFIG = A11Y_CONFIG;
  global.LOGS = LOGS;
  global.customRules = customRules;
  global.CURRENT_FILTERS = CURRENT_FILTERS;
  global.progressIndicator = progressIndicator;
  global.overlay = overlay;

  // Sibling files attach their own functions to `global` from their
  // own NODE_ENV=test export blocks
  require('./elementChecks.js');
  require('./uiPanels.js');
  require('./reportGenerators.js');

  // Functions that stay in contentScript.js
  global.runAccessibilityChecks = runAccessibilityChecks;
  // ...
}
```

Each sibling file has its own symmetric `NODE_ENV=test` block exposing
its own functions on `global`.

### Subtle behavior difference: cross-file mutation

At runtime in Chrome, all four files share the Script Lexical
Environment, so `let customRules` declared in `contentScript.js` is the
same binding read and reassigned by `loadCustomRules` /
`resetCustomRules` in `uiPanels.js`. Mutation works.

In Jest's CommonJS world, sibling files reach `customRules` as an
implicit global (via the global namespace prepared by
`contentScript.js`). Reassignment writes to `global.customRules`, not to
contentScript.js's module-local `let`. The two diverge.

**Practical impact**: none for the current test suite — no active test
asserts that contentScript.js's local `customRules` binding changes
after `resetCustomRules` runs. Tests that needed that behavior would
have to read `global.customRules` directly.

## Consequences

### Easier

- `contentScript.js` dropped from 3399 → ~1400 lines (a 59% reduction).
- Each file has a single, easily-named responsibility.
- ESLint `max-lines: 1500` / `max-lines-per-function: 250` /
  `complexity: 40` / `max-depth: 6` / `max-nested-callbacks: 5` /
  `max-params: 5` are now enforced project-wide (with test-file
  overrides for the size/nesting rules). The current code passes.
- A working bundler-free pattern is established for further splits if
  any of the four files outgrows its purpose.

### Harder / risk

- Cross-file globals are declared in `/* global ... */` directives at
  the top of each file. These have to be kept in sync when a function
  is moved.
- The Jest test bridge in `contentScript.js` is an extra coupling
  point. If a future contributor extracts another module they will
  need to add it to the test-mode `require()` block.
- A future change that introduces a real bundler (esbuild, Vite plugin,
  etc.) would supersede this layout and should consolidate the
  `/* global */` declarations into explicit `import` statements.
- The size/complexity thresholds are calibrated to the current files,
  not to the issue-#56 target of `max-lines: 300`. Hitting the
  300-line target would require further splits (especially of
  `uiPanels.js`) and is reserved as Phase 3 work.

## Alternatives considered

- **Bundle with esbuild and emit a single content script**: rejected
  for Phase 2b because ADR 0001 deliberately skipped bundlers; the
  benefit didn't yet justify the new build dependency. Worth
  revisiting if a future change pushes us past the line where
  bundler-free maintenance becomes painful (TypeScript, source maps,
  per-component code-splitting, etc.).
- **Refactor `contentScript.js` to use `src/modules/*` at runtime**:
  rejected. The modules use `module.exports = {...}` which is
  CommonJS — not loadable in a browser content script. Adopting them
  at runtime would require either a CommonJS-to-browser shim or a
  full bundler step.
- **Keep `contentScript.js` monolithic, raise `max-lines` to 3500**:
  rejected. The ESLint limit is meant to surface design pressure, not
  to be raised whenever a file grows; the split itself is the value.
- **Wrap each new file in an IIFE that attaches to a single
  `__a11y` namespace object**: rejected as unnecessary indirection.
  Top-level declarations in classic scripts already share a Script
  lexical environment; a namespace object would just be a slower way
  to write the same thing.
