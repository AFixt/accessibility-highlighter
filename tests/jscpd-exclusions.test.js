/**
 * @jest-environment node
 */

/**
 * Unit + end-to-end tests for the duplication-gate exclusion reporter.
 *
 * `scripts/jscpd-exclusions.js` exists because jscpd's `maxLines`/`maxSize` drop
 * an oversized file from the analysis entirely rather than truncating it, so a
 * repo reads "clean" while its largest files were never opened. The script's
 * whole job is to state what jscpd skipped.
 *
 * That makes it a reporter whose only value is accuracy, and it has no gate
 * behind it to catch a mistake — it always exits 0. So these tests pin the two
 * things that decide whether its output is true:
 *
 *   1. THE BOUNDARIES, which were measured against real jscpd, not inferred.
 *      Under jscpd 4.x maxLines drops at `>=`; under 5.x it drops at `>`;
 *      maxSize drops at `>` under both. The first version of this script used
 *      `>` for both limits on 4.x, and therefore reported a file of exactly
 *      maxLines as analysed when jscpd had dropped it — reproducing the exact
 *      defect it was written to report. `maxLines boundary` below is the
 *      regression test for that, and for the 5.x rule (AFixt/rest-base#199).
 *
 *   2. THE CANDIDATE SET. `gitignore: true` means jscpd respects .gitignore,
 *      not that it reads only tracked files; it analyses untracked, non-ignored
 *      files normally. The first version listed `git ls-files` alone and so
 *      under-reported. `candidate set` below pins that.
 *
 * Both failure modes are silent under-reporting, which no CI signal would ever
 * surface, so they are pinned here or nowhere.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  matchBraces,
  globToRegExp,
  compileIgnores,
  parseSize,
  countLines,
  extensionsFor,
  candidateFiles,
  jscpdMajor,
  classify,
  collectExclusions
} = require('../scripts/jscpd-exclusions');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'jscpd-exclusions.js');

/**
 * `process.env` without any `GIT_*` variable, plus `extra`.
 *
 * Git exports `GIT_DIR` and friends to every hook it runs, and from a worktree
 * they point at the real repository. A `git -C <tmp> init` that inherits them
 * re-initialises that repository instead of creating a new one, so every git
 * and CLI spawn below passes this as its `env`. Under Jest a spawn without
 * `env` sees the real process environment, not the test's copy of it.
 *
 * @param {Record<string, string>} [extra] - variables to set on top
 * @returns {NodeJS.ProcessEnv} a scrubbed copy; the live env is untouched
 */
function hermeticEnv(extra = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
  );
  return { ...env, ...extra };
}

/** Temp dirs created by a test, removed in afterEach. */
let dirs = [];

