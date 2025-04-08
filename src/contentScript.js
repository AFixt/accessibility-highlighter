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
 * @param {*} overlayClass
 * @param {*} level
 * @param {*} msg
 */
function overlay(overlayClass, level, msg) {
  const elementInError = this;
  const height = elementInError.offsetHeight;
  const width = elementInError.offsetWidth;
  const pos = {
    top: elementInError.offsetTop,
    left: elementInError.offsetLeft,
  };
  const overlayEl = document.createElement("div");
  overlayEl.classList.add(overlayClass);
  elementInError.parentNode.appendChild(overlayEl);
  overlayEl.style.position = "absolute";
  overlayEl.style.top = pos.top + "px";
  overlayEl.style.left = pos.left + "px";
  overlayEl.style.width = width + "px";
  overlayEl.style.height = height + "px";
  overlayEl.style.display = "inline";
  overlayEl.setAttribute('data-a11ymessage', msg); // Set the data-a11ymessage attribute

  overlayEl.style.zIndex = "1000";
  overlayEl.style.opacity = "0.2";
  overlayEl.style.MozBorderRadius = "10px";
  overlayEl.style.borderRadius = "10px";
  overlayEl.style.backgroundImage =
    "repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)";

  if (level === "error") {
    overlayEl.style.backgroundColor = "#FF0000";
    overlayEl.style.border = "6px solid #FF0000";
    overlayEl.classList.add("a11y-error");
  } else if (level === "warning") {
    overlayEl.style.backgroundColor = "#FFA500";
    overlayEl.style.border = "6px solid #FFA500";
    overlayEl.classList.add("a11y-warning");
  }

  // push the error to the logs array
  logs.push({
    Level: level,
    Message: msg,
    Element: elementInError.outerHTML.slice(0, 100) + "...",
  });
}

/**
 * Removes all highlighting overlays from the page.
 */
function removeAccessibilityOverlays() {
  const errorOverlays = document.querySelectorAll(".a11y-error, .a11y-warning");
  errorOverlays.forEach((overlay) => {
    overlay.parentNode.removeChild(overlay);
  });
}

/**
 * Runs a series of accessibility checks on the current page and logs any issues found.
 */
