console.log("Content script loaded");
const logs = [];

/**
 * List of table summary values that should be avoided.
 */
const stupidTableSummaries = [
  "combobox",
  "Layout",
  "for layout",
  "layout table",
  "layout",
  "Table for layout purposes",
  "Calendar",
  "Structural table",
  "footer",
  "This table is used for page layout",
  "Text Ad",
  "Calendar Display",
  "Links",
  "Content",
  "Header",
  "header",
  "Navigation elements",
  "top navbar",
  "title and navigation",
  "block",
  "main heading",
  "body",
  "links",
  "Event Calendar",
  "Search",
  "lightbox",
  "Menu",
  "all",
  "HeadBox",
  "Calendar of Events",
  "Lightbox",
  "Contents",
  "management",
  "contents",
  "search form",
  "This table is used for layout",
  "Search Input Table",
  "Content Area",
  "Fullsize Image",
  "Layout Structure",
  "Page title",
  "Main Table",
  "left",
  "category",
  "Banner Design Table",
  "Search Form",
  "Site contents",
  "pageinfo",
  "breadcrumb",
  "table used for layout purposes",
  "Footer",
  "main layout",
  "tooltip",
  "Logo",
];

/**
 * List of image alt attribute values that should be avoided.
 */
const stupidAlts = [
  "artwork",
  "arrow",
  "painting",
  "bullet",
  "graphic",
  "graph",
  "spacer",
  "image",
  "placeholder",
  "photo",
  "picture",
  "photograph",
  "logo",
  "screenshot",
  "back",
  "bg",
  "img",
  "alt",
];

/**
 * List of link text values that should be avoided.
 */
const stupidLinkText = [
  "link",
  "more",
  "here",
  "click",
  "click here",
  "read",
  "read more",
  "learn more",
  "continue",
  "go",
  "continue reading",
  "view",
  "view more",
  "less",
  "see all",
  "show",
  "hide",
  "show more",
  "show less",
];

/**
 * List of deprecated HTML elements.
 */
const deprecatedElements = [
  "applet",
  "basefont",
  "center",
  "dir",
  "font",
  "isindex",
  "listing",
  "menu",
  "s",
  "strike",
  "u",
];

/**
 * Provides the ability to overlay an element with a visual indicator of an accessibility issue.
 * @param {string} overlayClass - CSS class for the overlay
 * @param {string} level - Error level (error/warning)
 * @param {string} msg - Error message
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
      z-index: 2147483647;
      opacity: 0.4;
      border-radius: 5px;
      background-image: repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px);
    `;
    
    overlayEl.setAttribute('data-a11ymessage', sanitizedMsg);
    
    // Set overlay appearance based on level
    if (level === "error") {
      overlayEl.style.backgroundColor = "#FF0000";
      overlayEl.style.border = "2px solid #FF0000";
      overlayEl.classList.add("a11y-error");
    } else if (level === "warning") {
      overlayEl.style.backgroundColor = "#FFA500";
      overlayEl.style.border = "2px solid #FFA500";
      overlayEl.classList.add("a11y-warning");
    }
    
    // Append overlay to document body
    document.body.appendChild(overlayEl);

    // Push the error to the logs array
    logs.push({
      Level: level,
      Message: sanitizedMsg,
      Element: elementInError.outerHTML.slice(0, 100) + "...",
    });
  } catch (error) {
    console.error('Error creating overlay:', error);
  }
}

/**
 * Removes all highlighting overlays from the page.
 */
