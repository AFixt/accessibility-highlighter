/**
 * @file Accessibility Highlighter element checks
 *
 * Per-element accessibility checks: images, buttons, links, fieldsets,
 * inputs, tables, iframes, media, ARIA-role elements, tabindex, font sizes,
 * and landmark detection. Each check function inspects a single element
 * (or the page) and calls `overlay()` to flag violations.
 *
 * Loaded as a separate content script (see manifest.json
 * `content_scripts.js` array) and runs in the same isolated world as
 * `contentScript.js`. Shared state (`A11Y_CONFIG`, `customRules`) and
 * helpers (`overlay`) are visible through the shared Script lexical
 * environment.
 *
 * @author AFixt
 */

/* global A11Y_CONFIG, customRules, overlay */
/**
 * Checks a single element for multiple accessibility issues in one pass.
 * @param {Element} element - The element to check
 * @returns {void}
 */
function checkElement(element) {
  if (!element) {
    return;
  }

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
  if (!customRules.images.enabled) {
    return;
  }

  // Check for missing alt attribute
  if (customRules.images.checkMissingAlt && !element.hasAttribute('alt')) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.MISSING_ALT);
    return;
  }

  const altValue = element.getAttribute('alt');
  const titleValue = element.getAttribute('title');

  // Check for uninformative alt text
  if (
    customRules.images.checkUninformativeAlt &&
    altValue &&
    A11Y_CONFIG.PROHIBITED_ALT_VALUES.includes(altValue.toLowerCase())
  ) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.UNINFORMATIVE_ALT);
  }

  // Check for empty alt with non-empty title
  if (
    customRules.images.checkEmptyAltWithTitle &&
    altValue === '' &&
    titleValue &&
    titleValue.trim() !== ''
  ) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.EMPTY_ALT_WITH_TITLE);
  }

  // Check for different alt and title attributes
  if (
    customRules.images.checkDifferentAltTitle &&
    altValue &&
    titleValue &&
    altValue.trim() !== '' &&
    titleValue.trim() !== '' &&
    altValue.toLowerCase() !== titleValue.toLowerCase()
  ) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.DIFFERENT_ALT_TITLE);
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
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.BUTTON_NO_LABEL);
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
  if (role === 'button') {
    return;
  }

  // Check for empty links
  if (!hasAriaLabel && !hasAriaLabelledby && textContent === '') {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.LINK_NO_CONTENT);
    return;
  }

  // Check for invalid href - includes data: and vbscript: protocols
  const lowerHref = href ? href.toLowerCase() : '';
  if (
    href === '#' ||
    lowerHref.startsWith('javascript:') ||
    lowerHref.startsWith('data:') ||
    lowerHref.startsWith('vbscript:')
  ) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.INVALID_HREF);
  }

  // Check for generic link text
  if (textContent && A11Y_CONFIG.PROHIBITED_LINK_TEXT.includes(textContent.toLowerCase())) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.GENERIC_LINK_TEXT);
  }

  // Check for matching title and text
  if (titleValue && textContent && titleValue.toLowerCase() === textContent.toLowerCase()) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.MATCHING_TITLE_TEXT);
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
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.FIELDSET_NO_LEGEND);
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
      overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.INPUT_IMAGE_NO_ALT);
    }
  } else if (type !== 'submit' && type !== 'image' && type !== 'hidden') {
    // Check for form fields without labels
    const id = element.getAttribute('id');
    if (!id || !document.querySelector(`label[for="${id}"]`)) {
      console.log(element);
      overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.FORM_FIELD_NO_LABEL);
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
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.TABLE_NO_HEADERS);
  }

  // Check for nested tables
  if (element.closest('th, td')) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.NESTED_TABLE);
  }

  // Check for uninformative summary
  const summaryValue = element.getAttribute('summary');
  if (summaryValue) {
    const summaryTrimmed = summaryValue.trim();
    if (
      A11Y_CONFIG.PROHIBITED_TABLE_SUMMARIES.some(badSummary =>
        summaryTrimmed.toLowerCase().includes(badSummary.toLowerCase())
      )
    ) {
      console.log(element);
      overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.UNINFORMATIVE_SUMMARY);
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
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.IFRAME_NO_TITLE);
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
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.MEDIA_AUTOPLAY);
  }

  // Check for captions
  if (!element.querySelector('track[kind="captions"]')) {
    console.log(element);
    overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.MEDIA_NO_CAPTIONS);
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
  const isAriaHidden = element.getAttribute('aria-hidden') === 'true';

  switch (role) {
    case 'img':
      if (!hasAriaLabel && !hasAriaLabelledby && !isAriaHidden) {
        console.log(element);
        overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.ROLE_IMG_NO_LABEL);
      }
      break;
    case 'button': {
      const hasTextContent = element.textContent && element.textContent.trim() !== '';
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
        console.log(element);
        overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.BUTTON_NO_LABEL);
      }
      break;
    }
    case 'link': {
      const textContent = element.textContent ? element.textContent.trim() : '';
      if (!hasAriaLabel && !hasAriaLabelledby && textContent === '') {
        console.log(element);
        overlay.call(element, 'overlay', 'error', A11Y_CONFIG.MESSAGES.LINK_NO_CONTENT);
      }
      break;
    }
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
    overlay.call(
      element,
      'overlay',
      'warning',
      A11Y_CONFIG.MESSAGES.NON_ACTIONABLE_TABINDEX + tabindexValue
    );
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
    overlay.call(document.body, 'overlay', 'error', A11Y_CONFIG.MESSAGES.NO_LANDMARKS);
  }
}

// Export to globals when running under Jest so tests can reach these
// functions. The runtime extension uses the shared Script lexical
// environment instead.
if (
  typeof global !== 'undefined' &&
  global.process &&
  global.process.env &&
  global.process.env.NODE_ENV === 'test'
) {
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
}
