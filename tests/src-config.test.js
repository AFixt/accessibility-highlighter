/**
 * @fileoverview Tests for src/config.js ES6 module exports
 *
 * Tests the individual configuration exports from src/config.js using TDD approach.
 * This tests the standalone config module by parsing and evaluating it as CommonJS.
 */

const _fs = require('fs');
const _path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

describe('src/config.js ES6 Module Tests', () => {
  let config;

  beforeAll(() => {
    // Read and transform ES6 module to CommonJS for testing
    const _configPath = path.join(__dirname, '../src/config.js');
    const _configContent = fs.readFileSync(configPath, 'utf8');

    // Transform export statements to module.exports for testing
    configContent = configContent
      .replace(/export const (\w+)/g, 'const $1')
      .replace(/^\/\*\*[\s\S]*?\*\/\s*/gm, '') // Remove JSDoc comments
      .replace(/^\/\*[\s\S]*?\*\/\s*/gm, ''); // Remove block comments

    // Add exports at the end
    const _exportStatements = [
      'PERFORMANCE_CONFIG',
      'VISUAL_CONFIG',
      'CHECK_CONFIG',
      'PROHIBITED_TABLE_SUMMARIES',
      'PROHIBITED_ALT_VALUES',
      'PROHIBITED_LINK_TEXT',
      'DEPRECATED_ELEMENTS',
      'SELECTORS',
      'MESSAGES',
      'CSS_CLASSES',
      'USER_CONFIG',
      'DEFAULT_CONFIG'
    ];

    configContent += '\n\nmodule.exports = {\n';
    configContent += exportStatements.map(name => `  ${name}`).join(',\n');
    configContent += '\n};\n';

    // Evaluate the transformed code
    const _module = { exports: {} };
    eval(configContent); // eslint-disable-line no-eval
    config = module.exports;
  });

  describe('PERFORMANCE_CONFIG export', () => {
    test('should export PERFORMANCE_CONFIG with all required properties', () => {
      const { PERFORMANCE_CONFIG } = config;

      expect(PERFORMANCE_CONFIG).toBeDefined();
      expect(typeof PERFORMANCE_CONFIG).toBe('object');

      // Test all expected properties exist
      expect(PERFORMANCE_CONFIG.THROTTLE_DELAY).toBeDefined();
      expect(PERFORMANCE_CONFIG.FONT_SIZE_THRESHOLD).toBeDefined();
      expect(PERFORMANCE_CONFIG.MAX_LOG_ELEMENT_LENGTH).toBeDefined();
      expect(PERFORMANCE_CONFIG.Z_INDEX_OVERLAY).toBeDefined();
    });

    test('should have valid numeric values', () => {
      const { PERFORMANCE_CONFIG } = config;

      expect(typeof PERFORMANCE_CONFIG.THROTTLE_DELAY).toBe('number');
      expect(typeof PERFORMANCE_CONFIG.FONT_SIZE_THRESHOLD).toBe('number');
      expect(typeof PERFORMANCE_CONFIG.MAX_LOG_ELEMENT_LENGTH).toBe('number');
      expect(typeof PERFORMANCE_CONFIG.Z_INDEX_OVERLAY).toBe('number');
    });

    test('should have reasonable performance values', () => {
      const { PERFORMANCE_CONFIG } = config;

      // Throttle delay should be between 100ms and 10s
      expect(PERFORMANCE_CONFIG.THROTTLE_DELAY).toBeGreaterThan(100);
      expect(PERFORMANCE_CONFIG.THROTTLE_DELAY).toBeLessThan(10000);

      // Font size should be reasonable (6-24px)
      expect(PERFORMANCE_CONFIG.FONT_SIZE_THRESHOLD).toBeGreaterThan(6);
      expect(PERFORMANCE_CONFIG.FONT_SIZE_THRESHOLD).toBeLessThan(24);

      // Z-index should be high enough
      expect(PERFORMANCE_CONFIG.Z_INDEX_OVERLAY).toBeGreaterThan(1000);
    });
  });

  describe('VISUAL_CONFIG export', () => {
    test('should export VISUAL_CONFIG with all required properties', () => {
      const { VISUAL_CONFIG } = config;

      expect(VISUAL_CONFIG).toBeDefined();
      expect(typeof VISUAL_CONFIG).toBe('object');

      expect(VISUAL_CONFIG.ERROR_COLOR).toBeDefined();
      expect(VISUAL_CONFIG.WARNING_COLOR).toBeDefined();
      expect(VISUAL_CONFIG.OVERLAY_OPACITY).toBeDefined();
      expect(VISUAL_CONFIG.BORDER_RADIUS).toBeDefined();
      expect(VISUAL_CONFIG.BORDER_WIDTH).toBeDefined();
      expect(VISUAL_CONFIG.STRIPE_GRADIENT).toBeDefined();
    });

    test('should have valid color values', () => {
      const { VISUAL_CONFIG } = config;

      // Colors should be hex or named colors
      expect(typeof VISUAL_CONFIG.ERROR_COLOR).toBe('string');
      expect(typeof VISUAL_CONFIG.WARNING_COLOR).toBe('string');
      expect(VISUAL_CONFIG.ERROR_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^[a-zA-Z]+$/);
      expect(VISUAL_CONFIG.WARNING_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^[a-zA-Z]+$/);
    });

    test('should have valid opacity value', () => {
      const { VISUAL_CONFIG } = config;

      expect(typeof VISUAL_CONFIG.OVERLAY_OPACITY).toBe('number');
      expect(VISUAL_CONFIG.OVERLAY_OPACITY).toBeGreaterThan(0);
      expect(VISUAL_CONFIG.OVERLAY_OPACITY).toBeLessThanOrEqual(1);
    });
  });

  describe('CHECK_CONFIG export', () => {
    test('should export CHECK_CONFIG with all boolean flags', () => {
      const { CHECK_CONFIG } = config;

      expect(CHECK_CONFIG).toBeDefined();
      expect(typeof CHECK_CONFIG).toBe('object');

      // All check flags should be boolean
      Object.values(CHECK_CONFIG).forEach(value => {
        expect(typeof value).toBe('boolean');
      });

      // Check specific flags exist
      expect(CHECK_CONFIG.ENABLE_FONT_SIZE_CHECK).toBeDefined();
      expect(CHECK_CONFIG.ENABLE_LANDMARK_CHECK).toBeDefined();
      expect(CHECK_CONFIG.ENABLE_ALT_TEXT_CHECK).toBeDefined();
    });
  });

  describe('Prohibited values arrays', () => {
    test('should export PROHIBITED_TABLE_SUMMARIES array', () => {
      const { PROHIBITED_TABLE_SUMMARIES } = config;

      expect(Array.isArray(PROHIBITED_TABLE_SUMMARIES)).toBe(true);
      expect(PROHIBITED_TABLE_SUMMARIES.length).toBeGreaterThan(0);

      // All entries should be strings
      PROHIBITED_TABLE_SUMMARIES.forEach(summary => {
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
      });

      // Should contain common layout indicators
      expect(PROHIBITED_TABLE_SUMMARIES).toContain('layout');
      expect(PROHIBITED_TABLE_SUMMARIES).toContain('Layout');
    });

    test('should export PROHIBITED_ALT_VALUES array', () => {
      const { PROHIBITED_ALT_VALUES } = config;

      expect(Array.isArray(PROHIBITED_ALT_VALUES)).toBe(true);
      expect(PROHIBITED_ALT_VALUES.length).toBeGreaterThan(0);

      PROHIBITED_ALT_VALUES.forEach(altValue => {
        expect(typeof altValue).toBe('string');
        expect(altValue.length).toBeGreaterThan(0);
      });

      // Should contain common unhelpful values
      expect(PROHIBITED_ALT_VALUES).toContain('image');
      expect(PROHIBITED_ALT_VALUES).toContain('photo');
    });

    test('should export PROHIBITED_LINK_TEXT array', () => {
      const { PROHIBITED_LINK_TEXT } = config;

      expect(Array.isArray(PROHIBITED_LINK_TEXT)).toBe(true);
      expect(PROHIBITED_LINK_TEXT.length).toBeGreaterThan(0);

      PROHIBITED_LINK_TEXT.forEach(linkText => {
        expect(typeof linkText).toBe('string');
        expect(linkText.length).toBeGreaterThan(0);
      });

      // Should contain generic link text
      expect(PROHIBITED_LINK_TEXT).toContain('click here');
      expect(PROHIBITED_LINK_TEXT).toContain('read more');
    });
  });

  describe('SELECTORS export', () => {
    test('should export SELECTORS with valid CSS selectors', () => {
      const { SELECTORS } = config;

      expect(typeof SELECTORS).toBe('object');
      expect(typeof SELECTORS.ALL_CHECKABLE_ELEMENTS).toBe('string');
      expect(typeof SELECTORS.LANDMARK_ELEMENTS).toBe('string');
      expect(typeof SELECTORS.OVERLAY_ELEMENTS).toBe('string');

      // Selectors should contain expected elements
      expect(SELECTORS.ALL_CHECKABLE_ELEMENTS).toContain('img');
      expect(SELECTORS.ALL_CHECKABLE_ELEMENTS).toContain('button');
      expect(SELECTORS.LANDMARK_ELEMENTS).toContain('main');
      expect(SELECTORS.LANDMARK_ELEMENTS).toContain('nav');
    });

    test('should have valid selector arrays', () => {
      const { SELECTORS } = config;

      expect(Array.isArray(SELECTORS.TEXT_ELEMENTS)).toBe(true);
      expect(Array.isArray(SELECTORS.INTERACTIVE_ELEMENTS)).toBe(true);

      SELECTORS.TEXT_ELEMENTS.forEach(element => {
        expect(typeof element).toBe('string');
        expect(element.length).toBeGreaterThan(0);
      });
    });
  });

  describe('MESSAGES export', () => {
    test('should export MESSAGES with all error messages', () => {
      const { MESSAGES } = config;

      expect(typeof MESSAGES).toBe('object');

      // Check key messages exist
      expect(MESSAGES.MISSING_ALT).toBeDefined();
      expect(MESSAGES.BUTTON_NO_LABEL).toBeDefined();
      expect(MESSAGES.FORM_FIELD_NO_LABEL).toBeDefined();

      // All messages should be strings
      Object.values(MESSAGES).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CSS_CLASSES export', () => {
    test('should export CSS_CLASSES with valid class names', () => {
      const { CSS_CLASSES } = config;

      expect(typeof CSS_CLASSES).toBe('object');
      expect(typeof CSS_CLASSES.ERROR_OVERLAY).toBe('string');
      expect(typeof CSS_CLASSES.WARNING_OVERLAY).toBe('string');

      // Should be valid CSS class names (no dots)
      expect(CSS_CLASSES.ERROR_OVERLAY).not.toMatch(/^\./);
      expect(CSS_CLASSES.WARNING_OVERLAY).not.toMatch(/^\./);
    });
  });

  describe('DEPRECATED_ELEMENTS export', () => {
    test('should export DEPRECATED_ELEMENTS array', () => {
      const { DEPRECATED_ELEMENTS } = config;

      expect(Array.isArray(DEPRECATED_ELEMENTS)).toBe(true);
      expect(DEPRECATED_ELEMENTS.length).toBeGreaterThan(0);

      DEPRECATED_ELEMENTS.forEach(element => {
        expect(typeof element).toBe('string');
        expect(element.length).toBeGreaterThan(0);
      });

      // Should contain known deprecated elements
      expect(DEPRECATED_ELEMENTS).toContain('font');
      expect(DEPRECATED_ELEMENTS).toContain('center');
    });
  });

  describe('User configuration exports', () => {
    test('should export USER_CONFIG with proper structure', () => {
      const { USER_CONFIG } = config;

      expect(typeof USER_CONFIG).toBe('object');
      expect(USER_CONFIG.enabledChecks).toBeDefined();
      expect(USER_CONFIG.visualSettings).toBeDefined();
      expect(USER_CONFIG.performanceSettings).toBeDefined();
    });

    test('should export DEFAULT_CONFIG with proper structure', () => {
      const { DEFAULT_CONFIG } = config;

      expect(typeof DEFAULT_CONFIG).toBe('object');
      expect(DEFAULT_CONFIG.enabledChecks).toBeDefined();
      expect(DEFAULT_CONFIG.visualSettings).toBeDefined();
      expect(DEFAULT_CONFIG.performanceSettings).toBeDefined();
    });

    test('should have matching structure between USER_CONFIG and DEFAULT_CONFIG', () => {
      const { USER_CONFIG, DEFAULT_CONFIG } = config;

      expect(Object.keys(USER_CONFIG)).toEqual(Object.keys(DEFAULT_CONFIG));
      expect(Object.keys(USER_CONFIG.enabledChecks)).toEqual(Object.keys(DEFAULT_CONFIG.enabledChecks));
    });
  });

  describe('Configuration integrity', () => {
    test('should not have null or undefined values in any export', () => {
      // Test all exports
      const _exports = [
        'PERFORMANCE_CONFIG',
        'VISUAL_CONFIG',
        'CHECK_CONFIG',
        'PROHIBITED_TABLE_SUMMARIES',
        'PROHIBITED_ALT_VALUES',
        'PROHIBITED_LINK_TEXT',
        'DEPRECATED_ELEMENTS',
        'SELECTORS',
        'MESSAGES',
        'CSS_CLASSES',
        'USER_CONFIG',
        'DEFAULT_CONFIG'
      ];

      exports.forEach(exportName => {
        const _exportValue = config[exportName];
        expect(exportValue).toBeDefined();
        expect(exportValue).not.toBeNull();
      });
    });

    test('should have consistent data types across configurations', () => {
      const { PERFORMANCE_CONFIG, VISUAL_CONFIG, CHECK_CONFIG } = config;

      // Performance values should all be numbers
      Object.values(PERFORMANCE_CONFIG).forEach(value => {
        expect(typeof value).toBe('number');
      });

      // Visual settings should be appropriate types
      expect(typeof VISUAL_CONFIG.ERROR_COLOR).toBe('string');
      expect(typeof VISUAL_CONFIG.WARNING_COLOR).toBe('string');
      expect(typeof VISUAL_CONFIG.OVERLAY_OPACITY).toBe('number');

      // Check flags should all be boolean
      Object.values(CHECK_CONFIG).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });

    test('should have immutable-like structure for prohibited arrays', () => {
      const { PROHIBITED_TABLE_SUMMARIES, PROHIBITED_ALT_VALUES, PROHIBITED_LINK_TEXT } = config;

      // Arrays should be populated and frozen-like in behavior
      expect(PROHIBITED_TABLE_SUMMARIES.length).toBeGreaterThan(0);
      expect(PROHIBITED_ALT_VALUES.length).toBeGreaterThan(0);
      expect(PROHIBITED_LINK_TEXT.length).toBeGreaterThan(0);

      // Should contain expected values
      expect(PROHIBITED_TABLE_SUMMARIES.some(s => s.toLowerCase().includes('layout'))).toBe(true);
      expect(PROHIBITED_ALT_VALUES.some(s => s.toLowerCase().includes('image'))).toBe(true);
      expect(PROHIBITED_LINK_TEXT.some(s => s.toLowerCase().includes('click'))).toBe(true);
    });
  });
});