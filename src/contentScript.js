/**
 * @file Accessibility Highlighter Content Script
 *
 * This content script runs on all web pages and provides functionality to detect
 * and visually highlight accessibility issues. It performs various checks including:
 * - Missing or improper alt text on images
 * - Form fields without labels
 * - Improper heading structure
 * - Insufficient color contrast
 * - Missing ARIA attributes
 * - And many more accessibility violations
 *
 * The script uses overlays to visually indicate problem areas and LOGS detailed
 * information to the console for developers.
 *
 * @author AFixt
 * @version 1.0.1
 */

/* global createExportPanel, createFilterPanel, createSummaryPanel,
   createConfigPanel, showProgressIndicator, updateProgressIndicator,
   hideProgressIndicator, loadCustomRules,
   checkImageElement, checkButtonElement, checkLinkElement,
   checkFieldsetElement, checkInputElement, checkTableElement,
   checkIframeElement, checkMediaElement, checkRoleBasedElement,
   checkTabIndexElement, checkForLandmarks */

console.log('Content script loaded');

/**
 * Array to store accessibility check results for logging.
 * @type {LogEntry[]}
 */
const LOGS = [];

/**
 * Current overlay index for keyboard navigation.
 * @type {number}
 */
let currentOverlayIndex = -1;

/**
 * Flag to track if keyboard navigation is active.
 * @type {boolean}
 */
let keyboardNavigationActive = false;

/**
 * Progress indicator element for showing scan progress.
 * Reassigned and consumed from uiPanels.js (loaded as a separate content
 * script — see manifest.json).
 * @type {HTMLElement|null}
 */
// eslint-disable-next-line prefer-const
let progressIndicator = null;

/**
 * Current filter settings for accessibility results. Consumed from
 * uiPanels.js via the shared Script lexical environment.
 * @type {object}
 */
const CURRENT_FILTERS = {
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
 * Customizable rules configuration for accessibility checks. Reassigned by
 * `loadCustomRules` and `resetCustomRules` in uiPanels.js.
 * @type {object}
 */
// eslint-disable-next-line prefer-const
let customRules = {
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
    checkTableHeaders: true,
    checkNestedTables: true,
    checkUninformativeSummary: true,
    requireMainLandmark: true,
    requireHeadingStructure: false // If true, enforces proper heading hierarchy
  },

  // Multimedia accessibility rules
  multimedia: {
    enabled: true,
    checkAutoplay: true,
    checkIframeTitles: true,
    checkMediaCaptions: false, // Future: check for captions
    allowAutoplayWithControls: false // If true, autoplay is allowed if controls are present
  },

  // Navigation and interaction rules
  navigation: {
    enabled: true,
    checkTabIndex: true,
    checkKeyboardTraps: false, // Future: detect keyboard traps
    checkFocusIndicators: false, // Future: check focus visibility
    allowPositiveTabIndex: false // If true, positive tabindex values are allowed
  },

  // Text and typography rules
  typography: {
    enabled: true,
    checkFontSize: true,
    minimumFontSize: 12, // Minimum font size in pixels
    checkColorContrast: false, // Future: color contrast checking
    checkLineHeight: false // Future: line height checking
  },

  // ARIA and semantic rules
  aria: {
    enabled: true,
    checkRoleBasedElements: true,
    requireAriaLabels: false, // If true, requires aria-labels on all interactive elements
    checkAriaReferences: false, // Future: validate aria-labelledby/describedby references
    allowRedundantRoles: true // If false, flags redundant ARIA roles
  }
};

/**
 * @typedef {object} PerformanceConfig
 * @property {number} THROTTLE_DELAY - Throttle delay in milliseconds
 * @property {number} FONT_SIZE_THRESHOLD - Minimum font size threshold in pixels
 * @property {number} MAX_LOG_ELEMENT_LENGTH - Maximum length for element HTML in LOGS
 * @property {number} Z_INDEX_OVERLAY - Z-index value for overlays
 */

/**
 * @typedef {object} VisualConfig
 * @property {string} ERROR_COLOR - Hex color for error overlays
 * @property {string} WARNING_COLOR - Hex color for warning overlays
 * @property {number} OVERLAY_OPACITY - Opacity value for overlays (0-1)
 * @property {string} BORDER_RADIUS - CSS border-radius value
 * @property {string} BORDER_WIDTH - CSS border-width value
 * @property {string} STRIPE_GRADIENT - CSS gradient for overlay pattern
 */

