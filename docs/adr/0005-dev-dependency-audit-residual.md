# ADR 0005: Accept the residual `brace-expansion` advisory in the dev toolchain

- **Status**: Accepted
- **Date**: 2026-07-29
- **Deciders**: @karlgroves

## Context

The weekly `npm audit` job in `.github/workflows/security.yml` opens a
tracking issue whenever the full (dev + production) audit is non-empty.
Issue #82 reported 27 high advisories.

The extension ships **zero production dependencies** — `npm audit
--omit=dev --audit-level=high` reports 0 vulnerabilities, and that is the
only audit result that gates a build (see the comments in `ci.yml` and
`security.yml`). Everything in issue #82 is dev-toolchain only and never
reaches a published build.

Behind the 27 entries were only **two** root advisories. The other 25
entries were transitive fan-out — npm lists every package on the path to
a vulnerable dependency as its own line item.

| Root advisory                                                                                                                    | Range             | Vulnerable versions in tree                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------- |
| [GHSA-pm4m-ph32-ghv5](https://github.com/advisories/GHSA-pm4m-ph32-ghv5) — `js-yaml` DoS via exponential flow-collection parsing | `>=5.0.0 <=5.2.1` | `js-yaml@5.2.1`                              |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — `brace-expansion` DoS via unbounded expansion length  | `<=5.0.7`         | `brace-expansion@1.1.16`, `@2.1.2`, `@5.0.7` |

npm's own `fixAvailable` hints for most of these entries were useless —
it proposed `jest@25.0.0`, `npm-run-all@1.1.3`, `standard-version@4.2.0`,
and `license-checker-rseidelsohn@2.2.0`, all of which are _downgrades_ to
years-old majors.

### What made `brace-expansion` hard

The advisory range is `<=5.0.7`, which covers **every** version the
package has ever published except `5.0.8`. There are no backported
patches on the 1.x, 2.x, 3.x, or 4.x lines.

`brace-expansion@5` is not a drop-in replacement for its predecessors.
1.x and 2.x set `module.exports = expand`, so CommonJS callers do:

```js
var expand = require('brace-expansion');
expand('a{b,c}d');
```

5.0.8 is `"type": "module"` with a CommonJS interop build whose export is
a namespace object, not a callable:

```console
$ node -e "console.log(Object.keys(require('brace-expansion')))"
[ 'EXPANSION_MAX', 'EXPANSION_MAX_LENGTH', 'expand' ]
$ node -e "require('brace-expansion')('a{b,c}d')"
TypeError: require(...) is not a function
```

So an override forcing `brace-expansion@^5.0.8` into `minimatch@3` or
`minimatch@9` produces a `TypeError` at first use rather than a fix.
`minimatch@10` is the first release built against the 5.x API, and it
declares `brace-expansion: ^5.0.5` — which `5.0.8` satisfies.

That splits the tree cleanly into "fixable by moving to `minimatch@10`"
and "blocked on an upstream release".

## Decision

Apply every fix that is available and safe; document the rest.

### Fixed

1. **`js-yaml@5.2.1` → `5.2.2`.** `markdownlint-cli@0.49.1` declares
   `~5.2.1`, so the patched version was already in range and only the
   lockfile pinned it back. Removes GHSA-pm4m-ph32-ghv5 entirely.

2. **`brace-expansion@5.0.7` → `5.0.8`** for every `minimatch@10`
   consumer (`eslint`, `@eslint/config-array`, `eslint-plugin-import-x`,
   `eslint-plugin-sonarjs`, `markdownlint-cli`). Also in range, also
   only pinned by the lockfile.

3. **`npm-run-all@4.1.5` → `npm-run-all2@^8.0.4`.** `npm-run-all` has
   been unmaintained since 2018 and pulls `minimatch@3`.
   `npm-run-all2` is the maintained fork; it uses `picomatch` and has no
   `minimatch` in its tree at all. It ships an `npm-run-all` binary
   alongside `npm-run-all2`, so the `test:all`, `check`, and `check:all`
   scripts are unchanged and both `--parallel` and `-s` behave as before.

   Version `^8.0.4` rather than the current `^9`: `npm-run-all2@9`
   narrows its engines to `^22.22.2 || ^24.15.0 || >=26.0.0`, which would
   reject Node 22.0–22.22.1 even though this project's `engines` field
   allows `>=22.0.0`. `8.0.4` declares `^20.5.0 || >=22.0.0`.

4. **Dropped the `overrides` block.** It pinned
   `minimatch@3 > brace-expansion: ^1.1.16`, which was the fix for the
   _earlier_ `brace-expansion` ReDoS advisory. Under GHSA-mh99-v99m-4gvg
   every 1.x release is in range, so the pin no longer fixes anything and
   only froze a transitive dependency for no benefit.

5. **`security:check` now runs `npm audit --omit=dev --audit-level=high`.**
   It previously audited dev dependencies too, so `npm run check:all`
   always failed on advisories the project has deliberately decided not to
   gate on. The script now matches the CI gate it is meant to mirror.
   `npm run security:audit` still reports everything.

Result: 27 advisories → 25, and one of the two root advisories is gone.

### Accepted

The remaining 25 entries are all GHSA-mh99-v99m-4gvg reached through
three chains, none of which this repository can resolve:

| Chain                                                                                                           | Vulnerable version       | Blocked on                                             |
| --------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------ |
| `jest@29` → `@jest/reporters`/`test-exclude@6` → `glob@7` → `minimatch@3`                                       | `brace-expansion@1.1.17` | `glob@7` and `test-exclude@6` moving to `minimatch@10` |
| `standard-version@9` → `dotgitignore@2` → `minimatch@3`                                                         | `brace-expansion@1.1.17` | `dotgitignore` (unmaintained since 2019)               |
| `license-checker-rseidelsohn@4` → `read-installed-packages` → `read-package-json@6` → `glob@10` → `minimatch@9` | `brace-expansion@2.1.3`  | `glob@10` moving to `minimatch@10`                     |

Upgrades that look like they should help, but do not:

- **`jest@30`** moves `@jest/reporters` from `glob@7` to `glob@10`, which
  is still `minimatch@9` → `brace-expansion@2.x`. `test-exclude@6` stays
  on `glob@7` regardless. Measured effect: 25 → 24 advisories, in
  exchange for a major test-framework migration.
- **`commit-and-tag-version@13`** (the maintained `standard-version`
  fork) still depends on `dotgitignore@2`.
- **`license-checker-rseidelsohn@5.0.1`** does drop the `glob@10` chain,
  but declares `engines: { node: ">=24", npm: ">=11" }`. CI runs the Node
  version in `.nvmrc` (22), so adopting it means bumping `.nvmrc` and the
  project's `engines` field to Node 24 — a larger decision than an audit
  cleanup, and one that belongs in its own change.

The accepted risk is a denial-of-service in a brace-expansion parser
reached only by lint/test/release tooling, running on inputs this
repository controls (its own glob patterns and file paths). There is no
untrusted input path and no production exposure.

## Consequences

- The `npm audit` tracking issue stays open. That is working as intended:
  the weekly job auto-closes it once `npm audit` is clean, so it will
  close itself when `glob` and `test-exclude` ship `minimatch@10`
  releases. Future triage should check this ADR before re-deriving the
  analysis.
- `npm run check:all` passes again.
- Anyone tempted to add `overrides` for `brace-expansion` should read the
  CommonJS-interop note above first — the override installs cleanly, clears
  the audit, and then throws on first use.
- Revisit when: `glob@7`/`glob@10` or `test-exclude@6` release with
  `minimatch@10`; or the project moves to Node 24, at which point
  `license-checker-rseidelsohn@5` becomes available.
