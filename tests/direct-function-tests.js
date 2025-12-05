/**
 * Direct function tests for Accessibility Highlighter
 * Tests individual functions with controlled environments
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (callback) {
          callback({ isEnabled: false }); // Start disabled to avoid auto-run
        }
        return Promise.resolve({ isEnabled: false });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {callback();}
        return Promise.resolve();
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    lastError: null
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 123 }]),
    sendMessage: jest.fn()
  },
  action: {
    setIcon: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Mock window properties
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

// Import content script after mocking
require('../src/contentScript.js');

describe('Direct Function Tests for Real Code Coverage', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Clear logs
    if (global.logs) {
      global.logs.length = 0;
    }

    // Reset throttling
    if (global.resetThrottle) {
      global.resetThrottle();
    }

    // Mock getBoundingClientRect for all elements
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 10,
      left: 10,
      width: 100,
      height: 50,
      right: 110,
      bottom: 60
    }));
  });

  describe('Overlay Function Tests', () => {
    test('should create overlay with proper styling', () => {
      document.body.innerHTML = '<img src="test.jpg" id="test-img">';
      const _testElement = document.getElementById('test-img');

      // Call overlay function directly
      global.overlay.call(_testElement, 'overlay', 'error', 'Test message');

      const _overlays = document.querySelectorAll('.overlay');
      expect(_overlays.length).toBe(1);

      const _overlay = _overlays[0];
      expect(_overlay.style.position).toBe('absolute');
      expect(_overlay.style.width).toBe('100px');
      expect(_overlay.style.height).toBe('50px');
      expect(_overlay.getAttribute('data-a11ymessage')).toBe('Test message');
    });

    test('should sanitize messages properly', () => {
      document.body.innerHTML = '<div id="test-div"></div>';
      const _testElement = document.getElementById('test-div');

      global.overlay.call(_testElement, 'overlay', 'error', 'Message with <script>alert("xss")</script> content');

      const _overlay = document.querySelector('.overlay');
      const _message = _overlay.getAttribute('data-a11ymessage');
      expect(_message).not.toContain('<');
      expect(_message).not.toContain('>');
      expect(_message).toBe('Message with scriptalert("xss")/script content');
    });
  });

  describe('Individual Element Testing Functions', () => {
    test('should test individual functions by calling runAccessibilityChecks with specific elements', () => {
      // Create a simple test case that should trigger the checking functions
      document.body.innerHTML = `
        <img src="test.jpg" id="test-img">
        <button id="test-button"></button>
        <a href="#" id="test-link">click here</a>
        <input type="text" id="test-input">
        <table id="test-table"><tr><td>data</td></tr></table>
        <iframe src="test.html" id="test-iframe"></iframe>
      `;

      // Make sure elements are actually in DOM
      expect(document.querySelectorAll('img').length).toBe(1);
      expect(document.querySelectorAll('button').length).toBe(1);
      expect(document.querySelectorAll('a').length).toBe(1);
      expect(document.querySelectorAll('input').length).toBe(1);
      expect(document.querySelectorAll('table').length).toBe(1);
      expect(document.querySelectorAll('iframe').length).toBe(1);

      // Run accessibility checks
      global.runAccessibilityChecks();

      // Verify that checks ran and found issues
      expect(global.logs.length).toBeGreaterThan(0);

      // Check specific issues were found
      const _logMessages = global.logs.map(log => log.Message);
      expect(_logMessages.some(msg => msg.includes('img does not have an alt attribute'))).toBe(true);
      expect(_logMessages.some(msg => msg.includes('Button without aria-label'))).toBe(true);
      expect(_logMessages.some(msg => msg.includes('Link element with matching text content'))).toBe(true);
      expect(_logMessages.some(msg => msg.includes('Form field without a corresponding label'))).toBe(true);
      expect(_logMessages.some(msg => msg.includes('table without any th elements'))).toBe(true);
      expect(_logMessages.some(msg => msg.includes('iframe element without a title attribute'))).toBe(true);
    });
  });

  describe('removeAccessibilityOverlays Function', () => {
    test('should remove all overlays and clear logs', () => {
      // Create some overlays manually using innerHTML
      document.body.innerHTML = `
        <div class="overlay">Overlay 1</div>
        <div class="a11y-error">Overlay 2</div>
      `;

      // Add some logs
      global.logs.push({ Message: 'Test log entry' });

      expect(document.querySelectorAll('.overlay, .a11y-error').length).toBe(2);
      expect(global.logs.length).toBe(1);

      // Call remove function
      global.removeAccessibilityOverlays();

      expect(document.querySelectorAll('.overlay, .a11y-error').length).toBe(0);
      expect(global.logs.length).toBe(0);
    });
  });

  describe('toggleAccessibilityHighlight Function', () => {
    test('should run checks when enabled', () => {
      document.body.innerHTML = '<img src="test.jpg">';
      global.logs.length = 0;

      global.toggleAccessibilityHighlight(true);

      expect(global.logs.length).toBeGreaterThan(0);
    });

    test('should remove overlays when disabled', () => {
      // Create overlay using innerHTML
      document.body.innerHTML = '<div class="overlay">Test overlay</div>';

      expect(document.querySelectorAll('.overlay').length).toBe(1);

      global.toggleAccessibilityHighlight(false);

      expect(document.querySelectorAll('.overlay').length).toBe(0);
    });
  });
});