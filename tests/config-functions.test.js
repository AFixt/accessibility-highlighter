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
    // Re-initialize chrome.storage mocks after clearAllMocks
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
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
  });

  describe('saveCustomRules()', () => {
    test('should save custom rules to Chrome storage', async () => {
      const _customRules = {
        images: {
          enabled: false
        }
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
  });

  describe('mergeWithDefaults (indirectly tested)', () => {
    test('should merge user settings with defaults', async () => {
      const _userRules = {
        images: {
          enabled: false // User customization
        }
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ customRules: _userRules });
      });

      const _result = await loadCustomRules();

      // Should have user's custom value
      expect(_result.images.enabled).toBe(false);
      // Check that other default properties are preserved
      expect(_result).toHaveProperty('forms');
      expect(_result).toHaveProperty('links');
      expect(_result).toHaveProperty('structure');
      expect(_result.forms).toHaveProperty('enabled');
      expect(_result.links).toHaveProperty('enabled');
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