/**
 * @fileoverview Accessibility Highlighter Content Script
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
 * The script uses overlays to visually indicate problem areas and logs detailed
 * information to the console for developers.
 * 
 * @author AFixt
 * @version 1.0.1
 */

console.log("Content script loaded");

/**
 * Array to store accessibility check results for logging.
 * @type {LogEntry[]}
 */
const logs = [];

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
 * @type {HTMLElement|null}
 */
let progressIndicator = null;

/**
 * Current filter settings for accessibility results.
 * @type {Object}
 */
let currentFilters = {
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
 * Customizable rules configuration for accessibility checks.
 * @type {Object}
 */
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
 * @typedef {Object} PerformanceConfig
 * @property {number} THROTTLE_DELAY - Throttle delay in milliseconds
 * @property {number} FONT_SIZE_THRESHOLD - Minimum font size threshold in pixels
 * @property {number} MAX_LOG_ELEMENT_LENGTH - Maximum length for element HTML in logs
 * @property {number} Z_INDEX_OVERLAY - Z-index value for overlays
 */

/**
 * @typedef {Object} VisualConfig
 * @property {string} ERROR_COLOR - Hex color for error overlays
 * @property {string} WARNING_COLOR - Hex color for warning overlays
 * @property {number} OVERLAY_OPACITY - Opacity value for overlays (0-1)
 * @property {string} BORDER_RADIUS - CSS border-radius value
 * @property {string} BORDER_WIDTH - CSS border-width value
 * @property {string} STRIPE_GRADIENT - CSS gradient for overlay pattern
 */

/**
 * @typedef {Object} Selectors
 * @property {string} ALL_CHECKABLE_ELEMENTS - CSS selector for all checkable elements
 * @property {string} LANDMARK_ELEMENTS - CSS selector for landmark elements
 * @property {string[]} TEXT_ELEMENTS - Array of text element tag names
 * @property {string[]} INTERACTIVE_ELEMENTS - Array of interactive element tag names
 * @property {string} OVERLAY_ELEMENTS - CSS selector for overlay elements
 */

/**
 * @typedef {Object} Messages
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
 * @typedef {Object} CSSClasses
 * @property {string} ERROR_OVERLAY - CSS class for error overlays
 * @property {string} WARNING_OVERLAY - CSS class for warning overlays
 * @property {string} GENERIC_OVERLAY - CSS class for generic overlays
 */

/**
 * @typedef {Object} A11yConfig
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
 * @typedef {Object} LogEntry
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
    MAX_LOG_ELEMENT_LENGTH: 100, // Maximum length for element HTML in logs
    Z_INDEX_OVERLAY: 2147483647, // Highest z-index for overlays
  },
  
  VISUAL: {
    ERROR_COLOR: '#FF0000',
    WARNING_COLOR: '#FFA500',
    OVERLAY_OPACITY: 0.4,
    BORDER_RADIUS: '5px',
    BORDER_WIDTH: '2px',
    STRIPE_GRADIENT: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)',
  },
  
  PROHIBITED_TABLE_SUMMARIES: [
    "combobox", "Layout", "for layout", "layout table", "layout",
    "Table for layout purposes", "Calendar", "Structural table", "footer",
    "This table is used for page layout", "Text Ad", "Calendar Display",
    "Links", "Content", "Header", "header", "Navigation elements",
    "top navbar", "title and navigation", "block", "main heading",
    "body", "links", "Event Calendar", "Search", "lightbox", "Menu",
    "all", "HeadBox", "Calendar of Events", "Lightbox", "Contents",
    "management", "contents", "search form", "This table is used for layout",
    "Search Input Table", "Content Area", "Fullsize Image", "Layout Structure",
    "Page title", "Main Table", "left", "category", "Banner Design Table",
    "Search Form", "Site contents", "pageinfo", "breadcrumb",
    "table used for layout purposes", "Footer", "main layout", "tooltip", "Logo",
  ],
  
  PROHIBITED_ALT_VALUES: [
    "artwork", "arrow", "painting", "bullet", "graphic", "graph",
    "spacer", "image", "placeholder", "photo", "picture", "photograph",
    "logo", "screenshot", "back", "bg", "img", "alt",
  ],
  
  PROHIBITED_LINK_TEXT: [
    "link", "more", "here", "click", "click here", "read",
    "read more", "learn more", "continue", "go", "continue reading",
    "view", "view more", "less", "see all", "show", "hide",
    "show more", "show less",
  ],
  
  SELECTORS: {
    ALL_CHECKABLE_ELEMENTS: 'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]',
    LANDMARK_ELEMENTS: 'header, aside, footer, main, nav, [role="banner"], [role="complementary"], [role="contentinfo"], [role="main"], [role="navigation"], [role="search"]',
    TEXT_ELEMENTS: ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a', 'button'],
    INTERACTIVE_ELEMENTS: ['a', 'area', 'button', 'input', 'select', 'textarea'],
    OVERLAY_ELEMENTS: '.a11y-error, .a11y-warning, .overlay',
    PROGRESS_INDICATOR: '.a11y-progress-indicator',
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
    NO_ISSUES: 'No accessibility issues found.',
  },
  
  CSS_CLASSES: {
    ERROR_OVERLAY: 'a11y-error',
    WARNING_OVERLAY: 'a11y-warning',
    GENERIC_OVERLAY: 'overlay',
  },
};

/**
 * Provides the ability to overlay an element with a visual indicator of an accessibility issue.
 * @param {string} overlayClass - CSS class for the overlay
 * @param {'error'|'warning'} level - Error level (error/warning)
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
      console.warn('Skipping overlay for zero-sized element:', elementInError);
      return;
    }
    
    // Enhanced sanitization - remove all HTML tags and dangerous characters
    const sanitizedMsg = String(msg)
      .replace(/[<>"'&]/g, '') // Remove HTML-related characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
    
    // Create overlay element
    const overlayEl = document.createElement("div");
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
    if (level === "error") {
      overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.ERROR_COLOR;
      overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.ERROR_COLOR}`;
      overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.ERROR_OVERLAY);
    } else if (level === "warning") {
      overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.WARNING_COLOR;
      overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.WARNING_COLOR}`;
      overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.WARNING_OVERLAY);
    }
    
    // Append overlay to document body
    document.body.appendChild(overlayEl);

    // Push the error to the logs array with sanitized element HTML
    const sanitizedElementHTML = elementInError.outerHTML
      .slice(0, A11Y_CONFIG.PERFORMANCE.MAX_LOG_ELEMENT_LENGTH)
      .replace(/[<>"'&]/g, '') + "...";
    
    logs.push({
      Level: level,
      Message: sanitizedMsg,
      Element: sanitizedElementHTML,
    });
  } catch (error) {
    console.error('Error creating overlay:', error);
  }
}

/**
 * Creates and shows a progress indicator for accessibility scanning.
 * @param {string} message - Progress message to display
 * @param {number} [percentage] - Progress percentage (0-100)
 * @returns {void}
 */
function showProgressIndicator(message, percentage = 0) {
  try {
    // Remove existing progress indicator
    hideProgressIndicator();
    
    // Create progress container
    progressIndicator = document.createElement('div');
    progressIndicator.className = 'a11y-progress-indicator';
    progressIndicator.setAttribute('aria-live', 'polite');
    progressIndicator.setAttribute('aria-label', 'Accessibility scan progress');
    
    // Style the progress indicator
    progressIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
      background: #007cba;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      min-width: 250px;
      max-width: 350px;
    `;
    
    // Create content
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.marginBottom = '8px';
    
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      overflow: hidden;
    `;
    
    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: white;
      width: ${Math.max(0, Math.min(100, percentage))}%;
      transition: width 0.3s ease;
    `;
    
    progressBar.appendChild(progressFill);
    progressIndicator.appendChild(messageDiv);
    progressIndicator.appendChild(progressBar);
    
    // Store references for updates
    progressIndicator._messageDiv = messageDiv;
    progressIndicator._progressFill = progressFill;
    
    document.body.appendChild(progressIndicator);
  } catch (error) {
    console.error('Error showing progress indicator:', error);
  }
}

/**
 * Updates the progress indicator with new message and percentage.
 * @param {string} message - Updated progress message
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {void}
 */
function updateProgressIndicator(message, percentage) {
  try {
    if (progressIndicator && progressIndicator._messageDiv && progressIndicator._progressFill) {
      progressIndicator._messageDiv.textContent = message;
      progressIndicator._progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
  } catch (error) {
    console.error('Error updating progress indicator:', error);
  }
}

/**
 * Hides and removes the progress indicator.
 * @returns {void}
 */
function hideProgressIndicator() {
  try {
    if (progressIndicator && progressIndicator.parentNode) {
      progressIndicator.parentNode.removeChild(progressIndicator);
    }
    progressIndicator = null;
  } catch (error) {
    console.error('Error hiding progress indicator:', error);
  }
}

/**
 * Categorizes an accessibility issue based on its message and element type.
 * @param {string} message - The issue message
 * @param {Element} element - The problematic element
 * @returns {string} The category name
 */
function categorizeIssue(message, element) {
  const tagName = element ? element.tagName.toLowerCase() : '';
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('alt') || lowerMessage.includes('image') || tagName === 'img') {
    return 'images';
  } else if (lowerMessage.includes('form') || lowerMessage.includes('label') || 
             lowerMessage.includes('input') || lowerMessage.includes('fieldset') ||
             ['input', 'form', 'fieldset', 'label'].includes(tagName)) {
    return 'forms';
  } else if (lowerMessage.includes('link') || lowerMessage.includes('href') || tagName === 'a') {
    return 'links';
  } else if (lowerMessage.includes('landmark') || lowerMessage.includes('heading') ||
             lowerMessage.includes('table') || lowerMessage.includes('header') ||
             ['table', 'th', 'td', 'header', 'main', 'nav', 'aside', 'footer'].includes(tagName)) {
    return 'structure';
  } else if (lowerMessage.includes('media') || lowerMessage.includes('video') ||
             lowerMessage.includes('audio') || lowerMessage.includes('captions') ||
             ['video', 'audio', 'iframe'].includes(tagName)) {
    return 'multimedia';
  } else if (lowerMessage.includes('tabindex') || lowerMessage.includes('navigation') ||
             lowerMessage.includes('keyboard')) {
    return 'navigation';
  }
  
  return 'structure'; // Default category
}

/**
 * Applies current filters to show/hide overlays based on filter settings.
 * @returns {void}
 */
function applyFilters() {
  try {
    const allOverlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    let visibleCount = 0;
    
    allOverlays.forEach(overlay => {
      const level = overlay.classList.contains('a11y-error') ? 'error' : 'warning';
      const message = overlay.dataset.a11ymessage || '';
      const element = overlay.parentElement;
      const category = categorizeIssue(message, element);
      
      // Check if overlay should be visible based on filters
      const shouldShow = 
        (level === 'error' && currentFilters.showErrors) ||
        (level === 'warning' && currentFilters.showWarnings);
      
      const categoryEnabled = currentFilters.categories[category];
      
      if (shouldShow && categoryEnabled) {
        overlay.style.display = 'block';
        visibleCount++;
      } else {
        overlay.style.display = 'none';
      }
    });
    
    console.log(`Showing ${visibleCount} of ${allOverlays.length} accessibility issues`);
    
    // Update progress indicator if it exists
    if (progressIndicator && progressIndicator._messageDiv) {
      progressIndicator._messageDiv.textContent = 
        `Showing ${visibleCount} of ${allOverlays.length} issues`;
    }
    
  } catch (error) {
    console.error('Error applying filters:', error);
  }
}

/**
 * Creates a filter control panel for managing result visibility.
 * @returns {void}
 */
function createFilterPanel() {
  try {
    // Remove existing filter panel
    const existing = document.querySelector('.a11y-filter-panel');
    if (existing) {
      existing.remove();
    }
    
    const filterPanel = document.createElement('div');
    filterPanel.className = 'a11y-filter-panel';
    filterPanel.setAttribute('aria-label', 'Accessibility results filter panel');
    
    filterPanel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
      background: white;
      border: 2px solid #007cba;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      min-width: 200px;
      max-width: 300px;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Filter Results';
    title.style.cssText = 'margin: 0 0 10px 0; color: #007cba; font-size: 16px;';
    filterPanel.appendChild(title);
    
    // Severity filters
    const severityGroup = document.createElement('div');
    severityGroup.style.marginBottom = '15px';
    
    const severityTitle = document.createElement('h4');
    severityTitle.textContent = 'Severity';
    severityTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px;';
    severityGroup.appendChild(severityTitle);
    
    // Error checkbox
    const errorCheckbox = createFilterCheckbox('show-errors', 'Errors', currentFilters.showErrors, (checked) => {
      currentFilters.showErrors = checked;
      applyFilters();
    });
    severityGroup.appendChild(errorCheckbox);
    
    // Warning checkbox
    const warningCheckbox = createFilterCheckbox('show-warnings', 'Warnings', currentFilters.showWarnings, (checked) => {
      currentFilters.showWarnings = checked;
      applyFilters();
    });
    severityGroup.appendChild(warningCheckbox);
    
    filterPanel.appendChild(severityGroup);
    
    // Category filters
    const categoryGroup = document.createElement('div');
    categoryGroup.style.marginBottom = '15px';
    
    const categoryTitle = document.createElement('h4');
    categoryTitle.textContent = 'Categories';
    categoryTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px;';
    categoryGroup.appendChild(categoryTitle);
    
    const categories = [
      { key: 'images', label: 'Images' },
      { key: 'forms', label: 'Forms' },
      { key: 'links', label: 'Links' },
      { key: 'structure', label: 'Structure' },
      { key: 'multimedia', label: 'Multimedia' },
      { key: 'navigation', label: 'Navigation' }
    ];
    
    categories.forEach(({ key, label }) => {
      const checkbox = createFilterCheckbox(`category-${key}`, label, currentFilters.categories[key], (checked) => {
        currentFilters.categories[key] = checked;
        applyFilters();
      });
      categoryGroup.appendChild(checkbox);
    });
    
    filterPanel.appendChild(categoryGroup);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Filters';
    closeButton.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    closeButton.addEventListener('click', () => {
      filterPanel.remove();
    });
    filterPanel.appendChild(closeButton);
    
    document.body.appendChild(filterPanel);
    
  } catch (error) {
    console.error('Error creating filter panel:', error);
  }
}

/**
 * Creates a checkbox input for filter controls.
 * @param {string} id - Input ID
 * @param {string} label - Label text
 * @param {boolean} checked - Initial checked state
 * @param {Function} onChange - Change handler function
 * @returns {HTMLElement} Checkbox container element
 */
function createFilterCheckbox(id, label, checked, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 4px 0; display: flex; align-items: center;';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = checked;
  checkbox.style.marginRight = '8px';
  checkbox.addEventListener('change', (e) => onChange(e.target.checked));
  
  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;
  labelElement.style.cursor = 'pointer';
  
  container.appendChild(checkbox);
  container.appendChild(labelElement);
  
  return container;
}

/**
 * Creates a summary panel showing accessibility results overview.
 * @returns {void}
 */
function createSummaryPanel() {
  try {
    // Remove existing summary panel
    const existing = document.querySelector('.a11y-summary-panel');
    if (existing) {
      existing.remove();
    }
    
    // Analyze logs to create summary
    const summary = analyzeLogs();
    
    const summaryPanel = document.createElement('div');
    summaryPanel.className = 'a11y-summary-panel';
    summaryPanel.setAttribute('aria-label', 'Accessibility results summary');
    
    summaryPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
      background: white;
      border: 2px solid #007cba;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      min-width: 280px;
      max-width: 400px;
      max-height: 70vh;
      overflow-y: auto;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Accessibility Summary';
    title.style.cssText = 'margin: 0 0 15px 0; color: #007cba; font-size: 18px; text-align: center;';
    summaryPanel.appendChild(title);
    
    // Overall stats
    const overallStats = document.createElement('div');
    overallStats.style.cssText = 'margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;';
    
    const totalIssues = document.createElement('div');
    totalIssues.innerHTML = `<strong>Total Issues: ${summary.total}</strong>`;
    totalIssues.style.fontSize = '16px';
    overallStats.appendChild(totalIssues);
    
    const severityBreakdown = document.createElement('div');
    severityBreakdown.innerHTML = `
      <div style="margin-top: 8px;">
        <span style="color: #dc3545;">● Errors: ${summary.errors}</span>
        <span style="margin-left: 15px; color: #ffc107;">● Warnings: ${summary.warnings}</span>
      </div>
    `;
    overallStats.appendChild(severityBreakdown);
    
    summaryPanel.appendChild(overallStats);
    
    // Category breakdown
    if (Object.keys(summary.categories).length > 0) {
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = 'Issues by Category';
      categoryTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; color: #333;';
      summaryPanel.appendChild(categoryTitle);
      
      const categoryList = document.createElement('div');
      Object.entries(summary.categories)
        .sort(([,a], [,b]) => b - a) // Sort by count descending
        .forEach(([category, count]) => {
          const categoryItem = document.createElement('div');
          categoryItem.style.cssText = 'display: flex; justify-content: space-between; margin: 5px 0; padding: 5px 0; border-bottom: 1px solid #eee;';
          
          const categoryName = document.createElement('span');
          categoryName.textContent = category.charAt(0).toUpperCase() + category.slice(1);
          
          const categoryCount = document.createElement('span');
          categoryCount.textContent = count;
          categoryCount.style.cssText = 'font-weight: bold; color: #007cba;';
          
          categoryItem.appendChild(categoryName);
          categoryItem.appendChild(categoryCount);
          categoryList.appendChild(categoryItem);
        });
      
      summaryPanel.appendChild(categoryList);
    }
    
    // Top issues
    if (summary.topIssues.length > 0) {
      const topIssuesTitle = document.createElement('h4');
      topIssuesTitle.textContent = 'Most Common Issues';
      topIssuesTitle.style.cssText = 'margin: 20px 0 10px 0; font-size: 14px; color: #333;';
      summaryPanel.appendChild(topIssuesTitle);
      
      const topIssuesList = document.createElement('div');
      summary.topIssues.slice(0, 5).forEach(({ message, count }) => {
        const issueItem = document.createElement('div');
        issueItem.style.cssText = 'margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;';
        
        const issueText = document.createElement('div');
        issueText.textContent = message;
        issueText.style.cssText = 'margin-bottom: 4px;';
        
        const issueCount = document.createElement('div');
        issueCount.textContent = `Occurrences: ${count}`;
        issueCount.style.cssText = 'font-weight: bold; color: #666; font-size: 11px;';
        
        issueItem.appendChild(issueText);
        issueItem.appendChild(issueCount);
        topIssuesList.appendChild(issueItem);
      });
      
      summaryPanel.appendChild(topIssuesList);
    }
    
    // Actions section
    const actionsSection = document.createElement('div');
    actionsSection.style.cssText = 'margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;';
    
    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
    
    // Filter button
    const filterButton = document.createElement('button');
    filterButton.textContent = 'Filter Results';
    filterButton.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    filterButton.addEventListener('click', () => {
      const existingFilter = document.querySelector('.a11y-filter-panel');
      if (existingFilter) {
        existingFilter.remove();
      } else {
        createFilterPanel();
      }
    });
    buttonGroup.appendChild(filterButton);
    
    // Config button
    const configButton = document.createElement('button');
    configButton.textContent = 'Configure Rules';
    configButton.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: #17a2b8;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    configButton.addEventListener('click', () => {
      const existingConfig = document.querySelector('.a11y-config-panel');
      if (existingConfig) {
        existingConfig.remove();
      } else {
        createConfigPanel();
      }
    });
    buttonGroup.appendChild(configButton);
    
    // Export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Report';
    exportButton.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    exportButton.addEventListener('click', () => {
      createExportPanel();
    });
    buttonGroup.appendChild(exportButton);
    
    actionsSection.appendChild(buttonGroup);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Summary';
    closeButton.style.cssText = `
      width: 100%;
      margin-top: 10px;
      padding: 8px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    closeButton.addEventListener('click', () => {
      summaryPanel.remove();
    });
    actionsSection.appendChild(closeButton);
    
    summaryPanel.appendChild(actionsSection);
    
    document.body.appendChild(summaryPanel);
    
  } catch (error) {
    console.error('Error creating summary panel:', error);
  }
}

/**
 * Analyzes the logs array to create summary statistics.
 * @returns {Object} Summary object with statistics
 */
function analyzeLogs() {
  const summary = {
    total: logs.length,
    errors: 0,
    warnings: 0,
    categories: {},
    topIssues: []
  };
  
  const messageCount = {};
  
  logs.forEach(log => {
    // Count by severity
    if (log.level === 'error') {
      summary.errors++;
    } else if (log.level === 'warning') {
      summary.warnings++;
    }
    
    // Count by category
    const category = categorizeIssue(log.message, log.element);
    summary.categories[category] = (summary.categories[category] || 0) + 1;
    
    // Count message occurrences
    messageCount[log.message] = (messageCount[log.message] || 0) + 1;
  });
  
  // Create top issues list
  summary.topIssues = Object.entries(messageCount)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);
  
  return summary;
}

