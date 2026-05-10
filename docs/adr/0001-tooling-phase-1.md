# ADR 0001: Tooling stack — Phase 1 (issue #56)

- **Status**: Accepted
- **Date**: 2026-05-10
- **Deciders**: @karlgroves

## Context

Issue #56 proposes a comprehensive tooling stack covering code quality,
security, accessibility, performance, and documentation. Large portions of
the proposed stack assume a TypeScript + React + Express application. This
repository is a vanilla-JavaScript Chrome extension (Manifest V3) with no
React, no server, no build pipeline beyond `cp` into `dist/`.

Issue #56's ground rule: "Do not replace anything that already exists in this
project unless the new proposal leads to a demonstrably higher quality
outcome." This ADR records which proposals we adopted, deferred, and skipped
in Phase 1.

## Decision

### Adopted in Phase 1

| Area               | Tool                                                                | Notes                        |
| ------------------ | ------------------------------------------------------------------- | ---------------------------- |
| Editor consistency | `.editorconfig`                                                     | new                          |
| Node pinning       | `.nvmrc`, `.node-version`, `engines >=20`, `engine-strict=true`     | bumped from `>=12`           |
| Lint               | ESLint v10 flat config (`eslint.config.js`)                         | migrated from `.eslintrc.js` |
| Lint plugins       | sonarjs, security, unicorn, promise, n, import-x, no-secrets, jsdoc | new                          |
| Pre-commit         | `lint-staged` + gitleaks (optional)                                 | new                          |
| Hooks              | Husky `pre-commit`, `commit-msg`, `pre-push`, `post-merge`          | added pre-push + post-merge  |
| Link check         | `lychee` (binary, called from npm script)                           | new                          |
| License check      | `license-checker-rseidelsohn`                                       | new                          |
| Size budget        | `size-limit` against `dist/`                                        | new                          |
| Docs               | `docs/adr/`, `docs/templates/`                                      | new                          |
| Bootstrap          | `scripts/bootstrap.sh`                                              | new                          |

### Kept as-is (existing tools satisfy the proposal)

| Existing                            | Proposed equivalent                   | Reason kept                                                                                                                         |
| ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Jest                                | Vitest                                | Jest works; tests are stable; switching would invalidate 263 passing tests with no clear quality win                                |
| Prettier (project's `.prettierrc`)  | Prettier (issue's `.prettierrc.json`) | Project style is intentional (`trailingComma: none`, `arrowParens: avoid`); a wholesale config swap would churn the entire codebase |
| `markdownlint-cli` v0.47            | `markdownlint-cli2`                   | Output and rule coverage are equivalent for this project's markdown                                                                 |
| `jscpd`                             | `jscpd`                               | Already in use with project-tuned config                                                                                            |
| `commitlint` + conventional commits | Same                                  | Already configured                                                                                                                  |
| `standard-version`                  | Same                                  | Release flow works; no proposed replacement                                                                                         |
| npm audit                           | Same                                  | Already wired into CI                                                                                                               |
| Existing GitHub Actions workflows   | Issue's proposed workflows            | Existing workflows cover CI, security, release; CodeQL is already wired up                                                          |

### Skipped / deferred

| Proposal                                                                     | Reason                                                                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| TypeScript + `ts-reset` + `typescript-eslint`                                | Vanilla-JS Chrome extension; full JS→TS rewrite is out of scope. JSDoc types are already used for type intent. |
| React / RTL / `jsx-a11y` / react-hooks / react-refresh                       | No React in this project                                                                                       |
| Vite, Vitest                                                                 | No bundler needed; Jest is fine                                                                                |
| Express stack (helmet, rate-limit, cors, pino, zod, envalid, supertest, msw) | No server in this project                                                                                      |
| `react-helmet-async`, `schema-dts`, SSR/SSG                                  | No web app                                                                                                     |
| Stylelint + `@double-great/stylelint-a11y`                                   | No project CSS files (styling is inline JS for overlay elements)                                               |
| `@afix/a11y-assert` at component / E2E / preview levels                      | No components; E2E suite already uses Playwright with the extension loaded                                     |
| Lighthouse CI                                                                | No deployed web app to point at                                                                                |
| OWASP ZAP baseline                                                           | Same — no deployed web app                                                                                     |
| Semgrep, osv-scanner integration in pre-push                                 | Existing CodeQL workflow + `npm audit` cover the primary attack surface; can revisit if it proves insufficient |
| OWASP Dependency-Check on schedule                                           | Existing security workflow has the job configured (currently skipping); enable separately if needed            |
| `tsc-files`, TypeDoc                                                         | TypeScript dependent                                                                                           |
| `react-helmet-async`, `web-vitals`                                           | No web app                                                                                                     |

## Consequences

### Easier

- Lint signal is richer (security, code-smell, async correctness, secret detection)
- Stricter Node engine pinning prevents "works on my machine" install differences
- Pre-push hook catches lint/test regressions before they hit CI
- Future ADRs have a template to follow
- Bootstrap script gives new contributors a single command to set up

### Harder / follow-up work

- ESLint warnings remain (mostly JSDoc `Object` → `object` style fixes and a
  few sonarjs cases) — tracked as Phase-2 work
- Lychee, gitleaks are external binaries; CI workflows will need to install
  them when we enable those gates there. For now they are local-only.
- Tightening `sonarjs/cognitive-complexity`, `max-lines-per-function`,
  `complexity`, and `max-depth` will require refactoring `contentScript.js`
  (3000+ lines); deferred to a dedicated refactor.

## Alternatives considered

- **All-in adoption of issue #56's full stack**: rejected; would require
  rewriting the extension in TypeScript and adding React/Express tooling
  that doesn't apply.
- **Do nothing**: rejected; the project genuinely benefited from missing
  pieces like `.editorconfig`, Node pinning, lint-staged, and richer lint
  rules.
- **Wait for an external decision on TS migration**: rejected; the Phase-1
  changes are independently valuable.
