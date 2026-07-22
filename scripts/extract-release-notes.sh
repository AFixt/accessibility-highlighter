#!/usr/bin/env bash
#
# Extract the CHANGELOG.md section for a single release.
#
# Usage: scripts/extract-release-notes.sh <version> [changelog-path]
#
# <version> may carry the leading "v" used by release tags (v1.0.5) or not
# (1.0.5) — standard-version writes the version bare in the CHANGELOG heading,
# so the prefix is stripped before matching.
#
# The matching section is written to stdout with surrounding blank lines
# trimmed. A version with no section (or a missing CHANGELOG) produces no
# output and exit status 0, so callers can fall back to generic release notes.

set -euo pipefail

VERSION="${1:?usage: extract-release-notes.sh <version> [changelog-path]}"
CHANGELOG="${2:-CHANGELOG.md}"

[ -f "$CHANGELOG" ] || exit 0

# standard-version writes one of:
#   "## [1.1.0](compare-url) (date)"    minor and major bumps
#   "### [1.0.1](compare-url) (date)"   patch bumps
#   "## 1.0.0 (date)"                   first release, which has no compare link
# so match an h2 or h3 with the link brackets optional. Escape the dots so they
# match literally rather than as regex wildcards, and require the version to be
# followed by "]" or a space so 1.0.1 does not also match 1.0.10.
VERSION_NUM="${VERSION#v}"
RELEASE_NOTES_VERSION_RE="${VERSION_NUM//./\\.}"
export RELEASE_NOTES_VERSION_RE

# The section ends at the next *version* heading — one whose text starts with a
# digit or "[" — so that the per-type headings inside it ("### Features") are
# kept rather than treated as terminators. An h1 also ends it: the last section
# in the file has no following version heading, so anything appended after it
# (a link-reference block, a trailing title) would otherwise be swallowed.
awk '
  BEGIN { start = "^###? \\[?" ENVIRON["RELEASE_NOTES_VERSION_RE"] "(\\]| )" }
  $0 ~ start { flag = 1; next }
  /^# / { flag = 0 }
  /^###? \[?[0-9]/ { flag = 0 }
  flag
' "$CHANGELOG" | awk '
  NF == 0 && !started { next }
  { started = 1; lines[++n] = $0; if (NF) last = n }
  END { for (i = 1; i <= last; i++) print lines[i] }
'
