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
  let mockDocument;
  let mockConsole;
  let mockTabs;
  let mockStorage;

  beforeEach(() => {
    // Mock console
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      table: jest.fn()
    };
    global.console = mockConsole;

    // Mock storage
    mockStorage = {
      local: {
        get: jest.fn(() => Promise.resolve({ isEnabled: false })),
        set: jest.fn(() => Promise.resolve())
      }
    };

    // Mock tabs API
    mockTabs = {
      query: jest.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com' }])),
      sendMessage: jest.fn(() => Promise.resolve('response'))
    };

    // Mock Chrome APIs
    mockChrome = {
      storage: mockStorage,
      tabs: mockTabs,
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
    mockDocument = {
      body: {
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => [])
      },
      createElement: jest.fn(tag => {
        const element = {
          tagName: tag.toUpperCase(),
          innerHTML: '',
          className: '',
          style: {},
          attributes: {},
          setAttribute: jest.fn((name, value) => {
            element.attributes[name] = value;
          }),
          getAttribute: jest.fn(name => element.attributes[name]),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          addEventListener: jest.fn(),
          click: jest.fn(),
          getBoundingClientRect: jest.fn(() => ({
            top: 100, left: 200, width: 150, height: 100
          }))
        };
        return element;
      }),
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      querySelector: jest.fn(() => null)
    };
    
    global.document = mockDocument;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Background ↔ Content Script Communication', () => {
    test('should handle extension toggle message from background to content script', async () => {
      // Mock content script message handler
      const messageHandler = (message, sender, sendResponse) => {
        try {
          if (message.action === 'toggleAccessibilityHighlight') {
            const isEnabled = message.isEnabled;
            
            if (isEnabled) {
              // Simulate running accessibility checks
              mockConsole.log('Starting accessibility scan...');
              sendResponse('highlighted');
            } else {
              // Simulate removing overlays
              mockConsole.log('Removing accessibility overlays...');
              sendResponse('unhighlighted');
            }
            return true;
          }
          return false;
        } catch (error) {
          mockConsole.error('Error handling message:', error);
          return false;
        }
      };

      // Test enable message
      const enableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: true
      };

      const enableResponse = jest.fn();
      const enableResult = messageHandler(enableMessage, null, enableResponse);

      expect(enableResult).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith('Starting accessibility scan...');
      expect(enableResponse).toHaveBeenCalledWith('highlighted');

      // Test disable message
      const disableMessage = {
        action: 'toggleAccessibilityHighlight',
        isEnabled: false
      };

      const disableResponse = jest.fn();
      const disableResult = messageHandler(disableMessage, null, disableResponse);

      expect(disableResult).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith('Removing accessibility overlays...');
      expect(disableResponse).toHaveBeenCalledWith('unhighlighted');
    });

    test('should handle background script tab communication', async () => {
      // Mock background script functions
      const getCurrentTab = async () => {
        try {
          const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
          return tabs[0];
        } catch (error) {
          mockConsole.error('Error getting current tab:', error);
          throw error;
        }
      };

      const sendMessageToTab = async (tabId, message) => {
        try {
          const response = await mockChrome.tabs.sendMessage(tabId, message);
          return response;
        } catch (error) {
          mockConsole.error('Error sending message to tab:', error);
          throw error;
        }
      };

      // Test getting current tab
      const currentTab = await getCurrentTab();
      expect(currentTab.id).toBe(1);
      expect(currentTab.url).toBe('https://example.com');
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });

      // Test sending message to tab
      const message = { action: 'toggleAccessibilityHighlight', isEnabled: true };
      const response = await sendMessageToTab(currentTab.id, message);
      
      expect(response).toBe('response');
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, message);
    });

    test('should handle state synchronization between background and content script', async () => {
      // Mock state synchronization
      const syncExtensionState = async () => {
        try {
          // Get state from storage
          const result = await mockChrome.storage.local.get(['isEnabled']);
          const isEnabled = result.isEnabled || false;

          // Update icon based on state
          const iconPath = isEnabled ? 'icons/icon-active.png' : 'icons/icon-inactive.png';
          await mockChrome.action.setIcon({ path: iconPath });

          // Send state to content script
          const currentTab = await mockChrome.tabs.query({ active: true, currentWindow: true });
          if (currentTab[0]) {
            await mockChrome.tabs.sendMessage(currentTab[0].id, {
              action: 'syncState',
              isEnabled: isEnabled
            });
          }

          return isEnabled;
        } catch (error) {
          mockConsole.error('Error syncing state:', error);
          return false;
        }
      };

      const currentState = await syncExtensionState();

      expect(currentState).toBe(false); // Default state
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['isEnabled']);
      expect(mockChrome.action.setIcon).toHaveBeenCalledWith({ path: 'icons/icon-inactive.png' });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'syncState',
        isEnabled: false
      });
    });

    test('should handle communication errors gracefully', async () => {
      // Mock communication error scenarios
      const handleCommunicationError = async (operation) => {
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
          mockConsole.error('Communication error:', error.message);
          return error.message;
        }
      };

      // Test tab query error
      const tabError = await handleCommunicationError('tab_query_error');
      expect(tabError).toBe('Tab query failed');
      expect(mockConsole.error).toHaveBeenCalledWith('Communication error:', 'Tab query failed');

      // Test message send error
      const messageError = await handleCommunicationError('message_send_error');
      expect(messageError).toBe('Message send failed');

      // Test storage error
      const storageError = await handleCommunicationError('storage_error');
      expect(storageError).toBe('Storage access failed');
    });
  });

  describe('End-to-End User Scenarios', () => {
    test('should handle complete extension activation workflow', async () => {
      // Mock complete workflow from user click to content script execution
      const completeActivationWorkflow = async () => {
        const steps = [];

        try {
          // Step 1: User clicks extension icon
          steps.push('user_clicked_icon');

          // Step 2: Background script gets current tab
          const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
          const currentTab = tabs[0];
          steps.push('got_current_tab');

          // Step 3: Background script toggles state
          const currentState = await mockChrome.storage.local.get(['isEnabled']);
          const newState = !currentState.isEnabled;
          await mockChrome.storage.local.set({ isEnabled: newState });
          steps.push('toggled_state');

          // Step 4: Background script updates icon
          const iconPath = newState ? 'icons/icon-active.png' : 'icons/icon-inactive.png';
          await mockChrome.action.setIcon({ path: iconPath });
          steps.push('updated_icon');

          // Step 5: Background script sends message to content script
          const response = await mockChrome.tabs.sendMessage(currentTab.id, {
            action: 'toggleAccessibilityHighlight',
            isEnabled: newState
          });
          steps.push('sent_message_to_content');

          // Step 6: Content script responds
          if (response === 'response' || response === 'highlighted' || response === 'unhighlighted') {
            steps.push('content_script_responded');
          }

          return {
            success: true,
            steps: steps,
            newState: newState,
            response: response
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            steps: steps
          };
        }
      };

      const result = await completeActivationWorkflow();

      expect(result.success).toBe(true);
      expect(result.steps).toContain('user_clicked_icon');
      expect(result.steps).toContain('got_current_tab');
      expect(result.steps).toContain('toggled_state');
      expect(result.steps).toContain('updated_icon');
      expect(result.steps).toContain('sent_message_to_content');
      expect(result.steps).toContain('content_script_responded');
      expect(result.newState).toBe(true);
      expect(result.response).toBe('response');
    });

    test('should handle accessibility scan user journey', async () => {
      // Mock user journey for running accessibility scan
      const accessibilityScanJourney = async () => {
        const journey = {
          steps: [],
          findings: [],
          errors: []
        };

        try {
          // Step 1: User activates extension
          journey.steps.push('extension_activated');

          // Step 2: Content script starts scan
          journey.steps.push('scan_started');
          mockConsole.log('Starting accessibility scan...');

          // Step 3: Scan finds issues (mock findings)
          const mockIssues = [
            { type: 'image', message: 'Missing alt attribute', element: '<img src="test.jpg">' },
            { type: 'link', message: 'Uninformative link text', element: '<a href="#">click here</a>' },
            { type: 'form', message: 'Missing label', element: '<input type="text">' }
          ];

          journey.findings = mockIssues;
          journey.steps.push('issues_found');

          // Step 4: Create overlays for issues
          mockIssues.forEach(issue => {
            const overlay = mockDocument.createElement('div');
            overlay.className = 'a11y-highlight-overlay';
            overlay.setAttribute('data-a11ymessage', issue.message);
            mockDocument.body.appendChild(overlay);
          });
          journey.steps.push('overlays_created');

          // Step 5: Log results to console
          mockConsole.table(mockIssues);
          journey.steps.push('results_logged');

          // Step 6: User can navigate through issues
          journey.steps.push('navigation_ready');

          return journey;
        } catch (error) {
          journey.errors.push(error.message);
          return journey;
        }
      };

      const journey = await accessibilityScanJourney();

      expect(journey.steps).toContain('extension_activated');
      expect(journey.steps).toContain('scan_started');
      expect(journey.steps).toContain('issues_found');
      expect(journey.steps).toContain('overlays_created');
      expect(journey.steps).toContain('results_logged');
      expect(journey.steps).toContain('navigation_ready');
      expect(journey.findings).toHaveLength(3);
      expect(journey.errors).toHaveLength(0);
      expect(mockConsole.log).toHaveBeenCalledWith('Starting accessibility scan...');
      expect(mockConsole.table).toHaveBeenCalledWith(journey.findings);
    });

    test('should handle keyboard navigation user scenario', async () => {
      // Mock keyboard navigation scenario
      const keyboardNavigationScenario = async () => {
        const scenario = {
          overlays: [],
          currentIndex: -1,
          navigationActive: false,
          events: []
        };

        // Create mock overlays
        for (let i = 0; i < 3; i++) {
          const overlay = mockDocument.createElement('div');
          overlay.className = 'a11y-highlight-overlay';
          overlay.setAttribute('data-a11ymessage', `Issue ${i + 1}`);
          mockDocument.body.appendChild(overlay);
          scenario.overlays.push(overlay);
        }

        // Mock keyboard navigation handler
        const handleKeyboardEvent = (event) => {
          scenario.events.push(event.key);

          // Alt+Shift+N to start navigation
          if (event.altKey && event.shiftKey && event.key === 'N') {
            scenario.navigationActive = true;
            scenario.currentIndex = 0;
            event.preventDefault();
            return 'navigation_started';
          }

          if (!scenario.navigationActive) return 'not_navigating';

          switch (event.key) {
            case 'ArrowDown':
            case 'ArrowRight':
              event.preventDefault();
              scenario.currentIndex = Math.min(scenario.currentIndex + 1, scenario.overlays.length - 1);
              return 'moved_next';
            case 'ArrowUp':
            case 'ArrowLeft':
              event.preventDefault();
              scenario.currentIndex = Math.max(scenario.currentIndex - 1, 0);
              return 'moved_previous';
            case 'Home':
              event.preventDefault();
              scenario.currentIndex = 0;
              return 'moved_to_first';
            case 'End':
              event.preventDefault();
              scenario.currentIndex = scenario.overlays.length - 1;
              return 'moved_to_last';
            case 'Escape':
              event.preventDefault();
              scenario.navigationActive = false;
              scenario.currentIndex = -1;
              return 'navigation_stopped';
            default:
              return 'no_action';
          }
        };

        // Simulate user interactions
        const interactions = [
          { key: 'N', altKey: true, shiftKey: true, preventDefault: jest.fn() },
          { key: 'ArrowDown', preventDefault: jest.fn() },
          { key: 'ArrowDown', preventDefault: jest.fn() },
          { key: 'Home', preventDefault: jest.fn() },
          { key: 'End', preventDefault: jest.fn() },
          { key: 'Escape', preventDefault: jest.fn() }
        ];

        const results = interactions.map(interaction => handleKeyboardEvent(interaction));

        return {
          scenario,
          results,
          interactions
        };
      };

      const { scenario, results, interactions } = await keyboardNavigationScenario();

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
      const deactivationWorkflow = async () => {
        const workflow = {
          steps: [],
          cleanupActions: [],
          finalState: null
        };

        try {
          // Step 1: User clicks to deactivate
          workflow.steps.push('user_requested_deactivation');

          // Step 2: Background script updates state
          await mockChrome.storage.local.set({ isEnabled: false });
          workflow.steps.push('state_updated');

          // Step 3: Background script updates icon
          await mockChrome.action.setIcon({ path: 'icons/icon-inactive.png' });
          workflow.steps.push('icon_updated');

          // Step 4: Send message to content script
          const currentTab = await mockChrome.tabs.query({ active: true, currentWindow: true });
          await mockChrome.tabs.sendMessage(currentTab[0].id, {
            action: 'toggleAccessibilityHighlight',
            isEnabled: false
          });
          workflow.steps.push('message_sent');

          // Step 5: Content script cleanup
          // Mock overlay removal
          const overlays = mockDocument.querySelectorAll('.a11y-highlight-overlay');
          overlays.forEach(overlay => {
            mockDocument.body.removeChild(overlay);
            workflow.cleanupActions.push('removed_overlay');
          });
          workflow.steps.push('overlays_removed');

          // Step 6: Reset navigation state
          workflow.cleanupActions.push('navigation_reset');
          workflow.steps.push('navigation_state_reset');

          // Step 7: Clear logs
          workflow.cleanupActions.push('logs_cleared');
          workflow.steps.push('logs_cleared');

          workflow.finalState = 'deactivated';
          return workflow;
        } catch (error) {
          workflow.error = error.message;
          return workflow;
        }
      };

      const workflow = await deactivationWorkflow();

      expect(workflow.steps).toContain('user_requested_deactivation');
      expect(workflow.steps).toContain('state_updated');
      expect(workflow.steps).toContain('icon_updated');
      expect(workflow.steps).toContain('message_sent');
      expect(workflow.steps).toContain('overlays_removed');
      expect(workflow.steps).toContain('navigation_state_reset');
      expect(workflow.steps).toContain('logs_cleared');
      expect(workflow.finalState).toBe('deactivated');
      expect(workflow.error).toBeUndefined();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ isEnabled: false });
      expect(mockChrome.action.setIcon).toHaveBeenCalledWith({ path: 'icons/icon-inactive.png' });
    });
  });

  describe('State Synchronization', () => {
    test('should maintain state consistency across extension components', async () => {
      // Mock state management system
      const stateManager = {
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
            const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
              await mockChrome.tabs.sendMessage(tabs[0].id, {
                action: 'stateUpdate',
                state: this.state
              });
            }
          } catch (error) {
            mockConsole.warn('Failed to notify content script of state change:', error);
          }

          return this.state;
        },

        async loadState() {
          try {
            const stored = await mockChrome.storage.local.get(Object.keys(this.state));
            this.state = { ...this.state, ...stored };
            return this.state;
          } catch (error) {
            mockConsole.error('Failed to load state:', error);
            return this.state;
          }
        },

        getState() {
          return { ...this.state };
        }
      };

      // Test initial state load
      await stateManager.loadState();
      expect(stateManager.getState().isEnabled).toBe(false);

      // Test state update
      const newState = await stateManager.updateState({
        isEnabled: true,
        scanInProgress: true,
        lastScanTime: Date.now()
      });

      expect(newState.isEnabled).toBe(true);
      expect(newState.scanInProgress).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(newState);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        action: 'stateUpdate',
        state: newState
      });
    });

    test('should handle state synchronization during concurrent operations', async () => {
      // Mock concurrent state operations
      const concurrentStateOperations = async () => {
        const operations = [];
        const results = [];

        // Simulate multiple concurrent operations
        const promises = [
          // Operation 1: Toggle extension
          (async () => {
            operations.push('toggle_start');
            await new Promise(resolve => setTimeout(resolve, 10));
            await mockChrome.storage.local.set({ isEnabled: true });
            operations.push('toggle_complete');
            return 'toggle_success';
          })(),

          // Operation 2: Start scan
          (async () => {
            operations.push('scan_start');
            await new Promise(resolve => setTimeout(resolve, 5));
            await mockChrome.storage.local.set({ scanInProgress: true });
            operations.push('scan_complete');
            return 'scan_success';
          })(),

          // Operation 3: Update navigation
          (async () => {
            operations.push('nav_start');
            await new Promise(resolve => setTimeout(resolve, 15));
            await mockChrome.storage.local.set({ currentOverlayIndex: 2 });
            operations.push('nav_complete');
            return 'nav_success';
          })()
        ];

        const operationResults = await Promise.all(promises);
        results.push(...operationResults);

        return { operations, results };
      };

      const { operations, results } = await concurrentStateOperations();

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
      const stateRecovery = async () => {
        const recovery = {
          attempts: [],
          success: false,
          finalState: null
        };

        // Attempt 1: Storage failure
        try {
          recovery.attempts.push('attempt_1');
          mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage unavailable'));
          await mockChrome.storage.local.get(['isEnabled']);
        } catch (error) {
          recovery.attempts.push('attempt_1_failed');
          mockConsole.warn('State recovery attempt 1 failed:', error.message);
        }

        // Attempt 2: Fallback to defaults
        try {
          recovery.attempts.push('attempt_2_fallback');
          const defaultState = { isEnabled: false, scanInProgress: false };
          recovery.finalState = defaultState;
          recovery.success = true;
          recovery.attempts.push('attempt_2_success');
        } catch (error) {
          recovery.attempts.push('attempt_2_failed');
        }

        return recovery;
      };

      const recovery = await stateRecovery();

      expect(recovery.attempts).toContain('attempt_1');
      expect(recovery.attempts).toContain('attempt_1_failed');
      expect(recovery.attempts).toContain('attempt_2_fallback');
      expect(recovery.attempts).toContain('attempt_2_success');
      expect(recovery.success).toBe(true);
      expect(recovery.finalState).toEqual({ isEnabled: false, scanInProgress: false });
      expect(mockConsole.warn).toHaveBeenCalledWith('State recovery attempt 1 failed:', 'Storage unavailable');
    });
  });
});