/**
 * Loads custom rules from Chrome storage.
 * @async
 * @returns {Promise<void>}
 */
async function loadCustomRules() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(['customRules']);
      if (result.customRules && typeof result.customRules === 'object') {
        // Merge loaded rules with defaults to ensure all properties exist
        customRules = { ...customRules, ...result.customRules };
        console.log('Custom rules loaded from storage');
      }
    }
  } catch (error) {
    console.warn('Failed to load custom rules:', error);
  }
}

/**
 * Saves custom rules to Chrome storage.
 * @async
 * @returns {Promise<void>}
 */
async function saveCustomRules() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ customRules });
      console.log('Custom rules saved to storage');
    }
  } catch (error) {
    console.warn('Failed to save custom rules:', error);
  }
}

/**
 * Resets custom rules to default values.
 * @returns {void}
 */
function resetCustomRules() {
  customRules = {
    images: {
      enabled: true,
      checkMissingAlt: true,
      checkUninformativeAlt: true,
      checkEmptyAltWithTitle: true,
      checkDifferentAltTitle: true,
      allowDecorativeImages: true
    },
    forms: {
      enabled: true,
      checkMissingLabels: true,
      checkInputImageAlt: true,
      checkFieldsetLegend: true,
      requireExplicitLabels: false
    },
    links: {
      enabled: true,
      checkEmptyLinks: true,
      checkGenericLinkText: true,
      checkInvalidHref: true,
      checkMatchingTitleText: true,
      allowJavaScriptLinks: false
    },
    structure: {
      enabled: true,
      checkMissingLandmarks: true,
      checkTableHeaders: true,
      checkNestedTables: true,
      checkUninformativeSummary: true,
      requireMainLandmark: true,
      requireHeadingStructure: false
    },
    multimedia: {
      enabled: true,
      checkAutoplay: true,
      checkIframeTitles: true,
      checkMediaCaptions: false,
      allowAutoplayWithControls: false
    },
    navigation: {
      enabled: true,
      checkTabIndex: true,
      checkKeyboardTraps: false,
      checkFocusIndicators: false,
      allowPositiveTabIndex: false
    },
    typography: {
      enabled: true,
      checkFontSize: true,
      minimumFontSize: 12,
      checkColorContrast: false,
      checkLineHeight: false
    },
    aria: {
      enabled: true,
      checkRoleBasedElements: true,
      requireAriaLabels: false,
      checkAriaReferences: false,
      allowRedundantRoles: true
    }
  };
}

