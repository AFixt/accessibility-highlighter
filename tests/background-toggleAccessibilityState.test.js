/**
 * @fileoverview Tests for background.js toggleAccessibilityState() function
 *
 * Tests the state toggle functionality including storage operations,
 * icon updates, badge management, and content script communication.
 */

// Mock Chrome APIs before importing background script
global.chrome = {
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  action: {
    onClicked: {
      addListener: jest.fn()
    },
    setIcon: jest.fn(),
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
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
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  }
};

// Mock console methods
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

// Set test environment
global.process = { env: { NODE_ENV: 'test' } };

// Import background script after mocking
require('../src/background.js');

describe('Background Script - toggleAccessibilityState() Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete global.chrome.runtime.lastError;
  });

  describe('State toggling from disabled to enabled', () => {
    test('should toggle from disabled to enabled', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      // Mock storage returning disabled state
      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      // Call the function through the global export
      await global.toggleAccessibilityState();

      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify storage operations
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['isEnabled']);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });

      // Verify icon update to enabled state
      expect(chrome.action.setIcon).toHaveBeenCalledWith({
        path: {
          16: 'icons/icon-16.png',
          48: 'icons/icon-48.png',
          128: 'icons/icon-128.png'
        }
      });

      // Verify title update
      expect(chrome.action.setTitle).toHaveBeenCalledWith({
        title: 'Accessibility Highlighter (ON) - Click to disable accessibility checking'
      });

      // Verify badge text and color
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ON' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#28a745' });

      // Verify message sent to content script
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'toggleAccessibilityHighlight', isEnabled: true },
        expect.any(Function)
      );
    });

    test('should toggle from enabled to disabled', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      // Mock storage returning enabled state
      chrome.storage.local.get.mockResolvedValue({ isEnabled: true });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify storage operations
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: false });

      // Verify icon update to disabled state
      expect(chrome.action.setIcon).toHaveBeenCalledWith({
        path: {
          16: 'icons/icon-disabled-16.png',
          48: 'icons/icon-disabled-48.png',
          128: 'icons/icon-disabled-128.png'
        }
      });

      // Verify title update
      expect(chrome.action.setTitle).toHaveBeenCalledWith({
        title: 'Accessibility Highlighter (OFF) - Click to enable accessibility checking'
      });

      // Verify badge text and color
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'OFF' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc3545' });

      // Verify message sent to content script
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { action: 'toggleAccessibilityHighlight', isEnabled: false },
        expect.any(Function)
      );
    });
  });

  describe('Default state handling', () => {
    test('should default to false when isEnabled is undefined', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      // Mock storage returning empty result
      chrome.storage.local.get.mockResolvedValue({});
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should toggle from false (default) to true
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ON' });
    });

    test('should handle non-boolean isEnabled values', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      // Mock storage returning non-boolean value
      chrome.storage.local.get.mockResolvedValue({ isEnabled: 'true' });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      // String 'true' should be treated as false, so toggle to true
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
    });
  });

  describe('Error handling', () => {
    test('should handle storage.get errors', async () => {
      const mockError = new Error('Storage get failed');
      chrome.storage.local.get.mockRejectedValue(mockError);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Error getting storage:', mockError);
    });

    test('should handle storage.set errors', async () => {
      const mockError = new Error('Storage set failed');
      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockRejectedValue(mockError);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Error setting storage:', mockError);
    });

    test('should handle invalid storage result', async () => {
      chrome.storage.local.get.mockResolvedValue(null);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Invalid storage result:', null);
    });

    test('should handle getCurrentTab errors', async () => {
      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();

      // Mock getCurrentTab to return null (simulating error)
      chrome.tabs.query.mockRejectedValue(new Error('Tab query failed'));

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith('Error querying tabs:', expect.any(Error));
    });

    test('should handle invalid tab ID', async () => {
      const mockTab = { id: 'invalid', url: 'https://example.com', active: true };

      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      // getCurrentTab() validates the tab first and logs the error
      expect(console.error).toHaveBeenCalledWith('Invalid tab object:', mockTab);

      // Since getCurrentTab returns null for invalid tabs, we should also see the "No active tab found" warning
      expect(console.warn).toHaveBeenCalledWith('No active tab found');
    });

    test('should handle negative tab ID', async () => {
      const mockTab = { id: -5, url: 'https://example.com', active: true };

      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      // The tab will pass getCurrentTab validation (which only checks typeof tab.id !== 'number')
      // But will fail the validation in toggleAccessibilityState (which also checks < 0)
      expect(console.error).toHaveBeenCalledWith('Invalid tab ID:', -5);
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle sendMessage errors', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);

      // Mock runtime error during sendMessage
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        global.chrome.runtime.lastError = { message: 'Could not establish connection' };
        callback();
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.warn).toHaveBeenCalledWith(
        'Could not send message to tab 123: Could not establish connection'
      );
    });
  });

  describe('Tab communication', () => {
    test('should handle successful message response', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('Message received successfully');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.log).toHaveBeenCalledWith('Response from content script:', 'Message received successfully');
    });

    test('should handle no active tab', async () => {
      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([]);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.warn).toHaveBeenCalledWith('No active tab found');
    });

    test('should handle null tab', async () => {
      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([null]);

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.warn).toHaveBeenCalledWith('No active tab found');
    });
  });

  describe('State logging', () => {
    test('should log state transitions', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };

      chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
      chrome.storage.local.set.mockResolvedValue();
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        callback('success');
      });

      await global.toggleAccessibilityState();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.log).toHaveBeenCalledWith('Toggling state from false to true');
      expect(console.log).toHaveBeenCalledWith('Extension is now enabled.');
    });
  });
});