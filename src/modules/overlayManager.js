/**
 * @fileoverview Overlay management module for Accessibility Highlighter
 *
 * This module handles the creation, styling, positioning, and removal of
 * accessibility issue overlays on DOM elements. It provides functionality for:
 * - Creating visual overlays with proper styling
 * - Managing overlay visibility and filtering
 * - Categorizing accessibility issues
 * - Keyboard navigation highlighting
 *
 * @author AFixt
 * @version 1.0.1
 */

const { A11Y_CONFIG } = require('./config.js');
const { addLogEntry, getCurrentFilters } = require('./state.js');

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

    // Enhanced sanitization - remove all HTML tags and dangerous characters
    const sanitizedMsg = sanitizeMessage(msg);

    // Create overlay element
    const overlayEl = createOverlayElement(overlayClass, rect, sanitizedMsg);

    // Set overlay appearance based on level
    applyOverlayStyle(overlayEl, level);

    // Append overlay to document body
    document.body.appendChild(overlayEl);

    // Add to logs
    addOverlayToLogs(elementInError, sanitizedMsg, level);

  } catch (error) {
    console.error('Error creating overlay:', error);
  }
}

/**
 * Sanitizes a message by removing HTML tags and dangerous characters.
 * @param {string} msg - The message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeMessage(msg) {
  return String(msg)
    .replace(/[<>"'&]/g, '') // Remove HTML-related characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Creates an overlay DOM element with proper positioning.
 * @param {string} overlayClass - CSS class for the overlay
 * @param {DOMRect} rect - Element bounding rectangle
 * @param {string} message - Sanitized error message
 * @returns {HTMLElement} Created overlay element
 */
function createOverlayElement(overlayClass, rect, message) {
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

  // Use setAttribute for data attributes (dataset may not be available in all environments)
  overlayEl.setAttribute('data-a11ymessage', message);

  return overlayEl;
}

/**
 * Applies styling to an overlay element based on its level.
 * @param {HTMLElement} overlayEl - The overlay element
 * @param {'error'|'warning'} level - The error level
 * @returns {void}
 */
function applyOverlayStyle(overlayEl, level) {
  if (level === 'error') {
    overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.ERROR_COLOR;
    overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.ERROR_COLOR}`;
    overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.ERROR_OVERLAY);
  } else if (level === 'warning') {
    overlayEl.style.backgroundColor = A11Y_CONFIG.VISUAL.WARNING_COLOR;
    overlayEl.style.border = `${A11Y_CONFIG.VISUAL.BORDER_WIDTH} solid ${A11Y_CONFIG.VISUAL.WARNING_COLOR}`;
    overlayEl.classList.add(A11Y_CONFIG.CSS_CLASSES.WARNING_OVERLAY);
  }
}

/**
 * Adds an overlay to the logs array.
 * @param {Element} element - The problematic element
 * @param {string} message - The error message
 * @param {'error'|'warning'} level - The error level
 * @returns {void}
 */
function addOverlayToLogs(element, message, level) {
  const sanitizedElementHTML = element.outerHTML
    .slice(0, A11Y_CONFIG.PERFORMANCE.MAX_LOG_ELEMENT_LENGTH)
    .replace(/[<>"'&]/g, '') + '...';

  addLogEntry({
    Level: level,
    Message: message,
    Element: sanitizedElementHTML
  });
}

/**
 * Removes all accessibility overlays from the page.
 * @returns {void}
 */
function removeAccessibilityOverlays() {
  try {
    const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    overlays.forEach(overlay => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
    console.log(`Removed ${overlays.length} accessibility overlays`);
  } catch (error) {
    console.error('Error removing overlays:', error);
  }
}

/**
 * Highlights the current overlay for keyboard navigation.
 * @param {number} index - Index of the overlay to highlight
 * @returns {void}
 */
function highlightCurrentOverlay(index) {
  try {
    const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);

    // Remove highlight from all overlays
    overlays.forEach(overlay => {
      overlay.style.outline = '';
      overlay.style.outlineOffset = '';
    });

    // Highlight current overlay
    if (index >= 0 && index < overlays.length) {
      const currentOverlay = overlays[index];
      currentOverlay.style.outline = '3px solid #007cba';
      currentOverlay.style.outlineOffset = '2px';

      // Scroll overlay into view
      currentOverlay.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Log current issue details
      const message = currentOverlay.dataset.a11ymessage;
      console.log(`Overlay ${index + 1} of ${overlays.length}: ${message}`);
    }
  } catch (error) {
    console.error('Error highlighting overlay:', error);
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
    const filters = getCurrentFilters();
    let visibleCount = 0;

    allOverlays.forEach(overlay => {
      const level = overlay.classList.contains('a11y-error') ? 'error' : 'warning';
      const message = overlay.dataset.a11ymessage || '';
      const element = overlay.parentElement;
      const category = categorizeIssue(message, element);

      // Check if overlay should be visible based on filters
      const shouldShow =
        (level === 'error' && filters.showErrors) ||
        (level === 'warning' && filters.showWarnings);

      const categoryEnabled = filters.categories[category];

      if (shouldShow && categoryEnabled) {
        overlay.style.display = 'block';
        visibleCount++;
      } else {
        overlay.style.display = 'none';
      }
    });

    console.log(`Showing ${visibleCount} of ${allOverlays.length} accessibility issues`);
    return { visible: visibleCount, total: allOverlays.length };

  } catch (error) {
    console.error('Error applying filters:', error);
    return { visible: 0, total: 0 };
  }
}

/**
 * Gets the total count of overlays on the page.
 * @returns {number} Number of overlays
 */
function getOverlayCount() {
  try {
    const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    return overlays.length;
  } catch (error) {
    console.error('Error getting overlay count:', error);
    return 0;
  }
}

/**
 * Gets all visible overlays on the page.
 * @returns {NodeList} List of visible overlay elements
 */
function getVisibleOverlays() {
  try {
    const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    return Array.from(overlays).filter(overlay =>
      overlay.style.display !== 'none' &&
      window.getComputedStyle(overlay).display !== 'none'
    );
  } catch (error) {
    console.error('Error getting visible overlays:', error);
    return [];
  }
}

/**
 * Gets overlay information for a specific element.
 * @param {Element} target - The target element
 * @returns {Object|null} Overlay information or null if not found
 */
function getOverlayInfo(target) {
  try {
    const overlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    const targetOverlay = Array.from(overlays).find(overlay => {
      const rect = target.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      // Check if overlay position matches target position (within tolerance)
      const tolerance = 5;
      return Math.abs(rect.top - overlayRect.top) < tolerance &&
             Math.abs(rect.left - overlayRect.left) < tolerance;
    });

    if (targetOverlay) {
      return {
        element: targetOverlay,
        message: targetOverlay.dataset.a11ymessage,
        level: targetOverlay.classList.contains('a11y-error') ? 'error' : 'warning',
        category: categorizeIssue(targetOverlay.dataset.a11ymessage, target)
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting overlay info:', error);
    return null;
  }
}

// Export all overlay management functions for CommonJS
module.exports = {
  overlay,
  removeAccessibilityOverlays,
  highlightCurrentOverlay,
  categorizeIssue,
  applyFilters,
  getOverlayCount,
  getVisibleOverlays,
  getOverlayInfo
};