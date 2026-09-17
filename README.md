# Accessibility Highlighter

The Accessibility Highlighter finds accessibility problems on a website and highlights them on the page to give a visual indication of what the problems are. It also logs errors to console and annotates the DOM.

## Features

- Visual highlighting of accessibility issues on web pages
- Console logging of detected issues
- Easy toggle on/off with browser icon
- Detects common accessibility problems:
  - Missing alt text on images
  - Form elements without labels
  - Buttons and links without accessible names
  - Tables without proper headers
  - Iframes without titles
  - Uninformative text alternatives
  - And more...

## Installation

For detailed installation instructions, see [INSTALL.md](INSTALL.md).

Quick installation:

1. Download the latest release or build from source
2. Go to Chrome's extension page (`chrome://extensions/`)
3. Enable Developer Mode
4. Click "Load unpacked" and select the extension directory
5. Click the extension icon to toggle it on/off

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the extension
npm run build

# Package the extension for distribution
npm run package
```

### Quality checks

```bash
# Lint, formatting, markdown, manifest version, duplication — in parallel
npm run check

# The full pre-merge suite: the above, plus knip, tests, build, size budget,
# licence check, link check and npm audit
npm run check:all
```

[Knip](https://knip.dev) finds unused files, exports and dependencies — the
things ESLint cannot see, because `no-unused-vars` only ever looks at one file
at a time. It runs as part of `check:all` and must report nothing:

```bash
npm run knip
```

Its configuration lives in `knip.jsonc`, which is commented: the extension's
entry points come from `manifest.json` rather than from imports, so Knip has to
be told what they are. If Knip flags something that is deliberate, add an
`entry` glob or an `ignore` rule **with the reason**, rather than silencing the
whole category.

### Coverage thresholds

`npm test` fails if coverage falls. `jest.config.js` carries a
`coverageThreshold` set just under what each source file covers today — a
ratchet, not a target:

| File                      | statements |
| ------------------------- | ---------- |
| `src/elementChecks.js`    | 63%        |
| `src/background.js`       | 31%        |
| `src/contentScript.js`    | 23%        |
| `src/reportGenerators.js` | 4%         |
| `src/uiPanels.js`         | 3%         |
| any new source file       | 20%        |

Every file is listed individually on purpose: Jest measures `global` only over
files that have no threshold of their own, so naming just the well-covered ones
would leave `global` measuring the remainder. With all of them named, `global`
becomes the floor a newly added file has to clear.

If you improve coverage, **raise the number** — that is what locks the
improvement in. If a change legitimately lowers it, say why in the PR rather
than lowering the threshold quietly.

## How to Use

Once installed, the extension adds a button to the browser toolbar. When clicked:

1. Toggles visual highlighting on the current page
2. Updates icon to indicate current state (enabled/disabled)
3. Logs detailed accessibility information to the console

The highlighting appears as a red or orange overlay with diagonal stripes on elements with accessibility issues. Each overlay has a `data-a11ymessage` attribute that describes the specific issue.

For developers, open the browser console to see detailed information about each issue detected.

## Caveats

This extension's goal is to provide a visual demonstration of accessibility problems. It is not a comprehensive auditing tool. It doesn't find all accessibility errors, and there will be some false positives. Any discussion related to what this does or does not do should be viewed in that context.

### Why is this not available in the Chrome Web Store?

This tool is designed as a "sniff test" and for creating presentations, not as a full-featured accessibility auditing tool. We want to prevent users from over-relying on it for formal accessibility testing.

## Testing

The extension includes both automated and manual tests:

- Jest tests for core functionality
- Manual test page for visual verification
- Real HTML fixtures with passing and failing examples

Run tests with:

```bash
npm test
```

Or use the manual test runner by opening `/tests/manual-test-runner.html` in your browser.

## Contribute

PRs are welcome. Please run tests and ensure the extension works properly before submitting.

To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test`)
5. Submit a pull request

Find something wrong? Have something you'd like to change? Feel free to log an issue. However, please understand that we regard this mostly as a demonstration tool. As a result, issues are likely to remain unaddressed unless the necessary changes are fast and easy or until someone contributes a PR.

## License

ISC
