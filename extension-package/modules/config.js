/**
 * @fileoverview Configuration module for Accessibility Highlighter
 *
 * This module centralizes all configuration data including:
 * - Performance and visual settings
 * - Accessibility checking rules
 * - Filter settings
 * - Persistent configuration management
 *
 * @author AFixt
 * @version 1.0.1
 */

/**
 * @typedef {Object} PerformanceConfig
 * @property {number} THROTTLE_DELAY - Throttle delay in milliseconds
 * @property {number} FONT_SIZE_THRESHOLD - Minimum font size threshold
 * @property {number} MAX_LOG_ELEMENT_LENGTH - Maximum element HTML length in logs
 * @property {number} Z_INDEX_OVERLAY - Z-index for overlays
 */

/**
 * @typedef {Object} VisualConfig
 * @property {string} ERROR_COLOR - Error overlay color
 * @property {string} WARNING_COLOR - Warning overlay color
 * @property {number} OVERLAY_OPACITY - Overlay opacity
 * @property {string} BORDER_RADIUS - Border radius for overlays
 * @property {string} BORDER_WIDTH - Border width for overlays
 * @property {string} STRIPE_GRADIENT - Stripe pattern for overlays
 */

/**
 * @typedef {Object} A11yConfig
 * @property {PerformanceConfig} PERFORMANCE - Performance-related configuration
 * @property {VisualConfig} VISUAL - Visual styling configuration
 * @property {string[]} PROHIBITED_TABLE_SUMMARIES - Array of prohibited table summary values
 * @property {string[]} PROHIBITED_ALT_VALUES - Array of prohibited alt text values
 * @property {string[]} PROHIBITED_LINK_TEXT - Array of prohibited link text values
 * @property {Object} SELECTORS - CSS selectors and element arrays
 * @property {Object} MESSAGES - Error and warning messages
 * @property {Object} CSS_CLASSES - CSS class names
 */

/**
 * Centralized configuration object for the Accessibility Highlighter
 * @type {A11yConfig}
 */
const A11Y_CONFIG = {
  PERFORMANCE: {
    THROTTLE_DELAY: 1000, // 1 second throttle delay
    FONT_SIZE_THRESHOLD: 12, // Minimum font size in pixels
    MAX_LOG_ELEMENT_LENGTH: 100, // Maximum length for element HTML in logs
    Z_INDEX_OVERLAY: 2147483647 // Highest z-index for overlays
  },

  VISUAL: {
    ERROR_COLOR: '#FF0000',
    WARNING_COLOR: '#FFA500',
    OVERLAY_OPACITY: 0.4,
    BORDER_RADIUS: '5px',
    BORDER_WIDTH: '2px',
    STRIPE_GRADIENT: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)'
  },

  PROHIBITED_TABLE_SUMMARIES: [
    'combobox', 'Layout', 'for layout', 'layout table', 'layout',
    'Table for layout purposes', 'Calendar', 'Structural table', 'footer',
    'This table is used for page layout', 'Text Ad', 'Calendar Display',
    'Links', 'Content', 'Header', 'header', 'Navigation elements',
    'top navbar', 'title and navigation', 'block', 'main heading',
    'body', 'links', 'Event Calendar', 'Search', 'lightbox', 'Menu',
    'all', 'HeadBox', 'Calendar of Events', 'Lightbox', 'Contents',
    'management', 'contents', 'search form', 'This table is used for layout',
    'Search Input Table', 'Content Area', 'Fullsize Image', 'Layout Structure',
    'Page title', 'Main Table', 'left', 'category', 'Banner Design Table',
    'Search Form', 'Site contents', 'pageinfo', 'breadcrumb',
    'table used for layout purposes', 'Footer', 'main layout', 'tooltip', 'Logo'
  ],

  PROHIBITED_ALT_VALUES: [
    'artwork', 'arrow', 'painting', 'bullet', 'graphic', 'graph',
    'spacer', 'image', 'placeholder', 'photo', 'picture', 'photograph',
    'logo', 'screenshot', 'back', 'bg', 'img', 'alt'
  ],

  PROHIBITED_LINK_TEXT: [
    'link', 'more', 'here', 'click', 'click here', 'read',
    'read more', 'learn more', 'continue', 'go', 'continue reading',
    'view', 'view more', 'less', 'see all', 'show', 'hide',
    'show more', 'show less'
  ],

  SELECTORS: {
    ALL_CHECKABLE_ELEMENTS: 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]',
    LANDMARK_ELEMENTS: 'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]',
    TEXT_ELEMENTS: ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a', 'button'],
    INTERACTIVE_ELEMENTS: ['a', 'area', 'button', 'input', 'select', 'textarea'],
    OVERLAY_ELEMENTS: '.a11y-error, .a11y-warning, .overlay',
    PROGRESS_INDICATOR: '.a11y-progress-indicator'
  },

  MESSAGES: {
    MISSING_ALT: 'img does not have an alt attribute',
    UNINFORMATIVE_ALT: 'Uninformative alt attribute value found',
    EMPTY_ALT_WITH_TITLE: 'Image element with empty alt and non-empty title',
    DIFFERENT_ALT_TITLE: 'Image element with different alt and title attributes',
    BUTTON_NO_LABEL: 'Button without aria-label or aria-labelledby or inner text content',
    LINK_NO_CONTENT: 'Link without inner text, aria-label, aria-labelledby, or with empty text content',
    INVALID_HREF: 'Invalid link href attribute',
    GENERIC_LINK_TEXT: 'Link element with matching text content found',
    MATCHING_TITLE_TEXT: 'Link element with matching title and text content found',
    FIELDSET_NO_LEGEND: 'fieldset without legend',
    INPUT_IMAGE_NO_ALT: 'input type=image without alt or aria-label',
    FORM_FIELD_NO_LABEL: 'Form field without a corresponding label',
    TABLE_NO_HEADERS: 'table without any th elements',
    NESTED_TABLE: 'Nested table elements',
    UNINFORMATIVE_SUMMARY: 'Table with uninformative summary attribute',
    IFRAME_NO_TITLE: 'iframe element without a title attribute',
    MEDIA_AUTOPLAY: 'Media element set to autoplay',
    MEDIA_NO_CAPTIONS: 'Media element without captions track',
    ROLE_IMG_NO_LABEL: 'role=img without aria-label or aria-labelledby',
    NON_ACTIONABLE_TABINDEX: 'Non-actionable element with tabindex=',
    SMALL_FONT_SIZE: 'Text element with font size smaller than 12px',
    NO_LANDMARKS: 'No landmark elements found',
    THROTTLED: 'Accessibility checks throttled - please wait',
    NO_ISSUES: 'No accessibility issues found.'
  },

  CSS_CLASSES: {
    ERROR_OVERLAY: 'a11y-error',
    WARNING_OVERLAY: 'a11y-warning',
    GENERIC_OVERLAY: 'overlay'
  }
};