/**
 * @typedef {object} Selectors
 * @property {string} ALL_CHECKABLE_ELEMENTS - CSS selector for all checkable elements
 * @property {string} LANDMARK_ELEMENTS - CSS selector for landmark elements
 * @property {string[]} TEXT_ELEMENTS - Array of text element tag names
 * @property {string[]} INTERACTIVE_ELEMENTS - Array of interactive element tag names
 * @property {string} OVERLAY_ELEMENTS - CSS selector for overlay elements
 */

/**
 * @typedef {object} Messages
 * @property {string} MISSING_ALT - Message for missing alt attribute
 * @property {string} UNINFORMATIVE_ALT - Message for uninformative alt text
 * @property {string} EMPTY_ALT_WITH_TITLE - Message for empty alt with title
 * @property {string} DIFFERENT_ALT_TITLE - Message for different alt and title
 * @property {string} BUTTON_NO_LABEL - Message for button without label
 * @property {string} LINK_NO_CONTENT - Message for link without content
 * @property {string} INVALID_HREF - Message for invalid href
 * @property {string} GENERIC_LINK_TEXT - Message for generic link text
 * @property {string} MATCHING_TITLE_TEXT - Message for matching title and text
 * @property {string} FIELDSET_NO_LEGEND - Message for fieldset without legend
 * @property {string} INPUT_IMAGE_NO_ALT - Message for input image without alt
 * @property {string} FORM_FIELD_NO_LABEL - Message for form field without label
 * @property {string} TABLE_NO_HEADERS - Message for table without headers
 * @property {string} NESTED_TABLE - Message for nested table
 * @property {string} UNINFORMATIVE_SUMMARY - Message for uninformative summary
 * @property {string} IFRAME_NO_TITLE - Message for iframe without title
 * @property {string} MEDIA_AUTOPLAY - Message for media with autoplay
 * @property {string} MEDIA_NO_CAPTIONS - Message for media without captions
 * @property {string} ROLE_IMG_NO_LABEL - Message for role=img without label
 * @property {string} NON_ACTIONABLE_TABINDEX - Message for non-actionable tabindex
 * @property {string} SMALL_FONT_SIZE - Message for small font size
 * @property {string} NO_LANDMARKS - Message for no landmarks
 * @property {string} THROTTLED - Message for throttled execution
 * @property {string} NO_ISSUES - Message for no issues found
 */

/**
 * @typedef {object} CSSClasses
 * @property {string} ERROR_OVERLAY - CSS class for error overlays
 * @property {string} WARNING_OVERLAY - CSS class for warning overlays
 * @property {string} GENERIC_OVERLAY - CSS class for generic overlays
 */

/**
 * @typedef {object} A11yConfig
 * @property {PerformanceConfig} PERFORMANCE - Performance-related configuration
 * @property {VisualConfig} VISUAL - Visual styling configuration
 * @property {string[]} PROHIBITED_TABLE_SUMMARIES - Array of prohibited table summary values
 * @property {string[]} PROHIBITED_ALT_VALUES - Array of prohibited alt text values
 * @property {string[]} PROHIBITED_LINK_TEXT - Array of prohibited link text values
 * @property {Selectors} SELECTORS - CSS selectors and element arrays
 * @property {Messages} MESSAGES - Error and warning messages
 * @property {CSSClasses} CSS_CLASSES - CSS class names
 */

/**
 * @typedef {object} LogEntry
 * @property {string} Level - Log level (error/warning)
 * @property {string} Message - Error message
 * @property {string} Element - Element HTML snippet
 */

/**
 * Centralized configuration object for the Accessibility Highlighter
 * @type {A11yConfig}
 */
