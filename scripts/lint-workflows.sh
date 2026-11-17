#!/usr/bin/env bash
# Lint the GitHub Actions workflow files (`npm run lint:workflows`).
#
# One source of truth for the check pr-check.yml's `validate-workflows` job
# runs, so it can be run before pushing (issue #156). The logic used to live only
# inline in the workflow, and the Actions budget does not cover CI checks, so a
# check that exists only in CI is a check that does not run.
#
# - With `actionlint` on PATH (pr-check.yml installs a pinned build; locally
#   `brew install actionlint`, see scripts/bootstrap.sh) the files are linted
#   by actionlint, which validates the workflow schema, expressions and
#   (when shellcheck is installed) every `run:` script. Its settings live in
#   .github/actionlint.yaml.
# - Without it, the script falls back to the check the workflow used to run
#   inline: each file must parse as YAML, and a missing top-level `on:` or
#   `jobs:` key is reported as a warning.
# - With neither actionlint nor python3 + PyYAML it fails rather than passing,
#   because a check that did not run must not look like a clean one.
#
# Usage: scripts/lint-workflows.sh [workflow-dir]   (default .github/workflows)

set -uo pipefail

dir="${1:-.github/workflows}"
shopt -s nullglob
files=("$dir"/*.yml "$dir"/*.yaml)
shopt -u nullglob

if [ "${#files[@]}" -eq 0 ]; then
  echo "No workflow files found in $dir"
  exit 0
fi

if command -v actionlint >/dev/null 2>&1; then
  echo "Linting ${#files[@]} workflow file(s) in $dir with actionlint..."
  actionlint "${files[@]}" || exit 1
  echo "All workflow files are valid"
  exit 0
fi

echo "actionlint not found; running the YAML syntax check only (install: brew install actionlint)"

if ! python3 -c 'import yaml' >/dev/null 2>&1; then
  echo "ERROR: neither actionlint nor python3 with PyYAML is available; workflows were NOT checked" >&2
  exit 1
fi

errors=0
for f in "${files[@]}"; do
  echo "Checking $f..."

  if ! python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1]))' "$f" 2>/dev/null; then
    echo "ERROR: Invalid YAML in $f"
    errors=$((errors + 1))
  fi

  if ! grep -q '^on:' "$f" && ! grep -q "^'on':" "$f" && ! grep -q '^"on":' "$f"; then
    echo "WARNING: Missing 'on' trigger in $f"
  fi

  if ! grep -q '^jobs:' "$f"; then
    echo "WARNING: Missing 'jobs' section in $f"
  fi
done

if [ "$errors" -gt 0 ]; then
  echo "Found $errors workflow file(s) with errors"
  exit 1
fi

echo "All workflow files are valid"