/**
 * Default filter settings for accessibility results.
 * @type {Object}
 */
const DEFAULT_FILTERS = {
  showErrors: true,
  showWarnings: true,
  categories: {
    images: true,
    forms: true,
    links: true,
    structure: true,
    multimedia: true,
    navigation: true
  }
};

/**
 * Default customizable rules configuration for accessibility checks.
 * @type {Object}
 */
const DEFAULT_CUSTOM_RULES = {
  // Image accessibility rules
  images: {
    enabled: true,
    checkMissingAlt: true,
    checkUninformativeAlt: true,
    checkEmptyAltWithTitle: true,
    checkDifferentAltTitle: true,
    allowDecorativeImages: true // If false, all images must have descriptive alt
  },

  // Form accessibility rules
  forms: {
    enabled: true,
    checkMissingLabels: true,
    checkInputImageAlt: true,
    checkFieldsetLegend: true,
    requireExplicitLabels: false // If true, only explicit labels count (not aria-label)
  },

  // Link accessibility rules
  links: {
    enabled: true,
    checkEmptyLinks: true,
    checkGenericLinkText: true,
    checkInvalidHref: true,
    checkMatchingTitleText: true,
    allowJavaScriptLinks: false // If true, javascript: links are allowed
  },

  // Structure accessibility rules
  structure: {
    enabled: true,
    checkMissingLandmarks: true,
    checkHeadingStructure: true,
    checkTableHeaders: true,
    checkListStructure: true,
    allowNestedTables: false // If true, nested tables are allowed
  },

  // Multimedia accessibility rules
  multimedia: {
    enabled: true,
    checkAutoplay: true,
    checkCaptions: true,
    checkIframeTitle: true,
    allowAutoplay: false // If true, autoplay is allowed
  },

  // Navigation accessibility rules
  navigation: {
    enabled: true,
    checkTabIndex: true,
    checkKeyboardAccess: true,
    checkFocusIndicators: true,
    allowPositiveTabindex: false // If true, positive tabindex values are allowed
  },

  // General rules
  general: {
    enabled: true,
    minimumFontSize: 12, // Minimum font size in pixels
    checkColorContrast: false, // Disabled by default due to performance
    checkLanguage: true
  }
};

/**
 * Configuration for incremental scanning performance optimization.
 * @type {Object}
 */
