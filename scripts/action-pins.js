/**
 * Parses and classifies the pinned GitHub Actions references in
 * .github/workflows. Pure logic only — no I/O — so it is unit-testable
 * (tests/action-pins.test.js). The CLI wrapper that resolves tags against
 * the GitHub API is scripts/check-action-pins.js.
 *
 * Why this exists: every action reference here is pinned to a commit SHA so a
 * tag cannot be silently repointed under us. That closed a real supply-chain
 * hole and created an unowned maintenance job in exchange — a pinned SHA is
 * immune to a hijacked tag, and equally immune to the security fixes that tag
 * would have carried. Dependabot used to own refreshing the pins; it is now
 * banned repo-wide along with every other scheduled automation (#45),
 * so this check is the mechanism instead of it.
 *
 * The comparison is between the pinned SHA and the tag recorded in the
 * trailing comment (`@<sha> # v4.4.0`). Actions publish fixes by moving their
 * floating tag, so "the tag now points somewhere else" is exactly the signal
 * worth having.
 *
 * Known limitation: this cannot see a new major. A repository pinned to v4
 * keeps resolving v4 even after upstream ships v5. Dependabot would have
 * caught that; a human reading release notes still has to.
 *
 * Ported from lexic-a11y's scripts/action-pins.mjs (itself from a11y-mcp's
 * mcp-server/scripts/actionPins.ts). Rewritten as CommonJS to match this
 * repository's scripts/ idiom — see scripts/manifest-version.js. The parsing and
 * classification logic is unchanged, so a fix in any of the three ports
 * applies to the others.
 */

/**
 * @typedef {object} ActionPin
 * @property {string} file Workflow file the reference was found in.
 * @property {number} line 1-based line number, so output pastes into an editor.
 * @property {string} owner GitHub owner of the action.
 * @property {string} repo Repository name of the action.
 * @property {string} [sha] The 40-char commit SHA the workflow pins, if pinned.
 * @property {string} [tag] The version recorded in the trailing comment.
 * @property {string} ref The raw ref after `@`, whether or not it is a SHA.
 */

/**
 * @typedef {(
 *   | {kind: 'current'}
 *   | {kind: 'stale', expected: string}
 *   | {kind: 'unresolved', reason: string}
 *   | {kind: 'unknown', reason: string}
 * )} PinStatus
 * current: pinned SHA matches what the tag resolves to today.
 * stale: the tag has moved since this was pinned.
 * unresolved: a comparison was owed — the pin carries both a SHA and a tag —
 * and the lookup failed, so it did not happen.
 * unknown: nothing to compare against — no SHA, no tag comment, or a
 * deliberate branch pin.
 *
 * unresolved and unknown used to be one bucket, and that folded "we could not
 * check" into "there was nothing to check" (#109). Only the second is an
 * all-clear; the first is a check that was owed and never performed, and it
 * has to be able to fail the run on its own.
 */

const SHA_PATTERN = /^[0-9a-f]{40}$/;

// What a version tag looks like: v6, v4.4.0, 1.2.3. Anything else in the
// trailing comment is a branch or a note, not a tag to resolve.
//
// This repository has one such reference — Dependency-Check_Action pinned to a
// `main` commit, deliberately, because its only tag predates the `args` and
// `out` inputs the step depends on. The comment records `main @ 2025-12-10`,
// and `main` is a branch: it never resolves as a tag, and never will. Before
// #109 split unresolved out of unknown that cost nothing, because both were
// the same non-failing bucket. It does not any more, so the distinction has to
// be drawn before the lookup rather than after it — otherwise the one pin this
// repository can never check fails the check forever.
//
// Deliberately loose. The question is "is this the shape of a thing that could
// resolve as a tag", not "is this valid semver": an action tagged `v2.1.0-rc1`
// is still worth resolving, and one tagged `main` is still not.
const VERSION_TAG_PATTERN = /^v?\d/;

/**
 * Split a `uses:` line into its reference and any trailing `# tag` comment.
 *
 * String operations rather than a regex, for the same reason as
 * `splitActionRef` below: every pattern that expressed this concisely was
 * rejected by `security/detect-unsafe-regex` under this repository's lint
 * config. Scanning for the delimiters directly is linear by construction, so
 * there is nothing to be conservative about.
 *
 * @param {string} rawLine One line of a workflow file.
 * @returns {{value: string, tag?: string} | undefined} The reference and its tag comment, when the line is a `uses:`.
 */
