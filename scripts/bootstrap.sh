#!/usr/bin/env bash
#
# scripts/bootstrap.sh — verify required tools are installed and run `npm ci`.
# Optional binaries (gitleaks, lychee) are nice-to-have; missing ones are
# warned about, not fatal.
#
set -euo pipefail

green="$(printf '\033[32m')"
yellow="$(printf '\033[33m')"
red="$(printf '\033[31m')"
reset="$(printf '\033[0m')"

require() {
  if command -v "$1" >/dev/null 2>&1; then
    printf "%s✓%s %s\n" "$green" "$reset" "$1"
  else
    printf "%s✗%s %s — required. %s\n" "$red" "$reset" "$1" "$2" >&2
    return 1
  fi
}

optional() {
  if command -v "$1" >/dev/null 2>&1; then
    printf "%s✓%s %s\n" "$green" "$reset" "$1"
  else
    printf "%s○%s %s — optional. %s\n" "$yellow" "$reset" "$1" "$2"
  fi
}

echo "Checking required tools..."
require node "Install via nvm (https://github.com/nvm-sh/nvm) or your package manager."
require npm  "Comes with Node."
require git  "Install from https://git-scm.com or your package manager."

echo
echo "Checking optional tools..."
optional gitleaks "Install: 'brew install gitleaks' or download from https://github.com/gitleaks/gitleaks/releases"
optional lychee   "Install: 'brew install lychee' or 'cargo install lychee' or https://github.com/lycheeverse/lychee/releases"

# Verify the active Node major matches .nvmrc / package.json engines.
if [ -f .nvmrc ]; then
  desired_major="$(tr -d 'v\n' < .nvmrc | cut -d. -f1)"
  active_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$desired_major" != "$active_major" ]; then
    printf "%s!%s Node major mismatch: .nvmrc wants %s, you are on %s\n" \
      "$yellow" "$reset" "$desired_major" "$active_major"
    printf "  Run: nvm use\n"
  fi
fi

echo
echo "Installing npm dependencies..."
npm ci

echo
printf "%sBootstrap complete.%s Try: %snpm run check%s\n" \
  "$green" "$reset" "$green" "$reset"
