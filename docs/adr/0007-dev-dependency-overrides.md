# ADR 0007: Clear the 2026-10 dev-dependency audit findings with upgrades and scoped overrides

- **Status**: Accepted
- **Date**: 2026-10-09
- **Deciders**: @karlgroves
- **Related**: [ADR 0005](./0005-dev-dependency-audit-residual.md) (the last
  time `security:check` went red), issue #151

## Context

`npm run check:all` failed at `security:check` (`npm audit --audit-level=high`)
on `develop`. The audit reported 47 entries (33 high, 2 critical), all
dev-only. The extension still has no production dependencies, so
`npm audit --omit=dev` was clean throughout. As in ADR 0005, most of those
entries were fan-out from a few root advisories. Two of the roots have **no
patched release at all**:

- `braces` GHSA-vfj7-8cjw-p6xm, reached through `micromatch` from `jest@29`
  and from `jscpd@4` (via `@jscpd/finder` → `fast-glob`).
- `sprintf-js` GHSA-hp3w-g68c-fv3c, reached through `jest` →
  `babel-plugin-istanbul` → `@istanbuljs/load-nyc-config` → `js-yaml@3` →
  `argparse@1`.

Those two cannot be fixed by updating the package. The only options are to
remove the path that brings them in, or to accept them.

## Decision

Remove the paths rather than accept the findings:

- **`jest` / `jest-environment-jsdom` 29 → 30.5.** jest 30.5 no longer
  depends on `micromatch`.
- **`jscpd` 4 → 5.4.0, exact.** jscpd 5 ships as a native binary, published
  as per-platform optional packages, and has no JS dependency tree. It is
  pinned exactly, following the fleet precedent (AFixt/vscode#288), because
  that binary is the whole of the gate.

The remaining advisories have fixed releases that the parents' ranges exclude,
so they are handled with `overrides` in `package.json`:

| Override                                          | Advisory            | Why the parent can't take the fix itself                               |
| ------------------------------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `@istanbuljs/load-nyc-config` → `js-yaml` `4.3.2` | GHSA-hp3w-g68c-fv3c | Declares `js-yaml ^3`; js-yaml 4 uses `argparse@2` (no sprintf-js)     |
| `markdownlint-cli` → `js-yaml` `5.4.1`            | GHSA-r3ph-w7gj-g6xm | markdownlint-cli 0.49.1 pins `js-yaml ~5.2.1`                          |
| `micromark-extension-math` → `katex` `^0.18.2`    | GHSA-238p-pmpm-9mq7 | Declares `katex ^0.16.0`                                               |
| `smol-toml` `1.9.0` (top level)                   | GHSA-r4xh-jqrq-34v2 | markdownlint-cli pins `~1.7.0`; knip's `^1.8.0` lockfile copy is 1.8.0 |

The `@istanbuljs/load-nyc-config` override crosses a major version.
That package only calls `require('js-yaml').load(...)`, and the same call works
in js-yaml 4, where it is safe by default. A `.nycrc.yml` loaded through the
overridden copy parses correctly. This repository has no nyc config, so the
path does not run during the test suite.

## Consequences

- `npm audit` reports 0 vulnerabilities at any level, and `security:check`
  passes without narrowing it to `--omit=dev` (the reason ADR 0005 gives still
  holds).
- jscpd 5 tokenises differently from jscpd 4. The duplication figure went from
  1.89% to 3.07% with no source change, still under the `--threshold 5` gate.
  It analyses the same 37 JavaScript files, but jscpd 4 and 5 percentages are
  not comparable.
- **Every override is temporary.** Remove each one when its parent ships a
  range that admits the fix: a markdownlint-cli release past `js-yaml ~5.2`
  and `smol-toml ~1.7`, a micromark-extension-math that allows katex 0.18, and
  an `@istanbuljs/load-nyc-config` on js-yaml 4. An exact override also
  **holds a package back**: when a parent later wants a newer version, npm
  still installs the pinned one. So when you bump any of those parents,
  check whether its override is still needed, and drop it if not.
  `npm ls <pkg> --all` shows `overridden` next to each affected copy.
