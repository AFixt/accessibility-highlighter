# Accessibility Highlighter Tests

This directory contains tests for the Accessibility Highlighter extension.

## Test Structure

- `fixtures/` - Contains HTML fixtures with examples of passing and failing accessibility
- `test-highlighter.js` - Jest test suite for the highlighter functionality
- `setup-jest.js` - Setup file for Jest tests with mocks
- `manual-test-runner.html` - Browser-based tool for manually testing the highlighter

## Running Tests

You can run the tests using the following npm commands:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## How Tests Work

The tests use Jest with JSDOM to simulate browser functionality. Since the extension relies on browser APIs:

1. Chrome extension APIs are fully mocked in `setup-jest.js`
2. DOM manipulation functions are simulated
3. Test fixtures are used to demonstrate passing and failing accessibility cases

The tests verify:
- That overlays are added for accessibility issues
- That no overlays are added for accessible content
- That overlays can be toggled on/off
- That specific accessibility checks work as expected

## Manual Testing

The `manual-test-runner.html` file provides a browser-based interface for testing the highlighter against the fixtures. Open this file in a browser and use the buttons to:

1. Load passing or failing HTML in the test frame
2. Run the accessibility highlighter on the loaded HTML
3. Clear highlights to reset the test

This is useful for visually verifying that the highlighter correctly identifies accessibility issues.

## Fixtures

The fixtures directory contains two HTML files:

- `passing.html` - Contains HTML that passes all accessibility checks (properly labeled images, tables with headers, etc.)
- `failing.html` - Contains examples of various accessibility issues (missing alt text, form fields without labels, etc.)

These fixtures are useful both for automated tests and for manual testing/development.