const A11Y_CONFIG = {
  PERFORMANCE: {
    THROTTLE_DELAY: 1000, // 1 second throttle delay
    FONT_SIZE_THRESHOLD: 12, // Minimum font size in pixels
    MAX_LOG_ELEMENT_LENGTH: 100, // Maximum length for element HTML in LOGS
    Z_INDEX_OVERLAY: 2147483647 // Highest z-index for overlays
  },

  VISUAL: {
    ERROR_COLOR: '#FF0000',
    WARNING_COLOR: '#FFA500',
    OVERLAY_OPACITY: 0.4,
    BORDER_RADIUS: '5px',
    BORDER_WIDTH: '2px',
    STRIPE_GRADIENT:
      'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)'
  },

  PROHIBITED_TABLE_SUMMARIES: [
    'combobox',
    'Layout',
    'for layout',
    'layout table',
    'layout',
    'Table for layout purposes',
    'Calendar',
    'Structural table',
    'footer',
    'This table is used for page layout',
    'Text Ad',
    'Calendar Display',
    'Links',
    'Content',
    'Header',
    'header',
    'Navigation elements',
    'top navbar',
    'title and navigation',
    'block',
    'main heading',
    'body',
    'links',
    'Event Calendar',
    'Search',
    'lightbox',
    'Menu',
    'all',
    'HeadBox',
    'Calendar of Events',
    'Lightbox',
    'Contents',
    'management',
    'contents',
    'search form',
    'This table is used for layout',
    'Search Input Table',
    'Content Area',
    'Fullsize Image',
    'Layout Structure',
    'Page title',
    'Main Table',
    'left',
    'category',
    'Banner Design Table',
    'Search Form',
    'Site contents',
    'pageinfo',
    'breadcrumb',
    'table used for layout purposes',
    'Footer',
    'main layout',
    'tooltip',
    'Logo'
  ],

  PROHIBITED_ALT_VALUES: [
    'artwork',
    'arrow',
    'painting',
    'bullet',
    'graphic',
    'graph',
    'spacer',
    'image',
    'placeholder',
    'photo',
    'picture',
    'photograph',
    'logo',
    'screenshot',
    'back',
    'bg',
    'img',
    'alt'
  ],

  PROHIBITED_LINK_TEXT: [
    'link',
    'more',
    'here',
    'click',
    'click here',
    'read',
    'read more',
    'learn more',
    'continue',
    'go',
    'continue reading',
    'view',
    'view more',
    'less',
    'see all',
    'show',
    'hide',
    'show more',
    'show less'
  ],

  SELECTORS: {
    ALL_CHECKABLE_ELEMENTS:
      'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]',
    LANDMARK_ELEMENTS:
      'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]',
    TEXT_ELEMENTS: [
      'p',
      'span',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'li',
      'td',
      'th',
      'label',
      'a',
      'button'
    ],
    INTERACTIVE_ELEMENTS: ['a', 'area', 'button', 'input', 'select', 'textarea'],
    OVERLAY_ELEMENTS: '.a11y-error, .a11y-warning, .overlay',
    PROGRESS_INDICATOR: '.a11y-progress-indicator'
  },

  MESSAGES: {
    MISSING_ALT: 'img does not have an alt attribute',
    UNINFORMATIVE_ALT: 'Uninformative alt attribute value found',
    EMPTY_ALT_WITH_TITLE: 'Image element with empty alt and non-empty title',
    DIFFERENT_ALT_TITLE: 'Image element with different alt and title attributes',
    BUTTON_NO_LABEL: 'Button without aria-label or aria-labelledby or empty text content',
    LINK_NO_CONTENT: 'Link without inner text, aria-label, aria-labelledby, or empty text content',
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
 * Provides the ability to overlay an element with a visual indicator of an accessibility issue.
 * @param {string} overlayClass - CSS class for the overlay
 * @param {string} level - Error level (error/warning)
 * @param {string} msg - Error message
 * @this {Element} The DOM element to overlay
 * @returns {void}
 */
function overlay(overlayClass, level, msg) {
  const elementInError = this;

  try {
    // Validate parameters
    if (typeof overlayClass !== 'string' || !overlayClass) {
      console.error('Invalid overlay class:', overlayClass);
      return;
    }

    if (level !== 'error' && level !== 'warning') {
      console.error('Invalid level:', level);
      return;
    }

    if (typeof msg !== 'string' || !msg) {
      console.error('Invalid message:', msg);
      return;
    }

    // Get accurate element position and dimensions using getBoundingClientRect
    const rect = elementInError.getBoundingClientRect();

    // Skip if element is not visible
    if (rect.width === 0 || rect.height === 0) {
      console.log('Skipping overlay for zero-sized element:', elementInError);
      return;
    }

    // Sanitize message by escaping HTML entities
    // Note: Using dataset property is safe and doesn't execute code,
    // but we sanitize for defense-in-depth in case the value is used elsewhere
    const sanitizedMsg = String(msg)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();

    // Create overlay element
    const overlayEl = document.createElement('div');
    overlayEl.classList.add(overlayClass);

    // Validate numeric values
    const topPos = Math.max(0, rect.top + window.scrollY);
    const leftPos = Math.max(0, rect.left + window.scrollX);
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);

    // Set positioning styles using individual properties (safer than cssText)
    overlayEl.style.position = 'absolute';
    overlayEl.style.top = `${topPos}px`;
    overlayEl.style.left = `${leftPos}px`;
    overlayEl.style.width = `${width}px`;
    overlayEl.style.height = `${height}px`;
    overlayEl.style.display = 'block';
    overlayEl.style.pointerEvents = 'none';
    overlayEl.style.zIndex = String(A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY);
    overlayEl.style.opacity = String(A11Y_CONFIG.VISUAL.OVERLAY_OPACITY);
    overlayEl.style.borderRadius = A11Y_CONFIG.VISUAL.BORDER_RADIUS;
    overlayEl.style.backgroundImage = A11Y_CONFIG.VISUAL.STRIPE_GRADIENT;

    // Use textContent instead of setAttribute for safer content handling
    overlayEl.dataset.a11ymessage = sanitizedMsg;

    // Set overlay appearance based on level
    if (level === 'error') {
      overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.ERROR_COLOR;
      overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.ERROR_COLOR}`;
      overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.ERROR_OVERLAY);
    } else if (level === 'warning') {
      overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.WARNING_COLOR;
      overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.WARNING_COLOR}`;
      overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.WARNING_OVERLAY);
    }

    // Append overlay to document body
    document.body.appendChild(overlayEl);

    // Push the error to the LOGS array with sanitized element HTML
    const sanitizedElementHTML =
      elementInError.outerHTML
        .slice(0, A11Y_CONFIG.PERFORMANCE.MAX_LOG_ELEMENT_LENGTH)
        .replace(/[<>"'&]/g, '') + '...';

    LOGS.push({
      Level: level,
      Message: sanitizedMsg,
      Element: sanitizedElementHTML
    });
  } catch (error) {
    console.error('Error creating overlay:', error);
  }
}

/**
 * Removes all highlighting overlays from the page.
 * @returns {void}
 */
function removeAccessibilityOverlays() {
  try {
    // Cancel any running incremental scan
    cancelIncrementalScan();

    const errorOverlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    errorOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    // Remove filter panel
    const filterPanel = document.querySelector('.a11y-filter-panel');
    if (filterPanel) {
      filterPanel.remove();
    }

    // Remove summary panel
    const summaryPanel = document.querySelector('.a11y-summary-panel');
    if (summaryPanel) {
      summaryPanel.remove();
    }

    // Remove config panel
    const configPanel = document.querySelector('.a11y-config-panel');
    if (configPanel) {
      configPanel.remove();
    }

    // Remove export panel
    const exportPanel = document.querySelector('.a11y-export-panel');
    if (exportPanel) {
      exportPanel.remove();
    }

    // Clear LOGS array
    LOGS.length = 0;

    // Reset keyboard navigation
    keyboardNavigationActive = false;
    currentOverlayIndex = -1;

    // Hide progress indicator
    hideProgressIndicator();
  } catch (error) {
    console.error('Error removing overlays:', error);
  }
}

/**
 * Flag to prevent concurrent execution of accessibility checks.
 * @type {boolean}
 */
let isRunning = false;

/**
 * Timestamp of the last accessibility check execution.
 * @type {number}
 */
let lastRunTime = 0;

/**
 * Configuration for incremental scanning.
 * @type {object}
 */
const INCREMENTAL_CONFIG = {
  CHUNK_SIZE: 25, // Number of elements to process per chunk
  CHUNK_DELAY: 16, // Delay between chunks in milliseconds (approximately 60fps)
  MAX_SCAN_TIME: 5000, // Maximum time for a scan in milliseconds
  YIELD_EVERY: 50 // Yield after processing this many elements
};

/**
 * State for incremental scanning.
 * @type {object | null}
 */
let incrementalState = null;

/**
 * Starts incremental accessibility scanning.
 * @returns {void}
 */
function startIncrementalScan() {
  try {
    // Clear previous LOGS and state
    LOGS.length = 0;

    // Show progress indicator
    showProgressIndicator('Initializing incremental scan...', 0);

    // Initialize incremental state
    incrementalState = {
      walker: null,
      totalElements: 0,
      processedCount: 0,
      processedElements: new Set(),
      startTime: Date.now(),
      chunkStartTime: Date.now(),
      elementsInCurrentChunk: 0,
      isComplete: false,
      cancelled: false
    };

    // Check for landmarks first (quick check)
    updateProgressIndicator('Checking page structure...', 5);
    checkForLandmarks();

    // Count total elements for progress tracking
    const allElements = document.querySelectorAll('*');
    incrementalState.totalElements = allElements.length;

    // Create TreeWalker for efficient traversal
    incrementalState.walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function (node) {
          // Skip hidden elements
          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    updateProgressIndicator(`Starting scan of ${incrementalState.totalElements} elements...`, 10);

    // Start processing chunks
    processNextChunk();
  } catch (error) {
    console.error('Error starting incremental scan:', error);
    finishIncrementalScan();
  }
}

/**
 * Processes the next chunk of elements in incremental scan.
 * @returns {void}
 */
function processNextChunk() {
  if (!incrementalState || incrementalState.cancelled || incrementalState.isComplete) {
    finishIncrementalScan();
    return;
  }

  const chunkStartTime = performance.now();
  incrementalState.elementsInCurrentChunk = 0;

  try {
    // Process elements in this chunk
    while (incrementalState.elementsInCurrentChunk < INCREMENTAL_CONFIG.CHUNK_SIZE) {
      const node = incrementalState.walker.nextNode();

      // Check if we've reached the end
      if (!node) {
        incrementalState.isComplete = true;
        break;
      }

      // Skip if already processed
      if (incrementalState.processedElements.has(node)) {
        continue;
      }
      incrementalState.processedElements.add(node);

      // Process the element
      processElement(node);

      incrementalState.processedCount++;
      incrementalState.elementsInCurrentChunk++;

      // Check if we've exceeded max scan time
      if (Date.now() - incrementalState.startTime > INCREMENTAL_CONFIG.MAX_SCAN_TIME) {
        console.warn('Incremental scan timeout reached, stopping early');
        incrementalState.isComplete = true;
        break;
      }

      // Yield if we've been processing for too long in this chunk
      if (performance.now() - chunkStartTime > INCREMENTAL_CONFIG.CHUNK_DELAY) {
        break;
      }
    }

    // Update progress
    const progress =
      10 + Math.min(80, (incrementalState.processedCount / incrementalState.totalElements) * 80);
    updateProgressIndicator(
      `Processed ${incrementalState.processedCount} of ${incrementalState.totalElements} elements...`,
      progress
    );

    // Schedule next chunk or finish
    if (incrementalState.isComplete) {
      finishIncrementalScan();
    } else {
      // Use requestAnimationFrame for smooth UI updates, fallback to setTimeout
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(processNextChunk);
      } else {
        setTimeout(processNextChunk, INCREMENTAL_CONFIG.CHUNK_DELAY);
      }
    }
  } catch (error) {
    console.error('Error processing chunk:', error);
    finishIncrementalScan();
  }
}

/**
 * Processes a single element for accessibility issues.
 * @param {Element} node - The element to process
 * @returns {void}
 */
function processElement(node) {
  try {
    const tagName = node.tagName.toLowerCase();
    const role = node.getAttribute('role');
    const tabindex = node.getAttribute('tabindex');

    // Check element based on tag or role
    switch (tagName) {
      case 'img':
        checkImageElement(node);
        break;
      case 'button':
        checkButtonElement(node);
        break;
      case 'a':
        checkLinkElement(node);
        break;
      case 'fieldset':
        checkFieldsetElement(node);
        break;
      case 'input':
        checkInputElement(node);
        break;
      case 'table':
        checkTableElement(node);
        break;
      case 'iframe':
        checkIframeElement(node);
        break;
      case 'audio':
      case 'video':
        checkMediaElement(node);
        break;
      default:
        // Check role-based elements
        if (role) {
          checkRoleBasedElement(node, role);
        }
        // Check tabindex on non-interactive elements
        if (tabindex !== null) {
          checkTabIndexElement(node);
        }
        break;
    }

    // Check font size if enabled
    if (customRules.typography.enabled && customRules.typography.checkFontSize) {
      checkElementFontSize(node, tagName);
    }
  } catch (error) {
    console.warn('Error processing element:', node, error);
  }
}

/**
 * Finishes incremental scanning and cleans up.
 * @returns {void}
 */
function finishIncrementalScan() {
  try {
    if (incrementalState && !incrementalState.cancelled) {
      const scanTime = Date.now() - incrementalState.startTime;
      updateProgressIndicator('Finalizing scan results...', 95);

      // Log completion stats
      console.log(
        `Incremental scan completed: ${incrementalState.processedCount} elements in ${scanTime}ms`
      );
      console.table(LOGS);

      // Final progress update
      hideProgressIndicator();

      // Show completion message if there are issues
      if (LOGS.length > 0) {
        updateProgressIndicator(`Found ${LOGS.length} accessibility issues`, 100);
        setTimeout(() => hideProgressIndicator(), 2000);
      }
    }
  } catch (error) {
    console.error('Error finishing incremental scan:', error);
  } finally {
    // Clean up state
    incrementalState = null;
    isRunning = false;
  }
}

/**
 * Cancels the current incremental scan.
 * @returns {void}
 */
function cancelIncrementalScan() {
  if (incrementalState) {
    incrementalState.cancelled = true;
    incrementalState = null;
    isRunning = false;
    hideProgressIndicator();
    console.log('Incremental scan cancelled');
  }
}

/**
 * Efficiently runs accessibility checks using incremental scanning.
 * Uses chunked processing to prevent UI blocking on large pages.
 * @param {boolean} useIncremental - Whether to use incremental scanning (default: true)
 * @returns {void}
 */
/**
 * Checks if accessibility scanning should be throttled.
 * @returns {boolean} True if scanning should be throttled
 */
function shouldThrottleScan() {
  const now = Date.now();
  return isRunning || now - lastRunTime < A11Y_CONFIG.PERFORMANCE.THROTTLE_DELAY;
}

/**
 * Initializes accessibility scan state.
 * @returns {void}
 */
function initializeScanState() {
  isRunning = true;
  lastRunTime = Date.now();
  LOGS.length = 0;
}

/**
 * Creates and configures a TreeWalker for DOM traversal.
 * @returns {TreeWalker} Configured TreeWalker instance
 */
function createAccessibilityTreeWalker() {
  return document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        // Skip hidden elements
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );
}

