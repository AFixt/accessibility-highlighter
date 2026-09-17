// setup-jest.js
// Mock the Chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (callback) {
          callback({ isEnabled: true });
        }
        return Promise.resolve({ isEnabled: true });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 123 }]),
    sendMessage: jest.fn().mockImplementation((_tabId, _message, _callback) => {
      if (_callback) {
        _callback('success');
      }
    })
  },
  action: {
    setIcon: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Deliberately NOT mocked here: document.createElement and
// document.querySelectorAll. Both used to be replaced globally, for every
// suite, and both did more harm than good (#133).
//
// createElement returned a plain object rather than a Node, so anything that
// built an element and inserted it hit "parameter 1 is not of type 'Node'" and
// landed in its own catch block — which is why overlay(), downloadFile() and
// most of uiPanels.js could not be exercised at all. It also broke escapeHtml,
// whose old implementation round-tripped through a div and therefore returned
// undefined in every test.
//
// querySelectorAll returned canned arrays keyed off the selector string, which
// made assertions that query the document unfalsifiable. Two were found and
// both passed with the code under test deliberately broken.
//
// jsdom's own implementations are the default now. A suite that genuinely
// needs canned scan results should build the DOM it wants with
// `document.body.innerHTML = ...` and let jsdom answer, or stub within that
// suite so the opt-out is visible where it applies.

// Mock console methods
global.console.log = jest.fn();
global.console.table = jest.fn();
global.console.error = jest.fn();

// Mock window.getComputedStyle
global.getComputedStyle = jest.fn().mockImplementation(() => ({
  fontSize: '16px'
}));

// Define stubs for contentScript.js functions
global.logs = [];

global.overlay = jest.fn().mockImplementation(function (overlayClass, level, msg) {
  global.logs.push({
    Level: level,
    Message: msg,
    Element: this ? this.outerHTML || 'mock-element' : 'mock-element'
  });
});

global.removeAccessibilityOverlays = jest.fn();

global.runAccessibilityChecks = jest.fn().mockImplementation(() => {
  // Simulate finding issues when checking failing HTML
  if (document.body.innerHTML.includes('Test fixture with errors')) {
    global.logs.push({
      Level: 'error',
      Message: 'img does not have an alt attribute',
      Element: '<img src="test.jpg">'
    });
    global.logs.push({
      Level: 'error',
      Message: 'Form field without a corresponding label',
      Element: '<input type="text">'
    });
    global.logs.push({
      Level: 'error',
      Message: 'table without any th elements',
      Element: '<table><tr><td>Cell</td></tr></table>'
    });
    global.logs.push({
      Level: 'error',
      Message: 'Nested table elements',
      Element: '<td><table></table></td>'
    });
    global.logs.push({
      Level: 'error',
      Message: 'iframe element without a title attribute',
      Element: '<iframe src="test.html"></iframe>'
    });
    global.logs.push({
      Level: 'error',
      Message: 'Uninformative alt attribute value found',
      Element: '<img src="image.jpg" alt="image">'
    });
    global.logs.push({
      Level: 'error',
      Message: 'Link element with matching text content found',
      Element: '<a href="#">click here</a>'
    });
    global.logs.push({
      Level: 'error',
      Message: 'Table with uninformative summary attribute',
      Element: '<table summary="layout table for navigation">'
    });
    global.logs.push({
      Level: 'warning',
      Message: 'Non-actionable element with tabindex=0',
      Element: '<div tabindex="0">I can receive focus but do nothing</div>'
    });
  }
});

global.toggleAccessibilityHighlight = jest.fn().mockImplementation(isEnabled => {
  if (isEnabled) {
    global.runAccessibilityChecks();
  } else {
    global.removeAccessibilityOverlays();
  }
});

global.getCurrentTab = jest.fn().mockResolvedValue({ id: 123 });
