console.log("Content script loaded");
const logs = [];

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

function overlay(overlayClass, level, msg) {
  var self = this;
  var height = self.offsetHeight;
  var width = self.offsetWidth;
  var pos = {
    top: self.offsetTop,
    left: self.offsetLeft,
  };
  var parent = document.createElement("div");
  parent.classList.add(overlayClass);
  self.parentNode.insertBefore(parent, self);
  parent.style.position = "absolute";
  parent.style.top = pos.top + "px";
  parent.style.left = pos.left + "px";
  parent.style.width = width + "px";
  parent.style.height = height + "px";
  parent.style.display = "inline";

  self.style.zIndex = "1000";
  self.style.opacity = "0.2";
  self.style.MozBorderRadius = "10px";
  self.style.borderRadius = "10px";
  self.style.backgroundImage =
    "repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,.5) 15px, rgba(255,255,255,.5) 30px)";

  if (level === "error") {
    self.style.backgroundColor = "#FF0000";
    self.style.border = "6px solid #FF0000";
    self.classList.add("a11y-error");
  } else if (level === "warning") {
    self.style.backgroundColor = "#FFA500";
    self.style.border = "6px solid #FFA500";
    self.classList.add("a11y-warning");
  }

  logs.push({
    Level: level,
    Message: msg,
    Element: self.outerHTML.slice(0, 100) + "...",
  });
}

function removeAccessibilityOverlays() {
  const errorOverlays = document.querySelectorAll(".a11y-error, .a11y-warning");
  errorOverlays.forEach((overlay) => {
    overlay.parentNode.removeChild(overlay);
  });
}

