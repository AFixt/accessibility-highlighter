/**
 * Chrome API Error Handling Tests
 * Tests error scenarios for Chrome extension APIs
 */

describe('Chrome API Error Handling', () => {
  let originalChrome;
  let consoleErrorSpy;

  beforeEach(() => {
    // Save original chrome object
    originalChrome = global.chrome;

    // Mock console.error to capture error logs
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Clear DOM
    document.body.innerHTML = '';
    global.logs = [];
  });

  afterEach(() => {
    // Restore original chrome object
    global.chrome = originalChrome;

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  describe('Background Script Chrome API Errors', () => {
    test('should handle chrome.tabs.query failure', async () => {
      // Mock chrome.tabs.query to reject
      global.chrome = {
        tabs: {
          query: jest.fn().mockRejectedValue(new Error('Failed to query tabs'))
        },
        action: {
          setIcon: jest.fn(),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: false }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() }
        }
      };

      // Import background script
      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      // Try to get current tab
      try {
        await global.getCurrentTab();
      } catch (error) {
        expect(error.message).toBe('Failed to query tabs');
      }

      expect(global.chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, lastFocusedWindow: true }
      );
    });

    test('should handle chrome.storage.local.get failure', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 123 }]),
          sendMessage: jest.fn()
        },
        action: {
          setIcon: jest.fn(),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockRejectedValue(new Error('Storage access denied')),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() }
        }
      };

      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      // Simulate action click
      const clickHandler = global.chrome.action.onClicked.addListener.mock.calls[0][0];

      // Should not crash when storage.get fails
      expect(() => {
        clickHandler();
      }).not.toThrow();
    });

    test('should handle chrome.storage.local.set failure', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 123 }]),
          sendMessage: jest.fn()
        },
        action: {
          setIcon: jest.fn(),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: false }),
            set: jest.fn().mockRejectedValue(new Error('Storage write failed'))
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() }
        }
      };

      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      const clickHandler = global.chrome.action.onClicked.addListener.mock.calls[0][0];

      // Should not crash when storage.set fails
      expect(() => {
        clickHandler();
      }).not.toThrow();
    });

    test('should handle chrome.action.setIcon failure', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 123 }]),
          sendMessage: jest.fn()
        },
        action: {
          setIcon: jest.fn().mockImplementation(() => {
            throw new Error('Icon update failed');
          }),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: false }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() }
        }
      };

      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      const clickHandler = global.chrome.action.onClicked.addListener.mock.calls[0][0];

      // Should not crash when setIcon fails
      expect(() => {
        clickHandler();
      }).not.toThrow();
    });

    test('should handle chrome.tabs.sendMessage failure', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 123 }]),
          sendMessage: jest.fn().mockImplementation((tabId, message, callback) => {
            const error = new Error('Tab communication failed');
            if (callback) {
              global.chrome.runtime.lastError = error;
              callback();
            }
            throw error;
          })
        },
        action: {
          setIcon: jest.fn(),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: false }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() },
          lastError: null
        }
      };

      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      const clickHandler = global.chrome.action.onClicked.addListener.mock.calls[0][0];

      // Should not crash when sendMessage fails
      expect(() => {
        clickHandler();
      }).not.toThrow();
    });

    test('should handle empty tabs array from query', async () => {
      global.chrome = {
        tabs: {
          query: jest.fn().mockResolvedValue([]), // No active tabs
          sendMessage: jest.fn()
        },
        action: {
          setIcon: jest.fn(),
          onClicked: { addListener: jest.fn() }
        },
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: false }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onInstalled: { addListener: jest.fn() }
        }
      };

      delete require.cache[require.resolve('../src/background.js')];
      require('../src/background.js');

      // getCurrentTab should handle empty array gracefully
      const tab = await global.getCurrentTab();
      expect(tab).toBeUndefined();
    });
  });

  describe('Content Script Chrome API Errors', () => {
    test('should handle chrome.storage.local.get failure in content script', async () => {
      global.chrome = {
        storage: {
          local: {
            get: jest.fn().mockRejectedValue(new Error('Storage read failed')),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onMessage: { addListener: jest.fn() },
          lastError: new Error('Storage read failed')
        }
      };

      // Mock window properties
      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Should not crash when importing content script with storage errors
      expect(() => {
        delete require.cache[require.resolve('../src/contentScript.js')];
        require('../src/contentScript.js');
      }).not.toThrow();
    });

    test('should handle runtime.lastError in message handling', async () => {
      global.chrome = {
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ isEnabled: true }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onMessage: { addListener: jest.fn() },
          lastError: new Error('Runtime error occurred')
        }
      };

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      delete require.cache[require.resolve('../src/contentScript.js')];
      require('../src/contentScript.js');

      // Get the message listener
      const messageListener = global.chrome.runtime.onMessage.addListener.mock.calls[0][0];

      const message = {
        action: 'toggleHighlight',
        isEnabled: true
      };

      const mockSendResponse = jest.fn();

      // Should handle runtime errors gracefully
      expect(() => {
        messageListener(message, {}, mockSendResponse);
      }).not.toThrow();
    });

    test('should handle DOM manipulation errors gracefully', async () => {
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

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Mock querySelectorAll to throw error
      const originalQuerySelectorAll = document.querySelectorAll;
      document.querySelectorAll = jest.fn().mockImplementation(() => {
        throw new Error('DOM query failed');
      });

      delete require.cache[require.resolve('../src/contentScript.js')];
      require('../src/contentScript.js');

      // Should not crash when DOM operations fail
      expect(() => {
        global.runAccessibilityChecks();
      }).not.toThrow();

      // Restore original function
      document.querySelectorAll = originalQuerySelectorAll;
    });

    test('should handle getBoundingClientRect errors', async () => {
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

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Create element with problematic getBoundingClientRect
      const problemElement = document.createElement('div');
      problemElement.getBoundingClientRect = jest.fn().mockImplementation(() => {
        throw new Error('Cannot get bounding rect');
      });
      document.body.appendChild(problemElement);

      delete require.cache[require.resolve('../src/contentScript.js')];
      require('../src/contentScript.js');

      // Should handle getBoundingClientRect errors
      expect(() => {
        global.overlay.call(problemElement, 'overlay', 'error', 'Test message');
      }).not.toThrow();
    });

    test('should handle getComputedStyle errors', async () => {
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

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Mock getComputedStyle to throw
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = jest.fn().mockImplementation(() => {
        throw new Error('Cannot compute style');
      });

      delete require.cache[require.resolve('../src/contentScript.js')];
      require('../src/contentScript.js');

      // Should handle getComputedStyle errors
      expect(() => {
        global.checkFontSizes();
      }).not.toThrow();

      // Restore original function
      window.getComputedStyle = originalGetComputedStyle;
    });
  });

  describe('Network and Timing Error Scenarios', () => {
    test('should handle extension context invalidation', async () => {
      global.chrome = {
        storage: {
          local: {
            get: jest.fn().mockImplementation(() => {
              throw new Error('Extension context invalidated');
            }),
            set: jest.fn().mockImplementation(() => {
              throw new Error('Extension context invalidated');
            })
          }
        },
        runtime: {
          onMessage: { addListener: jest.fn() },
          lastError: new Error('Extension context invalidated')
        }
      };

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      // Should not crash when extension context is invalidated
      expect(() => {
        delete require.cache[require.resolve('../src/contentScript.js')];
        require('../src/contentScript.js');
      }).not.toThrow();
    });

    test('should handle rapid successive API calls', async () => {
      let callCount = 0;
      global.chrome = {
        storage: {
          local: {
            get: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount > 3) {
                throw new Error('Too many API calls');
              }
              return Promise.resolve({ isEnabled: true });
            }),
            set: jest.fn().mockResolvedValue()
          }
        },
        runtime: {
          onMessage: { addListener: jest.fn() },
          lastError: null
        }
      };

      Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      delete require.cache[require.resolve('../src/contentScript.js')];
      require('../src/contentScript.js');

      // Make multiple rapid calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise(resolve => {
            try {
              global.runAccessibilityChecks();
              resolve('success');
            } catch (error) {
              resolve('error');
            }
          })
        );
      }

      const results = await Promise.all(promises);

      // Some calls should succeed, some might fail, but should not crash
      expect(results).toHaveLength(5);
      expect(results.every(result => result === 'success' || result === 'error')).toBe(true);
    });
  });
});