function splitUsesLine(rawLine) {
  let rest = rawLine.trim();
  if (rest.startsWith('- ')) {
    rest = rest.slice(2).trim();
  }
  if (!rest.startsWith('uses:')) {
    return undefined;
  }

  rest = rest.slice('uses:'.length).trim();
  if (rest === '') {
    return undefined;
  }

  const hash = rest.indexOf('#');
  const value = (hash === -1 ? rest : rest.slice(0, hash)).trim();
  const comment = hash === -1 ? '' : rest.slice(hash + 1).trim();
  if (value === '') {
    return undefined;
  }

  // Only the first word of the comment is the tag; anything after it is prose.
  const [tag] = comment.split(/\s/, 1);
  return tag ? { value, tag } : { value };
}

/**
 * Split `owner/repo[/subpath]@ref` into its parts.
 *
 * Done with string operations rather than one regex on purpose. The upstream
 * ports match the whole thing in a single pattern whose optional `/subpath`
 * group overlaps the preceding `owner/repo`, which is ambiguous enough that
 * `security/detect-unsafe-regex` and `sonarjs/regex-complexity` both reject it
 * under this repository's lint config. Splitting on the last `@` and then on
 * `/` is unambiguous, linear, and easier to read than the pattern it replaces.
 *
 * Local (`./.github/actions/x`) and Docker (`docker://…`) references have no
 * upstream tag to compare against, so they are skipped here.
 *
 * @param {string} value The raw value following `uses:`.
 * @returns {{owner: string, repo: string, ref: string} | undefined} The parts, when it is an upstream action reference.
 */
function splitActionRef(value) {
  if (value.startsWith('./') || value.startsWith('docker://')) {
    return undefined;
  }

  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) {
    return undefined;
  }

  const [owner, repo] = value.slice(0, at).split('/');
  if (!owner || !repo) {
    return undefined;
  }

  return { owner, repo, ref: value.slice(at + 1) };
}

/**
 * Pull every action reference out of one workflow file's text.
 *
 * @param {string} text The workflow file contents.
 * @param {string} file The file name, recorded on each pin for reporting.
 * @returns {ActionPin[]} Every `uses:` reference found.
 */
function parseActionPins(text, file) {
  const pins = [];

  text.split('\n').forEach((rawLine, index) => {
    const line = splitUsesLine(rawLine);
    if (!line) {
      return;
    }

    const parts = splitActionRef(line.value);
    if (!parts) {
      return;
    }

    const { owner, repo, ref } = parts;
    const { tag } = line;

    pins.push({
      file,
      line: index + 1,
      owner,
      repo,
      ref,
      // A tag comment on an unpinned ref is noise; only record it with a SHA.
      ...(SHA_PATTERN.test(ref) ? { sha: ref } : {}),
      ...(tag ? { tag } : {})
    });
  });

  return pins;
}

/**
 * Compare one pin against the SHA its tag resolves to upstream.
 *
 * `resolvedSha` is undefined when the tag could not be resolved — a deleted
 * tag, a repository gone private or renamed, or a rate-limited API call. That
 * is unresolved rather than stale, because "we could not check" and "this is
 * out of date" warrant different responses — but it is not unknown either. A
 * pin carrying both a SHA and a tag was owed a comparison, and a comparison
 * that did not happen must not be reported as one that passed.
 *
 * @param {ActionPin} pin The parsed reference.
 * @param {string | undefined} resolvedSha What the tag points at today.
 * @returns {PinStatus} How the pin compares.
 */
function classifyPin(pin, resolvedSha) {
  if (!pin.sha) {
    return {
      kind: 'unknown',
      reason: `not pinned to a SHA (points at "${pin.ref}")`
    };
  }

  if (!pin.tag) {
    return {
      kind: 'unknown',
      reason: 'pinned to a SHA but has no "# <tag>" comment to check it against'
    };
  }

  if (!VERSION_TAG_PATTERN.test(pin.tag)) {
    return {
      kind: 'unknown',
      reason: `"${pin.tag}" is a branch or note, not a version tag — nothing to resolve against`
    };
  }

  if (!resolvedSha) {
    return { kind: 'unresolved', reason: `tag "${pin.tag}" could not be resolved upstream` };
  }

  return resolvedSha === pin.sha ? { kind: 'current' } : { kind: 'stale', expected: resolvedSha };
}

