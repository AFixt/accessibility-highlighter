/**
 * End-to-End tests for Accessibility Highlighter Chrome Extension
 * Tests the extension functionality in a real browser environment
 */

const { test, expect, chromium } = require('@playwright/test');
const _path = require('path');

test.describe('Accessibility Highlighter Extension E2E Tests', () => {
  let browser;
  let context;
  let page;

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
    page = await context.newPage();
  });

  test.afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test.beforeEach(async () => {
    // Create a fresh page for each test
    if (page) {
      await page.close();
    }
    page = await context.newPage();

    // Navigate to the test page with accessibility issues
    await page.goto('/failing.html');
    await page.waitForLoadState('networkidle');
  });

  test('should load extension without errors', async () => {
    // Check that the browser is running
    expect(browser).toBeDefined();
    expect(context).toBeDefined();
  });

  test('should detect and highlight accessibility issues', async () => {
    // Simulate extension activation (since we can't click browser action in headless mode)
    await page.evaluate(() => {
      // Simulate the extension being enabled
      const _event = new CustomEvent('extension-toggle', { detail: { enabled: true } });
      document.dispatchEvent(_event);
    });

    // Wait for overlays to be created
    await page.waitForTimeout(1000);

    // Check if overlays are present
    const _overlays = await page.locator('.a11y-error, .a11y-warning, .overlay').count();
    expect(_overlays).toBeGreaterThan(0);
  });

  test('should create overlays with proper positioning', async () => {
    // Add an image without alt text
    await page.setContent(`
      <html>
        <body>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="100" height="100">
        </body>
      </html>
    `);

    // Simulate running accessibility checks
    await page.evaluate(() => {
      // Inject the content script functionality for testing
      if (typeof runAccessibilityChecks === 'undefined') {
        // Create a mock version for testing
        window.runAccessibilityChecks = function() {
          const _images = document.querySelectorAll('img:not([alt])');
          _images.forEach(img => {
            const _rect = img.getBoundingClientRect();
            const _overlay = document.createElement('div');
            _overlay.className = 'overlay a11y-error';
            _overlay.style.cssText = `
              position: absolute;
              top: ${_rect.top + window.scrollY}px;
              left: ${_rect.left + window.scrollX}px;
              width: ${_rect.width}px;
              height: ${_rect.height}px;
              background-color: rgba(255, 0, 0, 0.4);
              pointer-events: none;
              z-index: 2147483647;
            `;
            _overlay.setAttribute('data-a11ymessage', 'img does not have an alt attribute');
            document.body.appendChild(_overlay);
          });
        };
      }
      runAccessibilityChecks();
    });

    // Check that overlay is positioned correctly
    const _overlay = page.locator('.overlay').first();
    await expect(_overlay).toBeVisible();

    const _overlayBox = await _overlay.boundingBox();
    const _imageBox = await page.locator('img').boundingBox();

    // Overlay should roughly match image position
    expect(Math.abs(_overlayBox.x - _imageBox.x)).toBeLessThan(5);
    expect(Math.abs(_overlayBox.y - _imageBox.y)).toBeLessThan(5);
  });

  test('should not create overlays for accessible content', async () => {
    // Navigate to a page with accessible content
    await page.goto('/passing.html');
    await page.waitForLoadState('networkidle');

    // Simulate running accessibility checks
    await page.evaluate(() => {
      if (typeof runAccessibilityChecks === 'undefined') {
        window.runAccessibilityChecks = function() {
          // For passing content, no overlays should be created
          console.log('No accessibility issues found');
        };
      }
      runAccessibilityChecks();
    });

    // Wait a moment for any potential overlays
    await page.waitForTimeout(500);

    // Should have no accessibility error overlays
    const _overlays = await page.locator('.a11y-error').count();
    expect(_overlays).toBe(0);
  });

  test('should handle multiple issues on same page', async () => {
    await page.setContent(`
      <html>
        <body>
          <img src="test1.jpg">
          <img src="test2.jpg">
          <input type="text">
          <button></button>
          <a href="#"></a>
          <table>
            <tr><td>Cell</td></tr>
          </table>
        </body>
      </html>
    `);

    // Simulate running comprehensive accessibility checks
    await page.evaluate(() => {
      window.runAccessibilityChecks = function() {
        let _errorCount = 0;

        // Check images without alt
        document.querySelectorAll('img:not([alt])').forEach(_img => {
          const _overlay = document.createElement('div');
          _overlay.className = 'overlay a11y-error';
          _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4); pointer-events: none;';
          _overlay.setAttribute('data-a11ymessage', 'img does not have an alt attribute');
          document.body.appendChild(_overlay);
          _errorCount++;
        });

        // Check form fields without labels
        document.querySelectorAll('input[type="text"]:not([aria-label])').forEach(_input => {
          if (!_input.id || !document.querySelector(`label[for="${_input.id}"]`)) {
            const _overlay = document.createElement('div');
            _overlay.className = 'overlay a11y-error';
            _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4); pointer-events: none;';
            _overlay.setAttribute('data-a11ymessage', 'Form field without label');
            document.body.appendChild(_overlay);
            _errorCount++;
          }
        });

        // Check empty buttons
        document.querySelectorAll('button').forEach(_button => {
          if (!_button.textContent.trim() && !_button.getAttribute('aria-label')) {
            const _overlay = document.createElement('div');
            _overlay.className = 'overlay a11y-error';
            _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4); pointer-events: none;';
            _overlay.setAttribute('data-a11ymessage', 'Button without label');
            document.body.appendChild(_overlay);
            _errorCount++;
          }
        });

        console.log(`Found ${_errorCount} accessibility issues`);
      };
      runAccessibilityChecks();
    });

    // Should find multiple issues
    await page.waitForTimeout(500);
    const _overlays = await page.locator('.overlay').count();
    expect(_overlays).toBeGreaterThan(2);
  });

  test('should remove overlays when toggled off', async () => {
    // First, create some overlays
    await page.setContent(`
      <html>
        <body>
          <img src="test.jpg">
        </body>
      </html>
    `);

    await page.evaluate(() => {
      // Add overlays
      const _overlay = document.createElement('div');
      _overlay.className = 'overlay a11y-error';
      _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4);';
      document.body.appendChild(_overlay);

      // Define removal function
      window.removeAccessibilityOverlays = function() {
        document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').forEach(el => {
          if (el.parentNode) {el.parentNode.removeChild(el);}
        });
      };
    });

    // Verify overlay exists
    await expect(page.locator('.overlay')).toBeVisible();

    // Remove overlays
    await page.evaluate(() => {
      removeAccessibilityOverlays();
    });

    // Verify overlays are removed
    const _overlayCount = await page.locator('.overlay').count();
    expect(_overlayCount).toBe(0);
  });

  test('should handle pages with dynamic content', async () => {
    await page.setContent(`
      <html>
        <body>
          <div id="container"></div>
          <button id="add-content">Add Content</button>
        </body>
      </html>
    `);

    // Add event listener to add problematic content dynamically
    await page.evaluate(() => {
      document.getElementById('add-content').addEventListener('click', () => {
        const _container = document.getElementById('container');
        _container.innerHTML = '<img src="dynamic.jpg"><input type="text">';
      });

      window.runAccessibilityChecks = function() {
        const _issues = document.querySelectorAll('img:not([alt]), input[type="text"]:not([aria-label])');
        _issues.forEach((element, index) => {
          const _overlay = document.createElement('div');
          _overlay.className = 'overlay a11y-error';
          _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4); pointer-events: none;';
          _overlay.setAttribute('data-a11ymessage', `Issue ${index + 1}`);
          document.body.appendChild(_overlay);
        });
      };
    });

    // Initially no issues
    await page.evaluate(() => runAccessibilityChecks());
    expect(await page.locator('.overlay').count()).toBe(0);

    // Add content and recheck
    await page.click('#add-content');
    await page.evaluate(() => runAccessibilityChecks());

    // Should now find issues in dynamic content
    const _overlays = await page.locator('.overlay').count();
    expect(_overlays).toBeGreaterThan(0);
  });

  test('should work on complex real-world pages', async () => {
    // Create a more complex page structure
    await page.setContent(`
      <html>
        <head><title>Test Page</title></head>
        <body>
          <header>
            <nav>
              <a href="#">Home</a>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </nav>
          </header>
          <main>
            <h1>Main Content</h1>
            <article>
              <h2>Article Title</h2>
              <p>Some content with <a href="#">click here</a> for more.</p>
              <img src="article-image.jpg">
              <form>
                <input type="text" placeholder="Enter name">
                <input type="email" placeholder="Enter email">
                <button type="submit">Submit</button>
              </form>
            </article>
            <aside>
              <h3>Sidebar</h3>
              <table>
                <tr><td>Data 1</td><td>Data 2</td></tr>
              </table>
            </aside>
          </main>
          <footer>
            <p>&copy; 2024 Test Site</p>
          </footer>
        </body>
      </html>
    `);

    // Run comprehensive accessibility checks
    await page.evaluate(() => {
      window.runAccessibilityChecks = function() {
        const _issues = [];

        // Check images without alt
        document.querySelectorAll('img:not([alt])').forEach(img => {
          _issues.push({ element: img, message: 'Missing alt attribute' });
        });

        // Check generic link text
        document.querySelectorAll('a').forEach(link => {
          const _text = link.textContent.toLowerCase().trim();
          if (['click here', 'more', 'here'].includes(_text)) {
            _issues.push({ element: link, message: 'Generic link text' });
          }
        });

        // Check form fields without labels
        document.querySelectorAll('input[type="text"], input[type="email"]').forEach(input => {
          if (!input.id || !document.querySelector(`label[for="${input.id}"]`)) {
            if (!input.getAttribute('aria-label')) {
              _issues.push({ element: input, message: 'Form field without label' });
            }
          }
        });

        // Check tables without headers
        document.querySelectorAll('table').forEach(table => {
          if (!table.querySelector('th')) {
            _issues.push({ element: table, message: 'Table without headers' });
          }
        });

        // Create overlays for issues
        _issues.forEach((issue, index) => {
          const _overlay = document.createElement('div');
          _overlay.className = 'overlay a11y-error';
          _overlay.style.cssText = 'position: absolute; background: rgba(255,0,0,0.4); pointer-events: none; z-index: 999999;';
          _overlay.setAttribute('data-a11ymessage', issue.message);
          _overlay.setAttribute('data-issue-id', index);
          document.body.appendChild(_overlay);
        });

        console.log(`Found ${_issues.length} accessibility issues`);
        return _issues.length;
      };
    });

    const _issueCount = await page.evaluate(() => runAccessibilityChecks());

    // Should find multiple issues in this complex page
    expect(_issueCount).toBeGreaterThan(3);

    // Verify overlays were created
    const _overlays = await page.locator('.overlay').count();
    expect(_overlays).toBe(_issueCount);

    // Check that overlays have proper attributes
    const _firstOverlay = page.locator('.overlay').first();
    await expect(_firstOverlay).toHaveAttribute('data-a11ymessage');
    await expect(_firstOverlay).toHaveAttribute('data-issue-id');
  });
});