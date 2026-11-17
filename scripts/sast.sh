#!/usr/bin/env bash
#
# scripts/sast.sh — static analysis of the extension source (`npm run security:sast`).
#
# One source of truth for the SAST gate in ci.yml's `security` job, so it can be
# run before pushing (issue #156). It used to be the njsscan GitHub Action, which
# existed only in CI; the Actions budget does not cover CI checks, and njsscan is
# not installed locally. Semgrep's `p/nodejsscan` ruleset is built from
# njsscan's rules, and it is the fleet's designated replacement.
#
# Gating matches what njsscan gated on: ERROR-severity rules only. Widening the
# gate to WARNING rules is a separate decision, since it changes how much this
# check will interrupt.
#
# Semgrep must be installed (`brew install semgrep` or `pipx install semgrep`).
# Without it this exits 1 rather than passing, because a scan that did not run
# must not look like a clean one. The ruleset is fetched from the Semgrep
# registry, so it needs network access. Metrics are off.
#
# Extra arguments are passed through to semgrep, e.g. CI's SARIF output:
#
#   npm run security:sast -- --sarif --output results.sarif
set -euo pipefail

if ! command -v semgrep >/dev/null 2>&1; then
  echo "ERROR: semgrep is not installed; the SAST scan was NOT run (brew install semgrep)" >&2
  exit 1
fi

exec semgrep scan \
  --config=p/nodejsscan \
  --severity=ERROR \
  --error \
  --metrics=off \
  "$@" \
  src/
