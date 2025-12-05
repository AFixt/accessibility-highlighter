/**
 * Chrome Extension Message Handling Tests
 * Tests the message listener functionality in the content script
 */

// Mock Chrome APIs before importing
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((_keys, _callback) => {
        // Don't call the callback during initial setup to prevent side effects
        return Promise.resolve({ isEnabled: false });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {callback();}
        return Promise.resolve();
      })
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    lastError: null
  }
};

// Mock DOM APIs
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

describe('Chrome Extension Message Handling', () => {
  let messageListener;
  let mockSender;
  let mockSendResponse;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Reset mocks
    jest.clearAllMocks();

    // Clear require cache and re-import to ensure clean state
    delete require.cache[require.resolve('../src/contentScript.js')];

    // Re-import the content script to get the message listener registered
    require('../src/contentScript.js');

    // Extract the message listener that was registered
    const _addListenerCalls = global.chrome.runtime.onMessage.addListener.mock.calls;
    if (_addListenerCalls.length > 0) {
      messageListener = _addListenerCalls[_addListenerCalls.length - 1][0];
    }

    // Setup mock sender and response function
    mockSender = { tab: { id: 123 } };
    mockSendResponse = jest.fn();

    // Mock global functions after import
    if (global.toggleAccessibilityHighlight) {
      global.toggleAccessibilityHighlight = jest.fn();
    }
    global.logs = [];
  });

  test('should register message listener on chrome.runtime.onMessage', () => {
    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(typeof messageListener).toBe('function');
  });

  test('should handle "toggleHighlight" message with enabled state', async () => {
    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    const _result = messageListener(_message, mockSender, mockSendResponse);

    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledWith(true);
    expect(mockSendResponse).toHaveBeenCalledWith('highlighted');
    expect(_result).toBe(true);
  });

  test('should handle "toggleHighlight" message with disabled state', async () => {
    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: false
    };

    const _result = messageListener(_message, mockSender, mockSendResponse);

    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledWith(false);
    expect(mockSendResponse).toHaveBeenCalledWith('unhighlighted');
    expect(_result).toBe(true);
  });

  test('should handle unknown message action gracefully', async () => {
    const _message = {
      action: 'unknownAction',
      someData: 'test'
    };

    const _result = messageListener(_message, mockSender, mockSendResponse);

    expect(global.toggleAccessibilityHighlight).not.toHaveBeenCalled();
    expect(mockSendResponse).not.toHaveBeenCalled();
    expect(_result).toBe(false);
  });

  test('should handle invalid message format gracefully', async () => {
    const _invalidMessages = [
      null,
      undefined,
      {},
      { action: null },
      { action: '' },
      'string message',
      123
    ];

    _invalidMessages.forEach(_msg => {
      const _result = messageListener(_msg, mockSender, mockSendResponse);
      expect(_result).toBe(false);
    });

    expect(global.toggleAccessibilityHighlight).not.toHaveBeenCalled();
    expect(mockSendResponse).not.toHaveBeenCalled();
  });

  test('should handle message with missing isEnabled property', async () => {
    const _message = {
      action: 'toggleHighlight'
      // Missing isEnabled property
    };

    const _result = messageListener(_message, mockSender, mockSendResponse);

    // Should not crash but also should not perform actions
    expect(_result).toBe(false);
    expect(global.toggleAccessibilityHighlight).not.toHaveBeenCalled();
  });

  test('should handle error during toggleAccessibilityHighlight execution', async () => {
    // Mock toggleAccessibilityHighlight to throw an error
    global.toggleAccessibilityHighlight = jest.fn().mockImplementation(() => {
      throw new Error('Test error during accessibility highlight toggle');
    });

    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    // Should not crash when toggleAccessibilityHighlight throws
    expect(() => {
      messageListener(_message, mockSender, mockSendResponse);
    }).not.toThrow();

    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledTimes(1);
  });

  test('should handle error during toggleAccessibilityHighlight with false', async () => {
    // Mock toggleAccessibilityHighlight to throw an error
    global.toggleAccessibilityHighlight = jest.fn().mockImplementation(() => {
      throw new Error('Test error during accessibility highlight disable');
    });

    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: false
    };

    // Should not crash when toggleAccessibilityHighlight throws
    expect(() => {
      messageListener(_message, mockSender, mockSendResponse);
    }).not.toThrow();

    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledTimes(1);
  });

  test('should return true for async response handling', async () => {
    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    const _result = messageListener(_message, mockSender, mockSendResponse);

    // Should return true to indicate async response
    expect(_result).toBe(true);
  });

  test('should call sendResponse with success true for valid toggle requests', async () => {
    const _enableMessage = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    const _disableMessage = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: false
    };

    messageListener(_enableMessage, mockSender, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith('highlighted');

    mockSendResponse.mockClear();

    messageListener(_disableMessage, mockSender, mockSendResponse);
    expect(mockSendResponse).toHaveBeenCalledWith('unhighlighted');
  });

  test('should handle multiple rapid message calls', async () => {
    const _message1 = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    const _message2 = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: false
    };

    const _message3 = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    // Send multiple messages rapidly
    messageListener(_message1, mockSender, mockSendResponse);
    messageListener(_message2, mockSender, mockSendResponse);
    messageListener(_message3, mockSender, mockSendResponse);

    // Should handle all messages
    expect(mockSendResponse).toHaveBeenCalledTimes(3);
    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledTimes(3);
    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledWith(true);
    expect(global.toggleAccessibilityHighlight).toHaveBeenCalledWith(false);
  });

  test('should preserve message listener context', async () => {
    const _message = {
      action: 'toggleAccessibilityHighlight',
      isEnabled: true
    };

    // Call with different context
    const _result = messageListener.call({}, _message, mockSender, mockSendResponse);

    expect(_result).toBe(true);
    expect(mockSendResponse).toHaveBeenCalledWith('highlighted');
  });
});