#!/usr/bin/env node

/**
 * @file Keep manifest.json's version in step with package.json.
 *
 * package.json is the single source of truth for the version. manifest.json
 * carries a copy because that is the number Chrome and the Web Store actually
 * read, and it has to be a bare `x.y.z`.
 *
 * Usage:
 *   node scripts/manifest-version.js --write   rewrite manifest.json to match
 *   node scripts/manifest-version.js --check   exit 1 if they disagree
 *
 * `--write` runs from the npm `version` lifecycle, so `npm version <bump>`
 * updates both files. `--check` runs in CI so the two cannot drift again.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');

/**
 * Read the version declared in package.json.
 *
 * @returns {string} The package version, e.g. "1.0.5"
 */
function packageVersion() {
  return JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8')).version;
}

/**
 * Read manifest.json.
 *
 * @returns {object} The parsed manifest
 */
function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

const mode = process.argv[2];
const expected = packageVersion();
const manifest = readManifest();

// Failures set process.exitCode rather than calling process.exit(), so the
// script still exits non-zero for CI without truncating pending stdout.
if (mode === '--check') {
  if (manifest.version === expected) {
    console.log(`manifest.json and package.json agree on ${expected}`);
  } else {
    console.error(
      `manifest.json version (${manifest.version}) does not match package.json (${expected}).\n` +
        'Run `npm run version:sync` to fix.'
    );
    process.exitCode = 1;
  }
} else if (mode === '--write') {
  if (manifest.version === expected) {
    console.log(`manifest.json already at ${expected}`);
  } else {
    // Rewrite only the version field, preserving key order and formatting so
    // the diff on a release is a single line.
    const source = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const updated = source.replace(/("version"\s*:\s*")[^"]*(")/, `$1${expected}$2`);
    if (updated === source) {
      console.error('Could not find a "version" field to rewrite in manifest.json');
      process.exitCode = 1;
    } else {
      fs.writeFileSync(MANIFEST_PATH, updated);
      console.log(`manifest.json ${manifest.version} -> ${expected}`);
    }
  }
} else {
  console.error('Usage: node scripts/manifest-version.js --write|--check');
  process.exitCode = 1;
}
