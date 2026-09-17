/**
 * @fileoverview Tests for scripts/action-pins.js
 *
 * The pin freshness check runs on workflow_dispatch only, so nothing exercises
 * this parser on a normal PR. A regression here does not fail a build — it
 * quietly reports "0 references checked" or drops the one stale pin that
 * mattered, and the supply-chain guarantee the SHA pinning was bought for goes
 * unverified until someone reads the output closely.
 *
 * These tests pin the reference shapes that actually appear in
 * .github/workflows, the shapes that must be skipped because they have no
 * upstream tag to compare against, and the boundary between "out of date" and
 * "could not be checked" — a distinction classifyPin exists to make.
 */

const {
  parseActionPins,
  classifyPin,
  checkedNothing,
  isComparable,
  repoSlug,
  summarize
} = require('../scripts/action-pins');

const SHA = 'd23441a48e516b6c34aea4fa41551a30e30af803';
const OTHER_SHA = '249970729cb0ef3589644e2896645e5dc5ba9c38';

/**
 * Parse a single workflow line, for the many cases that need only one.
 *
 * Throws rather than returning undefined so a parsing regression fails with
 * the line that stopped parsing, instead of "Cannot read properties of
 * undefined" from whichever property the caller reached for next. Cases that
 * expect nothing to parse call parseActionPins directly.
 *
 * @param {string} line One line of a workflow file.
 * @returns {object} The single pin parsed from it.
 */
function parseOne(line) {
  const [pin] = parseActionPins(line, 'ci.yml');
  if (!pin) {
    throw new Error(`expected one pin from: ${line.trim()}`);
  }
  return pin;
}

describe('parseActionPins', () => {
  it('parses the pinned-with-tag-comment form the workflows use', () => {
    expect(parseOne(`      - uses: actions/checkout@${SHA} # v6`)).toEqual({
      file: 'ci.yml',
      line: 1,
      owner: 'actions',
      repo: 'checkout',
      ref: SHA,
      sha: SHA,
      tag: 'v6'
    });
  });

  it('reads a uses: key that is not the first item in a step', () => {
    expect(parseOne(`        uses: actions/setup-node@${SHA} # v6`)).toMatchObject({
      owner: 'actions',
      repo: 'setup-node',
      sha: SHA,
      tag: 'v6'
    });
  });

  it('takes only the first word of the comment as the tag', () => {
    expect(
      parseOne(`      - uses: actions/checkout@${SHA} # v6 pinned deliberately`)
    ).toMatchObject({
      tag: 'v6'
    });
  });

  it('records no tag when there is no comment', () => {
    expect(parseOne(`      - uses: actions/checkout@${SHA}`).tag).toBeUndefined();
  });

  it('keeps owner and repo when the reference carries a subpath', () => {
    expect(parseOne(`      - uses: github/codeql-action/analyze@${SHA} # v4`)).toMatchObject({
      owner: 'github',
      repo: 'codeql-action',
      sha: SHA
    });
  });

  it('numbers lines from 1 so output pastes into an editor', () => {
    const workflow = [
      'jobs:',
      '  build:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`
    ];
    expect(parseActionPins(workflow.join('\n'), 'ci.yml')[0].line).toBe(4);
  });

  it('finds every reference in a multi-job workflow', () => {
    const workflow = [
      'jobs:',
      '  a:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`,
      `      - uses: actions/setup-node@${OTHER_SHA} # v6`,
      '  b:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`
    ].join('\n');

    expect(parseActionPins(workflow, 'ci.yml').map(p => `${p.repo}:${p.line}`)).toEqual([
      'checkout:4',
      'setup-node:5',
      'checkout:8'
    ]);
  });

  describe('references with no upstream tag to compare against', () => {
    it.each([
      ['a local action', '      - uses: ./.github/actions/setup@v1'],
      // Digest form, so this exercises the docker:// guard rather than tripping
      // over the missing-@ check first. The guard is belt-and-braces today —
      // "docker://…" splits to an empty repo and would be rejected anyway — so
      // this holds the behavior steady if that owner/repo parsing ever changes.
      ['a Docker action', '      - uses: docker://ghcr.io/owner/img@sha256:abc'],
      ['a commented-out step', `      # - uses: actions/checkout@${SHA} # v6`],
      ['a reference with no owner', `      - uses: checkout@${SHA}`],
      ['a reference with no @ref', '      - uses: actions/checkout'],
      ['a reference with a trailing @', '      - uses: actions/checkout@'],
      ['an empty uses:', '      - uses:'],
      // Non-empty until the comment is stripped, so it reaches the second of
      // the two empty-value checks. That check turns out to be redundant —
      // deleting it changes nothing, because an empty value has no "@" and is
      // rejected downstream anyway — so this pins the observable behavior, not
      // that particular branch. Executing it is what takes the file to 100%,
      // which is worth knowing when reading that number.
      ['a uses: whose value is only a comment', '      - uses: # v6'],
      ['an unrelated key', '      - name: actions/checkout@v4']
    ])('skips %s', (_label, line) => {
      expect(parseActionPins(line, 'ci.yml')).toEqual([]);
    });
  });

  describe('what counts as a SHA', () => {
    it('does not treat a floating ref as pinned', () => {
      const pin = parseOne('      - uses: actions/checkout@v4');
      expect(pin.sha).toBeUndefined();
      expect(pin.ref).toBe('v4');
    });

    it('does not treat an abbreviated SHA as pinned', () => {
      expect(
        parseOne(`      - uses: actions/checkout@${SHA.slice(0, 39)} # v6`).sha
      ).toBeUndefined();
    });

    it('does not treat an uppercase SHA as pinned', () => {
      // SHA_PATTERN is lower-case only. git writes lower-case hex, so this is
      // the parser declining to guess rather than a gap worth widening.
      expect(
        parseOne(`      - uses: actions/checkout@${SHA.toUpperCase()} # v6`).sha
      ).toBeUndefined();
    });

    it('still records the tag comment on an unpinned ref', () => {
      // The inline comment above this branch says a tag on an unpinned ref is
      // noise and is only recorded with a SHA, but the code records it either
      // way. It is inert today — classifyPin and the CLI both gate on pin.sha
      // first — so this pins the real behavior. If the code is ever aligned to
      // the comment, this test is the thing that says so.
      expect(parseOne('      - uses: actions/checkout@v4 # v4')).toMatchObject({
        ref: 'v4',
        tag: 'v4'
      });
    });
  });
});