/**
 * Processes a single DOM element for accessibility issues.
 * @param {Element} node - The DOM element to process
 * @returns {void}
 */
function processElementForAccessibility(node) {
  const tagName = node.tagName.toLowerCase();
  const role = node.getAttribute('role');
  const tabindex = node.getAttribute('tabindex');

  // Check element based on tag or role
  switch (tagName) {
    case 'img':
      checkImageElement(node);
      break;
    case 'button':
      checkButtonElement(node);
      break;
    case 'a':
      checkLinkElement(node);
      break;
    case 'fieldset':
      checkFieldsetElement(node);
      break;
    case 'input':
      checkInputElement(node);
      break;
    case 'table':
      checkTableElement(node);
      break;
    case 'iframe':
      checkIframeElement(node);
      break;
    case 'audio':
    case 'video':
      checkMediaElement(node);
      break;
    default:
      // Check role-based elements
      if (role) {
        checkRoleBasedElement(node, role);
      }
      // Check tabindex on non-interactive elements
      if (tabindex !== null) {
        checkTabIndexElement(node);
      }
      break;
  }

  // Check font size for text-containing elements
  checkElementFontSize(node, tagName);
}

/**
 * Checks font size for text-containing elements.
 * @param {Element} node - The DOM element to check
 * @param {string} tagName - The element's tag name in lowercase
 * @returns {void}
 */
