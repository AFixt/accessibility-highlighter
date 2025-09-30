/**
 * Background script tests for real code coverage
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
const __mockStorage = {
  get: jest.fn(),
  set: jest.fn()
};

const __mockTabs = {
  query: jest.fn(),
  sendMessage: jest.fn()
};

const __mockAction = {
  onClicked: {
    addListener: jest.fn()
  },
  setIcon: jest.fn()
};

const __mockRuntime = {
  onInstalled: {
    addListener: jest.fn()
  },
  lastError: null
};

const __mockCommands = {
  onCommand: {
    addListener: jest.fn()
  }
};

global.chrome = {
  storage: {
    local: __mockStorage
  },
  tabs: __mockTabs,
  action: __mockAction,
  runtime: __mockRuntime,
  commands: __mockCommands
};

describe('Background Script Real Code Tests', () => {
  let __isScriptLoaded = false;

  beforeEach(() => {
    // Load the background script only once
    if (!__isScriptLoaded) {
      require('../src/background.js');
      __isScriptLoaded = true;
    }

    // Clear storage and tabs mocks but not listener registrations
    __mockStorage.get.mockClear();
    __mockStorage.set.mockClear();
    __mockTabs.query.mockClear();
    __mockTabs.sendMessage.mockClear();
    __mockAction.setIcon.mockClear();

    // Reset mock implementations - background.js uses Promise-based API
    __mockStorage.get.mockResolvedValue({ isEnabled: false });
    __mockStorage.set.mockResolvedValue();

    __mockTabs.query.mockResolvedValue([{ id: 123 }]);
    __mockTabs.sendMessage.mockImplementation((_tabId, _message, _callback) => {
      if (_callback) {_callback('success');}
    });
  });

  test('should set up click listener and install listener on import', () => {
    // Verify listeners were set up
    expect(__mockAction.onClicked.addListener).toHaveBeenCalled();
    expect(__mockRuntime.onInstalled.addListener).toHaveBeenCalled();
    expect(__mockCommands.onCommand.addListener).toHaveBeenCalled();
  });

  test('should handle click event and toggle state', async () => {

    // Get the click handler function
    const _clickHandler = __mockAction.onClicked.addListener.mock.calls[0][0];

    // Mock storage.get to return false initially
    __mockStorage.get.mockResolvedValue({ isEnabled: false });

    // Mock storage.set to capture the new value
    let capturedValue;
    __mockStorage.set.mockImplementation(obj => {
      capturedValue = obj;
      return Promise.resolve();
    });

    // Execute click handler
    await _clickHandler();

    // Small delay to let Promise chains resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify state was toggled
    expect(__mockStorage.get).toHaveBeenCalledWith(['isEnabled']);
    expect(__mockStorage.set).toHaveBeenCalled();
    expect(capturedValue.isEnabled).toBe(true);

    // Verify icon was updated
    expect(__mockAction.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'icons/icon-16.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png'
      }
    });

    // Verify tab query was called
    expect(__mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });

    // Verify tab message was sent
    expect(__mockTabs.sendMessage).toHaveBeenCalledWith(
      123,
      { action: 'toggleAccessibilityHighlight', isEnabled: true },
      expect.any(Function)
    );
  });

  test('should handle install event and set initial icon', async () => {
    // Get the install handler function
    const _installHandler = __mockRuntime.onInstalled.addListener.mock.calls[0][0];

    // Mock storage.get for install
    __mockStorage.get.mockImplementation(_keys => {
      return Promise.resolve({ isEnabled: false });
    });

    // Execute install handler
    await _installHandler();

    // Verify initial icon was set
    expect(__mockAction.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'icons/icon-disabled-16.png',
        48: 'icons/icon-disabled-48.png',
        128: 'icons/icon-disabled-128.png'
      }
    });
  });

  test('should handle messaging errors gracefully', async () => {
    // Mock console.warn to capture error handling
    const _consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock runtime.lastError for testing error handling
    __mockRuntime.lastError = { message: 'Tab not found' };

    // Get the click handler function
    const _clickHandler = __mockAction.onClicked.addListener.mock.calls[0][0];

    // Mock storage using Promise-based API
    __mockStorage.get.mockResolvedValue({ isEnabled: false });
    __mockStorage.set.mockResolvedValue();

    // Execute click handler
    await _clickHandler();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify sendMessage was called
    expect(__mockTabs.sendMessage).toHaveBeenCalled();

    // The sendMessage callback should handle the error
    if (__mockTabs.sendMessage.mock.calls.length > 0 && __mockTabs.sendMessage.mock.calls[0][2]) {
      const _messageCallback = __mockTabs.sendMessage.mock.calls[0][2];
      _messageCallback('response');

      // Verify error was handled
      expect(_consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not send message to tab 123')
      );
    }

    // Cleanup
    _consoleSpy.mockRestore();
    __mockRuntime.lastError = null;
  });

  test('should handle getCurrentTab function', async () => {
    // Test the exported getCurrentTab function
    expect(typeof global.getCurrentTab).toBe('function');

    const _tab = await global.getCurrentTab();
    expect(_tab).toEqual({ id: 123 });
    expect(__mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });
  });

  test('should handle keyboard command to toggle accessibility', async () => {
    // Get the command handler function
    const _commandHandler = __mockCommands.onCommand.addListener.mock.calls[0][0];

    // Mock storage.get to return false initially
    __mockStorage.get.mockImplementation(_keys => {
      return Promise.resolve({ isEnabled: false });
    });

    // Mock storage.set to capture the new value
    let capturedValue;
    __mockStorage.set.mockImplementation(obj => {
      capturedValue = obj;
      return Promise.resolve();
    });

    // Execute command handler with the toggle command
    await _commandHandler('toggle-accessibility');

    // Verify state was toggled
    expect(__mockStorage.get).toHaveBeenCalledWith(['isEnabled']);
    expect(__mockStorage.set).toHaveBeenCalled();
    expect(capturedValue.isEnabled).toBe(true);

    // Test with wrong command - should not toggle
    jest.clearAllMocks();
    await _commandHandler('wrong-command');
    expect(__mockStorage.get).not.toHaveBeenCalled();
  });
});