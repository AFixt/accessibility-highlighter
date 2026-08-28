# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Accessibility Highlighter is a Chrome extension that identifies accessibility issues on webpages and visually highlights them. It uses a content script for DOM manipulation and a background service worker for extension state management.

## Git Flow Branching Strategy

This project follows Git Flow branching strategy. All development work must adhere to the following:

### Branch Structure

- **main**: Production-ready code only. Never commit directly to main.
- **develop**: Integration branch for features. All feature branches merge here first.
- **feature/**: Create feature branches from develop (e.g., feature/add-keyboard-nav)
- **release/**: For preparing production releases from develop
- **hotfix/**: Emergency fixes from main that bypass develop

### Workflow Rules

1. Always create feature branches from develop: `git checkout -b feature/feature-name develop`
2. Merge feature branches back to develop via pull request
3. Create release branches from develop when ready for production
4. Merge release branches to both main and develop
5. Create hotfix branches from main for critical production issues
6. Merge hotfix branches to both main and develop

### Releases

This project promotes `develop` to `main` directly via pull request; the `release/` branch step above is not used in practice — every tag from v1.0.3 onward sits on a `Merge pull request ... from AFixt/develop` commit.

1. Bump on develop with standard-version (`npm run release:patch` / `:minor` / `:major`). It updates package.json, package-lock.json, manifest.json and CHANGELOG.md, and commits as `chore(release): vX.Y.Z`.
2. Open a `develop` → `main` pull request titled `Release vX.Y.Z`; merge once checks pass.
3. Tag the merge commit on main and push the tag:
   `git tag -a vX.Y.Z -m "Release vX.Y.Z" && git push origin vX.Y.Z`.
   Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the per-browser packages and creates the GitHub release from the matching CHANGELOG section.
4. **Merge `main` back into `develop` and push.** This is the "and develop" half of workflow rule 4, and it is easy to lose because the release-branch step is skipped. Tags are created on main, so without it no tag is reachable from develop: `git describe` on develop goes stale and standard-version diffs against a long-superseded tag, producing a changelog that re-lists already-shipped work. (This was skipped from v1.0.2 until v1.0.6.) Expect an empty content diff — if real content appears, something reached main that develop never saw.

### Commit Messages

- Use conventional commit format when applicable
- Include ticket/issue numbers if available
- Keep messages clear and descriptive
- Subjects must be entirely lower-case (commitlint `subject-case`), so write `fix(docs): repoint the github links`, not `fix(docs): repoint the GitHub links`

## Project Todo List

The project todo list is maintained in todo.md. Always refer to todo.md for the current list of tasks and their priorities. Tasks should be completed in priority order (Critical, High, Medium, Low) and marked as complete as they are finished.

## Build/Development Commands

- No build process required - load as an unpacked extension in Chrome
- Test: `npm test` - Runs Jest tests
- Test with watch mode: `npm run test:watch`
- Test with coverage: `npm run test:coverage`
- Install as unpacked extension: chrome://extensions > Developer mode > Load unpacked
- Manual testing: Open /tests/manual-test-runner.html in browser

## Keyboard Shortcuts

- `Ctrl+Shift+A` (Windows/Linux) or `Cmd+Shift+A` (Mac): Toggle accessibility highlighting
- `Alt+Shift+N`: Start keyboard navigation through accessibility issues
- `Arrow Keys`: Navigate between issues (when keyboard navigation is active)
- `Home/End`: Jump to first/last issue
- `Enter/Space`: Get detailed information about current issue
- `Escape`: Exit keyboard navigation mode

## Code Style Guidelines

- Indentation: 2 spaces
- Naming: camelCase for variables and functions (e.g., `runAccessibilityChecks`)
- Documentation: JSDoc-style comments for functions
- DOM manipulation: Use standard DOM APIs
- State management: Use Chrome storage API
- Error handling: Log to console for debugging
- Logging: Use console.table for accessibility issues
- Extension architecture: Background service worker + content script
- Visual highlighting: CSS overlays with data-a11ymessage attributes

## Repository Structure

- manifest.json - Extension configuration (Manifest V3)
- background.js - Service worker for extension state
- contentScript.js - Main functionality for a11y checks
- README.md - Installation and usage instructions
- Icon files for enabled/disabled states
- tests/ - Test fixtures and Jest tests

## @afixt scoped packages & NPM_TOKEN

If this project installs any `@afixt/*` scoped packages, npm authentication is handled by an **organization-level GitHub Actions secret** named `NPM_TOKEN`. The org-level secret is **always** the one to use.

- Installing `@afixt/*` scoped packages should **not** return `404`. A `404` here is an authentication/token problem, not a missing package.
- If you do hit a `404`, remove any **repo-level** `NPM_TOKEN` secret — a repo-level token is likely stale and conflicts with the org-level secret.
- Do not override `NPM_TOKEN` per repository; always rely on the org-level secret.

## CI policy: no scheduled GitHub Actions

**No GitHub Actions workflow in this repository may use a `schedule:` (cron)
trigger, and no scheduled workflow that has been removed may be added back.**
This is a standing constraint, not a default to be traded away for convenience.

A timer-triggered check reports a problem hours or days after it entered the
codebase, attributes it to no one, and gets ignored. The same check run against a
pull request blocks the defect at the point of introduction.

### Rules

- No `on: schedule:` and no `- cron:` in any file under `.github/workflows/`.
- No Dependabot, in any form. `.github/dependabot.yml` is a scheduled updater
  and is covered by this policy. Dependabot **security alerts** and **automated
  security fixes** are switched off at the repository level too — verified by
  API on 2026-08-16. Nothing watches dependencies between pushes, so the
  dependency checks in the pull-request pipeline are the only place a
  vulnerable dependency gets caught.
- Every check a scheduled job would have performed runs as a step in the
  pull-request pipeline instead:
  - Dependency vulnerability and freshness checks (`npm audit`, `npm outdated`,
    OWASP Dependency-Check) run on `pull_request`.
  - Static analysis (CodeQL and equivalents) runs on `pull_request`.
  - Link checking, docs linting, and content checks run on `pull_request`,
    path-filtered to the files that can break them.
  - SBOM generation runs in the release/publish pipeline — an SBOM is a build
    output, not a periodic report.
  - DAST scans (ZAP and equivalents) run against the PR preview environment or
    as a post-deploy gate, not against a static URL on a timer.
  - End-to-end suites run as a smoke subset on `pull_request` and as the full
    matrix on merge to the default branch — never nightly.
- `workflow_dispatch` is allowed. A manual, on-demand run is not a scheduled run.
- Event-driven triggers (`push`, `pull_request`, `release`, `repository_dispatch`,
  `workflow_call`) are allowed and preferred.
- Genuinely periodic _product_ work — batch jobs, data pipelines, report
  generation — does not belong in GitHub Actions at all. Run it on real
  infrastructure with its own scheduler, alerting, and retries.

### If you think you need an exception

You do not add the cron. Raise it with the repository owner first.
