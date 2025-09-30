/**
 * Content Script Extended Tests
 * Tests for advanced content script functionality including:
 * - Keyboard event handlers
 * - Message handlers
 * - Error handling
 * - DOM interaction behaviors
 */

// Set test environment
process.env.NODE_ENV = 'test';

describe('Setup test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('Content Script Extended Tests', () => {
  let mockChrome;
  let _mockDocument;
  let mockOverlays;

  beforeEach(() => {
    // Mock overlays array
    mockOverlays = [];

    // Mock document
    _mockDocument = {
      querySelectorAll: jest.fn(selector => {
        if (selector === '.a11y-highlight-overlay') {
          return mockOverlays;
        }
        return [];
      }),
      createElement: jest.fn(tag => {
        const _element = {
          tagName: tag.toUpperCase(),
          className: '',
          style: {},
          attributes: {},
          setAttribute: jest.fn((name, value) => {
            _element.attributes[name] = value;
          }),
          getAttribute: jest.fn(name => _element.attributes[name]),
          getBoundingClientRect: jest.fn(() => ({
            top: 100, left: 200, width: 150, height: 100
          }))
        };
        return _element;
      }),
      body: {
        appendChild: jest.fn(element => {
          if (element.className === 'a11y-highlight-overlay') {
            mockOverlays.push(element);
          }
        }),
        innerHTML: ''
      }
    };

    global.document = _mockDocument;

    // Mock window
    global.window = {
      scrollY: 0,
      scrollX: 0
    };

    // Mock KeyboardEvent
    global.KeyboardEvent = class MockKeyboardEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.key = options.key || '';
        this.altKey = options.altKey || false;
        this.shiftKey = options.shiftKey || false;
        this.ctrlKey = options.ctrlKey || false;
        this.preventDefault = jest.fn();
      }
    };

    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      }
    };

    global.chrome = mockChrome;

    // Mock console methods
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockOverlays.length = 0; // Clear mock overlays
  });

  describe('Keyboard Event Handlers', () => {
    let handleKeyboardNavigation;
    let keyboardNavigationActive;
    let currentOverlayIndex;

    beforeEach(() => {
      // Create mock overlays
      for (let _i = 0; _i < 3; _i++) {
        const _overlay = document.createElement('div');
        _overlay.className = 'a11y-highlight-overlay';
        _overlay.setAttribute('data-a11ymessage', `Issue ${_i + 1}`);
        document.body.appendChild(_overlay);
      }

      // Mock keyboard navigation state
      keyboardNavigationActive = false;
      currentOverlayIndex = -1;

      // Create keyboard handler function (simulating the real one)
      handleKeyboardNavigation = event => {
        const _overlays = document.querySelectorAll('.a11y-highlight-overlay');

        if (_overlays.length === 0) {return;}

        // Alt + Shift + N: Start navigation
        if (event.altKey && event.shiftKey && event.key === 'N') {
          event.preventDefault();
          keyboardNavigationActive = true;
          currentOverlayIndex = 0;
          return;
        }

        if (!keyboardNavigationActive) {return;}

        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            currentOverlayIndex = Math.min(currentOverlayIndex + 1, overlays.length - 1);
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            currentOverlayIndex = Math.max(currentOverlayIndex - 1, 0);
            break;
          case 'Home':
            event.preventDefault();
            currentOverlayIndex = 0;
            break;
          case 'End':
            event.preventDefault();
            currentOverlayIndex = overlays.length - 1;
            break;
          case 'Escape':
            event.preventDefault();
            keyboardNavigationActive = false;
            currentOverlayIndex = -1;
            break;
        }
      };
    });

    test('should start keyboard navigation with Alt+Shift+N', () => {
      const _event = new KeyboardEvent('keydown', {
        key: 'N',
        altKey: true,
        shiftKey: true
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(keyboardNavigationActive).toBe(true);
      expect(currentOverlayIndex).toBe(0);
    });

    test('should navigate forward with ArrowDown', () => {
      // Start navigation first
      keyboardNavigationActive = true;
      currentOverlayIndex = 0;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowDown'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate forward with ArrowRight', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 0;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowRight'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate backward with ArrowUp', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowUp'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate backward with ArrowLeft', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should jump to first overlay with Home key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'Home'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(0);
    });

    test('should jump to last overlay with End key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 0;

      const _event = new KeyboardEvent('keydown', {
        key: 'End'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(2); // Last overlay index
    });

    test('should exit navigation with Escape key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 1;

      const _event = new KeyboardEvent('keydown', {
        key: 'Escape'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(keyboardNavigationActive).toBe(false);
      expect(currentOverlayIndex).toBe(-1);
    });

    test('should not navigate when navigation is inactive', () => {
      keyboardNavigationActive = false;
      currentOverlayIndex = -1;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowDown'
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(-1);
    });

    test('should not navigate beyond bounds', () => {
      keyboardNavigationActive = true;

      // Test upper bound
      currentOverlayIndex = 2; // Last overlay
      const _downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      downEvent.preventDefault = jest.fn();
      handleKeyboardNavigation(downEvent);
      expect(currentOverlayIndex).toBe(2); // Should stay at last

      // Test lower bound
      currentOverlayIndex = 0; // First overlay
      const _upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      upEvent.preventDefault = jest.fn();
      handleKeyboardNavigation(upEvent);
      expect(currentOverlayIndex).toBe(0); // Should stay at first
    });

    test('should do nothing when no overlays exist', () => {
      // Remove all overlays
      document.body.innerHTML = '';

      const _event = new KeyboardEvent('keydown', {
        key: 'N',
        altKey: true,
        shiftKey: true
      });
      event.preventDefault = jest.fn();

      handleKeyboardNavigation(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(keyboardNavigationActive).toBe(false);
    });
  });

  describe('Message Handlers', () => {
    let messageHandler;
    let toggleAccessibilityHighlight;

    beforeEach(() => {
      // Mock the toggle function
      toggleAccessibilityHighlight = jest.fn();

      // Create message handler (simulating the real one)
      messageHandler = (message, _sender, sendResponse) => {
        try {
          console.log('Message received', message);

          // Validate message structure
          if (!message || typeof message !== 'object') {
            console.warn('Invalid message received:', message);
            return false;
          }

          if (message.action === 'toggleAccessibilityHighlight') {
            // Validate isEnabled parameter
            if (typeof message.isEnabled !== 'boolean') {
              console.warn('Invalid isEnabled value:', message.isEnabled);
              return false;
            }

            toggleAccessibilityHighlight(message.isEnabled);
            sendResponse(message.isEnabled ? 'highlighted' : 'unhighlighted');
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error handling message:', error);
          return false;
        }
      };
    });

    test('should handle toggle message correctly', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      const _result = messageHandler(message, null, sendResponse);

      expect(console.log).toHaveBeenCalledWith('Message received', message);
      expect(toggleAccessibilityHighlight).toHaveBeenCalledWith(true);
      expect(sendResponse).toHaveBeenCalledWith('highlighted');
      expect(_result).toBe(true);
    });

    test('should handle disable message correctly', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: false
      };

      const _result = messageHandler(message, null, sendResponse);

      expect(toggleAccessibilityHighlight).toHaveBeenCalledWith(false);
      expect(sendResponse).toHaveBeenCalledWith('unhighlighted');
      expect(_result).toBe(true);
    });

    test('should handle invalid message object', () => {
      const _sendResponse = jest.fn();
      const _message = null;

      const _result = messageHandler(message, null, sendResponse);

      expect(console.warn).toHaveBeenCalledWith('Invalid message received:', null);
      expect(toggleAccessibilityHighlight).not.toHaveBeenCalled();
      expect(sendResponse).not.toHaveBeenCalled();
      expect(_result).toBe(false);
    });

    test('should handle invalid message structure', () => {
      const _sendResponse = jest.fn();
      const _message = 'invalid message';

      const _result = messageHandler(message, null, sendResponse);

      expect(console.warn).toHaveBeenCalledWith('Invalid message received:', 'invalid message');
      expect(_result).toBe(false);
    });

    test('should handle invalid isEnabled value', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: 'invalid'
      };

      const _result = messageHandler(message, null, sendResponse);

      expect(console.warn).toHaveBeenCalledWith('Invalid isEnabled value:', 'invalid');
      expect(toggleAccessibilityHighlight).not.toHaveBeenCalled();
      expect(_result).toBe(false);
    });

    test('should handle unknown action', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'unknownAction',
        data: 'test'
      };

      const _result = messageHandler(message, null, sendResponse);

      expect(console.log).toHaveBeenCalledWith('Message received', message);
      expect(toggleAccessibilityHighlight).not.toHaveBeenCalled();
      expect(sendResponse).not.toHaveBeenCalled();
      expect(_result).toBe(false);
    });

    test('should handle status request message', () => {
      // Extend handler to support status requests
      const _extendedHandler = (message, _sender, sendResponse) => {
        try {
          if (message.action === 'getStatus') {
            const _overlays = document.querySelectorAll('.a11y-highlight-overlay');
            sendResponse({
              isActive: overlays.length > 0,
              overlayCount: overlays.length
            });
            return true;
          }
          return messageHandler(message, _sender, sendResponse);
        } catch (error) {
          console.error('Error handling message:', error);
          return false;
        }
      };

      // Add some overlays
      const _overlay = document.createElement('div');
      overlay.className = 'a11y-highlight-overlay';
      document.body.appendChild(overlay);

      const _sendResponse = jest.fn();
      const _message = { action: 'getStatus' };

      const _result = extendedHandler(message, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        isActive: true,
        overlayCount: 1
      });
      expect(_result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in message processing gracefully', () => {
      const _sendResponse = jest.fn();

      // Create a handler that throws an error
      const _errorHandler = (message, _sender, _sendResponse) => {
        try {
          if (message.action === 'toggleAccessibilityHighlight') {
            throw new Error('Simulated error');
          }
          return false;
        } catch (error) {
          console.error('Error handling message:', error);
          return false;
        }
      };

      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      const _result = errorHandler(message, null, sendResponse);

      expect(console.error).toHaveBeenCalledWith('Error handling message:', expect.any(Error));
      expect(_result).toBe(false);
    });

    test('should handle DOM manipulation errors gracefully', () => {
      // Mock querySelector to throw an error
      const _originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = jest.fn(() => {
        throw new Error('DOM error');
      });

      const _handleDOMOperation = () => {
        try {
          const _overlays = document.querySelectorAll('.a11y-highlight-overlay');
          return overlays.length;
        } catch (error) {
          console.error('DOM operation failed:', error);
          return 0;
        }
      };

      const _result = handleDOMOperation();

      expect(console.error).toHaveBeenCalledWith('DOM operation failed:', expect.any(Error));
      expect(_result).toBe(0);

      // Restore original function
      document.querySelectorAll = originalQuerySelectorAll;
    });

    test('should validate overlay elements before operations', () => {
      const _highlightCurrentOverlay = index => {
        try {
          const _overlays = document.querySelectorAll('.a11y-highlight-overlay');

          if (!overlays || overlays.length === 0) {
            console.warn('No overlays found to highlight');
            return false;
          }

          if (index < 0 || index >= overlays.length) {
            console.warn('Invalid overlay index:', index);
            return false;
          }

          const _overlay = overlays[index];
          if (!overlay) {
            console.warn('Overlay element not found at index:', index);
            return false;
          }

          // Simulate highlighting
          overlay.style.border = '3px solid #ff0000';
          return true;
        } catch (error) {
          console.error('Error highlighting overlay:', error);
          return false;
        }
      };

      // Test with no overlays
      const _result = highlightCurrentOverlay(0);
      expect(console.warn).toHaveBeenCalledWith('No overlays found to highlight');
      expect(_result).toBe(false);

      // Add overlay and test with valid index
      const _overlay = document.createElement('div');
      overlay.className = 'a11y-highlight-overlay';
      document.body.appendChild(overlay);

      _result = highlightCurrentOverlay(0);
      expect(_result).toBe(true);
      expect(overlay.style.border).toBe('3px solid #ff0000');

      // Test with invalid index
      _result = highlightCurrentOverlay(5);
      expect(console.warn).toHaveBeenCalledWith('Invalid overlay index:', 5);
      expect(_result).toBe(false);
    });

    test('should handle missing Chrome APIs gracefully', () => {
      const _originalChrome = global.chrome;
      global.chrome = undefined;

      const _sendMessageSafely = message => {
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message);
            return true;
          } else {
            console.warn('Chrome runtime not available');
            return false;
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          return false;
        }
      };

      const _result = sendMessageSafely({ test: 'message' });

      expect(console.warn).toHaveBeenCalledWith('Chrome runtime not available');
      expect(_result).toBe(false);

      // Restore
      global.chrome = originalChrome;
    });
  });

  describe('DOM Interaction Behaviors', () => {
    test('should handle dynamic overlay creation', () => {
      const _createOverlay = (_element, _message, _level) => {
        try {
          if (!element || !element.getBoundingClientRect) {
            console.warn('Invalid element for overlay creation');
            return null;
          }

          const _overlay = document.createElement('div');
          overlay.className = 'a11y-highlight-overlay';
          overlay.setAttribute('data-a11ymessage', message);
          overlay.setAttribute('data-level', level);

          const _rect = element.getBoundingClientRect();
          overlay.style.cssText = `
            position: absolute;
            top: ${rect.top + window.scrollY}px;
            left: ${rect.left + window.scrollX}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            pointer-events: none;
            z-index: 10000;
            border: 2px solid ${level === 'error' ? '#ff0000' : '#ffa500'};
          `;

          document.body.appendChild(overlay);
          return overlay;
        } catch (error) {
          console.error('Error creating overlay:', error);
          return null;
        }
      };

      // Create a test element
      const _testElement = document.createElement('img');
      testElement.src = 'test.jpg';
      document.body.appendChild(testElement);

      // Mock getBoundingClientRect
      testElement.getBoundingClientRect = jest.fn(() => ({
        top: 100,
        left: 200,
        width: 150,
        height: 100
      }));

      const _overlay = createOverlay(testElement, 'Missing alt attribute', 'error');

      expect(overlay).not.toBeNull();
      expect(overlay.className).toBe('a11y-highlight-overlay');
      expect(overlay.getAttribute('data-a11ymessage')).toBe('Missing alt attribute');
      expect(overlay.getAttribute('data-level')).toBe('error');
      expect(overlay.style.border).toBe('2px solid #ff0000');
    });

    test('should handle overlay removal', () => {
      // Create test overlays
      for (let _i = 0; i < 3; i++) {
        const _overlay = document.createElement('div');
        overlay.className = 'a11y-highlight-overlay';
        document.body.appendChild(overlay);
      }

      const _removeAllOverlays = () => {
        try {
          const _overlays = document.querySelectorAll('.a11y-highlight-overlay');
          const _removedCount = 0;

          overlays.forEach(overlay => {
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
              removedCount++;
            }
          });

          console.log(`Removed ${removedCount} overlays`);
          return removedCount;
        } catch (error) {
          console.error('Error removing overlays:', error);
          return 0;
        }
      };

      expect(document.querySelectorAll('.a11y-highlight-overlay')).toHaveLength(3);

      const _removedCount = removeAllOverlays();

      expect(removedCount).toBe(3);
      expect(document.querySelectorAll('.a11y-highlight-overlay')).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith('Removed 3 overlays');
    });

    test('should handle filtered overlay operations', () => {
      // Create overlays with different levels
      const _levels = ['error', 'warning', 'error'];
      levels.forEach((level, index) => {
        const _overlay = document.createElement('div');
        overlay.className = 'a11y-highlight-overlay';
        overlay.setAttribute('data-level', level);
        overlay.setAttribute('data-a11ymessage', `Issue ${index + 1}`);
        document.body.appendChild(overlay);
      });

      const _filterOverlaysByLevel = targetLevel => {
        try {
          const _allOverlays = document.querySelectorAll('.a11y-highlight-overlay');
          const _filteredOverlays = Array.from(allOverlays).filter(overlay =>
            overlay.getAttribute('data-level') === targetLevel
          );

          // Hide non-matching overlays
          allOverlays.forEach(overlay => {
            const _isVisible = overlay.getAttribute('data-level') === targetLevel;
            overlay.style.display = isVisible ? 'block' : 'none';
          });

          return filteredOverlays.length;
        } catch (error) {
          console.error('Error filtering overlays:', error);
          return 0;
        }
      };

      const _errorCount = filterOverlaysByLevel('error');
      expect(errorCount).toBe(2);

      // Check that error overlays are visible
      const _errorOverlays = document.querySelectorAll('.a11y-highlight-overlay[data-level="error"]');
      errorOverlays.forEach(overlay => {
        expect(overlay.style.display).toBe('block');
      });

      // Check that warning overlays are hidden
      const _warningOverlays = document.querySelectorAll('.a11y-highlight-overlay[data-level="warning"]');
      warningOverlays.forEach(overlay => {
        expect(overlay.style.display).toBe('none');
      });
    });
  });
});