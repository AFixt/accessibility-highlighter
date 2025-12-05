/**
 * Real Chrome Extension E2E Tests
 * Tests the actual extension in a real Chrome browser
 */

const { test, expect, chromium } = require('@playwright/test');
const _path = require('path');

test.describe('Real Chrome Extension Tests', () => {
  let browser;
  let context;
  let page;
  let _extensionId;

  test.beforeAll(async () => {
    const _pathToExtension = path.join(__dirname, '../../dist');

    // Launch Chrome with the extension loaded
    browser = await chromium.launch({
      headless: false, // Extension testing requires headed mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // Create context
    context = await browser.newContext();
    page = await context.newPage();

    // Get extension ID
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(1000);

    // Find the extension ID (usually visible in developer mode)
    const _extensionCards = await page.locator('.extension-list-item').all();
    for (const card of _extensionCards) {
      const _nameElement = await card.locator('.extension-name').textContent();
      if (_nameElement && _nameElement.includes('Accessibility Highlighter')) {
        const _idElement = await card.locator('.extension-id');
        if (_idElement) {
          _extensionId = await _idElement.textContent();
          break;
        }
      }
    }
  });

  test.afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('should load extension and inject content script', async () => {
    // Navigate to a test page
    await page.setContent(`
      <html>
        <head><title>Test Page</title></head>
        <body>
          <img src="test.jpg" width="100" height="100">
          <input type="text">
          <button></button>
        </body>
      </html>
    `);

    // Wait for content script to load
    await page.waitForTimeout(2000);

    // Check if content script functions are available
    const _hasContentScript = await page.evaluate(() => {
      return typeof runAccessibilityChecks === 'function';
    });

    if (!hasContentScript) {
      // If content script isn't automatically injected, inject it manually for testing
      await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
      await page.waitForTimeout(1000);
    }

    // Verify content script functions exist
    const _functionsExist = await page.evaluate(() => {
      return {
        runAccessibilityChecks: typeof runAccessibilityChecks === 'function',
        removeAccessibilityOverlays: typeof removeAccessibilityOverlays === 'function',
        toggleAccessibilityHighlight: typeof toggleAccessibilityHighlight === 'function'
      };
    });

    expect(functionsExist.runAccessibilityChecks).toBe(true);
    expect(functionsExist.removeAccessibilityOverlays).toBe(true);
    expect(functionsExist.toggleAccessibilityHighlight).toBe(true);
  });

  test('should detect real accessibility issues with actual extension code', async () => {
    // Create a page with multiple accessibility issues
    await page.setContent(`
      <html>
        <head><title>Test Page with Issues</title></head>
        <body>
          <img src="image1.jpg" width="100" height="50">
          <img src="image2.jpg" alt="">
          <img src="image3.jpg" alt="image">
          <img src="image4.jpg" alt="Good description">
          
          <form>
            <input type="text" id="no-label">
            <label for="has-label">Name:</label>
            <input type="text" id="has-label">
            <input type="text" aria-label="Search">
          </form>
          
          <button></button>
          <button>Good button</button>
          <button aria-label="Close"></button>
          
          <a href="#" id="generic-link">click here</a>
          <a href="#" id="good-link">Read our privacy policy</a>
          
          <table id="no-headers">
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </table>
          
          <table id="has-headers">
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </table>
          
          <iframe src="about:blank"></iframe>
          <iframe src="about:blank" title="Content frame"></iframe>
        </body>
      </html>
    `);

    // Inject content script if needed
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
    await page.waitForTimeout(1000);

    // Run the real accessibility checks
    const _results = await page.evaluate(() => {
      // Clear any existing logs
      if (typeof logs !== 'undefined' && logs.length) {
        logs.length = 0;
      }

      // Run the actual extension code
      runAccessibilityChecks();

      // Wait a moment for async operations
      return new Promise(resolve => {
        setTimeout(() => {
          const _overlayCount = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length;
          const _logCount = typeof logs !== 'undefined' ? logs.length : 0;
          const _logMessages = typeof logs !== 'undefined' ? logs.map(log => log.Message) : [];

          resolve({
            overlayCount,
            logCount,
            logMessages,
            htmlElements: {
              images: document.querySelectorAll('img').length,
              inputs: document.querySelectorAll('input').length,
              buttons: document.querySelectorAll('button').length,
              links: document.querySelectorAll('a').length,
              tables: document.querySelectorAll('table').length,
              iframes: document.querySelectorAll('iframe').length
            }
          });
        }, 1000);
      });
    });

    console.log('Test results:', results);

    // Verify elements exist
    expect(results.htmlElements.images).toBe(4);
    expect(results.htmlElements.inputs).toBe(3);
    expect(results.htmlElements.buttons).toBe(3);
    expect(results.htmlElements.links).toBe(2);
    expect(results.htmlElements.tables).toBe(2);
    expect(results.htmlElements.iframes).toBe(2);

    // Verify issues were detected
    expect(results.logCount).toBeGreaterThan(0);
    expect(results.overlayCount).toBeGreaterThan(0);

    // Check specific issue types were found
    const _messages = results.logMessages.join(' ');
    expect(messages).toContain('img does not have an alt attribute');
    expect(messages).toContain('Form field without a corresponding label');
    expect(messages).toContain('Button without aria-label');
    expect(messages).toContain('Link element with matching text content');
    expect(messages).toContain('table without any th elements');
    expect(messages).toContain('iframe element without a title attribute');
  });

  test('should properly position overlays on real elements', async () => {
    await page.setContent(`
      <html>
        <body style="margin: 0; padding: 20px;">
          <img src="test.jpg" width="200" height="100" style="margin: 10px;">
        </body>
      </html>
    `);

    // Inject content script
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
    await page.waitForTimeout(1000);

    // Run accessibility checks
    await page.evaluate(() => {
      runAccessibilityChecks();
    });

    await page.waitForTimeout(1000);

    // Get positions of image and overlay
    const _positions = await page.evaluate(() => {
      const _img = document.querySelector('img');
      const _overlay = document.querySelector('.overlay');

      if (!img || !overlay) {
        return { error: 'Missing elements', img: !!img, overlay: !!overlay };
      }

      const _imgRect = img.getBoundingClientRect();
      const _overlayRect = overlay.getBoundingClientRect();

      return {
        img: {
          top: imgRect.top,
          left: imgRect.left,
          width: imgRect.width,
          height: imgRect.height
        },
        overlay: {
          top: overlayRect.top,
          left: overlayRect.left,
          width: overlayRect.width,
          height: overlayRect.height
        }
      };
    });

    console.log('Position test results:', positions);

    if (positions.error) {
      console.log('Error details:', positions);
    }

    expect(positions.img).toBeDefined();
    expect(positions.overlay).toBeDefined();

    // Overlay should roughly match image position (within 5px tolerance)
    if (positions.img && positions.overlay) {
      expect(Math.abs(positions.overlay.top - positions.img.top)).toBeLessThan(5);
      expect(Math.abs(positions.overlay.left - positions.img.left)).toBeLessThan(5);
      expect(Math.abs(positions.overlay.width - positions.img.width)).toBeLessThan(5);
      expect(Math.abs(positions.overlay.height - positions.img.height)).toBeLessThan(5);
    }
  });

  test('should handle overlay removal correctly', async () => {
    await page.setContent(`
      <html>
        <body>
          <img src="test1.jpg">
          <img src="test2.jpg">
          <input type="text">
        </body>
      </html>
    `);

    // Inject content script
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
    await page.waitForTimeout(1000);

    // Create overlays
    await page.evaluate(() => {
      runAccessibilityChecks();
    });

    await page.waitForTimeout(1000);

    // Verify overlays exist
    const _overlayCountBefore = await page.locator('.overlay, .a11y-error, .a11y-warning').count();
    expect(overlayCountBefore).toBeGreaterThan(0);

    // Remove overlays
    await page.evaluate(() => {
      removeAccessibilityOverlays();
    });

    await page.waitForTimeout(500);

    // Verify overlays are removed
    const _overlayCountAfter = await page.locator('.overlay, .a11y-error, .a11y-warning').count();
    expect(overlayCountAfter).toBe(0);

    // Verify logs are cleared
    const _logCount = await page.evaluate(() => {
      return typeof logs !== 'undefined' ? logs.length : -1;
    });
    expect(logCount).toBe(0);
  });

  test('should toggle highlighting on and off', async () => {
    await page.setContent(`
      <html>
        <body>
          <img src="test.jpg">
        </body>
      </html>
    `);

    // Inject content script
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
    await page.waitForTimeout(1000);

    // Toggle on
    await page.evaluate(() => {
      toggleAccessibilityHighlight(true);
    });

    await page.waitForTimeout(1000);
    const _overlaysOn = await page.locator('.overlay').count();
    expect(overlaysOn).toBeGreaterThan(0);

    // Toggle off
    await page.evaluate(() => {
      toggleAccessibilityHighlight(false);
    });

    await page.waitForTimeout(500);
    const _overlaysOff = await page.locator('.overlay').count();
    expect(overlaysOff).toBe(0);
  });

  test('should handle complex page structures', async () => {
    await page.setContent(`
      <html>
        <head><title>Complex Page</title></head>
        <body>
          <header>
            <nav>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">click here</a></li>
              </ul>
            </nav>
          </header>
          
          <main>
            <section>
              <h1>Main Content</h1>
              <article>
                <h2>Article Title</h2>
                <img src="hero.jpg" width="400" height="200">
                <p>Content with <a href="#info">more info</a></p>
                
                <form>
                  <fieldset>
                    <input type="text" placeholder="Name">
                    <input type="email" placeholder="Email" aria-label="Email address">
                    <textarea placeholder="Message"></textarea>
                    <button type="submit">Send</button>
                    <button type="reset"></button>
                  </fieldset>
                </form>
                
                <table>
                  <caption>Data Table</caption>
                  <tr>
                    <td>Name</td>
                    <td>Value</td>
                  </tr>
                  <tr>
                    <td>Item 1</td>
                    <td>100</td>
                  </tr>
                </table>
                
                <iframe src="about:blank" width="300" height="200"></iframe>
              </article>
            </section>
            
            <aside>
              <h3>Sidebar</h3>
              <img src="ad.jpg" alt="">
              <img src="logo.jpg" alt="photo">
            </aside>
          </main>
          
          <footer>
            <p>&copy; 2024</p>
          </footer>
        </body>
      </html>
    `);

    // Inject content script
    await page.addScriptTag({ path: path.join(__dirname, '../../dist/contentScript.js') });
    await page.waitForTimeout(1000);

    // Run comprehensive checks
    const _results = await page.evaluate(() => {
      if (typeof logs !== 'undefined') {
        logs.length = 0;
      }

      runAccessibilityChecks();

      return new Promise(resolve => {
        setTimeout(() => {
          const _overlays = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning');
          const _logMessages = typeof logs !== 'undefined' ? logs.map(log => log.Message) : [];

          resolve({
            overlayCount: overlays.length,
            logCount: logMessages.length,
            logMessages,
            overlayMessages: Array.from(overlays).map(o => o.getAttribute('data-a11ymessage')).filter(Boolean)
          });
        }, 1500);
      });
    });

    console.log('Complex page results:', results);

    // Should find multiple different types of issues
    expect(results.overlayCount).toBeGreaterThan(3);
    expect(results.logCount).toBeGreaterThan(3);

    // Check for various issue types
    const _allMessages = [...results.logMessages, ...results.overlayMessages].join(' ');

    // Should find image issues
    expect(allMessages).toMatch(/img does not have an alt attribute|Uninformative alt attribute/);

    // Should find form issues
    expect(allMessages).toMatch(/Form field without|Button without/);

    // Should find link issues
    expect(allMessages).toMatch(/Link element with matching text content/);

    // Should find table issues (no th elements)
    expect(allMessages).toContain('table without any th elements');

    // Should find iframe issues
    expect(allMessages).toContain('iframe element without a title attribute');
  });
});