function removeAccessibilityOverlays() {
  try {
    const errorOverlays = document.querySelectorAll(".a11y-error, .a11y-warning, .overlay");
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

// Throttling mechanism to prevent performance issues
let isRunning = false;
let lastRunTime = 0;
const THROTTLE_DELAY = 1000; // 1 second

/**
 * Efficiently runs accessibility checks using optimized DOM traversal.
 * Uses single-pass traversal and targeted queries to improve performance.
 */
function runAccessibilityChecks() {
  // Throttling to prevent performance issues
  const now = Date.now();
  if (isRunning || (now - lastRunTime) < THROTTLE_DELAY) {
    console.log('Accessibility checks throttled - please wait');
    return;
  }
  
  isRunning = true;
  lastRunTime = now;
  
  try {
    // Clear previous logs
    logs.length = 0;
    
    // Performance optimization: Use a single comprehensive query
    const elementsToCheck = document.querySelectorAll(
      'img, button, [role="button"], a, [role="link"], fieldset, input, table, iframe, audio, video, [tabindex], [role="img"]'
    );
    
    // Check for landmarks first (simple check)
    checkForLandmarks();
    
    // Process elements in a single pass
    for (const element of elementsToCheck) {
      checkElement(element);
    }
    
    // Separate optimized font size check (only text-containing elements)
    checkFontSizes();
    
    // Log results
    if (logs.length > 0) {
      console.table(logs);
    } else {
      console.log("No accessibility issues found.");
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
 * @param {Element} element - The image element to check
 */
function checkImageElement(element) {
  // Check for missing alt attribute
  if (!element.hasAttribute('alt')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "img does not have an alt attribute");
    return;
  }
  
  const altValue = element.getAttribute('alt');
  const titleValue = element.getAttribute('title');
  
  // Check for uninformative alt text
  if (altValue && stupidAlts.includes(altValue.toLowerCase())) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Uninformative alt attribute value found");
  }
  
  // Check for empty alt with non-empty title
  if (altValue === '' && titleValue && titleValue.trim() !== '') {
    console.log(element);
    overlay.call(element, "overlay", "error", "Image element with empty alt and non-empty title");
  }
  
  // Check for different alt and title attributes
  if (altValue && titleValue && altValue.trim() !== '' && titleValue.trim() !== '' && 
      altValue.toLowerCase() !== titleValue.toLowerCase()) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Image element with different alt and title attributes");
  }
}

/**
 * Checks button elements for accessibility issues.
 * @param {Element} element - The button element to check
 */
function checkButtonElement(element) {
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
  const hasTextContent = element.textContent && element.textContent.trim() !== '';
  
  if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Button without aria-label or aria-labelledby or empty text content");
  }
}

/**
 * Checks link elements for accessibility issues.
 * @param {Element} element - The link element to check
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
    overlay.call(element, "overlay", "error", "Link without inner text, aria-label, aria-labelledby, or empty text content");
    return;
  }
  
  // Check for invalid href
  if (href === '#' || (href && href.startsWith('javascript:'))) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Invalid link href attribute");
  }
  
  // Check for generic link text
  if (textContent && stupidLinkText.includes(textContent.toLowerCase())) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Link element with matching text content found");
  }
  
  // Check for matching title and text
  if (titleValue && textContent && titleValue.toLowerCase() === textContent.toLowerCase()) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Link element with matching title and text content found");
  }
}

/**
 * Checks fieldset elements for accessibility issues.
 * @param {Element} element - The fieldset element to check
 */
function checkFieldsetElement(element) {
  if (!element.querySelector('legend')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "fieldset without legend");
  }
}

/**
 * Checks input elements for accessibility issues.
 * @param {Element} element - The input element to check
 */
function checkInputElement(element) {
  const type = element.getAttribute('type');
  
  if (type === 'image') {
    const hasAlt = element.hasAttribute('alt');
    const hasAriaLabel = element.hasAttribute('aria-label');
    
    if (!hasAlt && !hasAriaLabel) {
      console.log(element);
      overlay.call(element, "overlay", "error", "input type=image without alt or aria-label");
    }
  } else if (type !== 'submit' && type !== 'image' && type !== 'hidden') {
    // Check for form fields without labels
    const id = element.getAttribute('id');
    if (!id || !document.querySelector(`label[for="${id}"]`)) {
      console.log(element);
      overlay.call(element, "overlay", "error", "Form field without a corresponding label");
    }
  }
}

/**
 * Checks table elements for accessibility issues.
 * @param {Element} element - The table element to check
 */