const INCREMENTAL_CONFIG = {
  CHUNK_SIZE: 100, // Number of elements to process per chunk
  CHUNK_DELAY: 10, // Delay between chunks in milliseconds
  MAX_TOTAL_TIME: 30000, // Maximum total scan time in milliseconds
  PROGRESS_UPDATE_INTERVAL: 500 // How often to update progress indicator
};

/**
 * Loads custom rules from Chrome storage.
 * @returns {Promise<Object>} Promise that resolves to custom rules object
 */
async function loadCustomRules() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise(resolve => {
        chrome.storage.local.get('customRules', result => {
          const rules = result.customRules || DEFAULT_CUSTOM_RULES;
          // Ensure all default properties exist
          const mergedRules = mergeWithDefaults(rules, DEFAULT_CUSTOM_RULES);
          resolve(mergedRules);
        });
      });
    } else {
      // Fallback for environments without chrome.storage
      const stored = localStorage.getItem('a11y-custom-rules');
      const rules = stored ? JSON.parse(stored) : DEFAULT_CUSTOM_RULES;
      return mergeWithDefaults(rules, DEFAULT_CUSTOM_RULES);
    }
  } catch (error) {
    console.warn('Error loading custom rules, using defaults:', error);
    return DEFAULT_CUSTOM_RULES;
  }
}

/**
 * Saves custom rules to Chrome storage.
 * @param {Object} rules - Custom rules object to save
 * @returns {Promise<void>} Promise that resolves when rules are saved
 */
async function saveCustomRules(rules) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise(resolve => {
        chrome.storage.local.set({ customRules: rules }, () => {
          console.log('Custom rules saved successfully');
          resolve();
        });
      });
    } else {
      // Fallback for environments without chrome.storage
      localStorage.setItem('a11y-custom-rules', JSON.stringify(rules));
      console.log('Custom rules saved to localStorage');
    }
  } catch (error) {
    console.error('Error saving custom rules:', error);
  }
}

/**
 * Resets custom rules to default values.
 * @returns {Promise<Object>} Promise that resolves to default rules
 */
async function resetCustomRules() {
  const defaultRules = JSON.parse(JSON.stringify(DEFAULT_CUSTOM_RULES));
  await saveCustomRules(defaultRules);
  return defaultRules;
}

/**
 * Loads filter settings from Chrome storage.
 * @returns {Promise<Object>} Promise that resolves to filter settings
 */
async function loadFilterSettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise(resolve => {
        chrome.storage.local.get('filterSettings', result => {
          const filters = result.filterSettings || DEFAULT_FILTERS;
          const mergedFilters = mergeWithDefaults(filters, DEFAULT_FILTERS);
          resolve(mergedFilters);
        });
      });
    } else {
      // Fallback for environments without chrome.storage
      const stored = localStorage.getItem('a11y-filter-settings');
      const filters = stored ? JSON.parse(stored) : DEFAULT_FILTERS;
      return mergeWithDefaults(filters, DEFAULT_FILTERS);
    }
  } catch (error) {
    console.warn('Error loading filter settings, using defaults:', error);
    return DEFAULT_FILTERS;
  }
}

/**
 * Saves filter settings to Chrome storage.
 * @param {Object} filters - Filter settings object to save
 * @returns {Promise<void>} Promise that resolves when settings are saved
 */
async function saveFilterSettings(filters) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise(resolve => {
        chrome.storage.local.set({ filterSettings: filters }, () => {
          console.log('Filter settings saved successfully');
          resolve();
        });
      });
    } else {
      // Fallback for environments without chrome.storage
      localStorage.setItem('a11y-filter-settings', JSON.stringify(filters));
      console.log('Filter settings saved to localStorage');
    }
  } catch (error) {
    console.error('Error saving filter settings:', error);
  }
}

/**
 * Merges user settings with default settings, ensuring all required properties exist.
 * @param {Object} userSettings - User's custom settings
 * @param {Object} defaultSettings - Default settings to merge with
 * @returns {Object} Merged settings object
 */
function mergeWithDefaults(userSettings, defaultSettings) {
  const merged = JSON.parse(JSON.stringify(defaultSettings));

  /**
   * Deep merge two objects with prototype pollution protection
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  function deepMerge(target, source) {
    for (const key in source) {
      // Protect against prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  deepMerge(merged, userSettings);
  return merged;
}

// Export all configuration and functions for CommonJS
module.exports = {
  A11Y_CONFIG,
  DEFAULT_FILTERS,
  DEFAULT_CUSTOM_RULES,
  INCREMENTAL_CONFIG,
  loadCustomRules,
  saveCustomRules,
  resetCustomRules,
  loadFilterSettings,
  saveFilterSettings
};