function checkElementFontSize(node, tagName) {
  if (
    A11Y_CONFIG.SELECTORS.TEXT_ELEMENTS.includes(tagName) &&
    node.textContent &&
    node.textContent.trim().length > 0
  ) {
    try {
      const style = window.getComputedStyle(node);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < A11Y_CONFIG.PERFORMANCE.FONT_SIZE_THRESHOLD) {
        console.log(node);
        overlay.call(node, 'overlay', 'warning', A11Y_CONFIG.MESSAGES.SMALL_FONT_SIZE);
      }
    } catch (error) {
      // Skip elements that can't be styled
    }
  }
}

/**
 * Traverses DOM and processes all elements for accessibility issues.
 * @param {TreeWalker} walker - The TreeWalker instance
 * @param {number} totalElements - Total number of elements for progress tracking
 * @returns {void}
 */
function traverseAndProcessElements(walker, totalElements) {
  let node;
  let processedCount = 0;
  const processedElements = new Set();

  while ((node = walker.nextNode())) {
    // Skip if already processed
    if (processedElements.has(node)) {
      continue;
    }
    processedElements.add(node);
    processedCount++;

    // Update progress every 50 elements
    if (processedCount % 50 === 0) {
      const progress = 20 + Math.min(70, (processedCount / totalElements) * 70);
      updateProgressIndicator(
        `Processed ${processedCount} of ${totalElements} elements...`,
        progress
      );
    }

    processElementForAccessibility(node);
  }
}

