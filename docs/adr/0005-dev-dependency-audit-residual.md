# ADR 0005: The residual `brace-expansion` audit findings are false positives

- **Status**: Accepted; the residual findings cleared on 2026-07-31 (see
  [Resolution](#resolution))
- **Date**: 2026-07-29
- **Deciders**: @karlgroves

## Context

The weekly `npm audit` job in `.github/workflows/security.yml` opens a tracking
issue whenever the full (dev + production) audit is non-empty. Issue #82
reported 27 high advisories.

The extension ships **zero production dependencies** — `npm audit --omit=dev
--audit-level=high` reports 0 vulnerabilities, and that is the only audit
result that gates a build (see the comments in `ci.yml` and `security.yml`).
Everything in issue #82 is dev-toolchain only and never reaches a published
build.

Behind the 27 entries were only **two** root advisories. The other 25 entries
were transitive fan-out — npm lists every package on the path to a vulnerable
dependency as its own line item.

| Root advisory                                                                                                                                    | Range             | Versions in the tree **before** this change  |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| [GHSA-pm4m-ph32-ghv5](https://github.com/advisories/GHSA-pm4m-ph32-ghv5) — `js-yaml` DoS via exponential flow-collection parsing                 | `>=5.0.0 <=5.2.1` | `js-yaml@5.2.1`                              |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) — `brace-expansion` DoS via unbounded expansion length (CVE-2026-14257) | `<=5.0.7`         | `brace-expansion@1.1.16`, `@2.1.2`, `@5.0.7` |

npm's own `fixAvailable` hints were useless — it proposed `jest@25.0.0`,
`npm-run-all@1.1.3`, `standard-version@4.2.0`, and
`license-checker-rseidelsohn@2.2.0`, all of which are _downgrades_ to
years-old majors. Ignore that column on reports from this job.

### The `brace-expansion` range is over-broad

The advisory range `<=5.0.7` reads as "everything ever published except
5.0.8", because every 1.x/2.x/3.x/4.x version sorts below `5.0.7` in semver.
That is not what actually shipped. The maintainer backported the fix across
all maintained lines:

| Version  | Published  |
| -------- | ---------- |
| `5.0.8`  | 2026-07-23 |
| `3.0.3`  | 2026-07-27 |
| `2.1.3`  | 2026-07-28 |
| `1.1.17` | 2026-07-29 |

(The 3.x row read `3.0.5` / 2026-07-28 when this ADR was first written. `3.0.3`
is the first patched 3.x, which is what the corrected advisory range uses. No
3.x is in this tree either way.)

`1.1.17`, `2.1.3`, and `3.0.3` **are patched**, but the advisory range still
covers them, so `npm audit` keeps reporting them. Verified behaviourally
using the proof-of-concept from the advisory that ships inside the package
(`ADVISORY-CVE-2026-14257.md`), under a constrained 512 MB heap:

```console
$ node --max-old-space-size=512 -e "require('brace-expansion').expand('{a,b}'.repeat(1500))"
# 1.1.17 -> 2666 results, 3,999,000 chars, ~7s   (bounded)
# 2.1.3  -> 2666 results, 3,999,000 chars, ~6s   (bounded)
# 1.1.16 -> FATAL ERROR: JavaScript heap out of memory
```

The ~4,000,000-character ceiling is the `EXPANSION_MAX_LENGTH` bound the
advisory's own Remediation section describes. `1.1.16` crashes under the same
input, which confirms the test discriminates.

Beware `1.1.16` specifically: it looks patched and isn't. It ships the fixed
code in `dist/commonjs/` and `dist/esm/` plus the advisory write-up, but its
`package.json` sets `main: index.js` with no `exports` map, and that root
`index.js` is unpatched. Every CommonJS consumer — which is all of them, via
`minimatch@3` — got the vulnerable path. `1.1.17` moves the bound into
`index.js` itself. This is why the previous `overrides` pin of
`brace-expansion: ^1.1.16` (commit `91145ff`) never actually fixed anything.

### `brace-expansion@5` is not a drop-in for older majors

Worth recording because it looks like an easy fix and isn't. 1.x and 2.x set
`module.exports = expand`, so CommonJS callers do:

```js
var expand = require('brace-expansion');
expand('a{b,c}d');
```

`5.0.8` is `"type": "module"` with a CommonJS interop build whose export is a
namespace object, not a callable:

```console
$ node -e "console.log(Object.keys(require('brace-expansion')))"
[ 'EXPANSION_MAX', 'EXPANSION_MAX_LENGTH', 'expand' ]
$ node -e "require('brace-expansion')('a{b,c}d')"
TypeError: require(...) is not a function
```

So an `overrides` entry forcing `brace-expansion@^5.0.8` into `minimatch@3`
or `minimatch@9` installs cleanly, **clears the audit**, and then throws the
first time anything globs. `minimatch@10` is the first release built against
the 5.x API (it declares `brace-expansion: ^5.0.5`). Do not reach for that
override — it is not needed, and it breaks the toolchain.

## Decision

Take the patched versions of everything, and treat what `npm audit` still
reports as a reporting artifact rather than a risk to mitigate.

### Changes

1. **`js-yaml@5.2.1` → `5.2.2`.** `markdownlint-cli@0.49.1` declares
   `~5.2.1`, so the patched version was already in range and only the
   lockfile pinned it back. Removes GHSA-pm4m-ph32-ghv5 entirely.

2. **`brace-expansion` updated to the patched release on every line present**
   — `1.1.16 → 1.1.17`, `2.1.2 → 2.1.3`, `5.0.7 → 5.0.8`. All were already
   in range for their consumers; only the lockfile pinned them back.

3. **`npm-run-all@4.1.5` → `npm-run-all2@^8.0.4`.** `npm-run-all` has been
   unmaintained since 2018. `npm-run-all2` is the maintained fork; it uses
   `picomatch` and drops 81 packages net from the dev tree, including the
   abandoned `es-abstract`/`string.prototype.*` polyfill cluster. The
   `test:all`, `check`, and `check:all` scripts now call `run-p`/`run-s`
   (both shipped by the fork) instead of `npm-run-all`, so the script text
   matches the installed package name.

   Version `^8.0.4` rather than the current `^9`: `npm-run-all2@9` narrows
   its engines to `^22.22.2 || ^24.15.0 || >=26.0.0`, which would reject Node
   22.0–22.22.1 even though this project's `engines` allows `>=22.0.0`.
   `8.0.4` declares `^20.5.0 || >=22.0.0`.

4. **Dropped the `overrides` block.** It pinned `brace-expansion: ^1.1.16`
   under `minimatch@3` as a fix for the _earlier_ `brace-expansion` ReDoS
   advisory. As described above, `1.1.16` is not actually patched for
   CommonJS consumers, so the pin fixed nothing; removing it lets the tree
   float to `1.1.17`, which is patched.

### Accepted

Every `brace-expansion` in the tree is now a patched release (`1.1.17`,
`2.1.3`, `5.0.8`) and every `js-yaml` is outside the vulnerable range. The
code is fully remediated.

`npm audit` nonetheless still reports 25 entries, all of them
GHSA-mh99-v99m-4gvg reached through `minimatch@3`/`minimatch@9`:

| Chain                                                                               | Installed version        | Status                    |
| ----------------------------------------------------------------------------------- | ------------------------ | ------------------------- |
| `jest@29` → `@jest/reporters`/`test-exclude@6` → `glob@7` → `minimatch@3`           | `brace-expansion@1.1.17` | Patched; flagged by range |
| `standard-version@9` → `dotgitignore@2` → `minimatch@3`                             | `brace-expansion@1.1.17` | Patched; flagged by range |
| `license-checker-rseidelsohn@4` → `read-package-json@6` → `glob@10` → `minimatch@9` | `brace-expansion@2.1.3`  | Patched; flagged by range |

These are **false positives**. Correcting the advisory range is the only
thing standing between this repository and a clean `npm audit` — there is no
upstream release to wait for and no residual denial-of-service exposure.
Google's OSV-Scanner, which CI also runs, passes on this tree.

Consequently, do **not** pursue any of the following in the name of this
advisory:

- **`jest@30`.** Measured: it moves `@jest/reporters` to `glob@10` and takes
  the audit from 25 to 24 entries. A major test-framework migration for one
  line of report noise.
- **`commit-and-tag-version@13`** (the maintained `standard-version` fork).
  Still depends on `dotgitignore@2`, so it changes nothing here.
- **`license-checker-rseidelsohn@5.0.1`.** Drops the `glob@10` chain, but
  declares `engines: { node: ">=24", npm: ">=11" }`. CI runs the Node version
  in `.nvmrc` (22), so it would require moving the project to Node 24. That
  may be worth doing on its own merits; it is not an audit fix.

## Consequences

- **`npm run check:all` failed at its `security:check` step** for as long as
  the range was wrong, and `security:check` is deliberately left as
  `npm audit --audit-level=high`. Narrowing it to `--omit=dev` would hide a
  whole class of real dev-toolchain advisories permanently in order to paper
  over a temporary false positive. It passed again on its own once the
  advisory range was corrected — see [Resolution](#resolution).
- **The `npm audit` tracking issue stayed open** meanwhile, which is the
  designed behaviour — the weekly job auto-closes it once `npm audit` is
  clean. Here that happened when the advisory range was narrowed, not when a
  dependency shipped.
- **Follow-up** (issue #84, now closed): report the over-broad range on
  GHSA-mh99-v99m-4gvg to GitHub's advisory database so the backported
  `1.1.17`/`2.1.3`/`3.0.3` releases are excluded.
- Anyone tempted to add an `overrides` entry for `brace-expansion` should
  read the interop note above first — it installs cleanly, clears the audit,
  and throws on first use.
- When re-deriving any of this, note that `.npmrc` sets `prefer-offline=true`
  and `cache-min=3600`. `npm view <pkg> versions` will happily serve a stale
  version list and omit a release published in the last hour; that is exactly
  how the backports were missed on the first pass. Use `--prefer-online`.

## Resolution

GitHub corrected GHSA-mh99-v99m-4gvg on **2026-07-31**. The flat `<= 5.0.7`
range is gone, replaced by one range per release line:

| Affected range      | First patched |
| ------------------- | ------------- |
| `< 1.1.17`          | `1.1.17`      |
| `>= 2.0.0, < 2.1.3` | `2.1.3`       |
| `>= 3.0.0, < 3.0.3` | `3.0.3`       |
| `>= 4.0.0, < 5.0.8` | `5.0.8`       |

The 4.x line still has no patched release of its own, so it is folded into the
5.x range — `4.0.1` remains affected, as predicted.

Nothing in this repository had to change. The tree already carried
`brace-expansion@1.1.17`, `@2.1.3`, and `@5.0.8`, every one of which sits
outside the corrected ranges:

```console
$ npm audit --audit-level=high
found 0 vulnerabilities
```

`npm run check:all` no longer fails at `security:check`, and needed no change
to get there — which is what leaving that script un-narrowed bought.

This project filed no correction request in the end. The over-broad range drew
a queue of reports from the wider ecosystem within a day of publication
([github/advisory-database#8877][pr8877] and others), and the fix landed before
ours would have. The analysis above still stands on its own; the only thing it
turned out not to need was the follow-up action.

[pr8877]: https://github.com/github/advisory-database/pull/8877

For future reports from this job, the durable lessons are unchanged: check for
backports with `--prefer-online` before believing a range, and verify
behaviourally rather than trusting either the range or the version number
(`1.1.16` remains the cautionary case — patched-looking, unpatched on the
CommonJS path).
