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

global.chrome = {
  storage: {
    local: mockStorage
  },
  tabs: mockTabs,
  action: mockAction,
  runtime: mockRuntime
};

describe('Background Script Real Code Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset mock implementations
    mockStorage.get.mockImplementation((keys, callback) => {
      if (callback) {
        callback({ isEnabled: false });
      }
      return Promise.resolve({ isEnabled: false });
    });

    mockStorage.set.mockImplementation((obj, callback) => {
      if (callback) {callback();}
      return Promise.resolve();
    });

    mockTabs.query.mockResolvedValue([{ id: 123 }]);
    mockTabs.sendMessage.mockImplementation((tabId, message, callback) => {
      if (callback) {callback('success');}
    });
  });

  test('should set up click listener and install listener on import', () => {
    // Import background script
    require('../src/background.js');

    // Verify listeners were set up
    expect(mockAction.onClicked.addListener).toHaveBeenCalled();
    expect(mockRuntime.onInstalled.addListener).toHaveBeenCalled();
  });

  test('should handle click event and toggle state', async () => {
    // Import background script
    require('../src/background.js');

    // Get the click handler function
    const clickHandler = mockAction.onClicked.addListener.mock.calls[0][0];

    // Mock storage.get to return false initially
    mockStorage.get.mockImplementation(keys => {
      return Promise.resolve({ isEnabled: false });
    });

    // Mock storage.set to capture the new value
    let capturedValue;
    mockStorage.set.mockImplementation(obj => {
      capturedValue = obj;
      return Promise.resolve();
    });

    // Execute click handler
    await clickHandler();

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

    // Verify tab message was sent
    expect(mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });
    expect(mockTabs.sendMessage).toHaveBeenCalledWith(
      123,
      { action: 'toggleAccessibilityHighlight', isEnabled: true },
      expect.any(Function)
    );
  });

  test('should handle install event and set initial icon', async () => {
    // Import background script
    require('../src/background.js');

    // Get the install handler function
    const installHandler = mockRuntime.onInstalled.addListener.mock.calls[0][0];

    // Mock storage.get for install
    mockStorage.get.mockImplementation(keys => {
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
    // Import background script
    require('../src/background.js');

    // Mock console.warn to capture error handling
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Mock runtime.lastError for testing error handling
    mockRuntime.lastError = { message: 'Tab not found' };

    // Get the click handler function
    const clickHandler = mockAction.onClicked.addListener.mock.calls[0][0];

    // Execute click handler
    await clickHandler();

    // The sendMessage callback should handle the error
    const messageCallback = mockTabs.sendMessage.mock.calls[0][2];
    messageCallback('response');

    // Verify error was handled
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not send message to tab 123')
    );

    // Cleanup
    consoleSpy.mockRestore();
    mockRuntime.lastError = null;
  });

  test('should handle getCurrentTab function', async () => {
    // Import background script
    require('../src/background.js');

    // Test the exported getCurrentTab function
    expect(typeof global.getCurrentTab).toBe('function');

    const tab = await global.getCurrentTab();
    expect(tab).toEqual({ id: 123 });
    expect(mockTabs.query).toHaveBeenCalledWith({
      active: true,
      lastFocusedWindow: true
    });
  });
});