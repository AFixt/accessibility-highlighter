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
 *   | {kind: 'unknown', reason: string}
 * )} PinStatus
 * current: pinned SHA matches what the tag resolves to today.
 * stale: the tag has moved since this was pinned.
 * unknown: nothing to compare against — no SHA, no tag comment, or the tag
 * could not be resolved.
 */

const SHA_PATTERN = /^[0-9a-f]{40}$/;

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
 * tag, a branch name in the comment, or a rate-limited API call. That is
 * reported as unknown rather than stale, because "we could not check" and
 * "this is out of date" warrant different responses.
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

  if (!resolvedSha) {
    return { kind: 'unknown', reason: `tag "${pin.tag}" could not be resolved upstream` };
  }

  return resolvedSha === pin.sha ? { kind: 'current' } : { kind: 'stale', expected: resolvedSha };
}

/**
 * Did the run resolve nothing at all?
 *
 * Every unresolved tag is reported as unknown, and unknown is not a failure —
 * one dead tag among many should not fail the job. But if *nothing* resolved,
 * the run has checked nothing, and reporting "0 stale" would be an all-clear
 * the check never earned. That is an expired or missing token, a rate limit,
 * or no network, and it is worth failing over.
 *
 * Only pins with both a SHA and a tag are checkable, so a repository with no
 * checkable pins is not an outage — there was nothing to resolve.
 *
 * @param {ActionPin[]} pins Every parsed reference.
 * @param {Map<string, string | undefined>} resolved Tag lookups, keyed `slug@tag`.
 * @returns {boolean} True when there was something to check and none of it resolved.
 */
function checkedNothing(pins, resolved) {
  const checkable = pins.filter(pin => pin.sha && pin.tag);
  if (checkable.length === 0) {
    return false;
  }

  return checkable.every(pin => !resolved.get(`${repoSlug(pin)}@${pin.tag}`));
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

module.exports = { parseActionPins, classifyPin, checkedNothing, repoSlug };
