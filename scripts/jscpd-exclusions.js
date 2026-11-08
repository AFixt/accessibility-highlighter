#!/usr/bin/env node
/**
 * Report the files the duplication gate will NOT look at.
 *
 * Why this exists
 * ---------------
 * jscpd's `maxLines` and `maxSize` do not truncate an oversized file. They drop
 * it from the analysis entirely — as both the source of a clone and the target
 * of one. So jscpd reports a repository clean while never having opened its
 * largest files, which are exactly where duplication accumulates.
 *
 * Nothing announced that, because from jscpd's point of view nothing happened.
 * A service file crossing 1000 lines simply left the gate's coverage in silence.
 *
 * The policy decision (AFPP-51, 2026-09-21) was to KEEP the limit and make the
 * exclusions visible, rather than raise it and absorb an unbudgeted triage. So
 * this script does not change what jscpd analyses. It states what jscpd skipped,
 * on every run, so a file crossing the threshold is an event somebody sees.
 *
 * It always exits 0. It is a reporter, not a gate: failing the build on a large
 * file would be a different policy, and one nobody chose. It prints its summary
 * even when nothing is excluded, because "0 excluded" is the line that proves
 * the check ran at all — a silent pass is the defect this whole script is about.
 * For the same reason, every path where it cannot determine the answer says so
 * rather than printing nothing.
 *
 * Usage:  node scripts/jscpd-exclusions.js [path/to/.jscpd.json]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * The variables git consults to locate a repository before it looks at `-C`.
 *
 * Git exports these to every hook, and the pre-push hook runs this script via
 * `npm run check`. Left in place they make `git -C root` list whichever
 * repository they name rather than `root` (AFixt/rest-base#186), so they are
 * removed for every git call.
 */
const GIT_LOCATION_VARS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES'
];

/**
 * `process.env` without the git location variables, so `-C` alone decides the
 * repository.
 *
 * @returns {NodeJS.ProcessEnv} A copy; the live environment is not modified.
 */
function gitEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !GIT_LOCATION_VARS.includes(name))
  );
}

const EXT_BY_FORMAT = new Map([
  ['javascript', ['.js', '.mjs', '.cjs', '.jsx']],
  ['typescript', ['.ts', '.tsx']],
  ['json', ['.json']],
  ['css', ['.css']],
  ['scss', ['.scss']],
  ['less', ['.less']],
  ['markup', ['.html', '.htm']],
  ['python', ['.py']],
  ['vue', ['.vue']],
  ['svelte', ['.svelte']],
  ['yaml', ['.yml', '.yaml']],
  ['markdown', ['.md']]
]);

const SIZE_MULTIPLIER = new Map([
  ['b', 1],
  ['kb', 1024],
  ['mb', 1024 ** 2],
  ['gb', 1024 ** 3]
]);

const SRC_DIR = /^(?:src|lib|app)\//;

/**
 * Pair every `{` with the `}` that closes it, the way a parser would.
 *
 * A brace counts as alternation only when it has a partner. Asking merely
 * whether some `}` appears later, without rebalancing, makes `{a{b}` open two
 * groups and close one: the RegExp built from it is invalid, `new RegExp`
 * throws, this CLI exits non-zero and the `&&` that follows then keeps jscpd
 * from running at all. An unpaired brace is therefore a literal, and the caller
 * is told about it.
 * @param {string} glob - one `ignore` entry
 * @returns {{paired: Set<number>, unmatched: number}} indices of paired braces,
 *   and how many braces were left unpaired
 */
function matchBraces(glob) {
  const paired = new Set();
  const open = [];
  let unmatched = 0;
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob.charAt(i);
    if (c === '{') {
      open.push(i);
    } else if (c === '}' && open.length > 0) {
      paired.add(open.pop());
      paired.add(i);
    } else if (c === '}') {
      unmatched += 1;
    }
  }
  return { paired, unmatched: unmatched + open.length };
}

