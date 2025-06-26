console.log("Content script loaded");

/**
 * Array to store accessibility check results for logging.
 * @type {LogEntry[]}
 */
const logs = [];

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
    // Get accurate element position and dimensions using getBoundingClientRect
    const rect = elementInError.getBoundingClientRect();
    
    // Skip if element is not visible
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Skipping overlay for zero-sized element:', elementInError);
      return;
    }
    
    // Sanitize message content
    const sanitizedMsg = String(msg).replace(/[<>]/g, '');
    
    // Create overlay element
    const overlayEl = document.createElement("div");
    overlayEl.classList.add(overlayClass);
    
    // Set positioning styles BEFORE appending to DOM
    overlayEl.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      display: block;
      pointer-events: none;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY};
      opacity: ${A11Y_CONFIG.VISUAL.OVERLAY_OPACITY};
      border-radius: ${A11Y_CONFIG.VISUAL.BORDER_RADIUS};
      background-image: ${A11Y_CONFIG.VISUAL.STRIPE_GRADIENT};
    `;
    
    overlayEl.setAttribute('data-a11ymessage', sanitizedMsg);
    
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

    // Push the error to the logs array
    logs.push({
      Level: level,
      Message: sanitizedMsg,
      Element: elementInError.outerHTML.slice(0, A11Y_CONFIG.PERFORMANCE.MAX_LOG_ELEMENT_LENGTH) + "...",
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
    const errorOverlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    errorOverlays.forEach((overlay) => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    // Clear logs array
    logs.length = 0;
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
 * Efficiently runs accessibility checks using optimized DOM traversal.
 * Uses single-pass traversal and targeted queries to improve performance.
 * @returns {void}
 */
function runAccessibilityChecks() {
  // Throttling to prevent performance issues
  const now = Date.now();
  if (isRunning || (now - lastRunTime) < A11Y_CONFIG.PERFORMANCE.THROTTLE_DELAY) {
    console.log(A11Y_CONFIG.MESSAGES.THROTTLED);
    return;
  }
  
  isRunning = true;
  lastRunTime = now;
  
  try {
    // Clear previous logs
    logs.length = 0;
    
    // Check for landmarks first (simple check)
    checkForLandmarks();
    
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
    const processedElements = new Set();
    
    while (node = walker.nextNode()) {
      // Skip if already processed
      if (processedElements.has(node)) continue;
      processedElements.add(node);
      
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
    
    // Log results
    if (logs.length > 0) {
      console.table(logs);
    } else {
      console.log(A11Y_CONFIG.MESSAGES.NO_ISSUES);
    }
  } catch (error) {
    console.error('Error during accessibility checks:', error);
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
  // Check for missing alt attribute
  if (!element.hasAttribute('alt')) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.MISSING_ALT);
    return;
  }
  
  const altValue = element.getAttribute('alt');
  const titleValue = element.getAttribute('title');
  
  // Check for uninformative alt text
  if (altValue && A11Y_CONFIG.PROHIBITED_ALT_VALUES.includes(altValue.toLowerCase())) {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.UNINFORMATIVE_ALT);
  }
  
  // Check for empty alt with non-empty title
  if (altValue === '' && titleValue && titleValue.trim() !== '') {
    console.log(element);
    overlay.call(element, "overlay", "error", A11Y_CONFIG.MESSAGES.EMPTY_ALT_WITH_TITLE);
  }
  
  // Check for different alt and title attributes
  if (altValue && titleValue && altValue.trim() !== '' && titleValue.trim() !== '' && 
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
    console.log("Initial isEnabled state:", result.isEnabled);
    toggleAccessibilityHighlight(result.isEnabled);
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