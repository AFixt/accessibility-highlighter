/**
 * @fileoverview Tests for scripts/check-action-pins.js
 *
 * tests/action-pins.test.js covers the parsing and classification the CLI is
 * built from, including checkedNothing. What it cannot cover is whether the
 * CLI still *calls* any of it: deleting the whole checkedNothing block from
 * main() left every one of those tests green, which is the same silent pass
 * the guard exists to prevent, one level up.
 *
 * So these run the real script as a subprocess and assert on its exit code,
 * with GITHUB_API_URL pointed at a local server standing in for the API. A
 * server answering 403 reproduces a rate limit, which is the likeliest way
 * this check goes blind in practice.
 *
 * These used to carry 30s timeouts because the CLI sat at 0% CPU for 3-15s
 * (sometimes far longer) before exiting. The cause was never fetch as such: it
 * is Node's TLS stack, which costs seconds to initialise on some machines, and
 * which fetch pulls in lazily on first use. The CLI now loads node:https only
 * when the URL is actually https, so a run against this plain-http stub never
 * touches TLS at all and finishes in a few hundred milliseconds (#111).
 *
 * So they run on Jest's default 5s now, deliberately. Eagerly requiring
 * node:https again — or going back to fetch — would blow that budget and fail
 * here, which is the point: the cap is the regression guard.
 *
 * Note this only ever helped the tests. A real workflow_dispatch run must
 * reach https://api.github.com and still pays whatever the host charges for
 * TLS init.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SCRIPT = path.resolve(__dirname, '../scripts/check-action-pins.js');

const SHA = 'd23441a48e516b6c34aea4fa41551a30e30af803';

let tmpDir;
let server;
let apiUrl;
let requestCount;
let receivedHeaders;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-action-pins-'));

  // 403 is what a rate limit looks like, and resolveTag turns it into
  // undefined exactly as it would against the real API.
  server = http.createServer((req, res) => {
    requestCount += 1;
    receivedHeaders.push(req.headers);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'API rate limit exceeded' }));
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  requestCount = 0;
  receivedHeaders = [];
});

/**
 * Write a workflows directory containing one file.
 *
 * @param {string} name Directory name, unique per case.
 * @param {string[]} lines Contents of the workflow file.
 * @returns {string} Path to the workflows directory.
 */
function workflowsDir(name, lines) {
  const dir = path.join(tmpDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ci.yml'), lines.join('\n'));
  return dir;
}

/**
 * Run the check against a workflows directory, with the stub API standing in
 * for github.com.
 *
 * @param {string} dir The workflows directory to check.
 * @param {string} [api] API base to use, defaulting to the stub server.
 * @returns {Promise<{status: number, output: string}>} Exit code and combined output.
 */
async function check(dir, api = apiUrl) {
  const options = {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_API_URL: api, GITHUB_TOKEN: '' }
  };

  try {
    const { stdout, stderr } = await execFileAsync('node', [SCRIPT, dir], options);
    return { status: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { status: error.code, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

describe('check-action-pins CLI', () => {
  it('fails when not one tag resolved, rather than reporting an all-clear', async () => {
    const dir = workflowsDir('all-fail', [
      'jobs:',
      '  a:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`
    ]);

    const { status, output } = await check(dir);

    expect(requestCount).toBeGreaterThan(0); // it really did try
    expect(output).toContain('nothing here was actually checked');
    expect(status).toBe(1);
  });

  it('treats an unusable API as a failed lookup rather than crashing', async () => {
    // This fails on the socket rather than answering, which is the shape a DNS
    // or network failure takes. Unhandled it would reject the Promise.all over
    // every lookup and unwind past the guard with a stack trace; the request's
    // 'error' handler in getJson is what routes it back to "nothing resolved".
    const dir = workflowsDir('unusable-api', [
      'jobs:',
      '  a:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`
    ]);

    const { status, output } = await check(dir, 'http://127.0.0.1:0');

    expect(output).toContain('nothing here was actually checked');
    expect(output).not.toContain('TypeError');
    expect(status).toBe(1);
  });

  it('does not treat "nothing was checkable" as an outage', async () => {
    // Floating refs carry no SHA, so there was never anything to resolve.
    // Reporting them as unknown is right; failing the run over it is not.
    const dir = workflowsDir('nothing-checkable', [
      'jobs:',
      '  a:',
      '    steps:',
      '      - uses: actions/checkout@v4'
    ]);

    const { status, output } = await check(dir);

    expect(requestCount).toBe(0); // nothing was checkable, so nothing was looked up
    expect(output).not.toContain('nothing here was actually checked');
    expect(status).toBe(0);
  });

  it('sends a User-Agent, which the GitHub API requires', async () => {
    // Without one the API answers 403 "Request forbidden by administrative
    // rules" and every lookup fails. The run still exits 1 through
    // checkedNothing, so the breakage is quiet in the worst way: it reports
    // "could not be checked" against every pin forever, while a stub that
    // answers regardless of headers keeps the whole suite green.
    //
    // Caught exactly that way. fetch supplied the header on our behalf; the
    // node:https move dropped it and took real resolution from 49/51 to 0/51
    // with no test noticing.
    const dir = workflowsDir('user-agent', [
      'jobs:',
      '  a:',
      '    steps:',
      `      - uses: actions/checkout@${SHA} # v6`
    ]);

    await check(dir);

    expect(receivedHeaders).toHaveLength(1);
    expect(receivedHeaders[0]['user-agent']).toBeTruthy();
  });

  it('fails when the directory holds no action references at all', async () => {
    const dir = workflowsDir('empty', ['jobs:', '  a:', '    steps:', '      - run: echo hi']);

    const { status, output } = await check(dir);

    expect(output).toContain('No action references found');
    expect(status).toBe(1);
  });
});