/**
 * Finalizes the accessibility scan and displays results.
 * @returns {void}
 */
function finalizeScanResults() {
  updateProgressIndicator('Completing scan...', 95);

  // Log results
  if (LOGS.length > 0) {
    updateProgressIndicator(
      `Found ${LOGS.length} accessibility issues. Press Alt+Shift+F for filters.`,
      100
    );
    console.table(LOGS);
    console.log(
      '💡 Tip: Press Alt+Shift+F to open the filter panel and customize which issues are shown.'
    );
  } else {
    updateProgressIndicator('No accessibility issues found!', 100);
    console.log(A11Y_CONFIG.MESSAGES.NO_ISSUES);
  }

  // Hide progress indicator after a brief delay
  setTimeout(() => {
    hideProgressIndicator();
  }, 2000);
}

/**
 * Handles errors during accessibility scanning.
 * @param {Error} error - The error that occurred
 * @returns {void}
 */
function handleScanError(error) {
  console.error('Error during accessibility checks:', error);
  updateProgressIndicator('Error during scan', 100);
  setTimeout(() => {
    hideProgressIndicator();
  }, 3000);
}

/**
 * Main function to run accessibility checks on the current page.
 * @param {boolean} useIncremental - Whether to use incremental scanning
 * @returns {void}
 */