/**
 * Creates a configuration panel for customizing accessibility rules.
 * @returns {void}
 */
function createConfigPanel() {
  try {
    // Remove existing config panel
    const existing = document.querySelector('.a11y-config-panel');
    if (existing) {
      existing.remove();
    }
    
    const configPanel = document.createElement('div');
    configPanel.className = 'a11y-config-panel';
    configPanel.setAttribute('aria-label', 'Accessibility rules configuration panel');
    
    configPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 2};
      background: white;
      border: 2px solid #007cba;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Accessibility Rules Configuration';
    title.style.cssText = 'margin: 0 0 20px 0; color: #007cba; font-size: 18px; text-align: center;';
    configPanel.appendChild(title);
    
    // Create sections for each rule category
    const categories = [
      { key: 'images', label: 'Image Accessibility' },
      { key: 'forms', label: 'Form Accessibility' },
      { key: 'links', label: 'Link Accessibility' },
      { key: 'structure', label: 'Document Structure' },
      { key: 'multimedia', label: 'Multimedia Content' },
      { key: 'navigation', label: 'Navigation & Interaction' },
      { key: 'typography', label: 'Text & Typography' },
      { key: 'aria', label: 'ARIA & Semantics' }
    ];
    
    categories.forEach(({ key, label }) => {
      const section = createConfigSection(key, label, customRules[key]);
      configPanel.appendChild(section);
    });
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: center; border-top: 1px solid #eee; padding-top: 20px;';
    
    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Configuration';
    saveButton.style.cssText = `
      padding: 10px 20px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    saveButton.addEventListener('click', async () => {
      await saveCustomRules();
      configPanel.remove();
      // Optionally re-run checks with new rules
      if (logs.length > 0) {
        removeAccessibilityOverlays();
        setTimeout(() => runAccessibilityChecks(), 100);
      }
    });
    actionButtons.appendChild(saveButton);
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Defaults';
    resetButton.style.cssText = `
      padding: 10px 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    resetButton.addEventListener('click', () => {
      if (confirm('Reset all rules to default values? This will overwrite your current configuration.')) {
        resetCustomRules();
        configPanel.remove();
        createConfigPanel(); // Recreate with default values
      }
    });
    actionButtons.appendChild(resetButton);
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelButton.addEventListener('click', () => {
      configPanel.remove();
    });
    actionButtons.appendChild(cancelButton);
    
    configPanel.appendChild(actionButtons);
    
    document.body.appendChild(configPanel);
    
  } catch (error) {
    console.error('Error creating config panel:', error);
  }
}

