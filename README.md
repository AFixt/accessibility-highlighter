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
```
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