/**
 * Minimal glob -> RegExp, covering the shapes jscpd `ignore` entries use.
 *
 * That includes brace alternation, `**\/*.test.{js,ts}`. Escaping `{` and `}`
 * as literals instead makes such a pattern match nothing, so every file it
 * names is reported as dropped by maxLines when jscpd never considered it at
 * all. A brace is an alternation only when matchBraces pairs it; otherwise it
 * is a literal, so every pattern this builds has balanced groups.
 *
 * The pattern is built from this repository's own `.jscpd.json`, which is a
 * tracked file under review, not user input — so the dynamic RegExp here is not
 * an injection surface. Each metacharacter is either translated explicitly or
 * escaped, and no quantifier is nested inside another, so the result cannot
 * backtrack catastrophically.
 */
function globToRegExp(glob) {
  const { paired } = matchBraces(glob);
  let out = '';
  let depth = 0;
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob.charAt(i);
    if (c === '{' && paired.has(i)) {
      out += '(?:';
      depth += 1;
    } else if (c === ',' && depth > 0) {
      out += '|';
    } else if (c === '}' && paired.has(i)) {
      out += ')';
      depth -= 1;
    } else if (c === '*' && glob.charAt(i + 1) === '*' && glob.charAt(i + 2) === '/') {
      out += '(?:[^/]+/)*';
      i += 2;
    } else if (c === '*' && glob.charAt(i + 1) === '*') {
      out += '[^\\0]*';
      i += 1;
    } else if (c === '*') {
      out += '[^/]*';
    } else if (c === '?') {
      out += '[^/]';
    } else if ('.+^${}()|[]\\/'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  // eslint-disable-next-line security/detect-non-literal-regexp -- built from the repo's own tracked config; see the doc comment above
  return new RegExp(`^${out}$`);
}

/**
 * Compile the config's `ignore` entries, one at a time.
 *
 * One bad entry must not take the report down with it: this reporter always
 * exits 0, and a throw here would also stop jscpd, which runs after it behind
 * `&&`. So an entry that cannot be compiled is named and skipped, and an entry
 * whose braces do not balance is named and compiled with the unpaired braces
 * taken literally. Either way the output says the report may differ from
 * jscpd's view, rather than leaving that to be discovered.
 *
 * A skipped entry can only make the report LONGER — the files it would have
 * excluded are then reported as dropped — which is the safe direction for a
 * reporter whose failure mode is silence.
 * @param {unknown} entries - `ignore` as written in the config
 * @returns {RegExp[]} matchers for the entries that compiled
 */
function compileIgnores(entries) {
  const out = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    try {
      if (typeof entry !== 'string') {
        throw new TypeError(`expected a glob string, got ${typeof entry}`);
      }
      const { unmatched } = matchBraces(entry);
      out.push(globToRegExp(entry));
      if (unmatched > 0) {
        console.log(
          `jscpd exclusions: ignore entry ${JSON.stringify(entry)} has unbalanced braces;`
        );
        console.log('  the unpaired ones are taken literally here, which jscpd may not do.');
      }
    } catch (error) {
      console.log(
        `jscpd exclusions: could not parse ignore entry ${JSON.stringify(entry)} (${error.message}); it is not applied.`
      );
      console.log('  Files it covers may be reported below even though jscpd ignores them.');
    }
  }
  return out;
}

/**
 * "100kb" -> 102400. Null when the value cannot be understood.
 *
 * Split into a digit scan and a unit lookup rather than one regex with nested
 * optional groups: the combined form trips `security/detect-unsafe-regex`, and
 * a size parser is not worth any backtracking risk at all.
 */
function parseSize(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const s = value.trim().toLowerCase();
  let i = 0;
  while (i < s.length && (s[i] === '.' || (s[i] >= '0' && s[i] <= '9'))) {
    i += 1;
  }
  const num = Number.parseFloat(s.slice(0, i));
  if (!Number.isFinite(num)) {
    return null;
  }
  const unit = s.slice(i) || 'b';
  const mult = SIZE_MULTIPLIER.get(unit);
  return mult ? Math.round(num * mult) : null;
}

function countLines(file) {
  const buf = fs.readFileSync(file);
  let n = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 10) {
      n += 1;
    }
  }
  if (buf.length > 0 && buf[buf.length - 1] !== 10) {
    n += 1;
  }
  return n;
}

