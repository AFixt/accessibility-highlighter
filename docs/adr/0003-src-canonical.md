# ADR 0003: `src/` is canonical; delete `extension-package/`

- **Status**: Accepted
- **Date**: 2026-05-11
- **Deciders**: @karlgroves

## Context

Two parallel source trees exist:

- `src/` — the active development tree. Jest loads it directly via
  `require('../src/contentScript.js')`. The `npm run build` script
  (defined in `package.json`) copies `src/` → `dist/`.
- `extension-package/` — a duplicate tree. `scripts/build.js` (invoked by
  `npm run build:all`, `npm run build:chrome`, etc.) copies
  `extension-package/` → `dist/<browser>/`.

The trees have drifted: `extension-package/contentScript.js` is 3195
lines, `src/contentScript.js` is 3399 lines, and they differ by ~678
lines of diff.

History (via `git log -- <path>`):

- `extension-package/contentScript.js` has received only 3 commits:
  `1770dec "Update packages"` (created it), `a0911af "Fix CodeQL security
vulnerabilities in PR #14"`, and `3ee2d41 "Fix incomplete sanitization
in CodeQL security scan"`.
- `src/contentScript.js` has received 10+ commits including those same
  two CodeQL fixes plus all subsequent work: `efde82b` (prettier),
  `78bd9eb` (ESLint flat config), the function-split refactors,
  documentation passes, etc.

All commits to `extension-package/` are also in `src/`. The 678-line
diff is entirely formatting (prettier line-wrapping, `Object` →
`object` JSDoc-type fixes from `jsdoc/check-types`, one
`prefer-immediate-return` fix). No behavioral changes live only in
`extension-package/`.

## Decision

`src/` is the single canonical source tree. `extension-package/` is
deleted. `scripts/build.js` is updated so `EXTENSION_DIR` points at
`src/`. The two `npm run build` and `npm run build:all` paths now
target the same source.

## Consequences

### Easier

- One source tree to edit. No risk of changes landing in the dev tree
  but missing the shipped tree.
- The Manifest V3 multi-content-script split planned for ADR 0004
  (contentScript.js modularization) is now unblocked.
- The build:all command will pick up Phase-1/Phase-2 formatting and
  lint fixes that the shipped extension had been missing.

### Harder / risk

- Existing built zips of the extension (produced from
  `extension-package/`) are now stale. A fresh build is needed for any
  release that follows this change.
- Manual smoke-test in Chrome/Edge/Firefox is recommended after the
  first build:all run that uses `src/` as the source, even though
  every diff line was already known formatting.

## Alternatives considered

- **Keep both trees, treat `extension-package/` as the release branch
  and sync from `src/` at release time**: rejected. Adds a manual
  sync step that the project has already proven it forgets to do, and
  adds no real value over building directly from `src/`.
- **Treat `extension-package/` as canonical and reconcile by copying
  `src/` over it**: rejected. `src/` is what Jest actually exercises;
  forcing the canonical pointer at the older tree would invert the
  test signal.