afterEach(() => {
  for (const d of dirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
  dirs = [];
});

/**
 * Make a throwaway git repo.
 *
 * @param {object} [options] - Options
 * @param {object|null} [options.config] - .jscpd.json contents, or null to omit
 * @param {Record<string, string>} [options.tracked] - files to write and commit
 * @param {Record<string, string>} [options.untracked] - files to write, not commit
 * @param {string} [options.gitignore] - .gitignore contents
 * @returns {string} Absolute path to the repo
 */
function makeRepo({ config = {}, tracked = {}, untracked = {}, gitignore } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-exc-'));
  dirs.push(dir);
  execFileSync('git', ['-C', dir, 'init', '-q'], { env: hermeticEnv() });
  if (gitignore !== undefined) {
    fs.writeFileSync(path.join(dir, '.gitignore'), gitignore);
  }
  if (config !== null) {
    fs.writeFileSync(path.join(dir, '.jscpd.json'), JSON.stringify(config));
  }
  for (const [name, body] of Object.entries(tracked)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  // Staged by name rather than `add -A`, matching the repo-wide rule against
  // blanket staging. The fixture repo is disposable, but a helper that models
  // the banned form is the one that gets copied into somewhere it matters.
  const staged = [
    ...(config === null ? [] : ['.jscpd.json']),
    ...(gitignore === undefined ? [] : ['.gitignore']),
    ...Object.keys(tracked)
  ];
  if (staged.length > 0) {
    execFileSync('git', ['-C', dir, 'add', '--', ...staged], { env: hermeticEnv() });
  }
  execFileSync(
    'git',
    [
      '-C',
      dir,
      '-c',
      'user.email=t@t',
      '-c',
      'user.name=t',
      'commit',
      '-qm',
      'seed',
      '--allow-empty'
    ],
    { env: hermeticEnv() }
  );
  for (const [name, body] of Object.entries(untracked)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

/** @param {number} n - line count @returns {string} n newline-terminated lines */
const lines = n => 'const a = 1;\n'.repeat(n);

/**
 * Run the real CLI against a repo.
 *
 * @param {string} dir - repo path
 * @param {Record<string, string>} [extraEnv] - variables to set for the CLI
 * @returns {{code: number, output: string}} Exit code and combined output
 */
function run(dir, extraEnv = {}) {
  try {
    const output = execFileSync(process.execPath, [SCRIPT, path.join(dir, '.jscpd.json')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: hermeticEnv(extraEnv)
    });
    return { code: 0, output };
  } catch (error) {
    return { code: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

/**
 * Install a stand-in jscpd manifest, which is all the reporter reads of it.
 *
 * @param {string} dir - Repo root.
 * @param {string} version - The version to claim.
 */
function fakeJscpd(dir, version) {
  const pkgDir = path.join(dir, 'node_modules', 'jscpd');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'jscpd', version }));
}

describe('maxLines boundary — jscpd 4.x drops at >=, not >', () => {
  // Measured against jscpd 4.2.4 with maxLines 1000: a 999-line file is
  // analysed, a 1000-line file is NOT. Getting this wrong under-reports in
  // silence. 4.x is also the rule when the version cannot be read.
  test.each([
    [998, false],
    [999, false],
    [1000, true],
    [1001, true]
  ])('a %i-line file is excluded: %s', (n, excluded) => {
    const dir = makeRepo({ tracked: { 'f.js': lines(n) } });
    const hit = classify(path.join(dir, 'f.js'), { maxLines: 1000, maxSize: null });
    expect(hit === null ? false : hit.kind === 'lines').toBe(excluded);
  });

  test('the file at exactly maxLines is named in the output', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'exact.js': lines(1000), 'under.js': lines(999) }
    });
    fakeJscpd(dir, '4.2.4');
    const { code, output } = run(dir);
    expect(code).toBe(0);
    expect(output).toContain('exact.js');
    expect(output).not.toContain('under.js');
    expect(output).toContain('1 file(s) will NOT be analysed');
    expect(output).toContain('maxLines rule: dropped at >= maxLines (jscpd 4.x)');
    expect(output).not.toContain('could not read the installed jscpd version');
  });

  test('an unreadable jscpd version falls back to the 4.x rule, and says so', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'exact.js': lines(1000) }
    });
    const { code, output } = run(dir);
    expect(code).toBe(0);
    expect(output).toContain('could not read the installed jscpd version');
    expect(output).toContain('maxLines rule: dropped at >= maxLines (jscpd version unknown)');
    expect(output).toContain('exact.js');
  });
});

describe('maxLines boundary — jscpd 5.x drops at >, unlike 4.x (AFixt/rest-base#199)', () => {
  // Measured against jscpd 5.4.1 with maxLines 1000: 1000 lines are analysed
  // and 1001 are dropped, with or without a trailing newline.
  test.each([
    [999, false],
    [1000, false],
    [1001, true]
  ])('a %i-line file is excluded: %s', (n, excluded) => {
    const dir = makeRepo({ tracked: { 'f.js': lines(n) } });
    const hit = classify(path.join(dir, 'f.js'), {
      maxLines: 1000,
      maxSize: null,
      maxLinesInclusive: false
    });
    expect(hit === null ? false : hit.kind === 'lines').toBe(excluded);
  });

  test('the CLI applies the 5.x rule when jscpd 5 is installed', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'exact.js': lines(1000), 'over.js': lines(1001) }
    });
    fakeJscpd(dir, '5.4.1');
    const { code, output } = run(dir);
    expect(code).toBe(0);
    expect(output).toContain('over.js');
    expect(output).not.toContain('exact.js');
    expect(output).toContain('1 file(s) will NOT be analysed');
    expect(output).toContain('maxLines rule: dropped at > maxLines (jscpd 5.x)');
  });
});

