/**
 * @fileoverview Tests for background.js getCurrentTab() function
 *
 * Tests the tab retrieval functionality including success cases,
 * error handling, and edge cases for tab validation.
 */

// Mock Chrome APIs before importing background script
global.chrome = {
  tabs: {
    query: jest.fn()
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
    setIcon: jest.fn()
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

// Import background script after mocking
require('../src/background.js');

describe('Background Script - getCurrentTab() Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete global.chrome.runtime.lastError;
  });

  describe('Successful tab retrieval', () => {
    test('should return active tab when query succeeds', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Test Page',
        active: true
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);

      // Access the function from global scope (it's defined in background.js)
      const result = await global.getCurrentTab();

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        lastFocusedWindow: true
      });
      expect(result).toEqual(mockTab);
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should return first tab when multiple tabs returned', async () => {
      const mockTabs = [
        { id: 123, url: 'https://example.com', title: 'Test Page 1', active: true },
        { id: 124, url: 'https://example2.com', title: 'Test Page 2', active: false }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await global.getCurrentTab();

      expect(result).toEqual(mockTabs[0]);
      expect(result.id).toBe(123);
    });
  });

  describe('Error handling', () => {
    test('should handle chrome.tabs.query rejection', async () => {
      const mockError = new Error('Chrome API error');
      chrome.tabs.query.mockRejectedValue(mockError);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error querying tabs:', mockError);
    });

    test('should handle empty tabs array', async () => {
      chrome.tabs.query.mockResolvedValue([]);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('No active tabs found');
    });

    test('should handle null tabs response', async () => {
      chrome.tabs.query.mockResolvedValue(null);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('No active tabs found');
    });

    test('should handle undefined tabs response', async () => {
      chrome.tabs.query.mockResolvedValue(undefined);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('No active tabs found');
    });
  });

  describe('Tab validation', () => {
    test('should reject null tab object', async () => {
      chrome.tabs.query.mockResolvedValue([null]);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Invalid tab object:', null);
    });

    test('should reject tab with missing id', async () => {
      const invalidTab = {
        url: 'https://example.com',
        title: 'Test Page',
        active: true
        // id is missing
      };

      chrome.tabs.query.mockResolvedValue([invalidTab]);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Invalid tab object:', invalidTab);
    });

    test('should reject tab with non-number id', async () => {
      const invalidTab = {
        id: '123', // string instead of number
        url: 'https://example.com',
        title: 'Test Page',
        active: true
      };

      chrome.tabs.query.mockResolvedValue([invalidTab]);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Invalid tab object:', invalidTab);
    });

    test('should reject non-object tab', async () => {
      chrome.tabs.query.mockResolvedValue(['not an object']);

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Invalid tab object:', 'not an object');
    });
  });

  describe('Edge cases', () => {
    test('should handle tab with id = 0 (valid)', async () => {
      const mockTab = {
        id: 0, // 0 is a valid tab ID
        url: 'https://example.com',
        title: 'Test Page',
        active: true
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);

      const result = await global.getCurrentTab();

      expect(result).toEqual(mockTab);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should handle tab with negative id (valid for special tabs)', async () => {
      const mockTab = {
        id: -1, // negative IDs can be valid for special tabs
        url: 'chrome://newtab',
        title: 'New Tab',
        active: true
      };

      chrome.tabs.query.mockResolvedValue([mockTab]);

      const result = await global.getCurrentTab();

      expect(result).toEqual(mockTab);
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should handle Chrome extension throwing synchronous error', async () => {
      // Simulate Chrome API throwing synchronously
      chrome.tabs.query.mockImplementation(() => {
        throw new Error('Synchronous Chrome error');
      });

      const result = await global.getCurrentTab();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error querying tabs:',
        expect.any(Error)
      );
    });
  });

  describe('Query options validation', () => {
    test('should call chrome.tabs.query with correct options', async () => {
      const mockTab = { id: 123, url: 'https://example.com', active: true };
      chrome.tabs.query.mockResolvedValue([mockTab]);

      await global.getCurrentTab();

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        lastFocusedWindow: true
      });
      expect(chrome.tabs.query).toHaveBeenCalledTimes(1);
    });
  });
});