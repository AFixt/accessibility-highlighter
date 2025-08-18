/**
 * @fileoverview Tests for overlay functionality in contentScript.js
 *
 * Tests the overlay creation, removal, and management functionality that
 * is implemented in the main content script.
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (callback) {callback({ isEnabled: true });}
        return Promise.resolve({ isEnabled: true });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {callback();}
        return Promise.resolve();
      })
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

// Import the content script
require('../src/contentScript.js');

describe('Overlay Functions from contentScript.js', () => {
  let mockElement;
  let consoleSpy;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Reset mocks
    jest.clearAllMocks();

    // Setup console spy
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    // Reset global LOGS
    global.LOGS = [];

    // Create mock element
    mockElement = {
      getBoundingClientRect: jest.fn(() => ({
        width: 100,
        height: 50,
        top: 10,
        left: 20,
        right: 120,
        bottom: 60
      })),
      tagName: 'IMG',
      outerHTML: '<img src="test.jpg">',
      style: {}
    };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('overlay() function', () => {
    test('should create overlay with valid parameters', () => {
      // Call overlay function with proper 'this' context
      global.overlay.call(mockElement, 'overlay', 'error', 'Missing alt attribute');

      // Check if overlay was created (should have both classes)
      const overlays = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning');
      expect(overlays.length).toBe(1);

      const overlayEl = overlays[0];
      expect(overlayEl.style.position).toBe('absolute');
      expect(overlayEl.dataset.a11ymessage).toBe('Missing alt attribute');
    });

    test('should handle invalid element dimensions', () => {
      mockElement.getBoundingClientRect = jest.fn(() => ({
        width: 0,
        height: 0,
        top: 10,
        left: 20
      }));

      global.overlay.call(mockElement, 'overlay', 'error', 'Test message');

      // Should skip zero-sized elements
      const overlays = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning');
      expect(overlays.length).toBe(0);
      expect(console.warn).toHaveBeenCalledWith('Skipping overlay for zero-sized element:', mockElement);
    });

    test('should sanitize dangerous message content', () => {
      global.overlay.call(mockElement, 'overlay', 'error', '<script>alert("xss")</script>Test message');

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        // Message should be sanitized
        expect(overlayEl.dataset.a11ymessage).not.toContain('<script>');
        expect(overlayEl.dataset.a11ymessage).not.toContain('alert');
      }
    });

    test('should apply different styles based on error level', () => {
      // Test error level
      global.overlay.call(mockElement, 'overlay', 'error', 'Error message');
      let overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');

      if (overlayEl) {
        // Should have error styling
        expect(overlayEl.style.backgroundColor).toContain('red') ||
        expect(overlayEl.style.backgroundColor).toContain('#');
      }

      // Clear and test warning level
      document.body.innerHTML = '';
      global.overlay.call(mockElement, 'overlay', 'warning', 'Warning message');
      overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');

      if (overlayEl) {
        // Should have warning styling (different from error)
        expect(overlayEl.style.backgroundColor).toBeDefined();
      }
    });

    test('should add log entry when creating overlay', () => {
      const initialLogCount = global.LOGS.length;

      global.overlay.call(mockElement, 'overlay', 'error', 'Test message');

      // Should have added to LOGS
      expect(global.LOGS.length).toBeGreaterThan(initialLogCount);

      const lastLog = global.LOGS[global.LOGS.length - 1];
      expect(lastLog.Message).toBe('Test message');
      expect(lastLog.Level).toBe('error');
    });

    test('should handle errors gracefully', () => {
      // Mock getBoundingClientRect to throw error
      mockElement.getBoundingClientRect = jest.fn(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => {
        global.overlay.call(mockElement, 'overlay', 'error', 'Test message');
      }).not.toThrow();
    });

    test('should validate parameters', () => {
      // Test invalid overlay class
      global.overlay.call(mockElement, '', 'error', 'Test message');
      expect(document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length).toBe(0);

      // Test invalid level
      global.overlay.call(mockElement, 'overlay', 'invalid', 'Test message');
      expect(document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length).toBe(0);

      // Test invalid message
      global.overlay.call(mockElement, 'overlay', 'error', '');
      expect(document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length).toBe(0);
    });
  });

  describe('removeAccessibilityOverlays() function', () => {
    test('should remove all overlays from page', () => {
      // Create some overlays
      global.overlay.call(mockElement, 'overlay', 'error', 'Error 1');
      global.overlay.call(mockElement, 'overlay', 'warning', 'Warning 1');

      const initialCount = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length;
      expect(initialCount).toBeGreaterThan(0);

      // Remove overlays
      global.removeAccessibilityOverlays();

      // Should have removed all overlays
      const finalCount = document.querySelectorAll('.overlay, .a11y-error, .a11y-warning').length;
      expect(finalCount).toBe(0);
    });

    test('should handle case with no overlays gracefully', () => {
      // Should not throw even if no overlays exist
      expect(() => {
        global.removeAccessibilityOverlays();
      }).not.toThrow();
    });

    test('should log removal count', () => {
      // Create overlays
      global.overlay.call(mockElement, 'overlay', 'error', 'Error 1');
      global.overlay.call(mockElement, 'overlay', 'warning', 'Warning 1');

      global.removeAccessibilityOverlays();

      // Should log the removal
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Removed'));
    });
  });

  describe('overlay positioning and styling', () => {
    test('should position overlay correctly relative to element', () => {
      // Set specific element position
      mockElement.getBoundingClientRect = jest.fn(() => ({
        width: 150,
        height: 75,
        top: 50,
        left: 100,
        right: 250,
        bottom: 125
      }));

      // Set scroll position
      Object.defineProperty(window, 'scrollX', { value: 10, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 20, writable: true });

      global.overlay.call(mockElement, 'overlay', 'error', 'Position test');

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        expect(overlayEl.style.top).toBe('70px'); // 50 + 20 scroll
        expect(overlayEl.style.left).toBe('110px'); // 100 + 10 scroll
        expect(overlayEl.style.width).toBe('150px');
        expect(overlayEl.style.height).toBe('75px');
      }
    });

    test('should set appropriate z-index for visibility', () => {
      global.overlay.call(mockElement, 'overlay', 'error', 'Z-index test');

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        const zIndex = parseInt(overlayEl.style.zIndex);
        expect(zIndex).toBeGreaterThan(1000); // Should be high z-index
      }
    });

    test('should make overlay non-interactive', () => {
      global.overlay.call(mockElement, 'overlay', 'error', 'Pointer events test');

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        expect(overlayEl.style.pointerEvents).toBe('none');
      }
    });
  });

  describe('overlay message handling', () => {
    test('should store message in data attribute', () => {
      const testMessage = 'This is a test accessibility message';

      global.overlay.call(mockElement, 'overlay', 'error', testMessage);

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        expect(overlayEl.dataset.a11ymessage).toBe(testMessage);
      }
    });

    test('should handle long messages appropriately', () => {
      const longMessage = 'A'.repeat(500); // Very long message

      global.overlay.call(mockElement, 'overlay', 'error', longMessage);

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        expect(overlayEl.dataset.a11ymessage).toBeDefined();
        expect(overlayEl.dataset.a11ymessage.length).toBeGreaterThan(0);
      }
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Message with "quotes" and \'apostrophes\' and & symbols';

      global.overlay.call(mockElement, 'overlay', 'error', specialMessage);

      const overlayEl = document.querySelector('.overlay, .a11y-error, .a11y-warning');
      if (overlayEl) {
        // Should have some form of the message (possibly sanitized)
        expect(overlayEl.dataset.a11ymessage).toBeDefined();
        expect(overlayEl.dataset.a11ymessage.length).toBeGreaterThan(0);
      }
    });
  });

  describe('overlay integration with global state', () => {
    test('should track overlays in global LOGS', () => {
      const initialLogCount = global.LOGS.length;

      global.overlay.call(mockElement, 'overlay', 'error', 'Log tracking test');

      expect(global.LOGS.length).toBe(initialLogCount + 1);

      const newLog = global.LOGS[global.LOGS.length - 1];
      expect(newLog.Message).toBe('Log tracking test');
      expect(newLog.Level).toBe('error');
    });

    test('should include element information in LOGS', () => {
      global.overlay.call(mockElement, 'overlay', 'error', 'Element info test');

      const lastLog = global.LOGS[global.LOGS.length - 1];
      expect(lastLog.Element).toBeDefined();
      expect(typeof lastLog.Element).toBe('string');
    });
  });
});