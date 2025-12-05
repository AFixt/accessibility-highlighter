/**
 * Element Checker Function Tests
 * Tests individual element checking functions directly
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (callback) {callback({ isEnabled: false });}
        return Promise.resolve({ isEnabled: false });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {callback();}
        return Promise.resolve();
      })
    }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    lastError: null
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 123 }]),
    sendMessage: jest.fn()
  },
  action: {
    setIcon: jest.fn(),
    onClicked: { addListener: jest.fn() }
  }
};

// Mock window properties
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

// Import the content script
require('../src/contentScript.js');

describe('Element Checker Functions - Real Code Coverage', () => {
  let _mockElement;
  let originalDocument;

  const _ALL_CHECKABLE_ELEMENTS = 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]';
  const _LANDMARK_ELEMENTS = 'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]';

  describe('checkRoleBasedElement Function', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      global.logs = [];
      console.log = jest.fn();
    });

    test('should flag role="img" element without aria-label or aria-labelledby', () => {
      const imgDiv = document.createElement('div');
      imgDiv.setAttribute('role', 'img');
      document.body.appendChild(imgDiv);

      global.checkRoleBasedElement(imgDiv, 'img');

      expect(console.log).toHaveBeenCalledWith(imgDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should not flag role="img" element with aria-label', () => {
      const imgDiv = document.createElement('div');
      imgDiv.setAttribute('role', 'img');
      imgDiv.setAttribute('aria-label', 'A chart showing sales data');
      document.body.appendChild(imgDiv);

      global.checkRoleBasedElement(imgDiv, 'img');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should not flag role="img" element with aria-labelledby', () => {
      const caption = document.createElement('p');
      caption.id = 'img-caption';
      caption.textContent = 'Chart description';
      document.body.appendChild(caption);

      const imgDiv = document.createElement('div');
      imgDiv.setAttribute('role', 'img');
      imgDiv.setAttribute('aria-labelledby', 'img-caption');
      document.body.appendChild(imgDiv);

      global.checkRoleBasedElement(imgDiv, 'img');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should not flag role="img" element with aria-hidden="true"', () => {
      const imgDiv = document.createElement('div');
      imgDiv.setAttribute('role', 'img');
      imgDiv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(imgDiv);

      global.checkRoleBasedElement(imgDiv, 'img');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should flag role="button" element without label or text content', () => {
      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).toHaveBeenCalledWith(buttonDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should not flag role="button" element with text content', () => {
      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      buttonDiv.textContent = 'Click me';
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should not flag role="button" element with aria-label', () => {
      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      buttonDiv.setAttribute('aria-label', 'Submit form');
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should not flag role="button" element with aria-labelledby', () => {
      const label = document.createElement('span');
      label.id = 'btn-label';
      label.textContent = 'Save document';
      document.body.appendChild(label);

      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      buttonDiv.setAttribute('aria-labelledby', 'btn-label');
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should flag role="button" element with only whitespace text content', () => {
      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      buttonDiv.textContent = '   \n\t   ';
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).toHaveBeenCalledWith(buttonDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should flag role="link" element without label or text content', () => {
      const linkDiv = document.createElement('div');
      linkDiv.setAttribute('role', 'link');
      document.body.appendChild(linkDiv);

      global.checkRoleBasedElement(linkDiv, 'link');

      expect(console.log).toHaveBeenCalledWith(linkDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should not flag role="link" element with text content', () => {
      const linkDiv = document.createElement('div');
      linkDiv.setAttribute('role', 'link');
      linkDiv.textContent = 'Visit our homepage';
      document.body.appendChild(linkDiv);

      global.checkRoleBasedElement(linkDiv, 'link');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should not flag role="link" element with aria-label', () => {
      const linkDiv = document.createElement('div');
      linkDiv.setAttribute('role', 'link');
      linkDiv.setAttribute('aria-label', 'Go to home page');
      document.body.appendChild(linkDiv);

      global.checkRoleBasedElement(linkDiv, 'link');

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should handle undefined or unknown roles gracefully', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'unknown');
      document.body.appendChild(div);

      expect(() => {
        global.checkRoleBasedElement(div, 'unknown');
      }).not.toThrow();

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should handle null textContent for role="button"', () => {
      const buttonDiv = document.createElement('div');
      buttonDiv.setAttribute('role', 'button');
      Object.defineProperty(buttonDiv, 'textContent', {
        value: null,
        writable: true
      });
      document.body.appendChild(buttonDiv);

      global.checkRoleBasedElement(buttonDiv, 'button');

      expect(console.log).toHaveBeenCalledWith(buttonDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should handle null textContent for role="link"', () => {
      const linkDiv = document.createElement('div');
      linkDiv.setAttribute('role', 'link');
      Object.defineProperty(linkDiv, 'textContent', {
        value: null,
        writable: true
      });
      document.body.appendChild(linkDiv);

      global.checkRoleBasedElement(linkDiv, 'link');

      expect(console.log).toHaveBeenCalledWith(linkDiv);
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });
  });

  beforeEach(() => {
    // Clear logs
    if (global.logs) {
      global.logs.length = 0;
    }

    // Reset throttling
    if (global.resetThrottle) {
      global.resetThrottle();
    }

    // Create a more sophisticated mock element that behaves like a real DOM element
    _mockElement = {
      tagName: 'DIV',
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      hasAttribute: jest.fn(),
      id: '',
      textContent: '',
      innerHTML: '',
      style: {},
      getBoundingClientRect: jest.fn(() => ({
        top: 10, left: 10, width: 100, height: 50, right: 110, bottom: 60
      })),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      parentNode: null,
      matches: jest.fn(() => false)
    };

    // Save original document
    originalDocument = global.document;

    // Mock document methods
    global.document = {
      ...originalDocument,
      createElement: jest.fn(tag => ({
        ..._mockElement,
        tagName: tag.toUpperCase(),
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn()
        },
        style: {},
        setAttribute: jest.fn(),
        getAttribute: jest.fn()
      })),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      }
    };
  });

  afterEach(() => {
    // Restore original document
    global.document = originalDocument;
  });

  describe('checkImageElement function', () => {
    test('should detect image without alt attribute', () => {
      const imgElement = {
        ..._mockElement,
        tagName: 'IMG',
        hasAttribute: jest.fn(attr => attr !== 'alt'),
        getAttribute: jest.fn(attr => {
          if (attr === 'alt') {return null;}
          if (attr === 'src') {return 'test.jpg';}
          return null;
        })
      };

      // Test by calling runAccessibilityChecks with a controlled querySelectorAll
      global.document.querySelectorAll = jest.fn(selector => {
        // Handle the main selector used by runAccessibilityChecks
        if (selector === 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]') {
          return [imgElement];
        }
        if (selector.includes('img')) {return [imgElement];}
        return [];
      });

      global.runAccessibilityChecks();

      // Should have found the missing alt issue
      expect(global.logs.length).toBeGreaterThan(0);
      expect(global.logs.some(log => log.Message.includes('img does not have an alt attribute'))).toBe(true);
    });

    test('should detect uninformative alt text', () => {
      const imgElement = {
        ..._mockElement,
        tagName: 'IMG',
        hasAttribute: jest.fn(() => true),
        getAttribute: jest.fn(attr => {
          if (attr === 'alt') {return 'image';} // Uninformative
          if (attr === 'src') {return 'test.jpg';}
          return null;
        })
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector === 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]') {
          return [imgElement];
        }
        if (selector.includes('header') || selector.includes('nav') || selector.includes('main')) {
          return [];
        }
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Uninformative alt attribute'))).toBe(true);
    });

    test('should not flag images with good alt text', () => {
      const imgElement = {
        ..._mockElement,
        tagName: 'IMG',
        hasAttribute: jest.fn(() => true),
        getAttribute: jest.fn(attr => {
          if (attr === 'alt') {return 'A beautiful landscape photograph';}
          if (attr === 'src') {return 'test.jpg';}
          return null;
        })
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('img')) {return [imgElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.every(log => !log.Message.includes('img does not have an alt attribute'))).toBe(true);
    });
  });

  describe('checkButtonElement function', () => {
    test('should detect button without label', () => {
      const buttonElement = {
        ..._mockElement,
        tagName: 'BUTTON',
        textContent: '',
        getAttribute: jest.fn(() => null),
        hasAttribute: jest.fn(() => false)
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('button')) {return [buttonElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Button without aria-label'))).toBe(true);
    });

    test('should not flag button with text content', () => {
      const buttonElement = {
        ..._mockElement,
        tagName: 'BUTTON',
        textContent: 'Click me',
        getAttribute: jest.fn(() => null),
        hasAttribute: jest.fn(() => false)
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('button')) {return [buttonElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.every(log => !log.Message.includes('Button without aria-label'))).toBe(true);
    });

    test('should not flag button with aria-label', () => {
      const buttonElement = {
        ..._mockElement,
        tagName: 'BUTTON',
        textContent: '',
        getAttribute: jest.fn(attr => attr === 'aria-label' ? 'Close dialog' : null),
        hasAttribute: jest.fn(attr => attr === 'aria-label')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('button')) {return [buttonElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.every(log => !log.Message.includes('Button without aria-label'))).toBe(true);
    });
  });

  describe('checkLinkElement function', () => {
    test('should detect generic link text', () => {
      const linkElement = {
        ..._mockElement,
        tagName: 'A',
        textContent: 'click here',
        getAttribute: jest.fn(attr => {
          if (attr === 'href') {return '#';}
          return null;
        }),
        hasAttribute: jest.fn(attr => attr === 'href')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('a')) {return [linkElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Link element with matching text content'))).toBe(true);
    });

    test('should detect empty link', () => {
      const linkElement = {
        ..._mockElement,
        tagName: 'A',
        textContent: '',
        getAttribute: jest.fn(attr => {
          if (attr === 'href') {return '#';}
          return null;
        }),
        hasAttribute: jest.fn(attr => attr === 'href')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('a')) {return [linkElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Link without inner text'))).toBe(true);
    });

    test('should not flag descriptive links', () => {
      const linkElement = {
        ..._mockElement,
        tagName: 'A',
        textContent: 'Read our privacy policy',
        getAttribute: jest.fn(attr => {
          if (attr === 'href') {return '/privacy';}
          return null;
        }),
        hasAttribute: jest.fn(attr => attr === 'href')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('a')) {return [linkElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.every(log =>
        !log.Message.includes('Link element with matching text content') &&
        !log.Message.includes('Link without inner text')
      )).toBe(true);
    });
  });

  describe('checkInputElement function', () => {
    test('should detect input without label', () => {
      const inputElement = {
        ..._mockElement,
        tagName: 'INPUT',
        id: 'test-input',
        getAttribute: jest.fn(attr => {
          if (attr === 'type') {return 'text';}
          if (attr === 'id') {return 'test-input';}
          return null;
        }),
        hasAttribute: jest.fn(attr => attr === 'id')
      };

      // Mock document.querySelector to not find a label
      global.document.querySelector = jest.fn(() => null);
      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('input')) {return [inputElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Form field without a corresponding label'))).toBe(true);
    });

    test('should detect input type=image without alt', () => {
      const inputElement = {
        ..._mockElement,
        tagName: 'INPUT',
        getAttribute: jest.fn(attr => {
          if (attr === 'type') {return 'image';}
          return null;
        }),
        hasAttribute: jest.fn(() => false)
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('input')) {return [inputElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('input type=image without alt'))).toBe(true);
    });
  });

  describe('checkTableElement function', () => {
    test('should detect table without headers', () => {
      const tableElement = {
        ..._mockElement,
        tagName: 'TABLE',
        querySelector: jest.fn(() => null), // No th elements
        querySelectorAll: jest.fn(() => [])
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('table')) {return [tableElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('table without any th elements'))).toBe(true);
    });

    test('should detect nested tables', () => {
      const nestedTable = { tagName: 'TABLE' };
      const tableElement = {
        ..._mockElement,
        tagName: 'TABLE',
        querySelector: jest.fn(selector => {
          if (selector === 'th') {return { tagName: 'TH' };} // Has headers
          return null;
        }),
        querySelectorAll: jest.fn(selector => {
          if (selector === 'table') {return [nestedTable];} // Has nested table
          return [];
        })
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('table')) {return [tableElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Nested table elements'))).toBe(true);
    });
  });

  describe('checkIframeElement function', () => {
    test('should detect iframe without title', () => {
      const iframeElement = {
        ..._mockElement,
        tagName: 'IFRAME',
        getAttribute: jest.fn(() => null),
        hasAttribute: jest.fn(() => false)
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('iframe')) {return [iframeElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('iframe element without a title attribute'))).toBe(true);
    });

    test('should not flag iframe with title', () => {
      const iframeElement = {
        ..._mockElement,
        tagName: 'IFRAME',
        getAttribute: jest.fn(attr => attr === 'title' ? 'Content frame' : null),
        hasAttribute: jest.fn(attr => attr === 'title')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('iframe')) {return [iframeElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.every(log => !log.Message.includes('iframe element without a title attribute'))).toBe(true);
    });
  });

  describe('checkFieldsetElement function', () => {
    test('should detect fieldset without legend', () => {
      const fieldsetElement = {
        ..._mockElement,
        tagName: 'FIELDSET',
        querySelector: jest.fn(() => null) // No legend
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('fieldset')) {return [fieldsetElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('fieldset without legend'))).toBe(true);
    });
  });

  describe('checkMediaElement function', () => {
    test('should detect autoplay media', () => {
      const videoElement = {
        ..._mockElement,
        tagName: 'VIDEO',
        hasAttribute: jest.fn(attr => attr === 'autoplay'),
        getAttribute: jest.fn(() => null)
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('video') || selector.includes('audio')) {return [videoElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Media element set to autoplay'))).toBe(true);
    });
  });

  describe('checkTabIndexElement function', () => {
    test('should detect non-actionable element with positive tabindex', () => {
      const divElement = {
        ..._mockElement,
        tagName: 'DIV',
        getAttribute: jest.fn(attr => attr === 'tabindex' ? '1' : null),
        hasAttribute: jest.fn(attr => attr === 'tabindex'),
        matches: jest.fn(() => false) // Not an interactive element
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('tabindex')) {return [divElement];}
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('Non-actionable element with tabindex='))).toBe(true);
    });
  });

  describe('checkForLandmarks function', () => {
    test('should detect missing landmarks', () => {
      // Mock empty landmark search
      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('header') || selector.includes('nav') || selector.includes('main')) {
          return [];
        }
        return [];
      });

      global.runAccessibilityChecks();

      expect(global.logs.some(log => log.Message.includes('No landmark elements found'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should handle errors gracefully', () => {
      // Mock an element that throws an error
      const errorElement = {
        ..._mockElement,
        tagName: 'IMG',
        getAttribute: jest.fn(() => {
          throw new Error('Test error');
        })
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('img')) {return [errorElement];}
        return [];
      });

      // Should not throw
      expect(() => {
        global.runAccessibilityChecks();
      }).not.toThrow();

      // Should have logged the error
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration test with multiple elements', () => {
    test('should handle page with multiple different issues', () => {
      const imgElement = {
        ..._mockElement,
        tagName: 'IMG',
        hasAttribute: jest.fn(() => false),
        getAttribute: jest.fn(() => null)
      };

      const buttonElement = {
        ..._mockElement,
        tagName: 'BUTTON',
        textContent: '',
        getAttribute: jest.fn(() => null),
        hasAttribute: jest.fn(() => false)
      };

      const linkElement = {
        ..._mockElement,
        tagName: 'A',
        textContent: 'click here',
        getAttribute: jest.fn(attr => attr === 'href' ? '#' : null),
        hasAttribute: jest.fn(attr => attr === 'href')
      };

      global.document.querySelectorAll = jest.fn(selector => {
        if (selector.includes('img')) {return [imgElement];}
        if (selector.includes('button')) {return [buttonElement];}
        if (selector.includes('a')) {return [linkElement];}
        return [];
      });

      global.runAccessibilityChecks();

      // Should find multiple different types of issues
      expect(global.logs.length).toBeGreaterThan(2);
      expect(global.logs.some(log => log.Message.includes('img does not have an alt attribute'))).toBe(true);
      expect(global.logs.some(log => log.Message.includes('Button without aria-label'))).toBe(true);
      expect(global.logs.some(log => log.Message.includes('Link element with matching text content'))).toBe(true);
    });
  });
});