describe('jscpdMajor', () => {
  test('reads the major from the jscpd that resolves from the config directory', () => {
    const dir = makeRepo();
    fakeJscpd(dir, '5.4.1');
    expect(jscpdMajor(dir)).toBe(5);
  });

  test('is null when jscpd is not installed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-nomod-'));
    dirs.push(dir);
    expect(jscpdMajor(dir)).toBeNull();
  });

  test('is null when the version is not semver-shaped', () => {
    const dir = makeRepo();
    fakeJscpd(dir, 'latest');
    expect(jscpdMajor(dir)).toBeNull();
  });
});

describe('maxSize boundary — jscpd drops at >, under 4.x and 5.x alike', () => {
  test.each([
    [1023, false],
    [1024, false],
    [1025, true]
  ])('a %i-byte file is excluded: %s', (bytes, excluded) => {
    const dir = makeRepo({ tracked: { 'f.js': 'a'.repeat(bytes) } });
    const hit = classify(path.join(dir, 'f.js'), { maxLines: null, maxSize: 1024 });
    expect(hit === null ? false : hit.kind === 'size').toBe(excluded);
  });

  test('a file over both limits is reported once, as oversize', () => {
    const dir = makeRepo({ tracked: { 'big.js': lines(2000) } });
    const hit = classify(path.join(dir, 'big.js'), { maxLines: 1000, maxSize: 1024 });
    expect(hit.kind).toBe('size');
  });
});

describe('candidate set — gitignore:true respects .gitignore, it is not tracked-only', () => {
  test('an untracked, non-ignored file is a candidate', () => {
    const dir = makeRepo({
      tracked: { 'kept.js': lines(1) },
      untracked: { 'newish.js': lines(1) }
    });
    expect(candidateFiles(dir)).toEqual(expect.arrayContaining(['kept.js', 'newish.js']));
  });

  test('a gitignored file is not a candidate', () => {
    const dir = makeRepo({
      gitignore: 'ignored.js\n',
      tracked: { 'kept.js': lines(1) },
      untracked: { 'ignored.js': lines(1) }
    });
    const files = candidateFiles(dir);
    expect(files).toContain('kept.js');
    expect(files).not.toContain('ignored.js');
  });

  test('an untracked oversized file is reported, not silently missed', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'small.js': lines(3) },
      untracked: { 'huge-new.js': lines(1500) }
    });
    expect(run(dir).output).toContain('huge-new.js');
  });

  test('lists the repository at root, not one an inherited GIT_DIR names (AFixt/rest-base#186)', () => {
    // Git exports GIT_DIR (and GIT_WORK_TREE from a worktree) to every hook,
    // and the pre-push hook runs this suite. `git -C root` alone does not
    // override them, so the listing came from whichever repository they named
    // and this oversized file went unreported. Driven as a subprocess because
    // under Jest a test's process.env is a copy the module's spawns never see.
    const decoy = makeRepo({ tracked: { 'decoy-only.js': lines(1) } });
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'huge.js': lines(1500) }
    });
    const { output } = run(dir, {
      GIT_DIR: path.join(decoy, '.git'),
      GIT_WORK_TREE: decoy
    });
    expect(output).toContain('huge.js');
    expect(output).not.toContain('decoy-only.js');
  });

  test('outside a git checkout it reports UNKNOWN rather than clean', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-nogit-'));
    dirs.push(dir);
    fs.writeFileSync(
      path.join(dir, '.jscpd.json'),
      JSON.stringify({ maxLines: 1000, format: ['javascript'] })
    );
    expect(candidateFiles(dir)).toBeNull();
    const { code, output } = run(dir);
    expect(code).toBe(0);
    expect(output).toContain('UNKNOWN');
  });
});

