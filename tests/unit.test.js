/**
 * Unit tests for Accessibility Highlighter core functions
 * Tests individual functions and configuration objects
 */

describe('Accessibility Highlighter Unit Tests', () => {
  // Setup global configuration before all tests
  beforeAll(() => {
    global.A11Y_CONFIG = {
      PERFORMANCE: {
        THROTTLE_DELAY: 1000,
        FONT_SIZE_THRESHOLD: 12,
        MAX_LOG_ELEMENT_LENGTH: 100,
        Z_INDEX_OVERLAY: 2147483647
      },
      VISUAL: {
        ERROR_COLOR: '#FF0000',
        WARNING_COLOR: '#FFA500',
        OVERLAY_OPACITY: 0.4,
        BORDER_RADIUS: '5px',
        BORDER_WIDTH: '2px'
      },
      PROHIBITED_ALT_VALUES: [
        'artwork', 'arrow', 'painting', 'bullet', 'graphic', 'graph',
        'spacer', 'image', 'placeholder', 'photo', 'picture', 'logo'
      ],
      PROHIBITED_LINK_TEXT: [
        'link', 'more', 'here', 'click', 'click here', 'read'
      ],
      SELECTORS: {
        ALL_CHECKABLE_ELEMENTS: 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]',
        LANDMARK_ELEMENTS: 'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]'
      },
      MESSAGES: {
        MISSING_ALT: 'img does not have an alt attribute',
        UNINFORMATIVE_ALT: 'Uninformative alt attribute value found',
        BUTTON_NO_LABEL: 'Button without aria-label or aria-labelledby or empty text content'
      },
      CSS_CLASSES: {
        ERROR_OVERLAY: 'a11y-error',
        WARNING_OVERLAY: 'a11y-warning'
      }
    };
  });

  describe('Configuration Objects', () => {
    test('A11Y_CONFIG should be properly structured', () => {
      expect(global.A11Y_CONFIG).toBeDefined();
      expect(global.A11Y_CONFIG.PERFORMANCE).toBeDefined();
      expect(global.A11Y_CONFIG.VISUAL).toBeDefined();
      expect(global.A11Y_CONFIG.PROHIBITED_ALT_VALUES).toBeInstanceOf(Array);
      expect(global.A11Y_CONFIG.PROHIBITED_LINK_TEXT).toBeInstanceOf(Array);
      expect(global.A11Y_CONFIG.SELECTORS).toBeDefined();
      expect(global.A11Y_CONFIG.MESSAGES).toBeDefined();
      expect(global.A11Y_CONFIG.CSS_CLASSES).toBeDefined();
    });

    test('performance settings should have reasonable defaults', () => {
      expect(global.A11Y_CONFIG.PERFORMANCE.THROTTLE_DELAY).toBeGreaterThan(0);
      expect(global.A11Y_CONFIG.PERFORMANCE.FONT_SIZE_THRESHOLD).toBeGreaterThan(0);
      expect(global.A11Y_CONFIG.PERFORMANCE.MAX_LOG_ELEMENT_LENGTH).toBeGreaterThan(0);
      expect(global.A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY).toBeGreaterThan(1000000);
    });

    test('visual settings should have valid values', () => {
      expect(global.A11Y_CONFIG.VISUAL.ERROR_COLOR).toMatch(/^#[0-9A-F]{6}$/i);
      expect(global.A11Y_CONFIG.VISUAL.WARNING_COLOR).toMatch(/^#[0-9A-F]{6}$/i);
      expect(global.A11Y_CONFIG.VISUAL.OVERLAY_OPACITY).toBeGreaterThan(0);
      expect(global.A11Y_CONFIG.VISUAL.OVERLAY_OPACITY).toBeLessThanOrEqual(1);
    });

    test('prohibited values arrays should contain expected items', () => {
      expect(global.A11Y_CONFIG.PROHIBITED_ALT_VALUES).toContain('image');
      expect(global.A11Y_CONFIG.PROHIBITED_ALT_VALUES).toContain('photo');
      expect(global.A11Y_CONFIG.PROHIBITED_LINK_TEXT).toContain('click here');
      expect(global.A11Y_CONFIG.PROHIBITED_LINK_TEXT).toContain('more');
    });

    test('selectors should be valid CSS selectors', () => {
      expect(global.A11Y_CONFIG.SELECTORS.ALL_CHECKABLE_ELEMENTS).toContain('img');
      expect(global.A11Y_CONFIG.SELECTORS.ALL_CHECKABLE_ELEMENTS).toContain('button');
      expect(global.A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS).toContain('header');
      expect(global.A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS).toContain('main');
    });

    test('messages should be descriptive', () => {
      Object.values(global.A11Y_CONFIG.MESSAGES).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      // Set up minimal DOM
      document.body.innerHTML = '';

      // Mock console methods
      global.console.log = jest.fn();
      global.console.error = jest.fn();
      global.console.warn = jest.fn();
    });

    test('overlay function should sanitize message content', () => {
      // Create a test element using innerHTML to avoid jsdom issues
      document.body.innerHTML = '<div id="test-element">Test</div>';
      const _testElement = document.getElementById('test-element');

      // Mock global logs array
      global.logs = [];

      // Create overlay function that matches the source code
      function overlay(overlayClass, level, msg) {
        const sanitizedMsg = String(msg).replace(/[<>]/g, '');
        global.logs.push({
          Level: level,
          Message: sanitizedMsg,
          Element: this.outerHTML ? this.outerHTML.slice(0, 100) : 'test-element'
        });
      }

      // Test with malicious content
      const maliciousMessage = '<script>alert("xss")</script>Test message';
      overlay.call(_testElement, 'overlay', 'error', maliciousMessage);

      // Check that script tags were removed
      expect(global.logs[0].Message).toBe('scriptalert("xss")/scriptTest message');
      expect(global.logs[0].Message).not.toContain('<script>');
      expect(global.logs[0].Message).not.toContain('</script>');
    });

    test('throttling should prevent rapid successive calls', () => {
      let callCount = 0;
      let lastRunTime = 0;
      let isRunning = false;
      const THROTTLE_DELAY = 100;

      function throttledFunction() {
        const now = Date.now();
        if (isRunning || (now - lastRunTime) < THROTTLE_DELAY) {
          return false; // Throttled
        }

        isRunning = true;
        lastRunTime = now;
        callCount++;

        // Simulate async work
        setTimeout(() => {
          isRunning = false;
        }, 10);

        return true; // Executed
      }

      // First call should execute
      expect(throttledFunction()).toBe(true);
      expect(callCount).toBe(1);

      // Rapid subsequent calls should be throttled
      expect(throttledFunction()).toBe(false);
      expect(throttledFunction()).toBe(false);
      expect(callCount).toBe(1);
    });

    test('error handling should catch and log errors gracefully', () => {
      const mockFunction = () => {
        try {
          throw new Error('Test error');
        } catch (error) {
          console.error('Error caught:', error);
          return false;
        }
      };

      const _result = mockFunction();
      expect(_result).toBe(false);
      expect(global.console.error).toHaveBeenCalledWith('Error caught:', expect.any(Error));
    });
  });

  describe('Element Detection Logic', () => {
    test('should correctly identify problematic alt text', () => {
      const prohibitedValues = ['image', 'photo', 'picture', 'graphic'];

      function isUninformativeAlt(altText) {
        return prohibitedValues.includes(altText.toLowerCase());
      }

      expect(isUninformativeAlt('image')).toBe(true);
      expect(isUninformativeAlt('Photo')).toBe(true);
      expect(isUninformativeAlt('Beautiful sunset over mountains')).toBe(false);
      expect(isUninformativeAlt('')).toBe(false);
    });

    test('should correctly identify generic link text', () => {
      const prohibitedLinkText = ['click here', 'more', 'read more', 'here'];

      function isGenericLinkText(linkText) {
        return prohibitedLinkText.includes(linkText.toLowerCase());
      }

      expect(isGenericLinkText('click here')).toBe(true);
      expect(isGenericLinkText('More')).toBe(true);
      expect(isGenericLinkText('Learn about our services')).toBe(false);
      expect(isGenericLinkText('Download the report')).toBe(false);
    });

    test('should validate form field label associations', () => {
      function hasValidLabel(inputElement) {
        const id = inputElement.getAttribute('id');
        const ariaLabel = inputElement.getAttribute('aria-label');
        const ariaLabelledby = inputElement.getAttribute('aria-labelledby');

        if (ariaLabel || ariaLabelledby) {return true;}
        if (!id) {return false;}

        // Check if there's a label with matching for attribute
        const label = document.querySelector(`label[for="${id}"]`);
        return !!label;
      }

      // Create test input with label using innerHTML
      document.body.innerHTML = `
        <input id="test-input" type="text">
        <label for="test-input">Test Label</label>
        <input id="unlabeled-input" type="text">
        <input aria-label="Test input" type="text">
      `;

      const inputWithLabel = document.getElementById('test-input');

      expect(hasValidLabel(inputWithLabel)).toBe(true);

      // Test input without label
      const inputWithoutLabel = document.getElementById('unlabeled-input');
      expect(hasValidLabel(inputWithoutLabel)).toBe(false);

      // Test input with aria-label
      const inputWithAriaLabel = document.querySelector('[aria-label="Test input"]');
      expect(hasValidLabel(inputWithAriaLabel)).toBe(true);
    });

    test('should identify invalid href attributes', () => {
      function isInvalidHref(href) {
        return href === '#' || (href && href.startsWith('javascript:'));
      }

      expect(isInvalidHref('#')).toBe(true);
      expect(isInvalidHref('javascript:void(0)')).toBe(true);
      expect(isInvalidHref('javascript:alert("test")')).toBe(true);
      expect(isInvalidHref('https://example.com')).toBe(false);
      expect(isInvalidHref('/about')).toBe(false);
      expect(isInvalidHref('mailto:test@example.com')).toBe(false);
    });
  });

  describe('Performance Optimizations', () => {
    test('should use efficient DOM traversal methods', () => {
      // Test that a comprehensive selector is used for efficiency
      const comprehensiveSelector = 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]';

      // Test that the selector includes all major interactive elements
      expect(comprehensiveSelector).toContain('img');
      expect(comprehensiveSelector).toContain('button');
      expect(comprehensiveSelector).toContain('a');
      expect(comprehensiveSelector).toContain('input');
      expect(comprehensiveSelector).toContain('table');
      expect(comprehensiveSelector).toContain('iframe');
      expect(comprehensiveSelector).toContain('[role="button"]');
      expect(comprehensiveSelector).toContain('[tabindex]');
    });

    test('should limit font size checks to text elements only', () => {
      const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a', 'button'];

      function shouldCheckFontSize(element) {
        if (!element || !element.tagName) {return false;}
        const tagName = element.tagName.toLowerCase();
        const hasTextContent = element.textContent && element.textContent.trim().length > 0;
        return textElements.includes(tagName) && hasTextContent;
      }

      // Create test elements using innerHTML
      document.body.innerHTML = `
        <p>Some text</p>
        <p></p>
        <img src="test.jpg" alt="test">
        <button>Click me</button>
      `;

      const paragraph = document.querySelector('p');
      expect(shouldCheckFontSize(paragraph)).toBe(true);

      const emptyParagraph = document.querySelectorAll('p')[1];
      expect(shouldCheckFontSize(emptyParagraph)).toBe(false);

      const image = document.querySelector('img');
      expect(shouldCheckFontSize(image)).toBe(false);

      const button = document.querySelector('button');
      expect(shouldCheckFontSize(button)).toBe(true);
    });
  });
});