function runAccessibilityChecks(useIncremental = true) {
  // Throttling to prevent performance issues
  if (shouldThrottleScan()) {
    console.log(A11Y_CONFIG.MESSAGES.THROTTLED);
    return;
  }

  // Use incremental scanning for better performance
  if (useIncremental) {
    isRunning = true;
    lastRunTime = Date.now();
    startIncrementalScan();
    return;
  }

  try {
    // Initialize scan state
    initializeScanState();

    // Show progress indicator
    showProgressIndicator('Starting accessibility scan...', 0);

    // Check for landmarks first (simple check)
    updateProgressIndicator('Checking page structure...', 10);
    checkForLandmarks();

    // Count total elements for progress tracking
    const allElements = document.querySelectorAll('*');
    const totalElements = allElements.length;
    updateProgressIndicator(`Scanning ${totalElements} elements...`, 20);

    // Create TreeWalker for efficient DOM traversal
    const walker = createAccessibilityTreeWalker();

    // Process all elements
    traverseAndProcessElements(walker, totalElements);

    // Finalize and display results
    finalizeScanResults();
  } catch (error) {
    handleScanError(error);
  } finally {
    isRunning = false;
  }
}

/**
 * Evaluate and apply the correct set of actions based on isEnabled state.
 * @param {boolean} isEnabled - Whether accessibility highlighting is enabled
 * @returns {void}
 */
function toggleAccessibilityHighlight(isEnabled) {
  console.log(`Toggling accessibility highlights: ${isEnabled}`);

  try {
    if (isEnabled) {
      runAccessibilityChecks();
    } else {
      removeAccessibilityOverlays();
    }
  } catch (error) {
    console.error('Error toggling accessibility highlight:', error);
  }
}

/**
 * Initial check for isEnabled state from storage.
 * @returns {void}
 */
chrome.storage.local.get(['isEnabled'], result => {
  try {
    // Validate storage result
    if (!result || typeof result !== 'object') {
      console.warn('Invalid storage result:', result);
      return;
    }

    // Validate isEnabled value (default to false if not set)
    const isEnabled = result.isEnabled === true;
    console.log('Initial isEnabled state:', isEnabled);
    toggleAccessibilityHighlight(isEnabled);
  } catch (error) {
    console.error('Error during initial state check:', error);
  }
});

/**
 * Listen for messages from the background or popup script to dynamically toggle features.
 * @param {object} message - The message object from the sender
 * @param {chrome.runtime.MessageSender} _sender - The sender information (unused)
 * @param {Function} sendResponse - Function to send response back to sender
 * @returns {boolean} - True if response will be sent asynchronously, false otherwise
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
});

/**
 * Highlights the current overlay in keyboard navigation.
 * @param {number} index - Index of overlay to highlight
 * @returns {void}
 */
