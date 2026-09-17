# ADR 0006: Delete `src/modules/` — a test-only layer with no production consumer

- **Status**: Accepted
- **Date**: 2026-09-17
- **Deciders**: @karlgroves
- **Supersedes**: the `src/modules/` disposition in
  [ADR 0002](./0002-tooling-phase-2.md) and [ADR 0004](./0004-content-script-split.md)

## Context

`src/modules/{config,overlayManager,state}.js` — 1,246 lines — was not reachable
from anything the extension runs:

- `manifest.json` does not list any of the three. The content scripts are
  `contentScript.js`, `elementChecks.js`, `uiPanels.js`, `reportGenerators.js`;
  the service worker is `background.js`.
- No production file requires them. `src/contentScript.js:1380-1382` requires
  its three siblings and stops there.
- They referenced only each other, and were imported only by their own tests.
- `scripts/build.js` copied `modules` into every browser package, so all 1,246
  lines shipped to Chrome, Firefox and Edge and were never loaded.

Knip (added in #118) reported 24 unused exports across the layer, which is what
surfaced it. The exemption written into `knip.jsonc` at the time deferred the
question to this ADR.

### What the earlier ADRs actually decided

[ADR 0002](./0002-tooling-phase-2.md) deferred the `contentScript.js`
modularization and listed, as an optional prerequisite, a build change "so the
existing `src/modules/` files can be loaded at runtime instead of duplicated in
`contentScript.js`". That reads as an intention to adopt them.

[ADR 0004](./0004-content-script-split.md) then settled it the other way, and is
the operative decision. It split `contentScript.js` into four sibling content
scripts, and under _Alternatives considered_ it explicitly **rejected**:

> **Refactor `contentScript.js` to use `src/modules/*` at runtime**: rejected.
> The modules use `module.exports = {...}` which is CommonJS — not loadable in a
> browser content script. Adopting them at runtime would require either a
> CommonJS-to-browser shim or a full bundler step.

It kept the files on the stated basis that they "continue to serve only Jest's
CommonJS test loader."

## Decision

Delete `src/modules/` and the three test files whose only subject was that
layer, and stop copying `modules` in `scripts/build.js`.

### Why the ADR 0004 rationale no longer holds

"They serve the test loader" describes a closed loop, not a purpose. The modules
are not used by production code, so tests over them do not exercise anything
that ships — the tests exist to test the modules, and the modules exist to be
tested. Nothing outside that loop depends on either half.

Two specific findings made this concrete:

1. **`tests/state-module.test.js` imported nothing at all** (`grep -c "require("`
   → 0). Its own header said it works "by creating a simplified test version of
   the state functions": it declared local copies of `LOGS`,
   `currentOverlayIndex`, `keyboardNavigationActive` and the rest, reimplemented
   the behaviour, and asserted against that. `jscpd` paired it with the module
   as a literal clone — `tests/state-module.test.js [113:2 - 125:2]` against
   `src/modules/state.js [328:2 - 342:57]`. It would have stayed green with
   `state.js` deleted outright. 27 tests of nothing.

2. **The shipped configuration is independently covered.**
   `tests/config-constants.test.js` requires `../src/contentScript.js` and
   asserts against the real `global.A11Y_CONFIG` (26 tests). So
   `tests/config-functions.test.js`, which tested the parallel copy in
   `src/modules/config.js`, was testing a shadow while the original was already
   under test elsewhere.

### The precedent

`src/config.js` was the same shape and was deleted in #118: an ESM copy of
`src/modules/config.js`, listed in no manifest, required by nothing, and drifted
far enough that `jscpd` reported the pair as near-duplicates for months. A
superseded parallel copy left in the tree does not stay inert; it diverges, and
then it misleads whoever reads it next.

## Consequences

### Easier

- 1,246 lines of unreachable product code gone, and no longer shipped in the
  Chrome, Firefox and Edge packages.
- 71 tests removed (27 + 9 + 35) that asserted over code with no production
  consumer. Coverage now reports on code that actually runs.
- The `src/modules/**` exemption is gone from `knip.jsonc`, so Knip's view of
  `src/` is complete — no directory is exempt, and the 24 unused exports are no
  longer hidden behind an entry declaration.
- The `contentScript.js` modularization question is settled rather than
  perpetually deferred: ADR 0004's four-file content-script split _is_ the
  modularization, and there is no second, parallel answer sitting beside it.

### Harder / risk

- If a bundler is ever adopted (ADR 0004 lists esbuild/Vite as worth
  revisiting), a module layer would have to be written again. That is the right
  trade: it would be written against the code that exists at that point, rather
  than resurrected from a copy that had been drifting, unexecuted, since 2026-05.
- **Reported coverage falls, from 28.57% to 20.22% of statements** (branches
  37.33% → 27.43%, functions 26.57% → 15.43%). That is the expected direction
  and worth stating plainly: the deleted layer was _well_ covered by its own 71
  tests, so removing it takes away high-coverage lines and leaves the genuinely
  under-tested `contentScript.js`, `uiPanels.js` and `reportGenerators.js`
  setting the average. The number did not get worse; it stopped being flattered
  by code nobody runs. See
  [#122](https://github.com/AFixt/accessibility-highlighter/issues/122) for the
  threshold question — and note that any threshold set before this landed would
  have been calibrated against that flattered figure.
- The history is in git. `git log --diff-filter=D -- src/modules/` finds the
  deleting commit, and `git show <sha>^:src/modules/state.js` retrieves any of
  it if the bundler decision later changes.

## Alternatives considered

- **Finish the migration — wire `contentScript.js` to the modules.** Rejected,
  and already rejected by ADR 0004 on the same grounds: Manifest V3 content
  scripts are classic scripts, `module.exports` is not loadable in one, and
  `"type": "module"` is allowed for service workers but not content scripts.
  It needs a bundler or a shim, neither of which this project has.
- **Keep the layer and only fix `tests/state-module.test.js`.** Rejected. A
  rewritten test asserting against the real module would be a _correct_ test of
  code that still never runs, at the cost of leaving 1,246 lines shipping and
  the Knip exemption in place.
- **Keep the files, stop shipping them** (drop `modules` from `build.js` but
  leave the source). Rejected as the worst of both: the drift risk stays, the
  reader confusion stays, and the only thing recovered is package size.