describe('ignore globs', () => {
  test.each([
    ['**/node_modules/**', 'node_modules/x.js', true],
    ['**/node_modules/**', 'a/b/node_modules/x.js', true],
    ['**/node_modules/**', 'src/app.js', false],
    ['**/*.min.js', 'a.min.js', true],
    ['**/*.min.js', 'deep/a.min.js', true],
    ['**/*.min.js', 'a.js', false],
    ['**/package-lock.json', 'package-lock.json', true],
    // Brace alternation. Escaping the braces as literals made these match
    // nothing, so a test file jscpd really does ignore was reported as
    // dropped by maxLines (AFixt/rest-base#197).
    ['**/*.test.{js,cjs,ts,tsx,jsx}', 'src/a.test.ts', true],
    ['**/*.test.{js,cjs,ts,tsx,jsx}', 'deep/b.test.jsx', true],
    ['**/*.test.{js,cjs,ts,tsx,jsx}', 'src/a.ts', false],
    ['**/*.test.{js,cjs,ts,tsx,jsx}', 'src/a.test.mjs', false],
    // A single-member brace group is still a group, not a literal.
    ['**/*.{js}', 'a.js', true],
    ['**/*.{js}', 'a.{js}', false],
    // Unpaired braces are literals, and the pattern still compiles.
    ['a{b.js', 'a{b.js', true],
    ['a}b.js', 'a}b.js', true]
  ])('%s matches %s: %s', (glob, candidate, expected) => {
    expect(globToRegExp(glob).test(candidate)).toBe(expected);
  });

  test('an ignored file is not reported even when oversized', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'], ignore: ['**/vendor/**'] },
      tracked: { 'a.js': lines(3) }
    });
    fs.mkdirSync(path.join(dir, 'vendor'));
    fs.writeFileSync(path.join(dir, 'vendor', 'big.js'), lines(2000));
    expect(run(dir).output).toContain('0 file(s) will NOT be analysed');
  });
});

describe('parseSize', () => {
  test.each([
    ['100kb', 102400],
    ['1mb', 1048576],
    ['512b', 512],
    ['512', 512],
    ['1.5kb', 1536],
    [2048, 2048]
  ])('%s -> %i', (input, expected) => {
    expect(parseSize(input)).toBe(expected);
  });

  test.each([
    ['', null],
    ['abc', null],
    ['10zb', null],
    [null, null],
    [undefined, null]
  ])('rejects %p', (input, expected) => {
    expect(parseSize(input)).toBe(expected);
  });
});

describe('countLines', () => {
  test.each([
    ['a\nb\n', 2],
    ['a\nb', 2],
    ['', 0],
    ['\n', 1]
  ])('counts %p as %i', (body, expected) => {
    const dir = makeRepo({ tracked: { 'f.js': body || 'x' } });
    const p = path.join(dir, 'f.js');
    fs.writeFileSync(p, body);
    expect(countLines(p)).toBe(expected);
  });
});

describe('extensionsFor', () => {
  test('maps known formats and ignores unknown ones', () => {
    expect([...extensionsFor(['javascript'])]).toEqual(
      expect.arrayContaining(['.js', '.mjs', '.cjs', '.jsx'])
    );
    expect([...extensionsFor(['typescript'])]).toEqual(expect.arrayContaining(['.ts', '.tsx']));
    expect([...extensionsFor(['brainfuck'])]).toEqual([]);
  });
});

describe('collectExclusions', () => {
  test('skips files whose extension is not a candidate format', () => {
    const dir = makeRepo({ tracked: { 'big.py': lines(2000), 'big.js': lines(2000) } });
    const { overLines } = collectExclusions(dir, ['big.py', 'big.js'], {
      exts: new Set(['.js']),
      ignores: [],
      maxLines: 1000,
      maxSize: null
    });
    expect(overLines.map(([rel]) => rel)).toEqual(['big.js']);
  });
});

describe('it reports rather than gating, and never passes silently', () => {
  test('exits 0 even with exclusions, because it is not a gate', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'big.js': lines(2000) }
    });
    expect(run(dir).code).toBe(0);
  });

  test('prints a summary when there is nothing to report', () => {
    const dir = makeRepo({
      config: { maxLines: 1000, format: ['javascript'] },
      tracked: { 'small.js': lines(3) }
    });
    const { output } = run(dir);
    expect(output).toContain('0 file(s) will NOT be analysed');
    expect(output).toContain('the gate saw all of them');
  });

  test('says so when the config is unparseable', () => {
    const dir = makeRepo({ tracked: { 'a.js': lines(1) } });
    fs.writeFileSync(path.join(dir, '.jscpd.json'), '{ not json');
    const { code, output } = run(dir);
    expect(code).toBe(0);
    expect(output).toContain('could not parse');
    expect(output).toContain('NOT the same as nothing being excluded');
  });

  test('says so when no limits are configured', () => {
    const dir = makeRepo({ config: { format: ['javascript'] }, tracked: { 'a.js': lines(1) } });
    expect(run(dir).output).toContain('nothing is dropped');
  });

  test('warns that it may under-report when format is absent', () => {
    const dir = makeRepo({ config: { maxLines: 1000 }, tracked: { 'a.js': lines(1) } });
    expect(run(dir).output).toContain('UNDER-report');
  });

  test('flags which exclusions are under src/, lib/ or app/', () => {
    const dir = makeRepo({ config: { maxLines: 1000, format: ['javascript'] } });
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'big.js'), lines(2000));
    expect(run(dir).output).toContain('1 of these are under src/, lib/ or app/');
  });
});

describe('matchBraces', () => {
  test('pairs a simple group', () => {
    const { paired, unmatched } = matchBraces('*.{js,ts}');
    expect([...paired].sort((a, b) => a - b)).toEqual([2, 8]);
    expect(unmatched).toBe(0);
  });

  test('counts an unclosed brace as unmatched and leaves it unpaired', () => {
    const { paired, unmatched } = matchBraces('{a');
    expect([...paired]).toEqual([]);
    expect(unmatched).toBe(1);
  });

  test('counts a stray closing brace as unmatched', () => {
    const { paired, unmatched } = matchBraces('a}');
    expect([...paired]).toEqual([]);
    expect(unmatched).toBe(1);
  });

  test('pairs the inner group of {a{b} and reports the outer as unmatched', () => {
    // The first version asked only whether some `}` appeared later and never
    // rebalanced, so this opened two groups and closed one. The RegExp it
    // built was invalid, `new RegExp` threw, and the `&&` after this CLI then
    // kept jscpd from running at all.
    const { paired, unmatched } = matchBraces('{a{b}');
    expect([...paired].sort((a, b) => a - b)).toEqual([2, 4]);
    expect(unmatched).toBe(1);
  });
});

describe('compileIgnores', () => {
  let logged;
  let spy;

  beforeEach(() => {
    logged = [];
    spy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  test('compiles every well-formed entry and says nothing', () => {
    const out = compileIgnores(['**/vendor/**', '**/*.test.{js,ts}']);
    expect(out).toHaveLength(2);
    expect(out[1].test('src/a.test.ts')).toBe(true);
    expect(logged).toEqual([]);
  });

  test('a non-array `ignore` yields no matchers rather than throwing', () => {
    expect(compileIgnores(undefined)).toEqual([]);
    expect(compileIgnores('**/*.js')).toEqual([]);
  });

  test('names an entry with unbalanced braces but still compiles it', () => {
    const out = compileIgnores(['{a{b}']);
    expect(out).toHaveLength(1);
    expect(logged.join('\n')).toContain('"{a{b}" has unbalanced braces');
  });

  test('names a non-string entry and skips it', () => {
    const out = compileIgnores([42]);
    expect(out).toEqual([]);
    expect(logged.join('\n')).toContain('could not parse ignore entry');
  });
});
