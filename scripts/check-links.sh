#!/usr/bin/env bash
#
# scripts/check-links.sh — check the links in this repo's Markdown docs.
#
# lychee is an optional tool (see scripts/bootstrap.sh):
#   - not installed          → warn and exit 0, so the step degrades gracefully
#   - installed and it fails → exit non-zero, so broken links fail `check:all`
#
# The old inline `command -v lychee && lychee ... || echo 'not installed'` had
# the `||` bound to the whole `&&` chain, so a lychee *failure* printed the
# "not installed" message and exited 0 — the step gated nothing.
#
# Inputs are the Markdown files tracked by git. That keeps node_modules,
# scratchpads and other local scratch files out of the run: checking everything
# under '**/*.md' meant ~23k links and half an hour of wall clock.
#
# Shared settings (excludes, retries, cache) live in lychee.toml so this script
# and .github/workflows/docs.yml check the same things the same way. Extra
# arguments are passed through to lychee, e.g.:
#
#   npm run links -- --verbose
#
# Set GITHUB_TOKEN in the environment to avoid github.com rate limiting.
set -euo pipefail

if ! command -v lychee >/dev/null 2>&1; then
  printf 'lychee not installed; skipping link check (see scripts/bootstrap.sh)\n'
  exit 0
fi

# Run from the repo root so the file list and lychee.toml resolve consistently
# no matter which directory the script was invoked from.
if root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$root"
else
  # Not a git checkout (e.g. an extracted tarball): fall back to a glob and let
  # lychee.toml's exclude_path keep vendored directories out of the run.
  exec lychee './**/*.md'
fi

files="$(git ls-files -- '*.md')"

if [ -z "$files" ]; then
  printf 'No tracked Markdown files to check.\n'
  exit 0
fi

printf '%s\n' "$files" | lychee --files-from - "$@"
