/**
 * @fileoverview Behaviour of the fleet-security secret gate block in .husky/pre-push
 *
 * The block is shell, so it is run rather than read: a text assertion cannot
 * tell a working gate from a dead one. Appending `|| true` to the gate call,
 * dropping its `"$@"`, or quoting the replay's here-doc delimiter leaves nearly
 * all of the text in place and switches the gate off, or breaks later hook code
 * that reads the refs.
 *
 * Each test runs the real hook as husky does (`sh -e`) under a stand-in HOME,
 * where the gate is a stub that records its arguments and stdin, with a
 * stand-in `npm` first on PATH. The stub `npm` stands for everything after the
 * block: it records the stdin it inherits, which is how the replay is asserted,
 * and marks that it ran, which is how "the push was blocked" is told apart from
 * "the rest of the hook ran".
 *
 * The same block, and this suite, are the reference copy in AFixt/genrem#129.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK = path.resolve(__dirname, '../.husky/pre-push');

/** Stand-in for ~/.fleet-security/bin/pre-push-secrets: consumes all of stdin, as the real gate does. */
const STUB_GATE = `#!/bin/sh
printf '%s\\n' "$@" > "$WORK/gate-args"
cat > "$WORK/gate-stdin"
exit "\${GATE_RC:-0}"
`;

/** Stand-in for `npm`: the rest of the hook, reading the refs after the gate. */
const STUB_NPM = `#!/bin/sh
cat > "$WORK/tail-stdin"
touch "$WORK/tail-ran"
`;

/**
 * The environment for the hook, minus GIT_* variables. Git exports them to a
 * hook run from a worktree, and inherited they would point any git command
 * the hook runs at the real repository.
 *
 * @param {Record<string, string>} extra - variables to add
 * @returns {Record<string, string>} a sanitised environment
 */
const childEnv = extra => {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_')) env[key] = value;
  }
  return { ...env, ...extra };
};

describe('.husky/pre-push secret gate block', () => {
  let work;
  const gatePath = () => path.join(work, 'home', '.fleet-security', 'bin', 'pre-push-secrets');
  const readWork = name => fs.readFileSync(path.join(work, name), 'utf8');
  const ran = name => fs.existsSync(path.join(work, name));

  /**
   * Run the hook as husky does, with git's two pre-push arguments.
   *
   * @param {string} input - the ref lines git would send on stdin
   * @param {Record<string, string>} [extra] - variables to add
   * @returns {import('child_process').SpawnSyncReturns<string>} the result
   */
  const runHook = (input, extra = {}) =>
    spawnSync('sh', ['-e', HOOK, 'origin', 'git@example.com:org/repo.git'], {
      input,
      env: childEnv({
        HOME: path.join(work, 'home'),
        PATH: `${path.join(work, 'bin')}${path.delimiter}${process.env.PATH}`,
        WORK: work,
        ...extra
      }),
      encoding: 'utf8'
    });

  /**
   * Install the stub gate, executable unless told otherwise.
   *
   * @param {number} [mode] - file mode for the stub
   */
  const installGate = (mode = 0o755) => {
    fs.mkdirSync(path.dirname(gatePath()), { recursive: true });
    fs.writeFileSync(gatePath(), STUB_GATE);
    fs.chmodSync(gatePath(), mode);
  };

  beforeEach(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-push-hook-'));
    fs.mkdirSync(path.join(work, 'home'));
    fs.mkdirSync(path.join(work, 'bin'));
    fs.writeFileSync(path.join(work, 'bin', 'npm'), STUB_NPM);
    fs.chmodSync(path.join(work, 'bin', 'npm'), 0o755);
  });

  afterEach(() => {
    fs.rmSync(work, { recursive: true, force: true });
  });

  it('blocks the push, and skips the rest of the hook, when the gate fails', () => {
    installGate();

    const res = runHook('refs/heads/a 1111 refs/heads/a 0000\n', { GATE_RC: '1' });

    expect(res.status).not.toBe(0);
    expect(ran('gate-stdin')).toBe(true);
    expect(ran('tail-ran')).toBe(false);
  });

  it("hands the gate git's remote name and URL, and every ref line", () => {
    installGate();
    const refs = 'refs/heads/a 1111 refs/heads/a 0000\nrefs/tags/v1 2222 refs/tags/v1 0000\n';

    const res = runHook(refs);

    expect(res.status).toBe(0);
    expect(readWork('gate-args')).toBe('origin\ngit@example.com:org/repo.git\n');
    expect(readWork('gate-stdin')).toBe(refs);
    expect(ran('tail-ran')).toBe(true);
  });

  it('replays the refs to the rest of the hook byte for byte, unexpanded', () => {
    // The gate consumes stdin, and stdin can be read only once. The replay goes
    // through a here-doc, so a ref name carrying `$`, a backtick or a backslash
    // is exactly where an expansion bug would show.
    installGate();
    const refs =
      'refs/heads/x$HOME`id`\\n 1111 refs/heads/x 0000\nrefs/heads/b 2222 refs/heads/b 0000\n';

    const res = runHook(refs);

    expect(res.status).toBe(0);
    expect(readWork('gate-stdin')).toBe(refs);
    expect(readWork('tail-stdin')).toBe(refs);
  });

  it('replays an empty stdin as empty, not as one blank ref line', () => {
    // A `while read ... || [ -n "$ref" ]` loop later in a hook runs once for a
    // blank line and zero times for no input, so the difference is observable.
    installGate();

    const res = runHook('');

    expect(res.status).toBe(0);
    expect(readWork('tail-stdin')).toBe('');
  });

  it('skips silently and runs the rest of the hook when the gate is not installed', () => {
    // .husky/pre-push is tracked; a missing toolkit must not block every push.
    const refs = 'refs/heads/a 1111 refs/heads/a 0000\n';

    const res = runHook(refs);

    expect(res.status).toBe(0);
    expect(res.stderr).toBe('');
    expect(readWork('tail-stdin')).toBe(refs);
  });

  it('warns on stderr, and still runs the rest of the hook, when the gate is not executable', () => {
    // A broken install that skipped quietly would look exactly like a clean scan.
    installGate(0o644);
    const refs = 'refs/heads/a 1111 refs/heads/a 0000\n';

    const res = runHook(refs);

    expect(res.status).toBe(0);
    expect(res.stderr).toMatch(/present but not executable[\s\S]*SKIPPED/);
    expect(res.stdout).toBe('');
    expect(ran('gate-stdin')).toBe(false);
    expect(readWork('tail-stdin')).toBe(refs);
  });
});
