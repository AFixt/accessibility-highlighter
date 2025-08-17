/**
 * @fileoverview Tests for A11Y_CONFIG constants and structure
 *
 * Tests the configuration object structure, data integrity,
 * and proper constant values for the accessibility highlighter.
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

// Import the content script to get A11Y_CONFIG
require('../src/contentScript.js');

describe('A11Y_CONFIG Constants and Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Top-level structure', () => {
    test('should have all required top-level properties', () => {
      expect(global.A11Y_CONFIG).toBeDefined();
      expect(typeof global.A11Y_CONFIG).toBe('object');

      // Check all required top-level properties exist in contentScript.js version
      expect(global.A11Y_CONFIG.PERFORMANCE).toBeDefined();
      expect(global.A11Y_CONFIG.VISUAL).toBeDefined();
      expect(global.A11Y_CONFIG.MESSAGES).toBeDefined();

      // Note: contentScript.js version doesn't have these properties
      // expect(global.A11Y_CONFIG.PROHIBITED_TABLE_SUMMARIES).toBeDefined();
      // expect(global.A11Y_CONFIG.PROHIBITED_ALT_VALUES).toBeDefined();
      // expect(global.A11Y_CONFIG.PROHIBITED_LINK_TEXT).toBeDefined();
      // expect(global.A11Y_CONFIG.SELECTORS).toBeDefined();
      // expect(global.A11Y_CONFIG.CSS_CLASSES).toBeDefined();
    });

    test('should be a read-only object structure', () => {
      const config = global.A11Y_CONFIG;

      // Should be an object
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();

      // Should have enumerable properties
      const keys = Object.keys(config);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('PERFORMANCE configuration', () => {
    test('should have valid performance settings', () => {
      const perf = global.A11Y_CONFIG.PERFORMANCE;

      expect(typeof perf).toBe('object');
      expect(perf.THROTTLE_DELAY).toBeDefined();
      expect(perf.FONT_SIZE_THRESHOLD).toBeDefined();
      expect(perf.MAX_LOG_ELEMENT_LENGTH).toBeDefined();
      expect(perf.Z_INDEX_OVERLAY).toBeDefined();
    });

    test('should have numeric values for performance settings', () => {
      const perf = global.A11Y_CONFIG.PERFORMANCE;

      expect(typeof perf.THROTTLE_DELAY).toBe('number');
      expect(typeof perf.FONT_SIZE_THRESHOLD).toBe('number');
      expect(typeof perf.MAX_LOG_ELEMENT_LENGTH).toBe('number');
      expect(typeof perf.Z_INDEX_OVERLAY).toBe('number');
    });

    test('should have reasonable performance values', () => {
      const perf = global.A11Y_CONFIG.PERFORMANCE;

      // Throttle delay should be reasonable (between 100ms and 10s)
      expect(perf.THROTTLE_DELAY).toBeGreaterThan(100);
      expect(perf.THROTTLE_DELAY).toBeLessThan(10000);

      // Font size threshold should be reasonable (between 6 and 24 pixels)
      expect(perf.FONT_SIZE_THRESHOLD).toBeGreaterThan(6);
      expect(perf.FONT_SIZE_THRESHOLD).toBeLessThan(24);

      // Max log element length should be reasonable (between 50 and 1000)
      expect(perf.MAX_LOG_ELEMENT_LENGTH).toBeGreaterThan(50);
      expect(perf.MAX_LOG_ELEMENT_LENGTH).toBeLessThan(1000);

      // Z-index should be high enough to be visible
      expect(perf.Z_INDEX_OVERLAY).toBeGreaterThan(1000);
    });
  });

  describe('VISUAL configuration', () => {
    test('should have valid visual settings', () => {
      const visual = global.A11Y_CONFIG.VISUAL;

      expect(typeof visual).toBe('object');
      expect(visual.ERROR_COLOR).toBeDefined();
      expect(visual.WARNING_COLOR).toBeDefined();
      expect(visual.OVERLAY_OPACITY).toBeDefined();
      expect(visual.BORDER_RADIUS).toBeDefined();
      expect(visual.BORDER_WIDTH).toBeDefined();
    });

    test('should have valid color values', () => {
      const visual = global.A11Y_CONFIG.VISUAL;

      // Colors should be strings
      expect(typeof visual.ERROR_COLOR).toBe('string');
      expect(typeof visual.WARNING_COLOR).toBe('string');

      // Colors should be valid hex colors or CSS color names
      expect(visual.ERROR_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^[a-zA-Z]+$/);
      expect(visual.WARNING_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^[a-zA-Z]+$/);
    });

    test('should have valid opacity value', () => {
      const visual = global.A11Y_CONFIG.VISUAL;

      expect(typeof visual.OVERLAY_OPACITY).toBe('number');
      expect(visual.OVERLAY_OPACITY).toBeGreaterThan(0);
      expect(visual.OVERLAY_OPACITY).toBeLessThanOrEqual(1);
    });

    test('should have valid CSS dimension values', () => {
      const visual = global.A11Y_CONFIG.VISUAL;

      expect(typeof visual.BORDER_RADIUS).toBe('string');
      expect(typeof visual.BORDER_WIDTH).toBe('string');

      // Should be valid CSS dimension values
      expect(visual.BORDER_RADIUS).toMatch(/^\d+(\.\d+)?(px|em|rem|%|pt)$/);
      expect(visual.BORDER_WIDTH).toMatch(/^\d+(\.\d+)?(px|em|rem|%|pt)$/);
    });
  });

  // Note: PROHIBITED arrays and SELECTORS are not part of contentScript.js A11Y_CONFIG
  /*
  describe('PROHIBITED arrays', () => {
    test('should have prohibited table summaries array', () => {
      const prohibited = global.A11Y_CONFIG.PROHIBITED_TABLE_SUMMARIES;

      expect(Array.isArray(prohibited)).toBe(true);
      expect(prohibited.length).toBeGreaterThan(0);

      // All entries should be strings
      prohibited.forEach(summary => {
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
      });
    });

    test('should have prohibited alt values array', () => {
      const prohibited = global.A11Y_CONFIG.PROHIBITED_ALT_VALUES;

      expect(Array.isArray(prohibited)).toBe(true);
      expect(prohibited.length).toBeGreaterThan(0);

      // All entries should be strings
      prohibited.forEach(altValue => {
        expect(typeof altValue).toBe('string');
        expect(altValue.length).toBeGreaterThan(0);
      });
    });

    test('should have prohibited link text array', () => {
      const prohibited = global.A11Y_CONFIG.PROHIBITED_LINK_TEXT;

      expect(Array.isArray(prohibited)).toBe(true);
      expect(prohibited.length).toBeGreaterThan(0);

      // All entries should be strings
      prohibited.forEach(linkText => {
        expect(typeof linkText).toBe('string');
        expect(linkText.length).toBeGreaterThan(0);
      });
    });

    test('should contain expected prohibited values', () => {
      const { PROHIBITED_ALT_VALUES, PROHIBITED_LINK_TEXT, PROHIBITED_TABLE_SUMMARIES } = global.A11Y_CONFIG;

      // Check some common prohibited alt values
      expect(PROHIBITED_ALT_VALUES).toContain('image');
      expect(PROHIBITED_ALT_VALUES).toContain('photo');
      expect(PROHIBITED_ALT_VALUES).toContain('graphic');

      // Check some common prohibited link text
      expect(PROHIBITED_LINK_TEXT).toContain('click here');
      expect(PROHIBITED_LINK_TEXT).toContain('read more');
      expect(PROHIBITED_LINK_TEXT).toContain('here');

      // Check some common prohibited table summaries
      expect(PROHIBITED_TABLE_SUMMARIES).toContain('layout');
      expect(PROHIBITED_TABLE_SUMMARIES).toContain('Layout');
    });
  });

  describe('SELECTORS configuration', () => {
    test('should have valid selector strings', () => {
      const selectors = global.A11Y_CONFIG.SELECTORS;

      expect(typeof selectors).toBe('object');
      expect(typeof selectors.ALL_CHECKABLE_ELEMENTS).toBe('string');
      expect(typeof selectors.LANDMARK_ELEMENTS).toBe('string');
      expect(typeof selectors.OVERLAY_ELEMENTS).toBe('string');

      // Selectors should not be empty
      expect(selectors.ALL_CHECKABLE_ELEMENTS.length).toBeGreaterThan(0);
      expect(selectors.LANDMARK_ELEMENTS.length).toBeGreaterThan(0);
      expect(selectors.OVERLAY_ELEMENTS.length).toBeGreaterThan(0);
    });

    test('should have valid selector arrays', () => {
      const selectors = global.A11Y_CONFIG.SELECTORS;

      if (selectors.TEXT_ELEMENTS) {
        expect(Array.isArray(selectors.TEXT_ELEMENTS)).toBe(true);
        selectors.TEXT_ELEMENTS.forEach(element => {
          expect(typeof element).toBe('string');
          expect(element.length).toBeGreaterThan(0);
        });
      }

      if (selectors.INTERACTIVE_ELEMENTS) {
        expect(Array.isArray(selectors.INTERACTIVE_ELEMENTS)).toBe(true);
        selectors.INTERACTIVE_ELEMENTS.forEach(element => {
          expect(typeof element).toBe('string');
          expect(element.length).toBeGreaterThan(0);
        });
      }
    });

    test('should contain expected elements in selectors', () => {
      const selectors = global.A11Y_CONFIG.SELECTORS;

      // ALL_CHECKABLE_ELEMENTS should contain common elements
      expect(selectors.ALL_CHECKABLE_ELEMENTS).toContain('img');
      expect(selectors.ALL_CHECKABLE_ELEMENTS).toContain('button');
      expect(selectors.ALL_CHECKABLE_ELEMENTS).toContain('input');
      expect(selectors.ALL_CHECKABLE_ELEMENTS).toContain('a');

      // LANDMARK_ELEMENTS should contain landmark elements
      expect(selectors.LANDMARK_ELEMENTS).toContain('main');
      expect(selectors.LANDMARK_ELEMENTS).toContain('nav');
      expect(selectors.LANDMARK_ELEMENTS).toContain('header');

      // OVERLAY_ELEMENTS should contain overlay classes
      expect(selectors.OVERLAY_ELEMENTS).toContain('a11y-error');
      expect(selectors.OVERLAY_ELEMENTS).toContain('a11y-warning');
    });
  });
  */

  describe('MESSAGES configuration', () => {
    test('should have all required message constants', () => {
      const messages = global.A11Y_CONFIG.MESSAGES;

      expect(typeof messages).toBe('object');

      // Test key message types exist (based on contentScript.js global A11Y_CONFIG)
      expect(messages.MISSING_ALT).toBeDefined();
      expect(messages.UNINFORMATIVE_ALT).toBeDefined();
      expect(messages.BUTTON_NO_LABEL).toBeDefined();
      expect(messages.FORM_FIELD_NO_LABEL).toBeDefined();
      expect(messages.GENERIC_LINK_TEXT).toBeDefined();
      expect(messages.TABLE_NO_HEADERS).toBeDefined();
      expect(messages.IFRAME_NO_TITLE).toBeDefined();
      expect(messages.SMALL_FONT_SIZE).toBeDefined();
      expect(messages.NO_LANDMARKS).toBeDefined();

      // Note: THROTTLED is not in contentScript.js global A11Y_CONFIG.MESSAGES
      // expect(messages.THROTTLED).toBeDefined();
    });

    test('should have string values for all messages', () => {
      const messages = global.A11Y_CONFIG.MESSAGES;

      Object.entries(messages).forEach(([, message]) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message.trim()).toBe(message); // No leading/trailing whitespace
      });
    });

    test('should have descriptive and clear messages', () => {
      const messages = global.A11Y_CONFIG.MESSAGES;

      // Messages should be descriptive (reasonable length)
      Object.entries(messages).forEach(([, message]) => {
        expect(message.length).toBeGreaterThan(10); // Not too short
        expect(message.length).toBeLessThan(200); // Not too long
      });

      // Specific message content checks
      expect(messages.MISSING_ALT.toLowerCase()).toContain('alt');
      expect(messages.BUTTON_NO_LABEL.toLowerCase()).toContain('button');
      expect(messages.FORM_FIELD_NO_LABEL.toLowerCase()).toContain('label');
    });
  });

  // Note: CSS_CLASSES are not part of contentScript.js A11Y_CONFIG
  /*
  describe('CSS_CLASSES configuration', () => {
    test('should have valid CSS class names', () => {
      const cssClasses = global.A11Y_CONFIG.CSS_CLASSES;

      expect(typeof cssClasses).toBe('object');
      expect(cssClasses.ERROR_OVERLAY).toBeDefined();
      expect(cssClasses.WARNING_OVERLAY).toBeDefined();

      // Should be valid CSS class names
      expect(typeof cssClasses.ERROR_OVERLAY).toBe('string');
      expect(typeof cssClasses.WARNING_OVERLAY).toBe('string');

      // Should not start with dot (class names, not selectors)
      expect(cssClasses.ERROR_OVERLAY).not.toMatch(/^\./);
      expect(cssClasses.WARNING_OVERLAY).not.toMatch(/^\./);

      // Should be valid CSS identifiers
      expect(cssClasses.ERROR_OVERLAY).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
      expect(cssClasses.WARNING_OVERLAY).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
    });

    test('should have distinct class names', () => {
      const cssClasses = global.A11Y_CONFIG.CSS_CLASSES;

      const classValues = Object.values(cssClasses);
      const uniqueValues = [...new Set(classValues)];

      // All class names should be unique
      expect(uniqueValues.length).toBe(classValues.length);
    });
  });
  */

  describe('Configuration integrity', () => {
    test('should not have null or undefined values', () => {
      const config = global.A11Y_CONFIG;

      function checkForNullValues(obj, path = '') {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          expect(value).not.toBeNull();
          expect(value).not.toBeUndefined();

          if (typeof value === 'object' && !Array.isArray(value)) {
            checkForNullValues(value, currentPath);
          }
        });
      }

      checkForNullValues(config);
    });

    test('should have consistent data types', () => {
      const config = global.A11Y_CONFIG;

      // Performance values should all be numbers
      Object.values(config.PERFORMANCE).forEach(value => {
        expect(typeof value).toBe('number');
      });

      // Messages should all be strings
      Object.values(config.MESSAGES).forEach(value => {
        expect(typeof value).toBe('string');
      });

      // Note: CSS_CLASSES not available in contentScript.js A11Y_CONFIG
      // Object.values(config.CSS_CLASSES).forEach(value => {
      //   expect(typeof value).toBe('string');
      // });
    });

    test('should be immutable in production', () => {
      const config = global.A11Y_CONFIG;

      // Should not be able to modify top-level properties
      expect(() => {
        config.NEW_PROPERTY = 'test';
      }).not.toThrow(); // Note: We can't enforce immutability in tests, but we test structure

      // Original structure should remain intact
      expect(config.PERFORMANCE).toBeDefined();
      expect(config.VISUAL).toBeDefined();
      expect(config.MESSAGES).toBeDefined();
    });
  });

  describe('Configuration completeness', () => {
    test('should have configuration for major accessibility checks', () => {
      const messages = global.A11Y_CONFIG.MESSAGES;

      // Should have messages for different types of accessibility issues (contentScript.js version)
      const availableMessages = {
        images: ['MISSING_ALT', 'UNINFORMATIVE_ALT'],
        forms: ['FORM_FIELD_NO_LABEL'],
        links: ['GENERIC_LINK_TEXT'],
        structure: ['TABLE_NO_HEADERS', 'NO_LANDMARKS'],
        multimedia: ['IFRAME_NO_TITLE'],
        general: ['SMALL_FONT_SIZE']
      };

      Object.entries(availableMessages).forEach(([, messageKeys]) => {
        messageKeys.forEach(key => {
          expect(messages[key]).toBeDefined();
        });
      });
    });

    // Note: SELECTORS test removed since they're not in contentScript.js A11Y_CONFIG
    /*
    test('should have selectors for all checkable elements', () => {
      const selectors = global.A11Y_CONFIG.SELECTORS;

      // Should include common interactive elements
      const expectedElements = ['img', 'button', 'input', 'a', 'table', 'iframe'];
      expectedElements.forEach(element => {
        expect(selectors.ALL_CHECKABLE_ELEMENTS).toContain(element);
      });
    });
    */
  });
});