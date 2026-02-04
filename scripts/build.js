#!/usr/bin/env node

/**
 * @fileoverview Build script for Accessibility Highlighter extension
 * Generates distribution packages for Chrome, Firefox, and Edge
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EXTENSION_DIR = path.join(ROOT_DIR, 'extension-package');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

/**
 * Read and parse manifest.json
 */
function readManifest() {
  const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * Write manifest.json to a directory
 */
function writeManifest(manifest, dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Copy extension files to target directory
 */
function copyExtensionFiles(targetDir) {
  // Create target directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Files and directories to copy
  const items = ['background.js', 'contentScript.js', 'config.js', 'icons', 'modules'];

  items.forEach(item => {
    const src = path.join(EXTENSION_DIR, item);
    const dest = path.join(targetDir, item);

    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  });
}

/**
 * Create zip file from directory
 */
function createZip(sourceDir, outputPath) {
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Remove existing zip if present
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Create zip (exclude .DS_Store files)
  execSync(`cd "${sourceDir}" && zip -r "${outputPath}" . -x "*.DS_Store"`, {
    stdio: 'inherit'
  });
}

/**
 * Build Chrome/Edge version (Manifest V3 with service_worker)
 */
function buildChrome(version) {
  console.log('\n📦 Building Chrome/Edge version...');

  const buildDir = path.join(DIST_DIR, 'chrome');
  const manifest = readManifest();

  // Clean and copy files
  fs.rmSync(buildDir, { recursive: true, force: true });
  copyExtensionFiles(buildDir);

  // Chrome manifest is already correct, just write it
  writeManifest(manifest, buildDir);

  // Create zip
  const zipPath = path.join(ROOT_DIR, `accessibility-highlighter-v${version}-chrome.zip`);
  createZip(buildDir, zipPath);

  console.log(`✅ Chrome build complete: ${zipPath}`);
  return zipPath;
}

/**
 * Build Firefox version (Manifest V3 with background scripts)
 */
function buildFirefox(version) {
  console.log('\n🦊 Building Firefox version...');

  const buildDir = path.join(DIST_DIR, 'firefox');
  const manifest = readManifest();

  // Clean and copy files
  fs.rmSync(buildDir, { recursive: true, force: true });
  copyExtensionFiles(buildDir);

  // Modify manifest for Firefox
  // 1. Add browser_specific_settings
  manifest.browser_specific_settings = {
    gecko: {
      id: 'accessibility-highlighter@afixt.com',
      strict_min_version: '109.0'
    }
  };

  // 2. Change service_worker to scripts for background
  // Firefox 121+ supports service_worker, but scripts is more compatible
  manifest.background = {
    scripts: ['background.js']
  };

  // 3. Remove host_permissions and merge into permissions for older Firefox
  // Actually, Firefox 109+ supports host_permissions, so we can keep it

  // Write modified manifest
  writeManifest(manifest, buildDir);

  // Create zip
  const zipPath = path.join(ROOT_DIR, `accessibility-highlighter-v${version}-firefox.zip`);
  createZip(buildDir, zipPath);

  console.log(`✅ Firefox build complete: ${zipPath}`);
  return zipPath;
}

/**
 * Build Edge version (same as Chrome for Chromium-based Edge)
 */
function buildEdge(version) {
  console.log('\n🌐 Building Edge version...');

  // Edge uses the same package as Chrome
  const chromeZip = path.join(ROOT_DIR, `accessibility-highlighter-v${version}-chrome.zip`);
  const edgeZip = path.join(ROOT_DIR, `accessibility-highlighter-v${version}-edge.zip`);

  if (fs.existsSync(chromeZip)) {
    fs.copyFileSync(chromeZip, edgeZip);
    console.log(`✅ Edge build complete: ${edgeZip}`);
    return edgeZip;
  } else {
    // Build Chrome first if not exists
    buildChrome(version);
    fs.copyFileSync(chromeZip, edgeZip);
    console.log(`✅ Edge build complete: ${edgeZip}`);
    return edgeZip;
  }
}

/**
 * Main build function
 */
function build(target = 'all') {
  console.log('🚀 Accessibility Highlighter Build Script\n');

  // Get version from manifest
  const manifest = readManifest();
  const version = manifest.version;
  console.log(`Version: ${version}`);

  // Create dist directory
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const results = [];

  switch (target.toLowerCase()) {
    case 'chrome':
      results.push(buildChrome(version));
      break;
    case 'firefox':
      results.push(buildFirefox(version));
      break;
    case 'edge':
      results.push(buildEdge(version));
      break;
    case 'all':
    default:
      results.push(buildChrome(version));
      results.push(buildFirefox(version));
      results.push(buildEdge(version));
      break;
  }

  console.log('\n✨ Build complete!\n');
  console.log('Generated files:');
  results.forEach(file => console.log(`  - ${path.basename(file)}`));

  return results;
}

// Parse command line arguments
const args = process.argv.slice(2);
const target = args[0] || 'all';

// Run build
build(target);