/**
 * Creates a configuration section for a specific rule category.
 * @param {string} categoryKey - The category key
 * @param {string} categoryLabel - The display label for the category
 * @param {Object} rules - The rules object for this category
 * @returns {HTMLElement} The section element
 */
function createConfigSection(categoryKey, categoryLabel, rules) {
  const section = document.createElement('div');
  section.style.cssText = 'margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px;';
  
  // Section header with enable/disable toggle
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';
  
  const enableCheckbox = document.createElement('input');
  enableCheckbox.type = 'checkbox';
  enableCheckbox.checked = rules.enabled;
  enableCheckbox.style.marginRight = '10px';
  enableCheckbox.addEventListener('change', (e) => {
    rules.enabled = e.target.checked;
    // Enable/disable all other checkboxes in this section
    const otherCheckboxes = section.querySelectorAll('input[type="checkbox"]:not(:first-child)');
    otherCheckboxes.forEach(cb => cb.disabled = !e.target.checked);
  });
  
  const headerLabel = document.createElement('h4');
  headerLabel.textContent = categoryLabel;
  headerLabel.style.cssText = 'margin: 0; font-size: 16px; color: #333;';
  
  header.appendChild(enableCheckbox);
  header.appendChild(headerLabel);
  section.appendChild(header);
  
  // Create checkboxes for each rule
  Object.entries(rules).forEach(([key, value]) => {
    if (key === 'enabled') return; // Skip the enabled flag
    
    if (typeof value === 'boolean') {
      const checkbox = createConfigCheckbox(key, formatRuleLabel(key), value, (checked) => {
        rules[key] = checked;
      });
      checkbox.style.marginLeft = '20px';
      if (!rules.enabled) {
        checkbox.querySelector('input').disabled = true;
      }
      section.appendChild(checkbox);
    } else if (typeof value === 'number') {
      const numberInput = createConfigNumberInput(key, formatRuleLabel(key), value, (newValue) => {
        rules[key] = newValue;
      });
      numberInput.style.marginLeft = '20px';
      if (!rules.enabled) {
        numberInput.querySelector('input').disabled = true;
      }
      section.appendChild(numberInput);
    }
  });
  
  return section;
}

/**
 * Creates a checkbox input for configuration.
 * @param {string} key - The rule key
 * @param {string} label - The display label
 * @param {boolean} checked - Initial checked state
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Checkbox container
 */
function createConfigCheckbox(key, label, checked, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `config-${key}`;
  checkbox.checked = checked;
  checkbox.style.marginRight = '8px';
  checkbox.addEventListener('change', (e) => onChange(e.target.checked));
  
  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', `config-${key}`);
  labelElement.textContent = label;
  labelElement.style.cssText = 'cursor: pointer; font-size: 13px;';
  
  container.appendChild(checkbox);
  container.appendChild(labelElement);
  
  return container;
}