function runAccessibilityChecks() {
  // Check for missing alt attributes on images
  const images = document.querySelectorAll("img:not([alt])");
  for (const element of images) {
    console.log(element);
    overlay.call(element, "overlay", "error", "img does not have an alt attribute");
  }

  // Check for missing labels on items with img role
  const roleImgElements = document.querySelectorAll(
    "[role=img]:not([aria-label]):not([aria-labelledby])"
  );

  for (const element of roleImgElements) {
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "role=img without aria-label or aria-labelledby"
    );
  }

  // Check for missing labels on items with button role
  const roleButtonElements = document.querySelectorAll(
    "[role=button]:not([aria-label]):not([aria-labelledby])"
  );
  const buttonElements = document.querySelectorAll(
    "button:not([aria-label]):not([aria-labelledby])"
  );

  const allButtonElements = Array.from(roleButtonElements).concat(
    Array.from(buttonElements)
  );

  for (const element of allButtonElements) {
    console.log(element);
  
    if (!element.textContent || element.textContent.trim() === "") {
      overlay.call(
        element,
        "overlay",
        "error",
        "Button without aria-label or aria-labelledby or empty text content"
      );
    }
  }

  // Check for missing labels on links
  const roleLinkElements = document.querySelectorAll(
    "[role=link]:not([aria-label]):not([aria-labelledby]):not(:empty)"
  );
  const linkElements = document.querySelectorAll(
    "a[href]:not([aria-label]):not([aria-labelledby]):not(:empty):not([role=button])"
  );

  const allLinkElements = Array.from(roleLinkElements).concat(Array.from(linkElements));

  for (const element of allLinkElements) {
    console.log(element);
  
    if (!element.textContent || element.textContent.trim() === "") {
      overlay.call(
        element,
        "overlay",
        "error",
        "Link without inner text, aria-label, aria-labelledby, or empty text content"
      );
    }
  }

  // Check for fieldsets without legends
  const fieldsetElements = document.querySelectorAll("fieldset:not(:has(legend))");
  for (const element of fieldsetElements) {
    console.log(element);
    overlay.call(element, "overlay", "error", "fieldset without legend");
  }

  // Check for missing text alternatives on input type=image
  const inputImageElements = document.querySelectorAll(
    "input[type=image]:not([alt]):not([aria-label])"
  );
  for (const element of inputImageElements) {
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "input type=image without alt or aria-label"
    );
  }

  // check for table without TH elements
  const tableElementsWithoutTH = document.querySelectorAll("table:not(:has(th))");
  for (const element of tableElementsWithoutTH) {
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "table without any th elements"
    );
  }

  //check for table elements inside th or td elements
  const tableElements = document.querySelectorAll("th table, td table");
  for (const element of tableElements) {
    console.log(element);

    overlay.call(element, "overlay", "error", "Nested table elements");
  }

  // check for iframe elements without title attribute
  const iframeElements = document.querySelectorAll("iframe:not([title])");
  for (const element of iframeElements) {
    console.log(element);
  
    overlay.call(element, "overlay", "error", "iframe element without a title attribute");
  }

  // Check for invalid link href attributes
  const linkElementsWithInvalidHref = document.querySelectorAll(
    'a[href="#"]:not([role="button"]), a[href*="javascript:"]:not([role="button"])'
  );
  for (const element of linkElementsWithInvalidHref) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Invalid link href attribute");
  }

  // Check for form fields without labels
  const formFields = document.querySelectorAll(
    "input:not([type='submit']):not([type='image']):not([type='hidden'], select, textarea"
  );
  for (const element of formFields) {
    const id = element.getAttribute("id");

    if (!id || !document.querySelector("label[for='" + id + "']")) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Form field without a corresponding label"
      );
    }
  }

  //Check for media elements with autoplay attribute
  const mediaElements = document.querySelectorAll("audio[autoplay], video[autoplay]");
  for (const element of mediaElements) {
    console.log(element);

    overlay.call(element, "overlay", "error", "Media element set to autoplay");
  }

  // Check for non-actionable elements with positive tabindex
  const elementsWithTabIndex = document.querySelectorAll(
    "[tabindex]:not(a):not(area):not(button):not(input):not(select):not(textarea):not([role])"
  );
  for (const element of elementsWithTabIndex) {
    const tabindexValue = parseInt(element.getAttribute("tabindex"), 10);
    
    // Only flag elements with tabindex=0 or positive tabindex values
    // Negative tabindex values (-1) are often used to make elements programmatically focusable but not in tab order
    if (!isNaN(tabindexValue) && tabindexValue >= 0) {
      console.log(element);
      overlay.call(
        element, 
        "overlay", 
        "warning", 
        `Non-actionable element with tabindex=${tabindexValue}`
      );
    }
  }

  // Check for image elements with bad alt attribute values
  const imageElements = document.querySelectorAll("img[alt]");
  for (const element of imageElements) {
    const altValue = element.getAttribute("alt");

    if (stupidAlts.includes(altValue.toLowerCase())) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Uninformative alt attribute value found"
      );
    }
  }

  // Check for link elements with bad text content
  const linkElementsWithBadText = document.querySelectorAll("a");
  for (const element of linkElementsWithBadText) {
    const linkText = element.textContent.trim();

    if (stupidLinkText.includes(linkText.toLowerCase())) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Link element with matching text content found"
      );
    }
  }

  //Check for links with matching title and text content
  const linkElementsWithMatchingTitle = document.querySelectorAll("a[title]");
  for (const element of linkElementsWithMatchingTitle) {
    const linkTitle = element.getAttribute("title");
    const linkText = element.textContent.trim();
  
    if (linkTitle.toLowerCase() === linkText.toLowerCase()) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Link element with matching title and text content found"
      );
    }
  }

  // Check for image elements with empty alt and non-empty title
  const imageElementsWithTitleAndEmptyAlt = document.querySelectorAll(
    "img[alt=''][title]:not([alt])"
  );
  for (const element of imageElementsWithTitleAndEmptyAlt) {
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "Image element with empty alt and non-empty title"
    );
  }

  // Check for image elements with different alt and title attributes
  const imageElementsWithDiffAltAndTitle = document.querySelectorAll(
    "img[alt][title]:not([alt=''][title='']):not([alt=''][title]):not([alt][title=''])"
  );
  for (const element of imageElementsWithDiffAltAndTitle) {
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "Image element with different alt and title attributes"
    );
  }

  // Check for text elements with font size smaller than 12px
  const textElements = document.querySelectorAll("*");

  for (const element of textElements) {
    const computedStyle = getComputedStyle(element);
    const fontSize = parseFloat(computedStyle.fontSize);

    if (fontSize < 12) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Text element with font size smaller than 12px"
      );
    }
  }

  // Check for landmarks
  const elements = document.querySelectorAll(
    "header, aside, footer, main, nav, [role='banner'], [role='complementary'], [role='contentinfo'], [role='main'], [role='navigation'], [role='search']"
  );
  if (elements.length === 0) {
    const bodyElement = document.body;
    console.log(bodyElement);
    overlay.call(bodyElement, "overlay", "error", "No landmark elements found");
  }

  // Check for media elements without captions track
  const mediaElementsWithoutCaptions = document.querySelectorAll(
    "video:not(:has(track[kind='captions'])), audio:not(:has(track[kind='captions']))"
  );
  for (const element of mediaElementsWithoutCaptions) {
    console.log(element);
    overlay.call(element, "overlay", "error", "Media element without captions track");
  }
  
  // Check for tables with uninformative summary attributes
  const tablesWithSummary = document.querySelectorAll("table[summary]");
  for (const element of tablesWithSummary) {
    const summaryValue = element.getAttribute("summary").trim();
    
    if (stupidTableSummaries.some(badSummary => 
      summaryValue.toLowerCase().includes(badSummary.toLowerCase()))) {
      console.log(element);
      overlay.call(
        element,
        "overlay",
        "error",
        "Table with uninformative summary attribute"
      );
    }
  }

  if (logs.length > 0) {
    console.table(logs);
  } else {
    console.log("No accessibility issues found.");
  }
}

/**
 * Evaluate and apply the correct set of actions based on isEnabled state.
 * @param {*} isEnabled
 */
function toggleAccessibilityHighlight(isEnabled) {
  console.log(`Toggling accessibility highlights: ${isEnabled}`);
  if (isEnabled) {
    runAccessibilityChecks();
  } else {
    removeAccessibilityOverlays();
  }
}

/**
 * Initial check for isEnabled state from storage.
 */
chrome.storage.local.get(["isEnabled"], (result) => {
  console.log("Initial isEnabled state:", result.isEnabled);
  toggleAccessibilityHighlight(result.isEnabled);
});

/**
 * Listen for messages from the background or popup script to dynamically toggle features.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received", message);
  if (message.action === "toggleAccessibilityHighlight") {
    toggleAccessibilityHighlight(message.isEnabled);

    sendResponse(message.isEnabled ? "highlighted" : "unhighlighted");

    return true;
  }

  return false;
});