/**
 * Did the run resolve nothing at all?
 *
 * Since #109 an unresolved pin fails the run on its own, so this no longer
 * decides the exit code — summarize() does. It survives because the total
 * failure and the single dead tag want different words: nothing resolving is
 * an expired token, a rate limit or no network, and saying so beats printing
 * the same "could not be resolved" line against every pin and leaving the
 * reader to infer the outage.
 *
 * Only pins with both a SHA and a tag are checkable, so a repository with no
 * checkable pins is not an outage — there was nothing to resolve.
 *
 * @param {ActionPin[]} pins Every parsed reference.
 * @param {Map<string, string | undefined>} resolved Tag lookups, keyed `slug@tag`.
 * @returns {boolean} True when there was something to check and none of it resolved.
 */
function checkedNothing(pins, resolved) {
  const checkable = pins.filter(isComparable);
  if (checkable.length === 0) {
    return false;
  }

  return checkable.every(pin => !resolved.get(`${repoSlug(pin)}@${pin.tag}`));
}

/**
 * Is this pin owed a comparison?
 *
 * The one predicate behind three decisions that have to agree: which refs get
 * looked up, which failures count as a check that did not happen, and whether
 * a run with nothing resolved is an outage. They were computed separately
 * before, which is how `pin.sha && pin.tag` came to include a branch pin that
 * can never resolve.
 *
 * @param {ActionPin} pin The parsed reference.
 * @returns {boolean} True when the pin claims a version tag its SHA can be checked against.
 */
function isComparable(pin) {
  return Boolean(pin.sha && pin.tag && VERSION_TAG_PATTERN.test(pin.tag));
}

/**
 * `owner/repo` — the key a tag is resolved against.
 *
 * @param {ActionPin} pin The parsed reference.
 * @returns {string} The repository slug.
 */
function repoSlug(pin) {
  return `${pin.owner}/${pin.repo}`;
}

/**
 * Kinds that mean a check was owed and came back bad, or came back not at all.
 *
 * `unresolved` is here because a lookup that failed is a comparison that did
 * not happen, and an exit code that cannot tell an unperformed check from a
 * passed one is reporting an all-clear it never earned (#109). The realistic
 * shape is partial: a rate limit part-way through a run, or one action's
 * repository going private, leaves most pins resolving and a few silently
 * unchecked forever.
 */
const FAILING_KINDS = new Set(['stale', 'unresolved']);

/**
 * Kinds that are a legitimate pass — the comparison happened and matched, or
 * there was never a comparison to make.
 */
const PASSING_KINDS = new Set(['current', 'unknown']);

/**
 * Count statuses by kind and decide whether the run should fail.
 *
 * Deliberately an allowlist: a kind in neither set throws rather than being
 * waved through. A denylist ("fail on stale") is fail-open in exactly the
 * shape of the bug this replaces — add a kind, forget the exit-code branch,
 * and the run reports success over a state nobody classified. Prior art:
 * AFixt/cookie-banner#116, whose first attempt used a denylist and had to be
 * redone.
 *
 * @param {PinStatus[]} statuses One status per pin, in any order.
 * @returns {{current: number, stale: number, unresolved: number, unknown: number, failed: boolean}} Counts per kind, and whether to exit non-zero.
 * @throws {Error} When a status carries a kind this function does not know.
 */
function summarize(statuses) {
  const counts = { current: 0, stale: 0, unresolved: 0, unknown: 0 };

  for (const status of statuses) {
    if (!FAILING_KINDS.has(status.kind) && !PASSING_KINDS.has(status.kind)) {
      throw new Error(
        `unrecognised pin status kind "${status.kind}" — add it to FAILING_KINDS or ` +
          'PASSING_KINDS in scripts/action-pins.js rather than letting it pass unclassified'
      );
    }

    counts[status.kind] += 1;
  }

  return { ...counts, failed: statuses.some(status => FAILING_KINDS.has(status.kind)) };
}

module.exports = {
  parseActionPins,
  classifyPin,
  checkedNothing,
  isComparable,
  repoSlug,
  summarize
};
