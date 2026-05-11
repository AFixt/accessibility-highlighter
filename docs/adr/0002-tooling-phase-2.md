# ADR 0002: Tooling stack — Phase 2 (issue #56)

- **Status**: Accepted
- **Date**: 2026-05-11
- **Deciders**: @karlgroves

## Context

[ADR 0001](./0001-tooling-phase-1.md) adopted the foundations of issue #56's
tooling stack and listed four explicit Phase-2 follow-ups:

1. Resolve remaining ESLint warnings.
2. Wire `lychee` + `gitleaks` into CI (currently local-only).
3. Decide on Semgrep / OSV-Scanner pre-push gates.
4. Enable the OWASP Dependency-Check scheduled job.
5. Refactor `contentScript.js` (3000+ lines) to satisfy tightened sonarjs
   rules.

## Decision

### Adopted in Phase 2

| Area              | Tool                                | Notes                                                                                                                                            |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secret scanning   | gitleaks job in `security.yml`      | Installs the binary directly to avoid org-licensing dependency on `gitleaks-action`                                                              |
| Vuln scanning     | OSV-Scanner job in `security.yml`   | Runs on every push/PR; non-blocking                                                                                                              |
| Schedule          | `cron: '0 6 * * 1'` on security.yml | Re-enables the previously-gated OWASP Dependency-Check and license-check jobs (their `if: schedule` condition could never fire without a `cron`) |
| Link rot          | New `docs.yml` workflow             | Runs `lychee` on PR (when `.md` changes) and on a weekly schedule                                                                                |
| ESLint tightening | `warn` → `error`                    | sonarjs/prefer-immediate-return, sonarjs/prefer-single-boolean-return, unicorn/explicit-length-check, promise/catch-or-return                    |
| ESLint tightening | `warn` → `error`                    | security/detect-non-literal-regexp, security/detect-unsafe-regex                                                                                 |
| ESLint tightening | `warn` → `error`                    | jsdoc/check-tag-names, jsdoc/check-param-names, jsdoc/check-types                                                                                |
| ESLint tightening | `off` → `error`                     | sonarjs/no-collapsible-if (fixed 2 test sites)                                                                                                   |

### Deferred — contentScript.js modularization (Phase 2b)

Refactoring `contentScript.js` into smaller modules is blocked on a
discovered architectural duplication that must be reconciled first:

- `src/contentScript.js` is 3399 lines. This is what Jest loads via
  `require('../src/contentScript.js')`.
- `extension-package/contentScript.js` is 3195 lines. This is what
  `scripts/build.js` copies into the per-browser distribution.
- The two files differ by ~678 lines of diff.
- `src/modules/{config,overlayManager,state}.js` exist but the runtime
  extension does not load them — only Jest tests import them.
- `npm run build` (defined in `package.json`) copies from `src/` to
  `dist/`. `npm run build:all` (`scripts/build.js`) copies from
  `extension-package/`. The two build paths target different source trees.

Splitting `contentScript.js` while two diverged source-of-truth copies
exist would either widen the drift or silently drop changes that live in
only one copy. The contentScript.js modularization therefore depends on:

1. **An ADR** picking one canonical source tree (`src/` vs
   `extension-package/`) and explicitly designating the other as
   generated or deleting it.
2. **A reconciliation pass** merging the diverged contents and removing
   the redundant copy.
3. **Optionally a build-time concatenation or Manifest V3 multi-content-
   script setup** so the existing `src/modules/` files can be loaded at
   runtime instead of duplicated in `contentScript.js`.

After those prerequisites land, the tightened ESLint rules in this Phase
(`max-lines`, `max-lines-per-function`, `complexity`, `max-depth`,
`max-nested-callbacks`, `max-params`) can be added on top of a
modularized content script without forcing per-file overrides.

### Still deferred from Phase 1

- `promise/no-nesting` — `background.js:131,166,170` use legacy
  `chrome.*` callback-style nested promises. Refactor to async/await
  tracked separately.
- Semgrep pre-push gate — covered transitively by CodeQL + the new
  OSV-Scanner CI job. Reconsider only if those prove insufficient.

## Consequences

### Easier

- Every push/PR now runs the full security triplet locally and in CI:
  npm-audit + gitleaks + OSV-Scanner.
- OWASP Dependency-Check and license compliance actually run weekly,
  catching CVEs that surface after the last code change.
- Link rot in docs is now caught on a weekly cadence and surfaces broken
  links on doc-changing PRs.
- ESLint signal is stricter without any code changes required —
  promoted rules already pass clean.

### Harder / follow-up

- Phase 2b (contentScript.js modularization) is the largest remaining
  acceptance-criteria item from issue #56 and now requires its own
  preparatory ADR before work can begin.
- `gitleaks` in CI installs a pinned binary version; that pin should be
  reviewed when gitleaks publishes major releases.

## Alternatives considered

- **Push the contentScript.js refactor through despite the drift**:
  rejected. Would widen src/ vs extension-package/ divergence or
  accidentally lose code present in only one copy.
- **Use `gitleaks-action` instead of installing the binary**: rejected
  because gitleaks-action requires a license key for organizations on
  private repos. Installing the binary directly is portable and
  license-free.
- **Add Semgrep pre-push gate**: rejected for Phase 2 — CodeQL
  (scheduled) plus OSV-Scanner (per push) already cover the primary
  attack surface, and adding Semgrep to pre-push would slow local
  iteration without a corresponding signal gain.
