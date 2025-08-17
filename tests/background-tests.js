/**
 * Background script tests for real code coverage
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
const mockStorage = {
  get: jest.fn(),
  set: jest.fn()
};

const mockTabs = {
  query: jest.fn(),
  sendMessage: jest.fn()
};

const mockAction = {
  onClicked: {
    addListener: jest.fn()
  },
  setIcon: jest.fn()
};

const mockRuntime = {
  onInstalled: {
    addListener: jest.fn()
  },
  lastError: null
};

const mockCommands = {
  onCommand: {
    addListener: jest.fn()
  }
};

global.chrome = {
  storage: {
    local: mockStorage
  },
  tabs: mockTabs,
  action: mockAction,
  runtime: mockRuntime,
  commands: mockCommands
};

describe('Background Script Real Code Tests', () => {
  let isScriptLoaded = false;

  beforeEach(() => {
    // Load the background script only once
    if (!isScriptLoaded) {
      require('../src/background.js');
      isScriptLoaded = true;
    }

    // Clear storage and tabs mocks but not listener registrations
    mockStorage.get.mockClear();
    mockStorage.set.mockClear();
    mockTabs.query.mockClear();
    mockTabs.sendMessage.mockClear();
    mockAction.setIcon.mockClear();

    // Reset mock implementations - background.js uses Promise-based API
    mockStorage.get.mockResolvedValue({ isEnabled: false });
    mockStorage.set.mockResolvedValue();

    mockTabs.query.mockResolvedValue([{ id: 123 }]);
    mockTabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (callback) {callback('success');}
    });
  });

  test('should set up click listener and install listener on import', () => {
    // Verify listeners were set up
    expect(mockAction.onClicked.addListener).toHaveBeenCalled();
    expect(mockRuntime.onInstalled.addListener).toHaveBeenCalled();
    expect(mockCommands.onCommand.addListener).toHaveBeenCalled();
  });

  test('should handle click event and toggle state', async () => {

    // Get the click handler function
    const clickHandler = mockAction.onClicked.addListener.mock.calls[0][0];

    // Mock storage.get to return false initially
    mockStorage.get.mockResolvedValue({ isEnabled: false });

    // Mock storage.set to capture the new value
    let capturedValue;
    mockStorage.set.mockImplementation(obj => {
      capturedValue = obj;
      return Promise.resolve();
    });

    // Execute click handler
    await clickHandler();

    // Small delay to let Promise chains resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify state was toggled
    expect(mockStorage.get).toHaveBeenCalledWith(['isEnabled']);
    expect(mockStorage.set).toHaveBeenCalled();
    expect(capturedValue.isEnabled).toBe(true);

    // Verify icon was updated
    expect(mockAction.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'icons/icon-16.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png'
      }
    });

    // Verify tab query was called
    expect(mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });
    
    // Verify tab message was sent
    expect(mockTabs.sendMessage).toHaveBeenCalledWith(
      123,
      { action: 'toggleAccessibilityHighlight', isEnabled: true },
      expect.any(Function)
    );
  });

  test('should handle install event and set initial icon', async () => {
    // Get the install handler function
    const installHandler = mockRuntime.onInstalled.addListener.mock.calls[0][0];

    // Mock storage.get for install
    mockStorage.get.mockImplementation(_keys => {
      return Promise.resolve({ isEnabled: false });
    });

    // Execute install handler
    await installHandler();

    // Verify initial icon was set
    expect(mockAction.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'icons/icon-disabled-16.png',
        48: 'icons/icon-disabled-48.png',
        128: 'icons/icon-disabled-128.png'
      }
    });
  });

  test('should handle messaging errors gracefully', async () => {
    // Mock console.warn to capture error handling
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock runtime.lastError for testing error handling
    mockRuntime.lastError = { message: 'Tab not found' };

    // Get the click handler function
    const clickHandler = mockAction.onClicked.addListener.mock.calls[0][0];

    // Mock storage using Promise-based API
    mockStorage.get.mockResolvedValue({ isEnabled: false });
    mockStorage.set.mockResolvedValue();

    // Execute click handler
    await clickHandler();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify sendMessage was called
    expect(mockTabs.sendMessage).toHaveBeenCalled();

    // The sendMessage callback should handle the error
    if (mockTabs.sendMessage.mock.calls.length > 0 && mockTabs.sendMessage.mock.calls[0][2]) {
      const messageCallback = mockTabs.sendMessage.mock.calls[0][2];
      messageCallback('response');

      // Verify error was handled
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not send message to tab 123')
      );
    }

    // Cleanup
    consoleSpy.mockRestore();
    mockRuntime.lastError = null;
  });

  test('should handle getCurrentTab function', async () => {
    // Test the exported getCurrentTab function
    expect(typeof global.getCurrentTab).toBe('function');

    const tab = await global.getCurrentTab();
    expect(tab).toEqual({ id: 123 });
    expect(mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });
  });

  test('should handle keyboard command to toggle accessibility', async () => {
    // Get the command handler function
    const commandHandler = mockCommands.onCommand.addListener.mock.calls[0][0];

    // Mock storage.get to return false initially
    mockStorage.get.mockImplementation(_keys => {
      return Promise.resolve({ isEnabled: false });
    });

    // Mock storage.set to capture the new value
    let capturedValue;
    mockStorage.set.mockImplementation(obj => {
      capturedValue = obj;
      return Promise.resolve();
    });

    // Execute command handler with the toggle command
    await commandHandler('toggle-accessibility');

    // Verify state was toggled
    expect(mockStorage.get).toHaveBeenCalledWith(['isEnabled']);
    expect(mockStorage.set).toHaveBeenCalled();
    expect(capturedValue.isEnabled).toBe(true);

    // Test with wrong command - should not toggle
    jest.clearAllMocks();
    await commandHandler('wrong-command');
    expect(mockStorage.get).not.toHaveBeenCalled();
  });
});