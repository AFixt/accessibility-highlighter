/**
 * @fileoverview Tests for scripts/extract-release-notes.sh
 *
 * The release workflow feeds the extracted section to `gh release create
 * --notes-file`, so a silent mismatch degrades every release to generic
 * boilerplate. These tests pin the heading shapes standard-version actually
 * emits:
 *   - "## [1.1.0](compare-url) (date)"   minor and major bumps
 *   - "### [1.0.1](compare-url) (date)"  patch bumps
 *   - "## 1.0.0 (date)"                  first release, no compare link
 * and the v-prefixed tag names the workflow passes in.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../scripts/extract-release-notes.sh');

const COMPARE = 'https://github.com/AFixt/a11y-highlighter/compare';

const CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](${COMPARE}/v1.1.0...v2.0.0) (2026-07-22)


### ⚠ BREAKING CHANGES

* big rework

### Features

* major change abc1234

## [1.1.0](${COMPARE}/v1.0.10...v1.1.0) (2026-07-21)


### Features

* minor level change def5678

### [1.0.10](${COMPARE}/v1.0.1...v1.0.10) (2026-07-20)


### Bug Fixes

* tenth patch 9999999

### [1.0.1](${COMPARE}/v1.0.0...v1.0.1) (2026-07-19)


### Bug Fixes

* patch level change fed4321


### Documentation

* note the fix 1122334

## 1.0.0 (2026-07-18)


### Features

* initial release 5566778
`;

let tmpDir;
let changelogPath;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-release-notes-'));
  changelogPath = path.join(tmpDir, 'CHANGELOG.md');
  fs.writeFileSync(changelogPath, CHANGELOG);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Run the extraction script and return its stdout.
 *
 * @param {string} version Version to extract, with or without a leading "v"
 * @param {string} [changelog] Path to the changelog to read
 * @returns {string} The extracted section
 */
function extract(version, changelog = changelogPath) {
  return execFileSync(SCRIPT, [version, changelog], { encoding: 'utf8' });
}

describe('extract-release-notes.sh', () => {
  it('extracts a patch release written under an h3 heading', () => {
    expect(extract('v1.0.1')).toBe(
      [
        '### Bug Fixes',
        '',
        '* patch level change fed4321',
        '',
        '',
        '### Documentation',
        '',
        '* note the fix 1122334'
      ].join('\n') + '\n'
    );
  });

  it('extracts a minor release written under an h2 heading', () => {
    expect(extract('v1.1.0')).toBe(
      ['### Features', '', '* minor level change def5678'].join('\n') + '\n'
    );
  });

  it('extracts a major release including its breaking-changes section', () => {
    const notes = extract('v2.0.0');
    expect(notes).toContain('### ⚠ BREAKING CHANGES');
    expect(notes).toContain('* big rework');
    expect(notes).toContain('* major change abc1234');
    expect(notes).not.toContain('minor level change');
  });

  it('extracts a first release, whose heading has no compare link', () => {
    expect(extract('v1.0.0')).toBe(
      ['### Features', '', '* initial release 5566778'].join('\n') + '\n'
    );
  });

  it('accepts a version with no leading v', () => {
    expect(extract('1.1.0')).toBe(extract('v1.1.0'));
  });

  it('stops at the next version heading rather than the next h3', () => {
    const notes = extract('v1.0.1');
    expect(notes).toContain('### Documentation');
    expect(notes).not.toContain('1.0.0');
    expect(notes).not.toContain('tenth patch');
  });

  it('does not let 1.0.1 match the 1.0.10 heading', () => {
    expect(extract('v1.0.1')).not.toContain('tenth patch');
    expect(extract('v1.0.10')).toContain('tenth patch');
  });

  it('treats dots literally rather than as regex wildcards', () => {
    expect(extract('v1x1x0')).toBe('');
  });

  it('produces no output for a version that has no section', () => {
    expect(extract('v9.9.9')).toBe('');
  });

  it('produces no output when the changelog is missing', () => {
    expect(extract('v1.0.1', path.join(tmpDir, 'nope.md'))).toBe('');
  });

  it('produces no output for a changelog with only a title', () => {
    const bare = path.join(tmpDir, 'BARE.md');
    fs.writeFileSync(bare, '# Changelog\n\nAll notable changes...\n');
    expect(extract('v1.0.5', bare)).toBe('');
  });

  it('stops the oldest section at a trailing h1 rather than swallowing it', () => {
    const trailing = path.join(tmpDir, 'TRAILING.md');
    fs.writeFileSync(
      trailing,
      [
        '## 1.0.0 (2026-07-18)',
        '',
        '### Features',
        '',
        '* initial release 5566778',
        '',
        '# Older releases',
        '',
        'See the v0 tags.',
        ''
      ].join('\n')
    );
    expect(extract('v1.0.0', trailing)).toBe(
      ['### Features', '', '* initial release 5566778'].join('\n') + '\n'
    );
  });
});