function highlightCurrentOverlay(index) {
  const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);

  // Remove previous highlight
  overlays.forEach(overlay => {
    overlay.style.outline = '';
    overlay.style.outlineOffset = '';
  });

  if (index >= 0 && index < overlays.length) {
    const currentOverlay = overlays[index];
    currentOverlay.style.outline = '3px solid #007cba';
    currentOverlay.style.outlineOffset = '2px';

    // Scroll into view
    currentOverlay.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Announce to screen readers
    const message = currentOverlay.dataset.a11ymessage || 'Accessibility issue';
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Issue ${index + 1} of ${overlays.length}: ${message}`
      );
      utterance.volume = 0.1; // Keep it quiet
      speechSynthesis.speak(utterance);
    }
  }
}

/**
 * Handles keyboard navigation through accessibility overlays.
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {void}
 */
function handleKeyboardNavigation(event) {
  const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);

  if (overlays.length === 0) {
    return;
  }

  // Alt + Shift + N: Start/activate keyboard navigation
  if (event.altKey && event.shiftKey && event.key === 'N') {
    event.preventDefault();
    keyboardNavigationActive = true;
    currentOverlayIndex = 0;
    highlightCurrentOverlay(currentOverlayIndex);
    return;
  }

  // Alt + Shift + F: Toggle filter panel
  if (event.altKey && event.shiftKey && event.key === 'F') {
    event.preventDefault();
    const existingPanel = document.querySelector('.a11y-filter-panel');
    if (existingPanel) {
      existingPanel.remove();
    } else {
      createFilterPanel();
    }
    return;
  }

  // Alt + Shift + S: Toggle summary panel
  if (event.altKey && event.shiftKey && event.key === 'S') {
    event.preventDefault();
    const existingPanel = document.querySelector('.a11y-summary-panel');
    if (existingPanel) {
      existingPanel.remove();
    } else {
      createSummaryPanel();
    }
    return;
  }

  // Alt + Shift + C: Toggle configuration panel
  if (event.altKey && event.shiftKey && event.key === 'C') {
    event.preventDefault();
    const existingPanel = document.querySelector('.a11y-config-panel');
    if (existingPanel) {
      existingPanel.remove();
    } else {
      createConfigPanel();
    }
    return;
  }

  // Alt + Shift + E: Toggle export panel
  if (event.altKey && event.shiftKey && event.key === 'E') {
    event.preventDefault();
    const existingPanel = document.querySelector('.a11y-export-panel');
    if (existingPanel) {
      existingPanel.remove();
    } else {
      createExportPanel();
    }
    return;
  }

  // Only handle navigation keys if keyboard navigation is active
  if (!keyboardNavigationActive) {
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      currentOverlayIndex = (currentOverlayIndex + 1) % overlays.length;
      highlightCurrentOverlay(currentOverlayIndex);
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      currentOverlayIndex = currentOverlayIndex > 0 ? currentOverlayIndex - 1 : overlays.length - 1;
      highlightCurrentOverlay(currentOverlayIndex);
      break;

    case 'Home':
      event.preventDefault();
      currentOverlayIndex = 0;
      highlightCurrentOverlay(currentOverlayIndex);
      break;

    case 'End':
      event.preventDefault();
      currentOverlayIndex = overlays.length - 1;
      highlightCurrentOverlay(currentOverlayIndex);
      break;

    case 'Escape':
      event.preventDefault();
      keyboardNavigationActive = false;
      currentOverlayIndex = -1;
      // Remove all highlights
      overlays.forEach(overlay => {
        overlay.style.outline = '';
        overlay.style.outlineOffset = '';
      });
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentOverlayIndex >= 0 && currentOverlayIndex < overlays.length) {
        const currentOverlay = overlays[currentOverlayIndex];
        const message = currentOverlay.dataset.a11ymessage || 'Accessibility issue';
        console.log('Selected accessibility issue:', message);

        // Show more detailed information
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(message);
          speechSynthesis.speak(utterance);
        }
      }
      break;
  }
}

// Add keyboard event listener
document.addEventListener('keydown', handleKeyboardNavigation, true);

// Initialize custom rules from storage when content script loads
(async function initializeCustomRules() {
  try {
    await loadCustomRules();
    console.log('Accessibility Highlighter: Custom rules initialized');
  } catch (error) {
    console.warn('Accessibility Highlighter: Failed to initialize custom rules:', error);
  }
})().catch(error => {
  // Catch any unhandled rejections from the IIFE itself
  console.warn('Failed to load custom rules:', error);
});

// Export functions for testing (when in test environment).
// At runtime in Chrome, contentScript.js, elementChecks.js, uiPanels.js,
// and reportGenerators.js share the Script lexical environment (all
// classic content scripts in one isolated world), so cross-file references
// resolve naturally. In Jest's CommonJS world each file is a separate
// module, so we expose contentScript.js's state on `global` first and then
// require() the sibling files — they look up `A11Y_CONFIG`, `customRules`,
// `overlay`, etc. as implicit globals.
if (
  typeof global !== 'undefined' &&
  global.process &&
  global.process.env &&
  global.process.env.NODE_ENV === 'test'
) {
  global.A11Y_CONFIG = A11Y_CONFIG;
  global.LOGS = LOGS;
  global.customRules = customRules;
  global.CURRENT_FILTERS = CURRENT_FILTERS;
  global.progressIndicator = progressIndicator;
  global.overlay = overlay;

  require('./elementChecks.js');
  require('./uiPanels.js');
  require('./reportGenerators.js');

  global.runAccessibilityChecks = runAccessibilityChecks;
  global.removeAccessibilityOverlays = removeAccessibilityOverlays;
  global.removeOverlays = removeAccessibilityOverlays; // Alias for tests
  global.toggleAccessibilityHighlight = toggleAccessibilityHighlight;

  // Export throttling variables for test control
  global.resetThrottle = () => {
    isRunning = false;
    lastRunTime = 0;
  };
}