describe('classifyPin', () => {
  const pinned = {
    file: 'ci.yml',
    line: 1,
    owner: 'actions',
    repo: 'checkout',
    ref: SHA,
    sha: SHA
  };

  it('reports a pin whose tag still resolves to it as current', () => {
    expect(classifyPin({ ...pinned, tag: 'v6' }, SHA)).toEqual({ kind: 'current' });
  });

  it('reports a pin whose tag has moved as stale, naming what to move to', () => {
    expect(classifyPin({ ...pinned, tag: 'v6' }, OTHER_SHA)).toEqual({
      kind: 'stale',
      expected: OTHER_SHA
    });
  });

  describe('unknown — there was nothing to compare', () => {
    it('when the reference is not pinned to a SHA', () => {
      const status = classifyPin({ ...pinned, ref: 'v4', sha: undefined, tag: 'v4' }, SHA);
      expect(status.kind).toBe('unknown');
      expect(status.reason).toContain('v4');
    });

    it('when a pinned SHA has no tag comment to check against', () => {
      const status = classifyPin(pinned, SHA);
      expect(status.kind).toBe('unknown');
      expect(status.reason).toContain('no "# <tag>" comment');
    });

    it('when the comment names a branch rather than a version tag', () => {
      // security.yml pins Dependency-Check_Action to a `main` commit on
      // purpose. `main` is a branch: it never resolves as a tag, so there is
      // nothing to compare and never will be. That was harmless while every
      // unresolvable pin shared the non-failing bucket; since #109 a failed
      // lookup fails the run, so this has to be decided by shape rather than
      // by asking the API and believing the answer.
      const status = classifyPin({ ...pinned, tag: 'main' }, undefined);

      expect(status.kind).toBe('unknown');
      expect(status.reason).toContain('main');
      expect(status.reason).toContain('not a version tag');
    });
  });

  it('reports a tag that would not resolve as unresolved, not unknown or stale', () => {
    // A deleted tag, a repository gone private, or a rate-limited call.
    // Reporting it as stale would send someone chasing a bump that is not
    // there; reporting it as unknown — which it was until #109 — files it
    // alongside "there was nothing to check" and lets the run exit 0 over a
    // comparison that was owed and never happened.
    const status = classifyPin({ ...pinned, tag: 'v6' }, undefined);

    expect(status.kind).toBe('unresolved');
    expect(status.reason).toContain('v6');
  });
});

describe('summarize', () => {
  it('fails the run for one unresolved pin among many that resolved', () => {
    // The case the old aggregate guard could not see: 28 resolve, 1 does not,
    // 0 stale, exit 0. This is the whole point of #109, so it is asserted
    // first and on its own.
    const statuses = [
      { kind: 'current' },
      { kind: 'current' },
      { kind: 'unresolved', reason: 'tag "v6" could not be resolved upstream' }
    ];

    expect(summarize(statuses)).toEqual({
      current: 2,
      stale: 0,
      unresolved: 1,
      unknown: 0,
      failed: true
    });
  });

  it('does not fail over pins that had nothing to compare', () => {
    const statuses = [
      { kind: 'current' },
      { kind: 'unknown', reason: 'not pinned to a SHA (points at "main")' }
    ];

    expect(summarize(statuses)).toMatchObject({ current: 1, unknown: 1, failed: false });
  });

  it('fails when a pin is stale', () => {
    expect(summarize([{ kind: 'stale', expected: OTHER_SHA }])).toMatchObject({
      stale: 1,
      failed: true
    });
  });

  it('passes an all-current run', () => {
    expect(summarize([{ kind: 'current' }, { kind: 'current' }])).toMatchObject({
      current: 2,
      failed: false
    });
  });

  it('passes when there was nothing to summarize at all', () => {
    expect(summarize([])).toEqual({
      current: 0,
      stale: 0,
      unresolved: 0,
      unknown: 0,
      failed: false
    });
  });

  it('throws on a kind it does not know rather than treating it as a pass', () => {
    // The allowlist is the load-bearing part. A denylist ("fail on stale and
    // unresolved") is fail-open in the same shape as the bug this replaces:
    // add a kind, forget to classify it, and the run reports success over a
    // state nobody decided about. Prior art: AFixt/cookie-banner#116, whose
    // first attempt used a denylist and had to be redone.
    expect(() => summarize([{ kind: 'probably-fine' }])).toThrow(/probably-fine/);
  });
});

