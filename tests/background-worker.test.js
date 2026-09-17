/**
 * @fileoverview Tests for the service worker in src/background.js (#141)
 *
 * tests/background-getCurrentTab.test.js covers getCurrentTab. Everything else
 * was untouched: toggleAccessibilityState is 92 lines of nested promise chains
 * with six .catch branches, and the three listeners — toolbar click, keyboard
 * command, install — had no coverage at all.
 *
 * The chrome mock lives here rather than in setup-jest.js. The global one has
 * no action.setTitle, setBadgeText, setBadgeBackgroundColor, commands or
 * runtime.onInstalled, and after #133 and #137 the preference in this
 * repository is for a suite to state the environment it needs rather than
 * inherit a shared one that quietly shapes every other suite too.
 *
 * Registering the listeners happens at module load, so the mock captures each
 * handler as it is registered and the tests invoke them directly. That is the
 * only way to reach them without a browser.
 *
 * toggleAccessibilityState kicks off its promise chain and returns without
 * awaiting it, so each case flushes the microtask queue before asserting.
 */

process.env.NODE_ENV = 'test';

/** Handlers captured as background.js registers them at module load. */
const handlers = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ isEnabled: false }),
      set: jest.fn().mockResolvedValue(undefined)
    }
  },
  runtime: {
    onInstalled: { addListener: fn => (handlers.installed = fn) },
    lastError: null
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 7 }]),
    sendMessage: jest.fn((_tabId, _message, callback) => callback && callback('ok'))
  },
  commands: {
    onCommand: { addListener: fn => (handlers.command = fn) }
  },
  action: {
    setIcon: jest.fn(),
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    onClicked: { addListener: fn => (handlers.clicked = fn) }
  }
};

require('../src/background.js');

/**
 * Let the module's nested promise chains run to completion.
 *
 * @returns {Promise<void>} Resolves once the queue is drained.
 */
async function flush() {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
}

/**
 * The single argument a jest.fn() was last called with.
 *
 * @param {jest.Mock} mock The mock to read.
 * @returns {*} The first argument of the most recent call.
 */
function lastArg(mock) {
  return mock.mock.calls[mock.mock.calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  chrome.storage.local.get.mockResolvedValue({ isEnabled: false });
  chrome.storage.local.set.mockResolvedValue(undefined);
  chrome.tabs.query.mockResolvedValue([{ id: 7 }]);
  chrome.runtime.lastError = null;
});

describe('the three listeners are registered', () => {
  it('registers a handler for the toolbar button, the shortcut and install', () => {
    // Without these the extension does nothing at all: no way to toggle and no
    // icon state after install.
    expect(typeof handlers.clicked).toBe('function');
    expect(typeof handlers.command).toBe('function');
    expect(typeof handlers.installed).toBe('function');
  });
});

describe('toggleAccessibilityState, switching on', () => {
  it('persists the flipped state', async () => {
    chrome.storage.local.get.mockResolvedValue({ isEnabled: false });

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('switches the icon to the enabled artwork', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(lastArg(chrome.action.setIcon).path).toEqual({
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png'
    });
  });

  it('says ON in the button title, which is its accessible name', async () => {
    // setTitle is what a screen reader announces for the toolbar button. The
    // source calls it out as being "for accessibility"; nothing checked it.
    await global.toggleAccessibilityState();
    await flush();

    expect(lastArg(chrome.action.setTitle).title).toContain('(ON)');
  });

  it('shows a green ON badge', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(lastArg(chrome.action.setBadgeText).text).toBe('ON');
    expect(lastArg(chrome.action.setBadgeBackgroundColor).color).toBe('#28a745');
  });

  it('tells the active tab to start highlighting', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    const [tabId, message] = chrome.tabs.sendMessage.mock.calls[0];
    expect(tabId).toBe(7);
    expect(message).toEqual({ action: 'toggleAccessibilityHighlight', isEnabled: true });
  });
});

describe('toggleAccessibilityState, switching off', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockResolvedValue({ isEnabled: true });
  });

  it('persists the flipped state', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: false });
  });

  it('switches the icon to the disabled artwork', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(lastArg(chrome.action.setIcon).path).toEqual({
      16: 'icons/icon-disabled-16.png',
      48: 'icons/icon-disabled-48.png',
      128: 'icons/icon-disabled-128.png'
    });
  });

  it('says OFF in the title and shows a red OFF badge', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(lastArg(chrome.action.setTitle).title).toContain('(OFF)');
    expect(lastArg(chrome.action.setBadgeText).text).toBe('OFF');
    expect(lastArg(chrome.action.setBadgeBackgroundColor).color).toBe('#dc3545');
  });

  it('tells the active tab to stop highlighting', async () => {
    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.tabs.sendMessage.mock.calls[0][1]).toEqual({
      action: 'toggleAccessibilityHighlight',
      isEnabled: false
    });
  });
});