/** Reads the config. Returns null (having explained itself) when it cannot. */
function loadConfig(cfgPath) {
  if (!fs.existsSync(cfgPath)) {
    console.log('jscpd exclusions: no .jscpd.json found — nothing to report.');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch (err) {
    console.log(`jscpd exclusions: could not parse ${path.basename(cfgPath)} (${err.message}).`);
    console.log('  Reporting nothing is NOT the same as nothing being excluded.');
    return null;
  }
}

function extensionsFor(formats) {
  const exts = new Set();
  for (const f of formats) {
    for (const e of EXT_BY_FORMAT.get(f) || []) {
      exts.add(e);
    }
  }
  return exts;
}

/**
 * The files jscpd would consider. Null when git cannot answer.
 *
 * `gitignore: true` means jscpd RESPECTS .gitignore — not that it looks only at
 * tracked files. Measured against jscpd 4.x: an untracked, non-ignored file is
 * analysed normally. So the candidate set is tracked files PLUS untracked ones
 * git does not ignore (`--others --exclude-standard`), and listing only
 * `ls-files` under-reports exactly the way this script exists to prevent.
 */
function candidateFiles(root) {
  const run = args =>
    execFileSync('git', ['-C', root, ...args], { maxBuffer: 64 * 1024 * 1024, env: gitEnv() })
      .toString('utf8')
      .split('\0')
      .filter(Boolean);
  try {
    const tracked = run(['ls-files', '-z']);
    const untracked = run(['ls-files', '-z', '--others', '--exclude-standard']);
    return [...new Set([...tracked, ...untracked])];
  } catch {
    return null;
  }
}

/**
 * The major version of the jscpd that `lint:cpd` will run, or null when it
 * cannot be read. Resolved from the config's directory, the way `npx jscpd`
 * and an npm script find it.
 *
 * @param {string} root - Directory holding .jscpd.json.
 * @returns {number|null} The major version, or null.
 */
function jscpdMajor(root) {
  try {
    const manifest = require.resolve('jscpd/package.json', { paths: [root] });
    const { version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const match = /^(\d+)\./.exec(String(version));
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * How jscpd would treat one candidate file.
 * Returns null when the file is analysed normally or is not a candidate at all.
 *
 * THE maxLines BOUNDARY DEPENDS ON THE jscpd MAJOR, and both were measured
 * rather than inferred, with maxLines 1000 and newline-terminated files:
 *
 *   jscpd 4.x  maxLines: dropped when lines >= maxLines.  999 analysed, 1000 DROPPED.
 *   jscpd 5.x  maxLines: dropped when lines >  maxLines.  1000 analysed, 1001 dropped.
 *   both       maxSize:  dropped when bytes >  maxSize.   1024 analysed, 1025 dropped.
 *
 * `maxLinesInclusive` selects the 4.x rule. It is the default because, when the
 * version is unknown, naming a file jscpd actually analysed is the harmless
 * mistake; calling a dropped file "analysed" is the precise defect this script
 * exists to report on. The unit tests pin every boundary; do not "tidy" them
 * into agreement.
 *
 * Size is checked first and returns immediately, so a file over BOTH limits is
 * reported once, as oversize. Either reason is true and the remedy is the same;
 * reporting both would double-count it in the total.
 */
function classify(abs, { maxLines, maxSize, maxLinesInclusive = true }) {
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return null;
  }
  if (!st.isFile()) {
    return null;
  }
  if (maxSize && st.size > maxSize) {
    return { kind: 'size', value: st.size };
  }
  if (!maxLines) {
    return null;
  }
  try {
    const n = countLines(abs);
    const dropped = maxLinesInclusive ? n >= maxLines : n > maxLines;
    return dropped ? { kind: 'lines', value: n } : null;
  } catch {
    return null; // unreadable: counted nowhere, and not claimed as analysed
  }
}

function collectExclusions(root, files, opts) {
  const overLines = [];
  const overSize = [];
  for (const rel of files) {
    if (!opts.exts.has(path.extname(rel))) {
      continue;
    }
    if (opts.ignores.some(re => re.test(rel))) {
      continue;
    }
    const hit = classify(path.join(root, rel), opts);
    if (hit?.kind === 'size') {
      overSize.push([rel, hit.value]);
    }
    if (hit?.kind === 'lines') {
      overLines.push([rel, hit.value]);
    }
  }
  return { overLines, overSize };
}

function report({ overLines, overSize }, cfg, maxLines, lineRule) {
  const total = overLines.length + overSize.length;
  console.log('');
  console.log(`jscpd exclusions: ${total} file(s) will NOT be analysed for duplication.`);
  console.log(`  limits: maxLines=${maxLines ?? '(unset)'}  maxSize=${cfg.maxSize ?? '(unset)'}`);
  if (maxLines && lineRule) {
    // Which boundary was applied depends on the jscpd major, so say which one.
    console.log(`  maxLines rule: ${lineRule}`);
  }
  if (total === 0) {
    console.log('  Every candidate file is within the limits, so the gate saw all of them.');
    return;
  }
  overLines.sort((a, b) => b[1] - a[1]);
  overSize.sort((a, b) => b[1] - a[1]);
  for (const [rel, n] of overLines) {
    console.log(`  ${String(n).padStart(7)} lines  ${rel}`);
  }
  for (const [rel, sz] of overSize) {
    console.log(`  ${String(Math.round(sz / 1024)).padStart(7)} kb     ${rel}`);
  }
  const src = [...overLines, ...overSize].filter(([rel]) => SRC_DIR.test(rel));
  if (src.length > 0) {
    console.log('');
    console.log(`  ${src.length} of these are under src/, lib/ or app/ — a clean jscpd result`);
    console.log('  says nothing about them. These are the ones worth reading.');
  }
  console.log('');
}

function main() {
  const cfgPath = path.resolve(process.argv[2] || '.jscpd.json');
  const root = path.dirname(cfgPath);

  const cfg = loadConfig(cfgPath);
  if (!cfg) {
    return 0;
  }

  const maxLines = cfg.maxLines;
  const maxSize = parseSize(cfg.maxSize);
  if (!maxLines && !maxSize) {
    console.log('jscpd exclusions: neither maxLines nor maxSize is set — nothing is dropped.');
    return 0;
  }

  // jscpd's own default `format` is broader than this. Assuming javascript is a
  // narrowing, so it is announced rather than applied quietly — a config with
  // maxLines and no format would otherwise be under-reported by this script in
  // silence, which is the failure mode it exists to prevent.
  const formats = cfg.format || ['javascript'];
  if (!cfg.format) {
    console.log('jscpd exclusions: no `format` in the config; assuming javascript only.');
    console.log('  jscpd itself considers more than that, so this run may UNDER-report.');
  }
  const exts = extensionsFor(formats);
  if (exts.size === 0) {
    console.log('jscpd exclusions: no recognised `format` entries — cannot determine candidates.');
    return 0;
  }

  const files = candidateFiles(root);
  if (files === null) {
    console.log('jscpd exclusions: not a git checkout, so the candidate list is UNKNOWN.');
    console.log('  This is reported rather than passed over: an unrun check is not a clean one.');
    return 0;
  }

  const major = jscpdMajor(root);
  if (maxLines && major === null) {
    console.log('jscpd exclusions: could not read the installed jscpd version.');
    console.log('  Assuming the 4.x maxLines rule, so a file of exactly maxLines is listed.');
  }
  const maxLinesInclusive = major === null || major < 5;
  const ignores = compileIgnores(cfg.ignore);
  const jscpdLabel = major === null ? 'jscpd version unknown' : `jscpd ${major}.x`;
  const lineRule = `dropped at ${maxLinesInclusive ? '>=' : '>'} maxLines (${jscpdLabel})`;
  report(
    collectExclusions(root, files, { exts, ignores, maxLines, maxSize, maxLinesInclusive }),
    cfg,
    maxLines,
    lineRule
  );
  return 0;
}

/* istanbul ignore next */
if (require.main === module) {
  // exitCode rather than process.exit(), so buffered stdout is flushed and
  // n/no-process-exit holds. main() always returns 0: a reporter, not a gate.
  process.exitCode = main();
}

module.exports = {
  matchBraces,
  globToRegExp,
  compileIgnores,
  parseSize,
  countLines,
  extensionsFor,
  candidateFiles,
  jscpdMajor,
  classify,
  collectExclusions,
  main
};
