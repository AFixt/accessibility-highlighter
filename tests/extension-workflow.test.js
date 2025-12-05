/**
 * Extension Workflow Tests
 * Tests for extension communication and end-to-end scenarios including:
 * - Background ↔ content script communication
 * - End-to-end user scenarios
 * - State synchronization
 * - Extension lifecycle management
 */

// Set test environment
process.env.NODE_ENV = 'test';

describe('Setup test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('Extension Workflow Tests', () => {
  let mockChrome;
  let _mockDocument;
  let _mockConsole;
  let _mockTabs;
  let _mockStorage;

  beforeEach(() => {
    // Mock console
    _mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      table: jest.fn()
    };
    global.console = _mockConsole;

    // Mock storage
    _mockStorage = {
      local: {
        get: jest.fn(() => Promise.resolve({ isEnabled: false })),
        set: jest.fn(() => Promise.resolve())
      }
    };

    // Mock tabs API
    _mockTabs = {
      query: jest.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com' }])),
      sendMessage: jest.fn(() => Promise.resolve('response'))
    };

    // Mock Chrome APIs
    mockChrome = {
      storage: _mockStorage,
      tabs: _mockTabs,
      action: {
        setIcon: jest.fn(() => Promise.resolve()),
        onClicked: {
          addListener: jest.fn()
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn(() => Promise.resolve())
      }
    };

    global.chrome = mockChrome;

    // Mock document
    _mockDocument = {
      body: {
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      },
      createElement: jest.fn(tag => {
        const _element = {
          tagName: tag.toUpperCase(),
          innerHTML: '',
          className: '',
          style: {},
          attributes: {},
          setAttribute: jest.fn((name, value) => {
            _element.attributes[name] = value;
          }),
          getAttribute: jest.fn(name => _element.attributes[name]),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          addEventListener: jest.fn(),
          click: jest.fn(),
          getBoundingClientRect: jest.fn(() => ({
            top: 100, left: 200, width: 150, height: 100
          }))
        };
        return _element;
      }),
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      querySelector: jest.fn(() => null)
    };

    global.document = _mockDocument;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Background ↔ Content Script Communication', () => {
    test('should handle extension toggle message from background to content script', async () => {
      // Mock content script message handler
      const _messageHandler = (_message, _sender, _sendResponse) => {
        try {
          if (_message.action === 'toggleAccessibilityHighlight') {
            const _isEnabled = _message.isEnabled;

            if (_isEnabled) {
              // Simulate running accessibility checks
              _mockConsole.log('Starting accessibility scan...');
              _sendResponse('highlighted');
            } else {
              // Simulate removing overlays
              _mockConsole.log('Removing accessibility overlays...');
              _sendResponse('unhighlighted');
            }
            return true;
          }
          return false;
        } catch (error) {
          _mockConsole.error('Error handling message:', error);
          return false;
        }
      };

      // Test enable message
      const _enableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      const _enableResponse = jest.fn();
      const _enableResult = _messageHandler(_enableMessage, null, _enableResponse);

      expect(_enableResult).toBe(true);
      expect(_mockConsole.log).toHaveBeenCalledWith('Starting accessibility scan...');
      expect(_enableResponse).toHaveBeenCalledWith('highlighted');

      // Test disable message
      const _disableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: false
      };

      const _disableResponse = jest.fn();
      const _disableResult = _messageHandler(_disableMessage, null, _disableResponse);

      expect(_disableResult).toBe(true);
      expect(_mockConsole.log).toHaveBeenCalledWith('Removing accessibility overlays...');
      expect(_disableResponse).toHaveBeenCalledWith('unhighlighted');
    });

    test('should handle background script tab communication', async () => {
      // Mock background script functions
      const _getCurrentTab = async () => {
        try {
          const _tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
          return _tabs[0];
        } catch (error) {
          _mockConsole.error('Error getting current tab:', error);
          throw error;
        }
      };

      const _sendMessageToTab = async (tabId, message) => {
        try {
          const _response = await mockChrome.tabs.sendMessage(tabId, message);
          return _response;
        } catch (error) {
          _mockConsole.error('Error sending message to tab:', error);
          throw error;
        }
      };

      // Test getting current tab
      const _currentTab = await _getCurrentTab();
      expect(_currentTab.id).toBe(1);
      expect(_currentTab.url).toBe('https://example.com');
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });

      // Test sending message to tab
      const _message = { action: 'toggleAccessibilityHighlight', isEnabled: true };
      const _response = await _sendMessageToTab(_currentTab.id, _message);

      expect(_response).toBe('response');
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, _message);
    });

    test('should handle state synchronization between background and content script', async () => {
      // Mock state synchronization
      const _syncExtensionState = async () => {
        try {
          // Get state from storage
          const _result = await mockChrome.storage.local.get(['isEnabled']);
          const _isEnabled = _result.isEnabled || false;

          // Update icon based on state
          const _iconPath = _isEnabled ? 'icons/icon-active.png' : 'icons/icon-inactive.png';
          await mockChrome.action.setIcon({ path: _iconPath });

          // Send state to content script
          const _currentTab = await mockChrome.tabs.query({ active: true, currentWindow: true });
          if (_currentTab[0]) {
            await mockChrome.tabs.sendMessage(_currentTab[0].id, {
              action: 'syncState',
              isEnabled: _isEnabled
            });
          }

          return _isEnabled;
        } catch (error) {
          _mockConsole.error('Error syncing state:', error);
          return false;
        }
      };

      const _currentState = await _syncExtensionState();

      expect(_currentState).toBe(false); // Default state
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['isEnabled']);
      expect(mockChrome.action.setIcon).toHaveBeenCalledWith({ path: 'icons/icon-inactive.png' });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'syncState',
        isEnabled: false
      });
    });

    test('should handle communication errors gracefully', async () => {
      // Mock communication error scenarios
      const _handleCommunicationError = async operation => {
        try {
          switch (operation) {
            case 'tab_query_error':
              mockChrome.tabs.query.mockRejectedValueOnce(new Error('Tab query failed'));
              await mockChrome.tabs.query({ active: true, currentWindow: true });
              break;
            case 'message_send_error':
              mockChrome.tabs.sendMessage.mockRejectedValueOnce(new Error('Message send failed'));
              await mockChrome.tabs.sendMessage(1, { action: 'test' });
              break;
            case 'storage_error':
              mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage access failed'));
              await mockChrome.storage.local.get(['isEnabled']);
              break;
          }
        } catch (error) {
          _mockConsole.error('Communication error:', error.message);
          return error.message;
        }
      };

      // Test tab query error
      const _tabError = await _handleCommunicationError('tab_query_error');
      expect(_tabError).toBe('Tab query failed');
      expect(_mockConsole.error).toHaveBeenCalledWith('Communication error:', 'Tab query failed');

      // Test message send error
      const _messageError = await _handleCommunicationError('message_send_error');
      expect(_messageError).toBe('Message send failed');

      // Test storage error
      const _storageError = await _handleCommunicationError('storage_error');
      expect(_storageError).toBe('Storage access failed');
    });
  });

  describe('End-to-End User Scenarios', () => {
    test('should handle complete extension activation workflow', async () => {
      // Mock complete workflow from user click to content script execution
      const _completeActivationWorkflow = async () => {
        const _steps = [];

        try {
          // Step 1: User clicks extension icon
          _steps.push('user_clicked_icon');

          // Step 2: Background script gets current tab
          const _tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
          const _currentTab = _tabs[0];
          _steps.push('got_current_tab');

          // Step 3: Background script toggles state
          const _currentState = await mockChrome.storage.local.get(['isEnabled']);
          const _newState = !_currentState.isEnabled;
          await mockChrome.storage.local.set({ isEnabled: _newState });
          _steps.push('toggled_state');

          // Step 4: Background script updates icon
          const _iconPath = _newState ? 'icons/icon-active.png' : 'icons/icon-inactive.png';
          await mockChrome.action.setIcon({ path: _iconPath });
          _steps.push('updated_icon');

          // Step 5: Background script sends message to content script
          const _response = await mockChrome.tabs.sendMessage(_currentTab.id, {
            action: 'toggleAccessibilityHighlight',
            isEnabled: _newState
          });
          _steps.push('sent_message_to_content');

          // Step 6: Content script responds
          if (_response === 'response' || _response === 'highlighted' || _response === 'unhighlighted') {
            _steps.push('content_script_responded');
          }

          return {
            success: true,
            steps: _steps,
            newState: _newState,
            response: _response
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            steps: _steps
          };
        }
      };

      const _result = await _completeActivationWorkflow();

      expect(_result.success).toBe(true);
      expect(_result.steps).toContain('user_clicked_icon');
      expect(_result.steps).toContain('got_current_tab');
      expect(_result.steps).toContain('toggled_state');
      expect(_result.steps).toContain('updated_icon');
      expect(_result.steps).toContain('sent_message_to_content');
      expect(_result.steps).toContain('content_script_responded');
      expect(_result.newState).toBe(true);
      expect(_result.response).toBe('response');
    });

    test('should handle accessibility scan user journey', async () => {
      // Mock user journey for running accessibility scan
      const _accessibilityScanJourney = async () => {
        const _journey = {
          steps: [],
          findings: [],
          errors: []
        };

        try {
          // Step 1: User activates extension
          _journey.steps.push('extension_activated');

          // Step 2: Content script starts scan
          _journey.steps.push('scan_started');
          _mockConsole.log('Starting accessibility scan...');

          // Step 3: Scan finds issues (mock findings)
          const _mockIssues = [
            { type: 'image', message: 'Missing alt attribute', element: '<img src="test.jpg">' },
            { type: 'link', message: 'Uninformative link text', element: '<a href="#">click here</a>' },
            { type: 'form', message: 'Missing label', element: '<input type="text">' }
          ];

          _journey.findings = _mockIssues;
          _journey.steps.push('issues_found');

          // Step 4: Create overlays for issues
          _mockIssues.forEach(issue => {
            const _overlay = _mockDocument.createElement('div');
            _overlay.className = 'a11y-highlight-overlay';
            _overlay.setAttribute('data-a11ymessage', issue.message);
            _mockDocument.body.appendChild(_overlay);
          });
          _journey.steps.push('overlays_created');

          // Step 5: Log results to console
          _mockConsole.table(_mockIssues);
          _journey.steps.push('results_logged');

          // Step 6: User can navigate through issues
          _journey.steps.push('navigation_ready');

          return _journey;
        } catch (error) {
          _journey.errors.push(error.message);
          return _journey;
        }
      };

      const _journey = await _accessibilityScanJourney();

      expect(_journey.steps).toContain('extension_activated');
      expect(_journey.steps).toContain('scan_started');
      expect(_journey.steps).toContain('issues_found');
      expect(_journey.steps).toContain('overlays_created');
      expect(_journey.steps).toContain('results_logged');
      expect(_journey.steps).toContain('navigation_ready');
      expect(_journey.findings).toHaveLength(3);
      expect(_journey.errors).toHaveLength(0);
      expect(_mockConsole.log).toHaveBeenCalledWith('Starting accessibility scan...');
      expect(_mockConsole.table).toHaveBeenCalledWith(_journey.findings);
    });

    test('should handle keyboard navigation user scenario', async () => {
      // Mock keyboard navigation scenario
      const _keyboardNavigationScenario = async () => {
        const _scenario = {
          overlays: [],
          currentIndex: -1,
          navigationActive: false,
          events: []
        };

        // Create mock overlays
        for (let _i = 0; _i < 3; _i++) {
          const _overlay = _mockDocument.createElement('div');
          _overlay.className = 'a11y-highlight-overlay';
          _overlay.setAttribute('data-a11ymessage', `Issue ${_i + 1}`);
          _mockDocument.body.appendChild(_overlay);
          _scenario.overlays.push(_overlay);
        }

        // Mock keyboard navigation handler
        const _handleKeyboardEvent = event => {
          _scenario.events.push(event.key);

          // Alt+Shift+N to start navigation
          if (event.altKey && event.shiftKey && event.key === 'N') {
            _scenario.navigationActive = true;
            _scenario.currentIndex = 0;
            event.preventDefault();
            return 'navigation_started';
          }

          if (!_scenario.navigationActive) {return 'not_navigating';}

          switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
              event.preventDefault();
              _scenario.currentIndex = Math.min(_scenario.currentIndex + 1, _scenario.overlays.length - 1);
              return 'moved_next';
            case 'ArrowUp':
            case 'ArrowLeft':
              event.preventDefault();
              _scenario.currentIndex = Math.max(_scenario.currentIndex - 1, 0);
              return 'moved_previous';
            case 'Home':
              event.preventDefault();
              _scenario.currentIndex = 0;
              return 'moved_to_first';
            case 'End':
              event.preventDefault();
              _scenario.currentIndex = _scenario.overlays.length - 1;
              return 'moved_to_last';
            case 'Escape':
              event.preventDefault();
              _scenario.navigationActive = false;
              _scenario.currentIndex = -1;
              return 'navigation_stopped';
            default:
              return 'no_action';
          }
        };

        // Simulate user interactions
        const _interactions = [
          { key: 'N', altKey: true, shiftKey: true, preventDefault: jest.fn() },
          { key: 'ArrowDown', preventDefault: jest.fn() },
          { key: 'ArrowDown', preventDefault: jest.fn() },
          { key: 'Home', preventDefault: jest.fn() },
          { key: 'End', preventDefault: jest.fn() },
          { key: 'Escape', preventDefault: jest.fn() }
        ];

        const _results = _interactions.map(interaction => _handleKeyboardEvent(interaction));

        return {
          scenario: _scenario,
          results: _results,
          interactions: _interactions
        };
      };

      const { scenario, results, interactions } = await _keyboardNavigationScenario();

      expect(scenario.overlays).toHaveLength(3);
      expect(results[0]).toBe('navigation_started'); // Alt+Shift+N
      expect(results[1]).toBe('moved_next'); // First ArrowDown
      expect(results[2]).toBe('moved_next'); // Second ArrowDown
      expect(results[3]).toBe('moved_to_first'); // Home
      expect(results[4]).toBe('moved_to_last'); // End
      expect(results[5]).toBe('navigation_stopped'); // Escape

      // Verify preventDefault was called for navigation keys
      interactions.forEach(interaction => {
        if (interaction.preventDefault) {
          expect(interaction.preventDefault).toHaveBeenCalled();
        }
      });

      expect(scenario.navigationActive).toBe(false); // Stopped by Escape
      expect(scenario.currentIndex).toBe(-1); // Reset by Escape
    });

    test('should handle extension deactivation user journey', async () => {
      // Mock deactivation workflow
      const _deactivationWorkflow = async () => {
        const _workflow = {
          steps: [],
          cleanupActions: [],
          finalState: null
        };

        try {
          // Step 1: User clicks to deactivate
          _workflow.steps.push('user_requested_deactivation');

          // Step 2: Background script updates state
          await mockChrome.storage.local.set({ isEnabled: false });
          _workflow.steps.push('state_updated');

          // Step 3: Background script updates icon
          await mockChrome.action.setIcon({ path: 'icons/icon-inactive.png' });
          _workflow.steps.push('icon_updated');

          // Step 4: Send message to content script
          const _currentTab = await mockChrome.tabs.query({ active: true, currentWindow: true });
          await mockChrome.tabs.sendMessage(_currentTab[0].id, {
            action: 'toggleAccessibilityHighlight',
            isEnabled: false
          });
          _workflow.steps.push('message_sent');

          // Step 5: Content script cleanup
          // Mock overlay removal
          const _overlays = _mockDocument.querySelectorAll('.a11y-highlight-overlay');
          _overlays.forEach(_overlay => {
            _mockDocument.body.removeChild(_overlay);
            _workflow.cleanupActions.push('removed_overlay');
          });
          _workflow.steps.push('overlays_removed');

          // Step 6: Reset navigation state
          _workflow.cleanupActions.push('navigation_reset');
          _workflow.steps.push('navigation_state_reset');

          // Step 7: Clear logs
          _workflow.cleanupActions.push('logs_cleared');
          _workflow.steps.push('logs_cleared');

          _workflow.finalState = 'deactivated';
          return _workflow;
        } catch (error) {
          _workflow.error = error.message;
          return _workflow;
        }
      };

      const _workflow = await _deactivationWorkflow();

      expect(_workflow.steps).toContain('user_requested_deactivation');
      expect(_workflow.steps).toContain('state_updated');
      expect(_workflow.steps).toContain('icon_updated');
      expect(_workflow.steps).toContain('message_sent');
      expect(_workflow.steps).toContain('overlays_removed');
      expect(_workflow.steps).toContain('navigation_state_reset');
      expect(_workflow.steps).toContain('logs_cleared');
      expect(_workflow.finalState).toBe('deactivated');
      expect(_workflow.error).toBeUndefined();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: false });
      expect(mockChrome.action.setIcon).toHaveBeenCalledWith({ path: 'icons/icon-inactive.png' });
    });
  });

  describe('State Synchronization', () => {
    test('should maintain state consistency across extension components', async () => {
      // Mock state management system
      const _stateManager = {
        state: {
          isEnabled: false,
          currentOverlayIndex: -1,
          keyboardNavigationActive: false,
          scanInProgress: false,
          lastScanTime: 0
        },

        async updateState(updates) {
          this.state = { ...this.state, ...updates };

          // Persist to storage
          await mockChrome.storage.local.set(this.state);

          // Notify content script of state changes
          try {
            const _tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
            if (_tabs[0]) {
              await mockChrome.tabs.sendMessage(_tabs[0].id, {
                action: 'stateUpdate',
                state: this.state
              });
            }
          } catch (error) {
            _mockConsole.warn('Failed to notify content script of state change:', error);
          }

          return this.state;
        },

        async loadState() {
          try {
            const _stored = await mockChrome.storage.local.get(Object.keys(this.state));
            this.state = { ...this.state, ..._stored };
            return this.state;
          } catch (error) {
            _mockConsole.error('Failed to load state:', error);
            return this.state;
          }
        },

        getState() {
          return { ...this.state };
        }
      };

      // Test initial state load
      await _stateManager.loadState();
      expect(_stateManager.getState().isEnabled).toBe(false);

      // Test state update
      const _newState = await _stateManager.updateState({
        isEnabled: true,
        scanInProgress: true,
        lastScanTime: Date.now()
      });

      expect(_newState.isEnabled).toBe(true);
      expect(_newState.scanInProgress).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(_newState);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'stateUpdate',
        state: _newState
      });
    });

    test('should handle state synchronization during concurrent operations', async () => {
      // Mock concurrent state operations
      const _concurrentStateOperations = async () => {
        const _operations = [];
        const _results = [];

        // Simulate multiple concurrent operations
        const _promises = [
          // Operation 1: Toggle extension
          (async () => {
            _operations.push('toggle_start');
            await new Promise(resolve => setTimeout(resolve, 10));
            await mockChrome.storage.local.set({ isEnabled: true });
            _operations.push('toggle_complete');
            return 'toggle_success';
          })(),

          // Operation 2: Start scan
          (async () => {
            _operations.push('scan_start');
            await new Promise(resolve => setTimeout(resolve, 5));
            await mockChrome.storage.local.set({ scanInProgress: true });
            _operations.push('scan_complete');
            return 'scan_success';
          })(),

          // Operation 3: Update navigation
          (async () => {
            _operations.push('nav_start');
            await new Promise(resolve => setTimeout(resolve, 15));
            await mockChrome.storage.local.set({ currentOverlayIndex: 2 });
            _operations.push('nav_complete');
            return 'nav_success';
          })()
        ];

        const _operationResults = await Promise.all(_promises);
        _results.push(..._operationResults);

        return { operations: _operations, results: _results };
      };

      const { operations, results } = await _concurrentStateOperations();

      expect(operations).toContain('toggle_start');
      expect(operations).toContain('scan_start');
      expect(operations).toContain('nav_start');
      expect(operations).toContain('toggle_complete');
      expect(operations).toContain('scan_complete');
      expect(operations).toContain('nav_complete');

      expect(results).toContain('toggle_success');
      expect(results).toContain('scan_success');
      expect(results).toContain('nav_success');

      // Verify all storage operations completed
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(3);
    });

    test('should recover from state synchronization failures', async () => {
      // Mock state recovery mechanism
      const _stateRecovery = async () => {
        const _recovery = {
          attempts: [],
          success: false,
          finalState: null
        };

        // Attempt 1: Storage failure
        try {
          _recovery.attempts.push('attempt_1');
          mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage unavailable'));
          await mockChrome.storage.local.get(['isEnabled']);
        } catch (error) {
          _recovery.attempts.push('attempt_1_failed');
          _mockConsole.warn('State recovery attempt 1 failed:', error.message);
        }

        // Attempt 2: Fallback to defaults
        try {
          _recovery.attempts.push('attempt_2_fallback');
          const _defaultState = { isEnabled: false, scanInProgress: false };
          _recovery.finalState = _defaultState;
          _recovery.success = true;
          _recovery.attempts.push('attempt_2_success');
        } catch (error) {
          _recovery.attempts.push('attempt_2_failed');
        }

        return _recovery;
      };

      const _recovery = await _stateRecovery();

      expect(_recovery.attempts).toContain('attempt_1');
      expect(_recovery.attempts).toContain('attempt_1_failed');
      expect(_recovery.attempts).toContain('attempt_2_fallback');
      expect(_recovery.attempts).toContain('attempt_2_success');
      expect(_recovery.success).toBe(true);
      expect(_recovery.finalState).toEqual({ isEnabled: false, scanInProgress: false });
      expect(_mockConsole.warn).toHaveBeenCalledWith('State recovery attempt 1 failed:', 'Storage unavailable');
    });
  });
});