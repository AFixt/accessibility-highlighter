/**
 * @fileoverview Tests for config.js module functions
 *
 * Tests the configuration management functions including:
 * - loadCustomRules
 * - saveCustomRules
 * - loadFilterSettings
 * - saveFilterSettings
 * - resetCustomRules
 */

// Mock Chrome APIs before importing modules
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

// Import functions after mocks are set up
const {
  loadCustomRules,
  saveCustomRules,
  loadFilterSettings,
  saveFilterSettings,
  resetCustomRules,
  DEFAULT_CUSTOM_RULES,
  DEFAULT_FILTERS
} = require('../src/modules/config.js');

describe('Config Module Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadCustomRules()', () => {
    test('should load custom rules from Chrome storage', async () => {
      const customRules = {
        prohibitedAlts: ['test1', 'test2'],
        prohibitedLinks: ['click', 'here']
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customRules });
      });

      const result = await loadCustomRules();

      expect(chrome.storage.local.get).toHaveBeenCalledWith('customRules', expect.any(Function));
      expect(result).toMatchObject(customRules);
    });

    test('should return default rules when no custom rules exist', async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await loadCustomRules();

      expect(result).toEqual(DEFAULT_CUSTOM_RULES);
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      // Temporarily remove chrome.storage
      const originalChrome = global.chrome;
      delete global.chrome.storage;

      const customRules = {
        prohibitedAlts: ['test1', 'test2']
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(customRules));

      const result = await loadCustomRules();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('a11y-custom-rules');
      expect(result).toMatchObject(customRules);

      // Restore chrome.storage
      global.chrome = originalChrome;
    });

    test('should handle errors gracefully and return defaults', async () => {
      chrome.storage.local.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await loadCustomRules();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Error loading custom rules, using defaults:',
        expect.any(Error)
      );
      expect(result).toEqual(DEFAULT_CUSTOM_RULES);
    });
  });

  describe('saveCustomRules()', () => {
    test('should save custom rules to Chrome storage', async () => {
      const customRules = {
        prohibitedAlts: ['test1', 'test2']
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveCustomRules(customRules);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { customRules },
        expect.any(Function)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('Custom rules saved successfully');
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const originalChrome = global.chrome;
      delete global.chrome.storage;

      const customRules = {
        prohibitedAlts: ['test1', 'test2']
      };

      await saveCustomRules(customRules);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'a11y-custom-rules',
        JSON.stringify(customRules)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('Custom rules saved to localStorage');

      global.chrome = originalChrome;
    });

    test('should handle errors gracefully', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await saveCustomRules({});

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error saving custom rules:',
        expect.any(Error)
      );
    });
  });

  describe('loadFilterSettings()', () => {
    test('should load filter settings from Chrome storage', async () => {
      const filterSettings = {
        showErrors: true,
        showWarnings: false,
        categories: {
          images: true,
          forms: false
        }
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ filterSettings });
      });

      const result = await loadFilterSettings();

      expect(chrome.storage.local.get).toHaveBeenCalledWith('filterSettings', expect.any(Function));
      expect(result).toMatchObject(filterSettings);
    });

    test('should return default filters when no settings exist', async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await loadFilterSettings();

      expect(result).toEqual(DEFAULT_FILTERS);
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const originalChrome = global.chrome;
      delete global.chrome.storage;

      const filterSettings = {
        showErrors: false,
        showWarnings: true
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(filterSettings));

      const result = await loadFilterSettings();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('a11y-filter-settings');
      expect(result).toMatchObject(filterSettings);

      global.chrome = originalChrome;
    });

    test('should handle errors gracefully and return defaults', async () => {
      chrome.storage.local.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await loadFilterSettings();

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Error loading filter settings, using defaults:',
        expect.any(Error)
      );
      expect(result).toEqual(DEFAULT_FILTERS);
    });
  });

  describe('saveFilterSettings()', () => {
    test('should save filter settings to Chrome storage', async () => {
      const filterSettings = {
        showErrors: true,
        showWarnings: false
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveFilterSettings(filterSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { filterSettings },
        expect.any(Function)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('Filter settings saved successfully');
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const originalChrome = global.chrome;
      delete global.chrome.storage;

      const filterSettings = {
        showErrors: true,
        showWarnings: false
      };

      await saveFilterSettings(filterSettings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'a11y-filter-settings',
        JSON.stringify(filterSettings)
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('Filter settings saved to localStorage');

      global.chrome = originalChrome;
    });

    test('should handle errors gracefully', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await saveFilterSettings({});

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error saving filter settings:',
        expect.any(Error)
      );
    });
  });

  describe('resetCustomRules()', () => {
    test('should reset custom rules to defaults', async () => {
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const result = await resetCustomRules();

      expect(result).toEqual(DEFAULT_CUSTOM_RULES);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { customRules: DEFAULT_CUSTOM_RULES },
        expect.any(Function)
      );
    });

    test('should handle errors from saveCustomRules', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await resetCustomRules();

      expect(result).toEqual(DEFAULT_CUSTOM_RULES);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error saving custom rules:',
        expect.any(Error)
      );
    });
  });

  describe('mergeWithDefaults (indirectly tested)', () => {
    test('should merge user settings with defaults', async () => {
      const userRules = {
        prohibitedAlts: ['custom1']
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customRules: userRules });
      });

      const result = await loadCustomRules();

      // Should have both user rules and any default properties
      expect(result.prohibitedAlts).toContain('custom1');
      // Check that other default properties are preserved
      expect(result).toHaveProperty('prohibitedTableSummaries');
      expect(result).toHaveProperty('prohibitedLinks');
    });

    test('should handle nested object merging', async () => {
      const userSettings = {
        categories: {
          images: false
        }
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ filterSettings: userSettings });
      });

      const result = await loadFilterSettings();

      // User setting should override default
      expect(result.categories.images).toBe(false);
      // Other defaults should be preserved
      expect(result.categories).toHaveProperty('forms');
      expect(result.categories).toHaveProperty('links');
    });
  });
});