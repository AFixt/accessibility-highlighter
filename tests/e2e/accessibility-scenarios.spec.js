/**
 * @fileoverview Accessibility Scenarios E2E Tests
 *
 * Comprehensive end-to-end tests for various accessibility scenarios
 * that the extension should detect and highlight.
 */

const { test, expect, chromium } = require('@playwright/test');
const _path = require('path');

test.describe('Accessibility Scenarios E2E Tests', () => {
  let browser;
  let context;
  let page;
  let extensionId;

  test.beforeAll(async () => {
    const _pathToExtension = _path.join(__dirname, '../../dist');

    // Launch Chrome with the extension loaded
    browser = await chromium.launch({
      headless: false, // Extension testing requires headed mode
      args: [
        `--disable-extensions-except=${_pathToExtension}`,
        `--load-extension=${_pathToExtension}`,
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    context = await browser.newContext();

    // Get all pages and find the background page to get extension ID
    const _backgrounds = context.backgroundPages();
    if (backgrounds.length > 0) {
      const _backgroundPage = backgrounds[0];
      extensionId = backgroundPage.url().split('/')[2];
    } else {
      // Wait for background page if not immediately available
      const _backgroundPage = await context.waitForEvent('backgroundpage');
      extensionId = backgroundPage.url().split('/')[2];
    }

    page = await context.newPage();
  });

  test.afterAll(async () => {
    await browser?.close();
  });

  test.beforeEach(async () => {
    // Create a fresh page for each test
    if (page) {
      await page.close();
    }
    page = await context.newPage();
  });

  test('should detect missing alt attributes on images', async () => {
    // Create a test page with images missing alt attributes
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Image Alt Test</title></head>
      <body>
        <h1>Image Accessibility Test</h1>
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100">
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100" alt="">
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100" alt="Good description">
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Click the extension icon to activate
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    // Wait a moment for the extension to process
    await page.waitForTimeout(2000);

    // Check for overlays on problematic images
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);

    // Check console for logged issues
    const _logs = await page.evaluate(() => {
      return window.console._logs || [];
    });
  });

  test('should detect form fields without labels', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Form Label Test</title></head>
      <body>
        <h1>Form Accessibility Test</h1>
        <form>
          <input type="text" placeholder="No label">
          <input type="email" placeholder="Also no label">
          <label for="good-input">Good Label:</label>
          <input type="text" id="good-input">
        </form>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should find issues with unlabeled inputs
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);
  });

  test('should detect tables without headers', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Table Header Test</title></head>
      <body>
        <h1>Table Accessibility Test</h1>
        <table>
          <tr><td>Data 1</td><td>Data 2</td></tr>
          <tr><td>Data 3</td><td>Data 4</td></tr>
        </table>
        <table>
          <tr><th>Header 1</th><th>Header 2</th></tr>
          <tr><td>Data 1</td><td>Data 2</td></tr>
        </table>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should detect the table without headers
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);
  });

  test('should detect buttons without accessible names', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Button Accessibility Test</title></head>
      <body>
        <h1>Button Accessibility Test</h1>
        <button></button>
        <button>   </button>
        <button>Good Button</button>
        <button aria-label="Icon button"></button>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should detect buttons without accessible names
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);
  });

  test('should detect small font sizes', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Font Size Test</title>
        <style>
          .small-text { font-size: 8px; }
          .tiny-text { font-size: 6px; }
          .normal-text { font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>Font Size Accessibility Test</h1>
        <p class="small-text">This text is too small</p>
        <p class="tiny-text">This text is extremely small</p>
        <p class="normal-text">This text is a good size</p>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should detect small font sizes
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);
  });

  test('should detect missing landmark elements', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Landmark Test</title></head>
      <body>
        <div>No landmarks here</div>
        <div>Just regular content</div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should detect missing landmarks
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);
  });

  test('should handle complex page with multiple issues', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Complex Accessibility Test</title>
        <style>
          .small { font-size: 9px; }
        </style>
      </head>
      <body>
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="50" height="50">
        <form>
          <input type="text" placeholder="Username">
          <input type="password" placeholder="Password">
          <button></button>
        </form>
        <table>
          <tr><td>No headers</td><td>Bad table</td></tr>
        </table>
        <p class="small">Very small text that's hard to read</p>
        <a href="#">Click here</a>
        <iframe src="about:blank"></iframe>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(3000);

    // Should detect multiple issues
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(3); // Multiple issues should be found
  });

  test('should toggle highlighting on and off', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Toggle Test</title></head>
      <body>
        <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100">
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Activate extension
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should have overlays
    const _overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(0);

    // Click extension icon again to toggle off
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(1000);

    // Should have no overlays
    overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBe(0);
  });

  test('should handle dynamic content changes', async () => {
    const _htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Dynamic Content Test</title></head>
      <body>
        <div id="content">
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100" alt="Good image">
        </div>
        <button onclick="addBadImage()">Add Bad Image</button>
        <script>
          function addBadImage() {
            const _img = document.createElement('img');
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            img.width = 100;
            img.height = 100;
            // Intentionally no alt attribute
            document.getElementById('content').appendChild(img);
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Initially activate extension - should find no issues
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    const _overlays = await page.locator('.a11y-error, .overlay').count();
    const _initialOverlays = overlays;

    // Add problematic content dynamically
    await page.click('button');
    await page.waitForTimeout(500);

    // Re-run accessibility check
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.goBack();

    await page.waitForTimeout(2000);

    // Should now detect the new issue
    overlays = await page.locator('.a11y-error, .overlay').count();
    expect(overlays).toBeGreaterThan(initialOverlays);
  });
});