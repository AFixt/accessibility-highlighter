#!/usr/bin/env node
/**
 * Reports GitHub Actions SHA pins that have drifted from the tag they claim.
 *
 * Dependabot used to own refreshing these pins; scheduled automation
 * (Dependabot included) is banned repo-wide (#45), so this check is the
 * mechanism instead. Run it via the `Action Pin Freshness` workflow_dispatch
 * job in security.yml, or locally:
 *
 *   npm run security:action-pins
 *
 * Exit code 1 when any pin is stale — the tag has moved since it was pinned,
 * which usually means upstream shipped a fix this repository is frozen
 * against. References that cannot be checked (no SHA, no tag comment, or a
 * branch pin like Dependency-Check_Action's deliberate `main` pin) are
 * reported as unknown and do not fail the run: "we could not check" and
 * "this is out of date" warrant different responses.
 *
 * Env vars:
 *   GITHUB_TOKEN — raises the API rate limit from 60/hr to 5000/hr. Optional
 *                  locally; supplied automatically in Actions.
 */
const fs = require('node:fs/promises');
const { join } = require('node:path');

const { classifyPin, parseActionPins, repoSlug } = require('./action-pins');

const DEFAULT_WORKFLOW_DIR = join(__dirname, '../.github/workflows');

const API = 'https://api.github.com';

/**
 * Request headers for the GitHub REST API.
 *
 * @returns {Record<string, string>} Headers, with auth when available.
 */
function headers() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Resolve `owner/repo` + tag to the commit SHA it points at today.
 *
 * Annotated tags resolve to a tag object rather than a commit, so those need
 * a second hop to get the commit a workflow would actually check out. Returns
 * undefined for anything unresolvable; the caller reports that as unknown
 * rather than treating it as drift.
 *
 * @param {string} slug `owner/repo`.
 * @param {string} tag The tag name from the pin's trailing comment.
 * @returns {Promise<string | undefined>} The commit SHA, if resolvable.
 */
async function resolveTag(slug, tag) {
  const res = await fetch(`${API}/repos/${slug}/git/ref/tags/${encodeURIComponent(tag)}`, {
    headers: headers()
  });
  if (!res.ok) {
    return undefined;
  }

  const ref = await res.json();
  if (!ref.object?.sha) {
    return undefined;
  }
  if (ref.object.type !== 'tag') {
    return ref.object.sha;
  }

  const deref = await fetch(`${API}/repos/${slug}/git/tags/${ref.object.sha}`, {
    headers: headers()
  });
  if (!deref.ok) {
    return undefined;
  }

  const annotated = await deref.json();
  return annotated.object?.sha;
}

/*
 * The fs calls below take a directory supplied on the command line, which is
 * the entire job of a CLI that reads a workflows directory. The value comes
 * from the workflow step that invokes this script, not from anything the
 * analysed code can influence, and the script only ever reads.
 */

/**
 * Parse every workflow file in a directory into action pins.
 *
 * @param {string} dir The workflows directory.
 * @returns {Promise<import('./action-pins').ActionPin[]>} All references.
 */
async function collectPins(dir) {
  const entries = await fs.readdir(dir);
  const pins = [];

  for (const name of entries.filter(n => n.endsWith('.yml') || n.endsWith('.yaml')).sort()) {
    pins.push(...parseActionPins(await fs.readFile(join(dir, name), 'utf8'), name));
  }

  return pins;
}

/**
 * Classify every pin, printing one line each, and bucket the ones that need
 * attention. Split out of main() to keep that function within this
 * repository's complexity limits.
 *
 * @param {import('./action-pins').ActionPin[]} pins Parsed references.
 * @param {Map<string, string | undefined>} resolved Tag lookups, keyed `slug@tag`.
 * @returns {{stale: string[], unknown: string[]}} Reportable lines per bucket.
 */
function report(pins, resolved) {
  const stale = [];
  const unknown = [];

  for (const pin of pins) {
    const status = classifyPin(pin, resolved.get(`${repoSlug(pin)}@${pin.tag}`));
    const where = `${pin.file}:${pin.line}`;

    if (status.kind === 'current') {
      console.log(`  ok       ${where}  ${repoSlug(pin)}@${pin.tag}`);
    } else if (status.kind === 'stale') {
      stale.push(`${where}  ${repoSlug(pin)}  ${pin.tag}: ${pin.sha} -> ${status.expected}`);
      console.log(`  STALE    ${where}  ${repoSlug(pin)}@${pin.tag}`);
    } else {
      unknown.push(`${where}  ${repoSlug(pin)}  ${status.reason}`);
      console.log(`  unknown  ${where}  ${repoSlug(pin)}  ${status.reason}`);
    }
  }

  return { stale, unknown };
}

/**
 * Check every pin and report; exit 1 if any is stale.
 *
 * @returns {Promise<void>} Resolves when the report is printed.
 */
async function main() {
  const dir = process.argv[2] || DEFAULT_WORKFLOW_DIR;
  const pins = await collectPins(dir);

  if (pins.length === 0) {
    console.error(`No action references found in ${dir}`);
    process.exitCode = 1;
    return;
  }

  // One lookup per distinct repo+tag: the references collapse to a handful,
  // which matters against an unauthenticated 60/hr rate limit.
  const wanted = new Map();
  for (const pin of pins) {
    if (pin.sha && pin.tag) {
      wanted.set(`${repoSlug(pin)}@${pin.tag}`, { slug: repoSlug(pin), tag: pin.tag });
    }
  }

  const resolved = new Map();
  await Promise.all(
    [...wanted].map(async ([key, { slug, tag }]) => resolved.set(key, await resolveTag(slug, tag)))
  );

  const { stale, unknown } = report(pins, resolved);

  console.log(
    `\n${pins.length} references checked: ${pins.length - stale.length - unknown.length} current, ` +
      `${stale.length} stale, ${unknown.length} unknown.`
  );

  if (unknown.length > 0) {
    console.log('\nCould not be checked:');
    for (const line of unknown) {
      console.log(`  ${line}`);
    }
  }

  if (stale.length > 0) {
    console.log('\nStale pins — the tag has moved since these were pinned:');
    for (const line of stale) {
      console.log(`  ${line}`);
    }
    console.log(
      '\nUpdate the SHA in the workflow, keeping the "# <tag>" comment accurate.\n' +
        'Read the upstream release notes first — that is the review step a pinned\n' +
        'SHA buys you, and the reason this repository pins rather than floating.'
    );
    process.exitCode = 1;
  }
}

// Failures set process.exitCode rather than calling process.exit(), so the
// script still exits non-zero for CI without truncating pending stdout.
main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