/**
 * Creates a number input for configuration.
 * @param {string} key - The rule key
 * @param {string} label - The display label
 * @param {number} value - Initial value
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Number input container
 */
function createConfigNumberInput(key, label, value, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';
  
  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', `config-${key}`);
  labelElement.textContent = label;
  labelElement.style.cssText = 'margin-right: 10px; font-size: 13px; min-width: 150px;';
  
  const input = document.createElement('input');
  input.type = 'number';
  input.id = `config-${key}`;
  input.value = value;
  input.min = key === 'minimumFontSize' ? '8' : '0';
  input.max = key === 'minimumFontSize' ? '24' : '100';
  input.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 3px;';
  input.addEventListener('change', (e) => onChange(parseInt(e.target.value) || value));
  
  container.appendChild(labelElement);
  container.appendChild(input);
  
  return container;
}

/**
 * Formats a rule key into a readable label.
 * @param {string} key - The rule key
 * @returns {string} Formatted label
 */
function formatRuleLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Alt/g, 'Alt Text')
    .replace(/Href/g, 'Link Target')
    .replace(/Aria/g, 'ARIA');
}

/**
 * Creates an export panel for downloading accessibility reports.
 * @returns {void}
 */
function createExportPanel() {
  try {
    // Remove existing export panel
    const existing = document.querySelector('.a11y-export-panel');
    if (existing) {
      existing.remove();
    }
    
    const exportPanel = document.createElement('div');
    exportPanel.className = 'a11y-export-panel';
    exportPanel.setAttribute('aria-label', 'Export accessibility report panel');
    
    exportPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 3};
      background: white;
      border: 2px solid #28a745;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      width: 400px;
      max-width: 90vw;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Export Accessibility Report';
    title.style.cssText = 'margin: 0 0 20px 0; color: #28a745; font-size: 18px; text-align: center;';
    exportPanel.appendChild(title);
    
    // Report info
    const summary = analyzeLogs();
    const infoSection = document.createElement('div');
    infoSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;';
    infoSection.innerHTML = `
      <div><strong>Report Summary:</strong></div>
      <div style="margin-top: 8px;">
        <div>• Total Issues: ${summary.total}</div>
        <div>• Errors: ${summary.errors}</div>
        <div>• Warnings: ${summary.warnings}</div>
        <div>• Page: ${document.title || 'Untitled'}</div>
        <div>• URL: ${window.location.href}</div>
        <div>• Generated: ${new Date().toLocaleString()}</div>
      </div>
    `;
    exportPanel.appendChild(infoSection);
    
    // Export format options
    const formatSection = document.createElement('div');
    formatSection.style.cssText = 'margin-bottom: 20px;';
    
    const formatTitle = document.createElement('h4');
    formatTitle.textContent = 'Export Format:';
    formatTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px;';
    formatSection.appendChild(formatTitle);
    
    const formats = [
      { value: 'json', label: 'JSON (Developer-friendly)' },
      { value: 'csv', label: 'CSV (Spreadsheet)' },
      { value: 'html', label: 'HTML (Readable Report)' },
      { value: 'txt', label: 'Text (Simple List)' }
    ];
    
    let selectedFormat = 'json';
    
    formats.forEach(format => {
      const radioContainer = document.createElement('div');
      radioContainer.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'exportFormat';
      radio.value = format.value;
      radio.id = `export-${format.value}`;
      radio.checked = format.value === selectedFormat;
      radio.style.marginRight = '8px';
      radio.addEventListener('change', () => {
        if (radio.checked) {
          selectedFormat = format.value;
        }
      });
      
      const label = document.createElement('label');
      label.setAttribute('for', `export-${format.value}`);
      label.textContent = format.label;
      label.style.cssText = 'cursor: pointer; font-size: 13px;';
      
      radioContainer.appendChild(radio);
      radioContainer.appendChild(label);
      formatSection.appendChild(radioContainer);
    });
    
    exportPanel.appendChild(formatSection);
    
    // Action buttons
    const buttonSection = document.createElement('div');
    buttonSection.style.cssText = 'display: flex; gap: 10px; justify-content: center;';
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Download Report';
    exportBtn.style.cssText = `
      padding: 10px 20px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    exportBtn.addEventListener('click', () => {
      exportReport(selectedFormat);
      exportPanel.remove();
    });
    buttonSection.appendChild(exportBtn);
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.addEventListener('click', () => {
      exportPanel.remove();
    });
    buttonSection.appendChild(cancelBtn);
    
    exportPanel.appendChild(buttonSection);
    
    document.body.appendChild(exportPanel);
    
  } catch (error) {
    console.error('Error creating export panel:', error);
  }
}

/**
 * Exports accessibility report in the specified format.
 * @param {string} format - Export format (json, csv, html, txt)
 * @returns {void}
 */
function exportReport(format) {
  try {
    const summary = analyzeLogs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accessibility-report-${timestamp}`;
    
    let content, mimeType, extension;
    
    switch (format) {
      case 'json':
        content = generateJSONReport(summary);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = generateCSVReport();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'html':
        content = generateHTMLReport(summary);
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'txt':
        content = generateTextReport(summary);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    // Create and trigger download
    downloadFile(content, `${filename}.${extension}`, mimeType);
    
    console.log(`Accessibility report exported as ${format.toUpperCase()}`);
    
  } catch (error) {
    console.error('Error exporting report:', error);
    alert(`Failed to export report: ${error.message}`);
  }
}

/**
 * Generates a JSON report of accessibility issues.
 * @param {Object} summary - Summary statistics
 * @returns {string} JSON report content
 */
function generateJSONReport(summary) {
  const report = {
    metadata: {
      title: document.title || 'Untitled',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      generator: 'Accessibility Highlighter v1.0.1',
      scanType: 'automatic'
    },
    summary: {
      totalIssues: summary.total,
      errorCount: summary.errors,
      warningCount: summary.warnings,
      categories: summary.categories,
      topIssues: summary.topIssues.slice(0, 10)
    },
    issues: logs.map((log, index) => ({
      id: index + 1,
      level: log.level,
      message: log.message,
      category: categorizeIssue(log.message, log.element),
      element: {
        tagName: log.element ? log.element.tagName.toLowerCase() : 'unknown',
        xpath: getElementXPath(log.element),
        outerHTML: log.element ? log.element.outerHTML.substring(0, 200) : 'N/A'
      },
      timestamp: log.timestamp || new Date().toISOString()
    })),
    configuration: {
      rulesApplied: Object.keys(customRules).filter(key => customRules[key].enabled),
      scanSettings: customRules
    }
  };
  
  return JSON.stringify(report, null, 2);
}

/**
 * Generates a CSV report of accessibility issues.
 * @returns {string} CSV report content
 */