describe('a missing stored value counts as off', () => {
  it('treats an absent isEnabled as false and switches on', async () => {
    // First run after install: storage has nothing yet.
    chrome.storage.local.get.mockResolvedValue({});

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('treats a non-boolean isEnabled as false rather than trusting it', async () => {
    chrome.storage.local.get.mockResolvedValue({ isEnabled: 'yes' });

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });
});

describe('when things go wrong', () => {
  it('rejects a malformed storage result by name, not by throwing into the catch', async () => {
    // Found by mutation: deleting the `!result || typeof result !== 'object'`
    // guard failed nothing, because without it `result.isEnabled` throws on
    // null, the outer .catch swallows it, and set() is skipped either way —
    // identical observable outcome. The guard's value is that the case is
    // handled deliberately rather than by exception, so that is what is
    // asserted: the message names the malformed result, and the generic
    // storage-failure path is not the one that ran.
    chrome.storage.local.get.mockResolvedValue(null);

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(chrome.action.setIcon).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Invalid storage result:', null);
    const messages = console.error.mock.calls.map(call => call[0]);
    expect(messages).not.toContain('Error getting storage:');
  });

  it('survives storage failing to read', async () => {
    chrome.storage.local.get.mockRejectedValue(new Error('storage unavailable'));

    await expect(global.toggleAccessibilityState()).resolves.toBeUndefined();
    await flush();

    expect(chrome.action.setIcon).not.toHaveBeenCalled();
  });

  it('does not update the icon when the write fails', async () => {
    // The icon is a claim about persisted state. Updating it after a failed
    // write would leave the toolbar asserting something untrue.
    chrome.storage.local.set.mockRejectedValue(new Error('quota exceeded'));

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.action.setIcon).not.toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('still updates the icon when there is no tab to message', async () => {
    // No active tab is normal — the user may be on a settings page. The state
    // change is real and the toolbar should reflect it.
    chrome.tabs.query.mockResolvedValue([]);

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.action.setBadgeText).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('refuses to message a tab whose id is not a valid number', async () => {
    // Found by mutation: replacing the `typeof activeTab.id !== 'number' ||
    // activeTab.id < 0` guard with `false` failed nothing, because every other
    // case here hands over a well-formed tab. chrome.tabs.query can return a
    // tab whose id is absent or negative — chrome.tabs.TAB_ID_NONE is -1 for
    // a devtools or app window — and sendMessage on that is an error.
    chrome.tabs.query.mockResolvedValue([{ id: -1 }]);

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    // The state change itself is real and must still be reflected.
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('refuses to message a tab whose id is not a number at all', async () => {
    chrome.tabs.query.mockResolvedValue([{ id: 'not-a-number' }]);

    await global.toggleAccessibilityState();
    await flush();

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('survives the content script not being there to answer', async () => {
    // Messaging a tab with no content script — a chrome:// page, say — sets
    // runtime.lastError instead of throwing. Reading the response without
    // checking it first is the classic way this crashes the worker.
    chrome.runtime.lastError = { message: 'Receiving end does not exist' };

    await expect(global.toggleAccessibilityState()).resolves.toBeUndefined();
    await flush();

    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
  });
});

describe('the listeners do what they are for', () => {
  it('the toolbar button toggles', async () => {
    handlers.clicked();
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('the keyboard shortcut toggles', async () => {
    handlers.command('toggle-accessibility');
    await flush();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('an unrelated command does nothing', async () => {
    handlers.command('some-other-command');
    await flush();

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});

describe('on install', () => {
  it('restores the toolbar to the stored state without changing it', async () => {
    chrome.storage.local.get.mockResolvedValue({ isEnabled: true });

    handlers.installed();
    await flush();

    expect(lastArg(chrome.action.setBadgeText).text).toBe('ON');
    expect(lastArg(chrome.action.setTitle).title).toContain('(ON)');
    // Install reflects state; it must not flip it.
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('shows the disabled state when the extension is off', async () => {
    chrome.storage.local.get.mockResolvedValue({ isEnabled: false });

    handlers.installed();
    await flush();

    expect(lastArg(chrome.action.setBadgeText).text).toBe('OFF');
    expect(lastArg(chrome.action.setIcon).path[16]).toBe('icons/icon-disabled-16.png');
  });

  it('falls back to the disabled state when storage returns nothing usable', async () => {
    chrome.storage.local.get.mockResolvedValue(null);

    handlers.installed();
    await flush();

    expect(lastArg(chrome.action.setBadgeText).text).toBe('OFF');
  });

  it('survives storage failing during install', async () => {
    chrome.storage.local.get.mockRejectedValue(new Error('storage unavailable'));

    expect(() => handlers.installed()).not.toThrow();
    await flush();

    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });
});
