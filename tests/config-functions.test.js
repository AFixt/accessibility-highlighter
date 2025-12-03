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
const __localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = __localStorageMock;

// Mock console methods
const _consoleSpy = {
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
      const _customRules = {
        prohibitedAlts: ['test1', 'test2'],
        prohibitedLinks: ['click', 'here']
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customRules: _customRules });
      });

      const _result = await loadCustomRules();

      expect(chrome.storage.local.get).toHaveBeenCalledWith('customRules', expect.any(Function));
      expect(_result).toMatchObject(_customRules);
    });

    test('should return default rules when no custom rules exist', async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const _result = await loadCustomRules();

      expect(_result).toEqual(DEFAULT_CUSTOM_RULES);
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      // Temporarily remove chrome.storage
      const __originalChrome = global.chrome;
      delete global.chrome.storage;

      const _customRules = {
        prohibitedAlts: ['test1', 'test2']
      };
      __localStorageMock.getItem.mockReturnValue(JSON.stringify(_customRules));

      const _result = await loadCustomRules();

      expect(__localStorageMock.getItem).toHaveBeenCalledWith('a11y-custom-rules');
      expect(_result).toMatchObject(_customRules);

      // Restore chrome.storage
      global.chrome = __originalChrome;
    });

    test('should handle errors gracefully and return defaults', async () => {
      chrome.storage.local.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const _result = await loadCustomRules();

      expect(_consoleSpy.warn).toHaveBeenCalledWith(
        'Error loading custom rules, using defaults:',
        expect.any(Error)
      );
      expect(_result).toEqual(DEFAULT_CUSTOM_RULES);
    });
  });

  describe('saveCustomRules()', () => {
    test('should save custom rules to Chrome storage', async () => {
      const _customRules = {
        prohibitedAlts: ['test1', 'test2']
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveCustomRules(_customRules);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { customRules: _customRules },
        expect.any(Function)
      );
      expect(_consoleSpy.log).toHaveBeenCalledWith('Custom rules saved successfully');
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const __originalChrome = global.chrome;
      delete global.chrome.storage;

      const _customRules = {
        prohibitedAlts: ['test1', 'test2']
      };

      await saveCustomRules(_customRules);

      expect(__localStorageMock.setItem).toHaveBeenCalledWith(
        'a11y-custom-rules',
        JSON.stringify(_customRules)
      );
      expect(_consoleSpy.log).toHaveBeenCalledWith('Custom rules saved to localStorage');

      global.chrome = __originalChrome;
    });

    test('should handle errors gracefully', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await saveCustomRules({});

      expect(_consoleSpy.error).toHaveBeenCalledWith(
        'Error saving custom rules:',
        expect.any(Error)
      );
    });
  });

  describe('loadFilterSettings()', () => {
    test('should load filter settings from Chrome storage', async () => {
      const _filterSettings = {
        showErrors: true,
        showWarnings: false,
        categories: {
          images: true,
          forms: false
        }
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ filterSettings: _filterSettings });
      });

      const _result = await loadFilterSettings();

      expect(chrome.storage.local.get).toHaveBeenCalledWith('filterSettings', expect.any(Function));
      expect(_result).toMatchObject(_filterSettings);
    });

    test('should return default filters when no settings exist', async () => {
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({});
      });

      const _result = await loadFilterSettings();

      expect(_result).toEqual(DEFAULT_FILTERS);
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const __originalChrome = global.chrome;
      delete global.chrome.storage;

      const _filterSettings = {
        showErrors: false,
        showWarnings: true
      };
      __localStorageMock.getItem.mockReturnValue(JSON.stringify(_filterSettings));

      const _result = await loadFilterSettings();

      expect(__localStorageMock.getItem).toHaveBeenCalledWith('a11y-filter-settings');
      expect(_result).toMatchObject(_filterSettings);

      global.chrome = __originalChrome;
    });

    test('should handle errors gracefully and return defaults', async () => {
      chrome.storage.local.get.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const _result = await loadFilterSettings();

      expect(_consoleSpy.warn).toHaveBeenCalledWith(
        'Error loading filter settings, using defaults:',
        expect.any(Error)
      );
      expect(_result).toEqual(DEFAULT_FILTERS);
    });
  });

  describe('saveFilterSettings()', () => {
    test('should save filter settings to Chrome storage', async () => {
      const _filterSettings = {
        showErrors: true,
        showWarnings: false
      };

      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveFilterSettings(_filterSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { filterSettings: _filterSettings },
        expect.any(Function)
      );
      expect(_consoleSpy.log).toHaveBeenCalledWith('Filter settings saved successfully');
    });

    test('should fallback to localStorage when Chrome storage is unavailable', async () => {
      const __originalChrome = global.chrome;
      delete global.chrome.storage;

      const _filterSettings = {
        showErrors: true,
        showWarnings: false
      };

      await saveFilterSettings(_filterSettings);

      expect(__localStorageMock.setItem).toHaveBeenCalledWith(
        'a11y-filter-settings',
        JSON.stringify(_filterSettings)
      );
      expect(_consoleSpy.log).toHaveBeenCalledWith('Filter settings saved to localStorage');

      global.chrome = __originalChrome;
    });

    test('should handle errors gracefully', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await saveFilterSettings({});

      expect(_consoleSpy.error).toHaveBeenCalledWith(
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

      const _result = await resetCustomRules();

      expect(_result).toEqual(DEFAULT_CUSTOM_RULES);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { customRules: DEFAULT_CUSTOM_RULES },
        expect.any(Function)
      );
    });

    test('should handle errors from saveCustomRules', async () => {
      chrome.storage.local.set.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const _result = await resetCustomRules();

      expect(_result).toEqual(DEFAULT_CUSTOM_RULES);
      expect(_consoleSpy.error).toHaveBeenCalledWith(
        'Error saving custom rules:',
        expect.any(Error)
      );
    });
  });

  describe('mergeWithDefaults (indirectly tested)', () => {
    test('should merge user settings with defaults', async () => {
      const _userRules = {
        prohibitedAlts: ['custom1']
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customRules: _userRules });
      });

      const _result = await loadCustomRules();

      // Should have both user rules and any default properties
      expect(_result.prohibitedAlts).toContain('custom1');
      // Check that other default properties are preserved
      expect(_result).toHaveProperty('prohibitedTableSummaries');
      expect(_result).toHaveProperty('prohibitedLinks');
    });

    test('should handle nested object merging', async () => {
      const _userSettings = {
        categories: {
          images: false
        }
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ filterSettings: _userSettings });
      });

      const _result = await loadFilterSettings();

      // User setting should override default
      expect(_result.categories.images).toBe(false);
      // Other defaults should be preserved
      expect(_result.categories).toHaveProperty('forms');
      expect(_result.categories).toHaveProperty('links');
    });
  });
});