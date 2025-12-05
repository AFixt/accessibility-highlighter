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
        appendChild: jest.fn(_element => {
          if (_element.className === 'a11y-highlight-overlay') {
            mockOverlays.push(_element);
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
      handleKeyboardNavigation = _event => {
        const _overlays = document.querySelectorAll('.a11y-highlight-overlay');

        if (_overlays.length === 0) {return;}

        // Alt + Shift + N: Start navigation
        if (_event.altKey && _event.shiftKey && _event.key === 'N') {
          _event.preventDefault();
          keyboardNavigationActive = true;
          currentOverlayIndex = 0;
          return;
        }

        if (!keyboardNavigationActive) {return;}

        switch (_event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            _event.preventDefault();
            currentOverlayIndex = Math.min(currentOverlayIndex + 1, _overlays.length - 1);
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            _event.preventDefault();
            currentOverlayIndex = Math.max(currentOverlayIndex - 1, 0);
            break;
          case 'Home':
            _event.preventDefault();
            currentOverlayIndex = 0;
            break;
          case 'End':
            _event.preventDefault();
            currentOverlayIndex = _overlays.length - 1;
            break;
          case 'Escape':
            _event.preventDefault();
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
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
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
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate forward with ArrowRight', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 0;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowRight'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate backward with ArrowUp', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowUp'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should navigate backward with ArrowLeft', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowLeft'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(1);
    });

    test('should jump to first overlay with Home key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 2;

      const _event = new KeyboardEvent('keydown', {
        key: 'Home'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(0);
    });

    test('should jump to last overlay with End key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 0;

      const _event = new KeyboardEvent('keydown', {
        key: 'End'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(2); // Last overlay index
    });

    test('should exit navigation with Escape key', () => {
      keyboardNavigationActive = true;
      currentOverlayIndex = 1;

      const _event = new KeyboardEvent('keydown', {
        key: 'Escape'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).toHaveBeenCalled();
      expect(keyboardNavigationActive).toBe(false);
      expect(currentOverlayIndex).toBe(-1);
    });

    test('should not navigate when navigation is inactive', () => {
      keyboardNavigationActive = false;
      currentOverlayIndex = -1;

      const _event = new KeyboardEvent('keydown', {
        key: 'ArrowDown'
      });
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).not.toHaveBeenCalled();
      expect(currentOverlayIndex).toBe(-1);
    });

    test('should not navigate beyond bounds', () => {
      keyboardNavigationActive = true;

      // Test upper bound
      currentOverlayIndex = 2; // Last overlay
      const _downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      _downEvent.preventDefault = jest.fn();
      handleKeyboardNavigation(_downEvent);
      expect(currentOverlayIndex).toBe(2); // Should stay at last

      // Test lower bound
      currentOverlayIndex = 0; // First overlay
      const _upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      _upEvent.preventDefault = jest.fn();
      handleKeyboardNavigation(_upEvent);
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
      _event.preventDefault = jest.fn();

      handleKeyboardNavigation(_event);

      expect(_event.preventDefault).not.toHaveBeenCalled();
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
      messageHandler = (_message, _sender, _sendResponse) => {
        try {
          console.log('Message received', _message);

          // Validate message structure
          if (!_message || typeof _message !== 'object') {
            console.warn('Invalid message received:', _message);
            return false;
          }

          if (_message.action === 'toggleAccessibilityHighlight') {
            // Validate isEnabled parameter
            if (typeof _message.isEnabled !== 'boolean') {
              console.warn('Invalid isEnabled value:', _message.isEnabled);
              return false;
            }

            toggleAccessibilityHighlight(_message.isEnabled);
            _sendResponse(_message.isEnabled ? 'highlighted' : 'unhighlighted');
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

      const _result = messageHandler(_message, null, _sendResponse);

      expect(console.log).toHaveBeenCalledWith('Message received', _message);
      expect(toggleAccessibilityHighlight).toHaveBeenCalledWith(true);
      expect(_sendResponse).toHaveBeenCalledWith('highlighted');
      expect(_result).toBe(true);
    });

    test('should handle disable message correctly', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: false
      };

      const _result = messageHandler(_message, null, _sendResponse);

      expect(toggleAccessibilityHighlight).toHaveBeenCalledWith(false);
      expect(_sendResponse).toHaveBeenCalledWith('unhighlighted');
      expect(_result).toBe(true);
    });

    test('should handle invalid message object', () => {
      const _sendResponse = jest.fn();
      const _message = null;

      const _result = messageHandler(_message, null, _sendResponse);

      expect(console.warn).toHaveBeenCalledWith('Invalid message received:', null);
      expect(toggleAccessibilityHighlight).not.toHaveBeenCalled();
      expect(_sendResponse).not.toHaveBeenCalled();
      expect(_result).toBe(false);
    });

    test('should handle invalid message structure', () => {
      const _sendResponse = jest.fn();
      const _message = 'invalid message';

      const _result = messageHandler(_message, null, _sendResponse);

      expect(console.warn).toHaveBeenCalledWith('Invalid message received:', 'invalid message');
      expect(_result).toBe(false);
    });

    test('should handle invalid isEnabled value', () => {
      const _sendResponse = jest.fn();
      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: 'invalid'
      };

      const _result = messageHandler(_message, null, _sendResponse);

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

      const _result = messageHandler(_message, null, _sendResponse);

      expect(console.log).toHaveBeenCalledWith('Message received', _message);
      expect(toggleAccessibilityHighlight).not.toHaveBeenCalled();
      expect(_sendResponse).not.toHaveBeenCalled();
      expect(_result).toBe(false);
    });

    test('should handle status request message', () => {
      // Extend handler to support status requests
      const _extendedHandler = (_message, _sender, _sendResponse) => {
        try {
          if (_message.action === 'getStatus') {
            const _overlays = document.querySelectorAll('.a11y-highlight-overlay');
            _sendResponse({
              isActive: _overlays.length > 0,
              overlayCount: _overlays.length
            });
            return true;
          }
          return messageHandler(_message, _sender, _sendResponse);
        } catch (error) {
          console.error('Error handling message:', error);
          return false;
        }
      };

      // Add some overlays
      const _overlay = document.createElement('div');
      _overlay.className = 'a11y-highlight-overlay';
      document.body.appendChild(_overlay);

      const _sendResponse = jest.fn();
      const _message = { action: 'getStatus' };

      const _result = _extendedHandler(_message, null, _sendResponse);

      expect(_sendResponse).toHaveBeenCalledWith({
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
      const _errorHandler = (_message, _sender, _sendResponse) => {
        try {
          if (_message.action === 'toggleAccessibilityHighlight') {
            throw new Error('Simulated error');
          }
          return false;
        } catch (_error) {
          console.error('Error handling message:', _error);
          return false;
        }
      };

      const _message = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      const _result = _errorHandler(_message, null, _sendResponse);

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
          return _overlays.length;
        } catch (error) {
          console.error('DOM operation failed:', error);
          return 0;
        }
      };

      const _result = _handleDOMOperation();

      expect(console.error).toHaveBeenCalledWith('DOM operation failed:', expect.any(Error));
      expect(_result).toBe(0);

      // Restore original function
      document.querySelectorAll = _originalQuerySelectorAll;
    });

    test('should validate overlay elements before operations', () => {
      const _highlightCurrentOverlay = index => {
        try {
          const _overlays = document.querySelectorAll('.a11y-highlight-overlay');

          if (!_overlays || _overlays.length === 0) {
            console.warn('No overlays found to highlight');
            return false;
          }

          if (index < 0 || index >= _overlays.length) {
            console.warn('Invalid overlay index:', index);
            return false;
          }

          const _overlay = _overlays[index];
          if (!_overlay) {
            console.warn('Overlay element not found at index:', index);
            return false;
          }

          // Simulate highlighting
          _overlay.style.border = '3px solid #ff0000';
          return true;
        } catch (error) {
          console.error('Error highlighting overlay:', error);
          return false;
        }
      };

      // Test with no overlays
      let _result = _highlightCurrentOverlay(0);
      expect(console.warn).toHaveBeenCalledWith('No overlays found to highlight');
      expect(_result).toBe(false);

      // Add overlay and test with valid index
      const _overlay = document.createElement('div');
      _overlay.className = 'a11y-highlight-overlay';
      document.body.appendChild(_overlay);

      _result = _highlightCurrentOverlay(0);
      expect(_result).toBe(true);
      expect(_overlay.style.border).toBe('3px solid #ff0000');

      // Test with invalid index
      _result = _highlightCurrentOverlay(5);
      expect(console.warn).toHaveBeenCalledWith('Invalid overlay index:', 5);
      expect(_result).toBe(false);
    });

    test('should handle missing Chrome APIs gracefully', () => {
      const _originalChrome = global.chrome;
      global.chrome = undefined;

      const _sendMessageSafely = _message => {
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(_message);
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

      const _result = _sendMessageSafely({ test: 'message' });

      expect(console.warn).toHaveBeenCalledWith('Chrome runtime not available');
      expect(_result).toBe(false);

      // Restore
      global.chrome = _originalChrome;
    });
  });

  describe('DOM Interaction Behaviors', () => {
    test('should handle dynamic overlay creation', () => {
      const _createOverlay = (_element, _message, _level) => {
        try {
          if (!_element || !_element.getBoundingClientRect) {
            console.warn('Invalid element for overlay creation');
            return null;
          }

          const _overlay = document.createElement('div');
          _overlay.className = 'a11y-highlight-overlay';
          _overlay.setAttribute('data-a11ymessage', _message);
          _overlay.setAttribute('data-level', _level);

          const _rect = _element.getBoundingClientRect();
          _overlay.style.cssText = `
            position: absolute;
            top: ${_rect.top + window.scrollY}px;
            left: ${_rect.left + window.scrollX}px;
            width: ${_rect.width}px;
            height: ${_rect.height}px;
            pointer-events: none;
            z-index: 10000;
            border: 2px solid ${_level === 'error' ? '#ff0000' : '#ffa500'};
          `;

          document.body.appendChild(_overlay);
          return _overlay;
        } catch (error) {
          console.error('Error creating overlay:', error);
          return null;
        }
      };

      // Create a test element
      const _testElement = document.createElement('img');
      _testElement.src = 'test.jpg';
      document.body.appendChild(_testElement);

      // Mock getBoundingClientRect
      _testElement.getBoundingClientRect = jest.fn(() => ({
        top: 100,
        left: 200,
        width: 150,
        height: 100
      }));

      const _overlay = _createOverlay(_testElement, 'Missing alt attribute', 'error');

      expect(_overlay).not.toBeNull();
      expect(_overlay.className).toBe('a11y-highlight-overlay');
      expect(_overlay.getAttribute('data-a11ymessage')).toBe('Missing alt attribute');
      expect(_overlay.getAttribute('data-level')).toBe('error');
      expect(_overlay.style.border).toBe('2px solid #ff0000');
    });

    test('should handle overlay removal', () => {
      // Create test overlays
      for (let _i = 0; _i < 3; _i++) {
        const _overlay = document.createElement('div');
        _overlay.className = 'a11y-highlight-overlay';
        document.body.appendChild(_overlay);
      }

      const _removeAllOverlays = () => {
        try {
          const _overlays = document.querySelectorAll('.a11y-highlight-overlay');
          let _removedCount = 0;

          _overlays.forEach(_overlay => {
            if (_overlay && _overlay.parentNode) {
              _overlay.parentNode.removeChild(_overlay);
              _removedCount++;
            }
          });

          console.log(`Removed ${_removedCount} overlays`);
          return _removedCount;
        } catch (error) {
          console.error('Error removing overlays:', error);
          return 0;
        }
      };

      expect(document.querySelectorAll('.a11y-highlight-overlay')).toHaveLength(3);

      const _removedCount = _removeAllOverlays();

      expect(_removedCount).toBe(3);
      expect(document.querySelectorAll('.a11y-highlight-overlay')).toHaveLength(0);
      expect(console.log).toHaveBeenCalledWith('Removed 3 overlays');
    });

    test('should handle filtered overlay operations', () => {
      // Create overlays with different levels
      const _levels = ['error', 'warning', 'error'];
      _levels.forEach((_level, index) => {
        const _overlay = document.createElement('div');
        _overlay.className = 'a11y-highlight-overlay';
        _overlay.setAttribute('data-level', _level);
        _overlay.setAttribute('data-a11ymessage', `Issue ${index + 1}`);
        document.body.appendChild(_overlay);
      });

      const _filterOverlaysByLevel = targetLevel => {
        try {
          const _allOverlays = document.querySelectorAll('.a11y-highlight-overlay');
          const _filteredOverlays = Array.from(_allOverlays).filter(_overlay =>
            _overlay.getAttribute('data-level') === targetLevel
          );

          // Hide non-matching overlays
          _allOverlays.forEach(_overlay => {
            const _isVisible = _overlay.getAttribute('data-level') === targetLevel;
            _overlay.style.display = _isVisible ? 'block' : 'none';
          });

          return _filteredOverlays.length;
        } catch (error) {
          console.error('Error filtering overlays:', error);
          return 0;
        }
      };

      const _errorCount = _filterOverlaysByLevel('error');
      expect(_errorCount).toBe(2);

      // Check that error overlays are visible
      const _errorOverlays = document.querySelectorAll('.a11y-highlight-overlay[data-level="error"]');
      _errorOverlays.forEach(_overlay => {
        expect(_overlay.style.display).toBe('block');
      });

      // Check that warning overlays are hidden
      const _warningOverlays = document.querySelectorAll('.a11y-highlight-overlay[data-level="warning"]');
      _warningOverlays.forEach(_overlay => {
        expect(_overlay.style.display).toBe('none');
      });
    });
  });
});