function runAccessibilityChecks() {
  // Check for missing alt attributes on images
  var images = document.querySelectorAll("img:not([alt])");
  for (var i = 0; i < images.length; i++) {
    console.log(images[i]);
    overlay.call(images[i], "overlay", "error", "img does not have an alt attribute");
  }

  // Check for missing labels on items with img role
  var roleImgElements = document.querySelectorAll(
    "[role=img]:not([aria-label]):not([aria-labelledby])"
  );
  for (var i = 0; i < roleImgElements.length; i++) {
    console.log(roleImgElements[i]);
    overlay.call(
      roleImgElements[i],
      "overlay",
      "error",
      "role=img without aria-label or aria-labelledby"
    );
  }

  // Check for missing labels on items with button role
  var roleButtonElements = document.querySelectorAll(
    "[role=button]:not([aria-label]):not([aria-labelledby])"
  );
  var buttonElements = document.querySelectorAll(
    "button:not([aria-label]):not([aria-labelledby])"
  );

  var allButtonElements = Array.from(roleButtonElements).concat(
    Array.from(buttonElements)
  );

  for (var i = 0; i < allButtonElements.length; i++) {
    var element = allButtonElements[i];
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
  var roleLinkElements = document.querySelectorAll(
    "[role=link]:not([aria-label]):not([aria-labelledby]):not(:empty)"
  );
  var linkElements = document.querySelectorAll(
    "a[href]:not([aria-label]):not([aria-labelledby]):not(:empty)"
  );

  var allLinkElements = Array.from(roleLinkElements).concat(Array.from(linkElements));

  for (var i = 0; i < allLinkElements.length; i++) {
    var element = allLinkElements[i];
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
  var fieldsetElements = document.querySelectorAll("fieldset:not(:has(legend))");
  for (var i = 0; i < fieldsetElements.length; i++) {
    console.log(fieldsetElements[i]);
    overlay.call(fieldsetElements[i], "overlay", "error", "fieldset without legend");
  }

  // Check for missing text alternatives on input type=image
  var inputImageElements = document.querySelectorAll(
    "input[type=image]:not([alt]):not([aria-label])"
  );
  for (var i = 0; i < inputImageElements.length; i++) {
    console.log(inputImageElements[i]);
    overlay.call(
      inputImageElements[i],
      "overlay",
      "error",
      "input type=image without alt or aria-label"
    );
  }

  // check for table without TH elements
  var tableElements = document.querySelectorAll("table:not(:has(th))");
  for (var i = 0; i < tableElements.length; i++) {
    console.log(tableElements[i]);
    overlay.call(tableElements[i], "overlay", "error", "table without any th elements");
  }

  //check for table elements inside th or td elements
  var tableElements = document.querySelectorAll("th table, td table");
  for (var i = 0; i < tableElements.length; i++) {
    var element = tableElements[i];
    console.log(element);

    overlay.call(element, "overlay", "error", "Nested table elements");
  }

  // check for iframe elements without title attribute
  var iframeElements = document.querySelectorAll("iframe:not([title])");
  for (var i = 0; i < iframeElements.length; i++) {
    var element = iframeElements[i];
    console.log(element);

    overlay.call(element, "overlay", "error", "iframe element without a title attribute");
  }

  // Check for invalid link href attributes
  var linkElements = document.querySelectorAll(
    'a[href="#"]:not([role="button"]), a[href*="javascript:"]:not([role="button"])'
  );
  for (var i = 0; i < linkElements.length; i++) {
    var element = linkElements[i];
    console.log(element);
    overlay.call(element, "overlay", "error", "Invalid link href attribute");
  }

  // Check for form fields without labels
  var formFields = document.querySelectorAll(
    "input:not([type='submit']):not([type='image']):not([type='hidden'], select, textarea"
  );
  for (var i = 0; i < formFields.length; i++) {
    var element = formFields[i];
    var id = element.getAttribute("id");

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
  var mediaElements = document.querySelectorAll("audio[autoplay], video[autoplay]");
  for (var i = 0; i < mediaElements.length; i++) {
    var element = mediaElements[i];
    console.log(element);

    overlay.call(element, "overlay", "error", "Media element set to autoplay");
  }

  // Check for elements with tabindex attribute
  var elementsWithTabIndex = document.querySelectorAll(
    "[tabindex]:not(a):not(area):not(button):not(input):not(select):not(textarea):not([role])"
  );
  for (var i = 0; i < elementsWithTabIndex.length; i++) {
    var element = elementsWithTabIndex[i];
    console.log(element);

    overlay.call(element, "overlay", "error", "Element with tabindex attribute");
  }

  // Check for image elements with bad alt attribute values
  var imageElements = document.querySelectorAll("img[alt]");
  for (var i = 0; i < imageElements.length; i++) {
    var element = imageElements[i];
    var altValue = element.getAttribute("alt");

    if (stupidAlts.includes(altValue)) {
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
  var linkElements = document.querySelectorAll("a");
  for (var i = 0; i < linkElements.length; i++) {
    var element = linkElements[i];
    var linkText = element.textContent.trim();

    if (stupidLinkText.includes(linkText)) {
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
  var linkElements = document.querySelectorAll("a[title]");
  for (var i = 0; i < linkElements.length; i++) {
    var element = linkElements[i];
    var linkTitle = element.getAttribute("title");
    var linkText = element.textContent.trim();

    if (linkTitle === linkText) {
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
  var imageElements = document.querySelectorAll("img[alt=''][title]:not([alt])");
  for (var i = 0; i < imageElements.length; i++) {
    var element = imageElements[i];
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "Image element with empty alt and non-empty title"
    );
  }

  // Check for image elements with different alt and title attributes
  var imageElements = document.querySelectorAll(
    "img[alt][title]:not([alt=''][title='']):not([alt=''][title]):not([alt][title=''])"
  );
  for (var i = 0; i < imageElements.length; i++) {
    var element = imageElements[i];
    console.log(element);
    overlay.call(
      element,
      "overlay",
      "error",
      "Image element with different alt and title attributes"
    );
  }

  // Check for text elements with font size smaller than 12px
  var textElements = document.querySelectorAll("*");

  for (var i = 0; i < textElements.length; i++) {
    var element = textElements[i];
    var computedStyle = getComputedStyle(element);
    var fontSize = parseFloat(computedStyle.fontSize);

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
  var elements = document.querySelectorAll(
    "header, aside, footer, main, nav, [role='banner'], [role='complementary'], [role='contentinfo'], [role='main'], [role='navigation'], [role='search']"
  );
  if (elements.length === 0) {
    var bodyElement = document.body;
    console.log(bodyElement);
    overlay.call(bodyElement, "overlay", "error", "No landmark elements found");
  }

  // Check for media elements without captions track
  var mediaElements = document.querySelectorAll(
    "video:not(:has(track[kind='captions'])), audio:not(:has(track[kind='captions']))"
  );
  for (var i = 0; i < mediaElements.length; i++) {
    var element = mediaElements[i];
    console.log(element);
    overlay.call(element, "overlay", "error", "Media element without captions track");
  }

  if (logs.length > 0) {
    console.table(logs);
  } else {
    console.log("No accessibility issues found.");
  }
}

// Function to evaluate and apply the correct set of actions based on isEnabled state.
function toggleAccessibilityHighlight(isEnabled) {
  console.log(`Toggling accessibility highlights: ${isEnabled}`);
  if (isEnabled) {
    runAccessibilityChecks();
  } else {
    removeAccessibilityOverlays();
  }
}

// Initial check for isEnabled state from storage.
chrome.storage.local.get(["isEnabled"], (result) => {
  console.log("Initial isEnabled state:", result.isEnabled);
  toggleAccessibilityHighlight(result.isEnabled);
});

// Listen for messages from the background or popup script to dynamically toggle features.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received", message);
  if (message.action === "toggleAccessibilityHighlight") {
    toggleAccessibilityHighlight(message.isEnabled);
  }
});
