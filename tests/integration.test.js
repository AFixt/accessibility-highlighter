/**
 * Integration Tests for Accessibility Highlighter
 * Tests the complete workflow and interaction between different components
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ isEnabled: true }),
      set: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    lastError: null
  }
};

// Mock window properties
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

// Import content script
require('../src/contentScript.js');

describe('Accessibility Highlighter Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.logs = [];
    console.log = jest.fn();
    console.table = jest.fn();
  });

  describe('Complete Accessibility Check Workflow', () => {
    test('should detect multiple accessibility issues on complex page', () => {
      // Create a complex page with multiple accessibility issues
      document.body.innerHTML = `
        <header>
          <h1>Website Title</h1>
          <nav>
            <a href="javascript:void(0)">Click here</a>
            <a href="#content">Read more</a>
          </nav>
        </header>
        
        <main id="content">
          <form>
            <input type="text" name="username" placeholder="Username">
            <input type="password" name="password">
            <button></button>
          </form>
          
          <table>
            <tr>
              <td>Data 1</td>
              <td>Data 2</td>
            </tr>
          </table>
          
          <img src="chart.png">
          <img src="logo.png" alt="">
          <img src="photo.jpg" alt="photo" title="A beautiful landscape photo">
          
          <div role="button"></div>
          <div role="img"></div>
          <div role="link"></div>
          
          <iframe src="content.html"></iframe>
          
          <p style="font-size: 8px;">Very small text</p>
          <p style="font-size: 14px;">Normal text</p>
          
          <div tabindex="5">High tab order</div>
          <span tabindex="0">Focusable span</span>
        </main>
        
        <footer>
          <p>Copyright 2024</p>
        </footer>
      `;

      // Run accessibility checks
      global.runAccessibilityChecks();

      // Verify multiple issues were detected
      expect(console.log).toHaveBeenCalled();
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(5);

      // Verify console.table was called with logs
      expect(console.table).toHaveBeenCalledWith(global.logs);
      expect(global.logs.length).toBeGreaterThan(0);
    });

    test('should handle page with no accessibility issues', () => {
      // Create a page with good accessibility
      document.body.innerHTML = `
        <header>
          <h1>Accessible Website</h1>
          <nav>
            <a href="/home">Home</a>
            <a href="/about">About Us</a>
          </nav>
        </header>
        
        <main>
          <form>
            <label for="username">Username:</label>
            <input type="text" id="username" name="username">
            
            <label for="password">Password:</label>
            <input type="password" id="password" name="password">
            
            <button type="submit">Login</button>
          </form>
          
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John Doe</td>
                <td>john@example.com</td>
              </tr>
            </tbody>
          </table>
          
          <img src="chart.png" alt="Sales chart showing 20% increase">
          <iframe src="content.html" title="Contact form"></iframe>
          
          <p style="font-size: 16px;">Well-sized text content</p>
        </main>
      `;

      global.runAccessibilityChecks();

      // Should have minimal or no issues
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(0);
      expect(global.logs.length).toBe(0);
    });

    test('should handle removal of all overlays', () => {
      // Create page with issues
      document.body.innerHTML = `
        <img src="test.jpg">
        <button></button>
        <a href="#">Click here</a>
      `;

      // Run checks to create overlays
      global.runAccessibilityChecks();

      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(0);

      // Remove all overlays
      global.removeAccessibilityOverlays();

      const _overlaysAfter = document.querySelectorAll('.overlay');
      expect(_overlaysAfter.length).toBe(0);
    });

    test('should handle throttled rapid successive calls', () => {
      document.body.innerHTML = `<img src="test.jpg">`;

      // Make multiple rapid calls
      global.runAccessibilityChecks();
      global.runAccessibilityChecks();
      global.runAccessibilityChecks();

      // Should not create multiple overlays for same element
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(1);
    });
  });

  describe('Message Handling Integration', () => {
    test('should handle complete enable/disable workflow', () => {
      // Setup page with issues
      document.body.innerHTML = `
        <img src="test.jpg">
        <button></button>
      `;

      // Get message listener
      const _messageListener = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];
      const _mockSendResponse = jest.fn();
      const _mockSender = { tab: { id: 123 } };

      // Enable highlighting
      const _enableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      _messageListener(_enableMessage, _mockSender, _mockSendResponse);

      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(0);
      expect(_mockSendResponse).toHaveBeenCalledWith('highlighted');

      _mockSendResponse.mockClear();

      // Disable highlighting
      const _disableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: false
      };

      messageListener(disableMessage, mockSender, mockSendResponse);

      overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(0);
      expect(_mockSendResponse).toHaveBeenCalledWith('unhighlighted');
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should handle large DOM with many elements', () => {
      // Create a large DOM structure
      const _htmlContent = '';
      for (let _i = 0; i < 100; i++) {
        htmlContent += `
          <div>
            <img src="image${i}.jpg">
            <button>Button ${i}</button>
            <a href="#link${i}">Link ${i}</a>
            <input type="text" name="field${i}">
            <table>
              <tr><td>Data ${i}</td></tr>
            </table>
          </div>
        `;
      }
      document.body.innerHTML = htmlContent;

      const _startTime = performance.now();
      global.runAccessibilityChecks();
      const _endTime = performance.now();

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max

      // Should detect multiple issues
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(100);
    });

    test('should not create memory leaks with repeated operations', () => {
      document.body.innerHTML = `
        <img src="test.jpg">
        <button></button>
      `;

      // Simulate repeated enable/disable cycles
      for (let _i = 0; i < 50; i++) {
        global.runAccessibilityChecks();
        global.removeAccessibilityOverlays();
      }

      // Final state should be clean
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(0);

      // Logs should still work
      global.runAccessibilityChecks();
      expect(global.logs.length).toBeGreaterThan(0);
    });

    test('should handle dynamic content changes', () => {
      // Start with simple content
      document.body.innerHTML = `<div id="container"></div>`;

      global.runAccessibilityChecks();
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(0);

      // Add problematic content dynamically
      const _container = document.getElementById('container');
      container.innerHTML = `
        <img src="test.jpg">
        <button></button>
      `;

      global.runAccessibilityChecks();
      overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(0);

      // Remove problematic content
      container.innerHTML = `
        <img src="test.jpg" alt="Properly described image">
        <button>Properly labeled button</button>
      `;

      global.removeAccessibilityOverlays();
      global.runAccessibilityChecks();
      overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(0);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from partial failures during checks', () => {
      document.body.innerHTML = `
        <img src="test.jpg">
        <button></button>
        <a href="#">Link</a>
      `;

      // Mock one element to throw error during checking
      const _elements = document.querySelectorAll('*');
      const _problematicElement = elements[1]; // button

      const _originalGetAttribute = problematicElement.getAttribute;
      problematicElement.getAttribute = jest.fn().mockImplementation(attr => {
        if (attr === 'aria-label') {
          throw new Error('DOM access error');
        }
        return originalGetAttribute.call(problematicElement, attr);
      });

      // Should continue checking other elements despite one failure
      expect(() => {
        global.runAccessibilityChecks();
      }).not.toThrow();

      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(0); // Should still find issues in other elements
    });

    test('should handle corrupted overlay cleanup', () => {
      document.body.innerHTML = `<img src="test.jpg">`;

      global.runAccessibilityChecks();
      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBeGreaterThan(0);

      // Corrupt one overlay by removing its remove method
      if (overlays.length > 0) {
        delete overlays[0].remove;
      }

      // Should still clean up other overlays without crashing
      expect(() => {
        global.removeAccessibilityOverlays();
      }).not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    test('should use correct configuration for all checks', () => {
      // Verify A11Y_CONFIG is properly loaded and used
      expect(global.A11Y_CONFIG).toBeDefined();
      expect(global.A11Y_CONFIG.MESSAGES).toBeDefined();
      expect(global.A11Y_CONFIG.SELECTORS).toBeDefined();
      expect(global.A11Y_CONFIG.VISUAL).toBeDefined();

      // Create elements that would trigger different message types
      document.body.innerHTML = `
        <img src="test.jpg">
        <button></button>
        <a href="#">Click here</a>
        <table><tr><td>Data</td></tr></table>
        <input type="text" name="test">
      `;

      global.runAccessibilityChecks();

      // Verify different message types are used
      const _messageTypes = global.logs.map(log => log.Message);
      expect(messageTypes.length).toBeGreaterThan(0);

      // Should include various message types from config
      const _hasImageMessage = messageTypes.some(msg =>
        msg.includes(global.A11Y_CONFIG.MESSAGES.MISSING_ALT) ||
        msg.includes('alt attribute')
      );
      expect(hasImageMessage).toBe(true);
    });
  });

  describe('Cross-Browser Compatibility Simulation', () => {
    test('should handle different getBoundingClientRect implementations', () => {
      document.body.innerHTML = `<img src="test.jpg">`;
      const _img = document.querySelector('img');

      // Simulate different getBoundingClientRect behaviors
      const _mockRects = [
        { width: 100, height: 50, top: 10, left: 20, right: 120, bottom: 60 },
        { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, // Hidden element
        { width: -1, height: -1, top: 0, left: 0, right: -1, bottom: -1 } // Edge case
      ];

      mockRects.forEach(rect => {
        img.getBoundingClientRect = jest.fn().mockReturnValue(rect);

        expect(() => {
          global.overlay.call(img, 'overlay', 'error', 'Test message');
        }).not.toThrow();
      });
    });

    test('should handle different textContent implementations', () => {
      const _button = document.createElement('button');
      document.body.appendChild(button);

      // Test different textContent scenarios
      const _textScenarios = [
        null,
        undefined,
        '',
        '   ',
        'Valid text',
        0,
        false
      ];

      textScenarios.forEach(text => {
        Object.defineProperty(button, 'textContent', {
          value: text,
          writable: true,
          configurable: true
        });

        expect(() => {
          global.checkButtonElement(button);
        }).not.toThrow();
      });
    });
  });
});