function generateCSVReport() {
  const headers = ['ID', 'Level', 'Category', 'Message', 'Element', 'XPath', 'Timestamp'];
  const rows = [headers.join(',')];
  
  logs.forEach((log, index) => {
    const row = [
      index + 1,
      log.level,
      categorizeIssue(log.message, log.element),
      `"${log.message.replace(/"/g, '""')}"`,
      log.element ? log.element.tagName.toLowerCase() : 'unknown',
      `"${getElementXPath(log.element)}"`,
      log.timestamp || new Date().toISOString()
    ];
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}

/**
 * Generates an HTML report of accessibility issues.
 * @param {Object} summary - Summary statistics
 * @returns {string} HTML report content
 */
function generateHTMLReport(summary) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${document.title || 'Untitled'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #007cba; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .issue { border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 15px; padding: 15px; }
        .issue.error { border-left: 4px solid #dc3545; }
        .issue.warning { border-left: 4px solid #ffc107; }
        .category { display: inline-block; background: #007cba; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 10px; }
        .element { background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-item { text-align: center; padding: 15px; background: white; border-radius: 4px; border: 1px solid #dee2e6; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007cba; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Report</h1>
        <p><strong>Page:</strong> ${document.title || 'Untitled'}</p>
        <p><strong>URL:</strong> ${window.location.href}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Tool:</strong> Accessibility Highlighter v1.0.1</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${summary.total}</div>
                <div>Total Issues</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" style="color: #dc3545;">${summary.errors}</div>
                <div>Errors</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" style="color: #ffc107;">${summary.warnings}</div>
                <div>Warnings</div>
            </div>
        </div>
        
        ${Object.keys(summary.categories).length > 0 ? `
        <h3>Issues by Category</h3>
        <table>
            <thead>
                <tr><th>Category</th><th>Count</th></tr>
            </thead>
            <tbody>
                ${Object.entries(summary.categories)
                  .sort(([,a], [,b]) => b - a)
                  .map(([cat, count]) => `<tr><td>${cat.charAt(0).toUpperCase() + cat.slice(1)}</td><td>${count}</td></tr>`)
                  .join('')}
            </tbody>
        </table>
        ` : ''}
    </div>
    
    <div class="issues">
        <h2>Detailed Issues</h2>
        ${logs.length === 0 ? '<p>No accessibility issues found.</p>' : 
          logs.map((log, index) => `
            <div class="issue ${log.level || 'error'}">
                <div>
                    <span class="category">${categorizeIssue(log.message, log.element)}</span>
                    <strong>Issue #${index + 1}</strong>
                </div>
                <p>${log.message}</p>
                ${log.element ? `
                <div class="element">
                    <strong>Element:</strong> &lt;${log.element.tagName.toLowerCase()}&gt;<br>
                    <strong>XPath:</strong> ${getElementXPath(log.element)}<br>
                    <strong>HTML:</strong> ${log.element.outerHTML.substring(0, 200)}${log.element.outerHTML.length > 200 ? '...' : ''}
                </div>
                ` : ''}
            </div>
          `).join('')}
    </div>
</body>
</html>`;
  
  return html;
}

/**
 * Generates a plain text report of accessibility issues.
 * @param {Object} summary - Summary statistics
 * @returns {string} Text report content
 */
function generateTextReport(summary) {
  const lines = [];
  
  lines.push('ACCESSIBILITY REPORT');
  lines.push('===================');
  lines.push('');
  lines.push(`Page: ${document.title || 'Untitled'}`);
  lines.push(`URL: ${window.location.href}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Tool: Accessibility Highlighter v1.0.1`);
  lines.push('');
  
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Total Issues: ${summary.total}`);
  lines.push(`Errors: ${summary.errors}`);
  lines.push(`Warnings: ${summary.warnings}`);
  lines.push('');
  
  if (Object.keys(summary.categories).length > 0) {
    lines.push('ISSUES BY CATEGORY');
    lines.push('------------------');
    Object.entries(summary.categories)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${count}`);
      });
    lines.push('');
  }
  
  lines.push('DETAILED ISSUES');
  lines.push('---------------');
  
  if (logs.length === 0) {
    lines.push('No accessibility issues found.');
  } else {
    logs.forEach((log, index) => {
      lines.push(`${index + 1}. [${(log.level || 'error').toUpperCase()}] ${log.message}`);
      if (log.element) {
        lines.push(`   Element: <${log.element.tagName.toLowerCase()}>`);
        lines.push(`   XPath: ${getElementXPath(log.element)}`);
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

/**
 * Gets the XPath of an element.
 * @param {Element} element - The element to get XPath for
 * @returns {string} XPath string
 */
function getElementXPath(element) {
  if (!element) return 'N/A';
  
  try {
    const parts = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const part = `${tagName}[${index}]`;
      parts.unshift(part);
      
      current = current.parentNode;
    }
    
    return '/' + parts.join('/');
  } catch (error) {
    return 'XPath generation failed';
  }
}

/**
 * Downloads a file with the given content.
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {void}
 */
function downloadFile(content, filename, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Download failed');
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
    errorOverlays.forEach((overlay) => {
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
    
    // Clear logs array
    logs.length = 0;
    
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
 * @type {Object}
 */
const INCREMENTAL_CONFIG = {
  CHUNK_SIZE: 25, // Number of elements to process per chunk
  CHUNK_DELAY: 16, // Delay between chunks in milliseconds (approximately 60fps)
  MAX_SCAN_TIME: 5000, // Maximum time for a scan in milliseconds
  YIELD_EVERY: 50 // Yield after processing this many elements
};

/**
 * State for incremental scanning.
 * @type {Object|null}
 */
let incrementalState = null;

/**
 * Starts incremental accessibility scanning.
 * @returns {void}
 */
function startIncrementalScan() {
  try {
    // Clear previous logs and state
    logs.length = 0;
    
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
        acceptNode: function(node) {
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
      if (incrementalState.processedElements.has(node)) continue;
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
    const progress = 10 + Math.min(80, (incrementalState.processedCount / incrementalState.totalElements) * 80);
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
      checkFontSize(node);
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
      console.log(`Incremental scan completed: ${incrementalState.processedCount} elements in ${scanTime}ms`);
      console.table(logs);
      
      // Final progress update
      hideProgressIndicator();
      
      // Show completion message if there are issues
      if (logs.length > 0) {
        updateProgressIndicator(`Found ${logs.length} accessibility issues`, 100);
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
function runAccessibilityChecks(useIncremental = true) {
  // Throttling to prevent performance issues
  const now = Date.now();
  if (isRunning || (now - lastRunTime) < A11Y_CONFIG.PERFORMANCE.THROTTLE_DELAY) {
    console.log(A11Y_CONFIG.MESSAGES.THROTTLED);
    return;
  }
  
  isRunning = true;
  lastRunTime = now;
  
  // Use incremental scanning for better performance
  if (useIncremental) {
    startIncrementalScan();
    return;
  }
  
  try {
    // Clear previous logs
    logs.length = 0;
    
    // Show progress indicator
    showProgressIndicator('Starting accessibility scan...', 0);
    
    // Check for landmarks first (simple check)
    updateProgressIndicator('Checking page structure...', 10);
    checkForLandmarks();
    
    // Count total elements for progress tracking
    const allElements = document.querySelectorAll('*');
    const totalElements = allElements.length;
    
    updateProgressIndicator(`Scanning ${totalElements} elements...`, 20);
    
    // Use TreeWalker for efficient single-pass DOM traversal
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
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
    
    // Single pass through all elements
    let node;
    let processedCount = 0;
    const processedElements = new Set();
    
    while (node = walker.nextNode()) {
      // Skip if already processed
      if (processedElements.has(node)) continue;
      processedElements.add(node);
      processedCount++;
      
      // Update progress every 50 elements
      if (processedCount % 50 === 0) {
        const progress = 20 + Math.min(70, (processedCount / totalElements) * 70);
        updateProgressIndicator(`Processed ${processedCount} of ${totalElements} elements...`, progress);
      }
      
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
      if (A11Y_CONFIG.SELECTORS.TEXT_ELEMENTS.includes(tagName) && 
          node.textContent && node.textContent.trim().length > 0) {
        try {
          const fontSize = parseFloat(style.fontSize || window.getComputedStyle(node).fontSize);
          if (fontSize < A11Y_CONFIG.PERFORMANCE.FONT_SIZE_THRESHOLD) {
            console.log(node);
            overlay.call(node, "overlay", "error", A11Y_CONFIG.MESSAGES.SMALL_FONT_SIZE);
          }
        } catch (error) {
          // Skip elements that can't be styled
        }
      }
    }
    
    // Finalize progress
    updateProgressIndicator('Completing scan...', 95);
    
    // Log results
    if (logs.length > 0) {
      updateProgressIndicator(`Found ${logs.length} accessibility issues. Press Alt+Shift+F for filters.`, 100);
      console.table(logs);
      console.log('💡 Tip: Press Alt+Shift+F to open the filter panel and customize which issues are shown.');
    } else {
      updateProgressIndicator('No accessibility issues found!', 100);
      console.log(A11Y_CONFIG.MESSAGES.NO_ISSUES);
    }
    
    // Hide progress indicator after a brief delay
    setTimeout(() => {
      hideProgressIndicator();
    }, 2000);
    
  } catch (error) {
    console.error('Error during accessibility checks:', error);
    updateProgressIndicator('Error during scan', 100);
    setTimeout(() => {
      hideProgressIndicator();
    }, 3000);
  } finally {
    isRunning = false;
  }
}

/**
 * Checks a single element for multiple accessibility issues in one pass.
 * @param {Element} element - The element to check
 * @returns {void}
 */
function checkElement(element) {
  if (!element) return;
  
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  
  try {
    switch (tagName) {
      case 'img':
        checkImageElement(element);
        break;
      case 'button':
        checkButtonElement(element);
        break;
      case 'a':
        checkLinkElement(element);
        break;
      case 'fieldset':
        checkFieldsetElement(element);
        break;
      case 'input':
        checkInputElement(element);
        break;
      case 'table':
        checkTableElement(element);
        break;
      case 'iframe':
        checkIframeElement(element);
        break;
      case 'audio':
      case 'video':
        checkMediaElement(element);
        break;
      default:
        // Check role-based elements
        if (role) {
          checkRoleBasedElement(element, role);
        }
        // Check tabindex on non-interactive elements
        if (element.hasAttribute('tabindex')) {
          checkTabIndexElement(element);
        }
        break;
    }
  } catch (error) {
    console.warn('Error checking element:', element, error);
  }
}

/**
 * Checks image elements for accessibility issues.
 * @param {HTMLImageElement} element - The image element to check
 * @returns {void}
 */
function checkImageElement(element) {
  // Skip if image checks are disabled
  if (!customRules.images.enabled) return;
  
  // Check for missing alt attribute
  if (customRules.images.checkMissingAlt && !element.hasAttribute('alt')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.MISSING_ALT);
    return;
  }
  
  const altValue = element.getAttribute('alt');
  const titleValue = element.getAttribute('title');
  
  // Check for uninformative alt text
  if (customRules.images.checkUninformativeAlt && altValue && 
      A11Y_CONFIG.PROHIBITED_ALT_VALUES.includes(altValue.toLowerCase())) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.UNINFORMATIVE_ALT);
  }
  
  // Check for empty alt with non-empty title
  if (customRules.images.checkEmptyAltWithTitle && altValue === '' && 
      titleValue && titleValue.trim() !== '') {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.EMPTY_ALT_WITH_TITLE);
  }
  
  // Check for different alt and title attributes
  if (customRules.images.checkDifferentAltTitle && altValue && titleValue && 
      altValue.trim() !== '' && titleValue.trim() !== '' && 
      altValue.toLowerCase() !== titleValue.toLowerCase()) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.DIFFERENT_ALT_TITLE);
  }
}

/**
 * Checks button elements for accessibility issues.
 * @param {HTMLButtonElement|Element} element - The button element to check
 * @returns {void}
 */
function checkButtonElement(element) {
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
  const hasTextContent = element.textContent && element.textContent.trim() !== '';
  
  if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.BUTTON_NO_LABEL);
  }
}

/**
 * Checks link elements for accessibility issues.
 * @param {HTMLAnchorElement} element - The link element to check
 * @returns {void}
 */
function checkLinkElement(element) {
  const href = element.getAttribute('href');
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
  const textContent = element.textContent ? element.textContent.trim() : '';
  const titleValue = element.getAttribute('title');
  const role = element.getAttribute('role');
  
  // Skip if it's a button role
  if (role === 'button') return;
  
  // Check for empty links
  if (!hasAriaLabel && !hasAriaLabelledby && textContent === '') {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.LINK_NO_CONTENT);
    return;
  }
  
  // Check for invalid href
  if (href === '#' || (href && href.startsWith('javascript:'))) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.INVALID_HREF);
  }
  
  // Check for generic link text
  if (textContent && A11Y_CONFIG.PROHIBITED_LINK_TEXT.includes(textContent.toLowerCase())) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.GENERIC_LINK_TEXT);
  }
  
  // Check for matching title and text
  if (titleValue && textContent && titleValue.toLowerCase() === textContent.toLowerCase()) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.MATCHING_TITLE_TEXT);
  }
}

/**
 * Checks fieldset elements for accessibility issues.
 * @param {HTMLFieldSetElement} element - The fieldset element to check
 * @returns {void}
 */
function checkFieldsetElement(element) {
  if (!element.querySelector('legend')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.FIELDSET_NO_LEGEND);
  }
}

/**
 * Checks input elements for accessibility issues.
 * @param {HTMLInputElement} element - The input element to check
 * @returns {void}
 */
function checkInputElement(element) {
  const type = element.getAttribute('type');
  
  if (type === 'image') {
    const hasAlt = element.hasAttribute('alt');
    const hasAriaLabel = element.hasAttribute('aria-label');
    
    if (!hasAlt && !hasAriaLabel) {
      console.log(element);
      overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.INPUT_IMAGE_NO_ALT);
    }
  } else if (type !== 'submit' && type !== 'image' && type !== 'hidden') {
    // Check for form fields without labels
    const id = element.getAttribute('id');
    if (!id || !document.querySelector(`label[for="${id}"]`)) {
      console.log(element);
      overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.FORM_FIELD_NO_LABEL);
    }
  }
}

/**
 * Checks table elements for accessibility issues.
 * @param {HTMLTableElement} element - The table element to check
 * @returns {void}
 */
function checkTableElement(element) {
  // Check for tables without TH elements
  if (!element.querySelector('th')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.TABLE_NO_HEADERS);
  }
  
  // Check for nested tables
  if (element.closest('th, td')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.NESTED_TABLE);
  }
  
  // Check for uninformative summary
  const summaryValue = element.getAttribute('summary');
  if (summaryValue) {
    const summaryTrimmed = summaryValue.trim();
    if (A11Y_CONFIG.PROHIBITED_TABLE_SUMMARIES.some(badSummary => 
        summaryTrimmed.toLowerCase().includes(badSummary.toLowerCase()))) {
      console.log(element);
      overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.UNINFORMATIVE_SUMMARY);
    }
  }
}

/**
 * Checks iframe elements for accessibility issues.
 * @param {HTMLIFrameElement} element - The iframe element to check
 * @returns {void}
 */
function checkIframeElement(element) {
  if (!element.hasAttribute('title')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.IFRAME_NO_TITLE);
  }
}

/**
 * Checks media elements for accessibility issues.
 * @param {HTMLMediaElement} element - The media element to check
 * @returns {void}
 */
function checkMediaElement(element) {
  // Check for autoplay
  if (element.hasAttribute('autoplay')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.MEDIA_AUTOPLAY);
  }
  
  // Check for captions
  if (!element.querySelector('track[kind="captions"]')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.MEDIA_NO_CAPTIONS);
  }
}

/**
 * Checks role-based elements for accessibility issues.
 * @param {Element} element - The element to check
 * @param {string} role - The role attribute value
 * @returns {void}
 */
function checkRoleBasedElement(element, role) {
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
  
  switch (role) {
    case 'img':
      if (!hasAriaLabel && !hasAriaLabelledby) {
        console.log(element);
        overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.ROLE_IMG_NO_LABEL);
      }
      break;
    case 'button':
      const hasTextContent = element.textContent && element.textContent.trim() !== '';
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
        console.log(element);
        overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.BUTTON_NO_LABEL);
      }
      break;
    case 'link':
      const textContent = element.textContent ? element.textContent.trim() : '';
      if (!hasAriaLabel && !hasAriaLabelledby && textContent === '') {
        console.log(element);
        overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.LINK_NO_CONTENT);
      }
      break;
  }
}

/**
 * Checks elements with tabindex for accessibility issues.
 * @param {Element} element - The element to check
 * @returns {void}
 */
function checkTabIndexElement(element) {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const tabindexValue = parseInt(element.getAttribute('tabindex'), 10);
  
  // Skip interactive elements and elements with roles
  if (A11Y_CONFIG.SELECTORS.INTERACTIVE_ELEMENTS.includes(tagName) || role) {
    return;
  }
  
  // Only flag elements with tabindex=0 or positive tabindex values
  if (!isNaN(tabindexValue) && tabindexValue >= 0) {
    console.log(element);
    overlay.call(element, "overlay", "warning", A11Y_CONFIG.MESSAGES.NON_ACTIONABLE_TABINDEX + tabindexValue);
  }
}

/**
 * Optimized font size check - only checks text-containing elements.
 * Note: This function is now integrated into the main traversal for better performance.
 * Kept for backward compatibility and testing.
 * @returns {void}
 */
function checkFontSizes() {
  // This functionality is now integrated into runAccessibilityChecks
  // to avoid multiple DOM traversals
  // Silently do nothing - functionality integrated into main traversal
}

/**
 * Checks for landmark elements on the page.
 * @returns {void}
 */
function checkForLandmarks() {
  const landmarks = document.querySelectorAll(A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS);
  
  if (landmarks.length === 0) {
    console.log(document.body);
    overlay.call(document.body, "overlay", "error", A11Y_CONFIG.MESSAGES.NO_LANDMARKS);
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
chrome.storage.local.get(["isEnabled"], (result) => {
  try {
    // Validate storage result
    if (!result || typeof result !== 'object') {
      console.warn('Invalid storage result:', result);
      return;
    }
    
    // Validate isEnabled value (default to false if not set)
    const isEnabled = result.isEnabled === true;
    console.log("Initial isEnabled state:", isEnabled);
    toggleAccessibilityHighlight(isEnabled);
  } catch (error) {
    console.error('Error during initial state check:', error);
  }
});

/**
 * Listen for messages from the background or popup script to dynamically toggle features.
 * @param {Object} message - The message object from the sender
 * @param {chrome.runtime.MessageSender} _sender - The sender information (unused)
 * @param {Function} sendResponse - Function to send response back to sender
 * @returns {boolean} - True if response will be sent asynchronously, false otherwise
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    console.log("Message received", message);
    
    // Validate message structure
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message received:', message);
      return false;
    }
    
    if (message.action === "toggleAccessibilityHighlight") {
      // Validate isEnabled parameter
      if (typeof message.isEnabled !== 'boolean') {
        console.warn('Invalid isEnabled value:', message.isEnabled);
        return false;
      }
      
      toggleAccessibilityHighlight(message.isEnabled);
      sendResponse(message.isEnabled ? "highlighted" : "unhighlighted");
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
      const utterance = new SpeechSynthesisUtterance(`Issue ${index + 1} of ${overlays.length}: ${message}`);
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
  
  if (overlays.length === 0) return;
  
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
  if (!keyboardNavigationActive) return;
  
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
})();

// Export functions for testing (when in test environment)
if (typeof global !== 'undefined' && global.process && global.process.env && global.process.env.NODE_ENV === 'test') {
  global.runAccessibilityChecks = runAccessibilityChecks;
  global.removeAccessibilityOverlays = removeAccessibilityOverlays;
  global.removeOverlays = removeAccessibilityOverlays; // Alias for tests
  global.toggleAccessibilityHighlight = toggleAccessibilityHighlight;
  global.overlay = overlay;
  global.logs = logs;
  
  // Export individual check functions
  global.checkElement = checkElement;
  global.checkImageElement = checkImageElement;
  global.checkButtonElement = checkButtonElement;
  global.checkLinkElement = checkLinkElement;
  global.checkFieldsetElement = checkFieldsetElement;
  global.checkInputElement = checkInputElement;
  global.checkTableElement = checkTableElement;
  global.checkIframeElement = checkIframeElement;
  global.checkMediaElement = checkMediaElement;
  global.checkRoleBasedElement = checkRoleBasedElement;
  global.checkTabIndexElement = checkTabIndexElement;
  global.checkFontSizes = checkFontSizes;
  global.checkForLandmarks = checkForLandmarks;
  
  // Export throttling variables for test control
  global.resetThrottle = () => {
    isRunning = false;
    lastRunTime = 0;
  };
  
  // Create config object from constants
  global.A11Y_CONFIG = {
    PERFORMANCE: {
      THROTTLE_DELAY: 1000,
      FONT_SIZE_THRESHOLD: 12,
      MAX_LOG_ELEMENT_LENGTH: 100,
      Z_INDEX_OVERLAY: 2147483647
    },
    VISUAL: {
      ERROR_COLOR: '#FF0000',
      WARNING_COLOR: '#FFA500',
      OVERLAY_OPACITY: 0.4,
      BORDER_RADIUS: '5px',
      BORDER_WIDTH: '2px',
      STRIPE_GRADIENT: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)'
    },
    MESSAGES: {
      MISSING_ALT: 'img does not have an alt attribute',
      UNINFORMATIVE_ALT: 'Uninformative alt attribute value found',
      FORM_FIELD_NO_LABEL: 'Form field without a corresponding label',
      BUTTON_NO_LABEL: 'Button without aria-label or aria-labelledby or empty text content',
      GENERIC_LINK_TEXT: 'Link element with matching text content found',
      TABLE_NO_HEADERS: 'table without any th elements',
      IFRAME_NO_TITLE: 'iframe element without a title attribute',
      SMALL_FONT_SIZE: 'Text element with font size smaller than 12px',
      NO_LANDMARKS: 'No landmark elements found'
    }
  };
}