function checkTableElement(element) {
  // Check for tables without TH elements
  if (!element.querySelector('th')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "table without any th elements");
  }
  
  // Check for nested tables
  if (element.closest('th, td')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Nested table elements");
  }
  
  // Check for uninformative summary
  const summaryValue = element.getAttribute('summary');
  if (summaryValue) {
    const summaryTrimmed = summaryValue.trim();
    if (stupidTableSummaries.some(badSummary => 
        summaryTrimmed.toLowerCase().includes(badSummary.toLowerCase()))) {
      console.log(element);
      overlay.call(element, "overlay", "error", "Table with uninformative summary attribute");
    }
  }
}

/**
 * Checks iframe elements for accessibility issues.
 * @param {Element} element - The iframe element to check
 */
function checkIframeElement(element) {
  if (!element.hasAttribute('title')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "iframe element without a title attribute");
  }
}

/**
 * Checks media elements for accessibility issues.
 * @param {Element} element - The media element to check
 */
function checkMediaElement(element) {
  // Check for autoplay
  if (element.hasAttribute('autoplay')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Media element set to autoplay");
  }
  
  // Check for captions
  if (!element.querySelector('track[kind="captions"]')) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Media element without captions track");
  }
}

/**
 * Checks role-based elements for accessibility issues.
 * @param {Element} element - The element to check
 * @param {string} role - The role attribute value
 */
function checkRoleBasedElement(element, role) {
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
  
  switch (role) {
    case 'img':
      if (!hasAriaLabel && !hasAriaLabelledby) {
        console.log(element);
        overlay.call(element, "overlay", "error", "role=img without aria-label or aria-labelledby");
      }
      break;
    case 'button':
      const hasTextContent = element.textContent && element.textContent.trim() !== '';
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTextContent) {
        console.log(element);
        overlay.call(element, "overlay", "error", "Button without aria-label or aria-labelledby or empty text content");
      }
      break;
    case 'link':
      const textContent = element.textContent ? element.textContent.trim() : '';
      if (!hasAriaLabel && !hasAriaLabelledby && textContent === '') {
        console.log(element);
        overlay.call(element, "overlay", "error", "Link without inner text, aria-label, aria-labelledby, or empty text content");
      }
      break;
  }
}

/**
 * Checks elements with tabindex for accessibility issues.
 * @param {Element} element - The element to check
 */
function checkTabIndexElement(element) {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const tabindexValue = parseInt(element.getAttribute('tabindex'), 10);
  
  // Skip interactive elements and elements with roles
  if (['a', 'area', 'button', 'input', 'select', 'textarea'].includes(tagName) || role) {
    return;
  }
  
  // Only flag elements with tabindex=0 or positive tabindex values
  if (!isNaN(tabindexValue) && tabindexValue >= 0) {
    console.log(element);
    overlay.call(element, "overlay", "warning", `Non-actionable element with tabindex=${tabindexValue}`);
  }
}

/**
 * Optimized font size check - only checks text-containing elements.
 */
function checkFontSizes() {
  // Use TreeWalker for efficient text node traversal
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        // Only check elements that likely contain text
        const tagName = node.tagName.toLowerCase();
        const hasTextContent = node.textContent && node.textContent.trim().length > 0;
        const isTextElement = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'label', 'a', 'button'].includes(tagName);
        
        return (hasTextContent && isTextElement) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    },
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    try {
      const computedStyle = getComputedStyle(node);
      const fontSize = parseFloat(computedStyle.fontSize);
      
      if (fontSize < 12) {
        console.log(node);
        overlay.call(node, "overlay", "error", "Text element with font size smaller than 12px");
      }
    } catch (error) {
      // Skip elements that can't be styled
      continue;
    }
  }
}

/**
 * Checks for landmark elements on the page.
 */
function checkForLandmarks() {
  const landmarks = document.querySelectorAll(
    "header, aside, footer, main, nav, [role='banner'], [role='complementary'], [role='contentinfo'], [role='main'], [role='navigation'], [role='search']"
  );
  
  if (landmarks.length === 0) {
    console.log(document.body);
    overlay.call(document.body, "overlay", "error", "No landmark elements found");
  }
}

/**
 * Evaluate and apply the correct set of actions based on isEnabled state.
 * @param {boolean} isEnabled - Whether accessibility highlighting is enabled
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
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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