describe('isComparable', () => {
  const pinned = {
    file: 'ci.yml',
    line: 1,
    owner: 'actions',
    repo: 'checkout',
    ref: SHA,
    sha: SHA
  };

  it('is true for a SHA pinned against a version tag', () => {
    expect(isComparable({ ...pinned, tag: 'v6' })).toBe(true);
    expect(isComparable({ ...pinned, tag: 'v4.4.0' })).toBe(true);
    expect(isComparable({ ...pinned, tag: '1.2.3' })).toBe(true);
  });

  it('is false for a branch pin, which can never resolve as a tag', () => {
    expect(isComparable({ ...pinned, tag: 'main' })).toBe(false);
    expect(isComparable({ ...pinned, tag: 'master' })).toBe(false);
  });

  it('is false without a SHA or without a tag comment', () => {
    expect(isComparable({ ...pinned, sha: undefined, ref: 'v4', tag: 'v4' })).toBe(false);
    expect(isComparable(pinned)).toBe(false);
  });
});

describe('checkedNothing', () => {
  const checkable = [
    { file: 'ci.yml', line: 1, owner: 'actions', repo: 'checkout', ref: SHA, sha: SHA, tag: 'v6' },
    { file: 'ci.yml', line: 2, owner: 'actions', repo: 'setup-node', ref: SHA, sha: SHA, tag: 'v6' }
  ];

  it('is true when not one checkable pin resolved — a token, rate-limit or network failure', () => {
    expect(checkedNothing(checkable, new Map())).toBe(true);
  });

  it('is false as soon as one resolves, so a single dead tag is not an outage', () => {
    expect(checkedNothing(checkable, new Map([['actions/checkout@v6', SHA]]))).toBe(false);
  });

  it('is false when every pin resolved', () => {
    const resolved = new Map([
      ['actions/checkout@v6', SHA],
      ['actions/setup-node@v6', SHA]
    ]);

    expect(checkedNothing(checkable, resolved)).toBe(false);
  });

  it('is false when nothing was checkable in the first place', () => {
    // Nothing to resolve is not the same as failing to resolve: a repository
    // with no SHA-pinned references has not suffered an outage.
    const unpinned = [{ file: 'a.yml', line: 1, owner: 'some', repo: 'action', ref: 'main' }];

    expect(checkedNothing(unpinned, new Map())).toBe(false);
  });

  it('ignores unpinned references when deciding, rather than counting them as failures', () => {
    // A pin with no tag comment is unresolvable by construction. If it counted
    // toward "checkable", one such reference alongside a healthy resolved pin
    // could never reach the all-resolved state.
    const mixed = [
      ...checkable,
      { file: 'a.yml', line: 3, owner: 'o', repo: 'r', ref: SHA, sha: SHA }
    ];
    const resolved = new Map([
      ['actions/checkout@v6', SHA],
      ['actions/setup-node@v6', SHA]
    ]);

    expect(checkedNothing(mixed, resolved)).toBe(false);
  });
});

describe('the check as a whole', () => {
  it('reports a moved tag as stale against the SHA it moved to, and leaves its neighbour current', () => {
    // The pieces are exercised separately above; this composes them the way
    // check-action-pins.js does, so the `slug@tag` lookup key that joins
    // parsing to classification is covered by something.
    const workflow = [
      `      - uses: actions/checkout@${SHA} # v6`,
      `      - uses: actions/setup-node@${OTHER_SHA} # v6`
    ].join('\n');
    const resolved = new Map([
      ['actions/checkout@v6', OTHER_SHA], // upstream moved v6 off the pinned SHA
      ['actions/setup-node@v6', OTHER_SHA] // still where it was pinned
    ]);

    const statuses = parseActionPins(workflow, 'ci.yml').map(pin =>
      classifyPin(pin, resolved.get(`${repoSlug(pin)}@${pin.tag}`))
    );

    expect(statuses).toEqual([{ kind: 'stale', expected: OTHER_SHA }, { kind: 'current' }]);
  });
});

describe('repoSlug', () => {
  it('joins owner and repo, dropping any subpath', () => {
    expect(repoSlug(parseOne(`      - uses: github/codeql-action/analyze@${SHA} # v4`))).toBe(
      'github/codeql-action'
    );
  });
});
