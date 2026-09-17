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
// Deliberately NOT mocked here either: the extension's own functions
// (overlay, runAccessibilityChecks, removeAccessibilityOverlays,
// toggleAccessibilityHighlight, getCurrentTab) and a `logs` array standing in
// for LOGS. They were defined here as jest.fn()s, and runAccessibilityChecks
// matched one magic phrase in document.body.innerHTML and pushed six hardcoded
// entries (#137).
//
// tests/highlighter.test.js was built entirely on them and would have passed
// with src/ deleted. The hardcoded entries also used the {Level, Message,
// Element} shape that matches no reader (#132), which is how the one suite
// calling itself integration managed to agree with the writer and nothing else.
//
// src/contentScript.js and src/background.js publish the real functions on
// `global` under NODE_ENV=test. Require the module and use those.
