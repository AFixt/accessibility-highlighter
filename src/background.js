/**
 * @fileoverview Accessibility Highlighter - Background Service Worker
 *
 * This service worker manages the extension's lifecycle and state. It handles:
 * - Extension icon clicks to toggle accessibility checking on/off
 * - State persistence using Chrome storage API
 * - Communication with content scripts via message passing
 * - Dynamic icon updates to reflect current state
 * - Extension installation and update events
 *
 * The service worker runs persistently in the background and coordinates
 * between the browser action and content scripts running on web pages.
 *
 * @author AFixt
 * @version 1.0.1
 */

/**
 * @typedef {Object} TabQueryOptions
 * @property {boolean} active - Whether to find active tabs
 * @property {boolean} lastFocusedWindow - Whether to search in last focused window
 */

/**
 * @typedef {Object} Tab
 * @property {number} id - The tab ID
 * @property {string} url - The tab URL
 * @property {string} title - The tab title
 * @property {boolean} active - Whether the tab is active
 */

/**
 * @typedef {Object} StorageResult
 * @property {boolean} [isEnabled] - Whether the extension is enabled
 */

/**
 * @typedef {Object} ExtensionMessage
 * @property {string} action - The action to perform
 * @property {boolean} isEnabled - Whether accessibility highlighting is enabled
 */

/**
 * Get the currently active tab in the last focused window.
 * @async
 * @function getCurrentTab
 * @returns {Promise<Tab>} The currently active tab
 */
async function getCurrentTab() {
  try {
    /** @type {TabQueryOptions} */
    const queryOptions = { active: true, lastFocusedWindow: true };
    const tabs = await chrome.tabs.query(queryOptions);

    // Validate tabs result
    if (!Array.isArray(tabs) || tabs.length === 0) {
      console.warn('No active tabs found');
      return null;
    }

    const tab = tabs[0];

    // Validate tab object
    if (!tab || typeof tab !== 'object' || typeof tab.id !== 'number') {
      console.error('Invalid tab object:', tab);
      return null;
    }

    return tab;
  } catch (error) {
    console.error('Error querying tabs:', error);
    return null;
  }
}

/**
 * Toggles the accessibility highlighter state.
 * Shared function used by both click and keyboard shortcut handlers.
 * @async
 * @function toggleAccessibilityState
 * @returns {void}
 */
async function toggleAccessibilityState() {
  chrome.storage.local.get(['isEnabled']).then(result => {
    // Validate storage result
    if (!result || typeof result !== 'object') {
      console.error('Invalid storage result:', result);
      return;
    }

    // Validate and toggle isEnabled (default to false if not set)
    const currentState = result.isEnabled === true;
    const newState = !currentState;
    console.log(`Toggling state from ${currentState} to ${newState}`);

    chrome.storage.local.set({ isEnabled: newState }).then(() => {
      console.log(`Extension is now ${newState ? 'enabled' : 'disabled'}.`);

      // Update the extension icon based on the current state
      chrome.action.setIcon({
        path: {
          16: newState ? 'icons/icon-16.png' : 'icons/icon-disabled-16.png',
          48: newState ? 'icons/icon-48.png' : 'icons/icon-disabled-48.png',
          128: newState ? 'icons/icon-128.png' : 'icons/icon-disabled-128.png'
        }
      });

      // Update the title for accessibility (screen readers)
      chrome.action.setTitle({
        title: newState
          ? 'Accessibility Highlighter (ON) - Click to disable accessibility checking'
          : 'Accessibility Highlighter (OFF) - Click to enable accessibility checking'
      });

      // Set badge text for visual indication
      chrome.action.setBadgeText({
        text: newState ? 'ON' : 'OFF'
      });

      // Set badge background color based on state
      chrome.action.setBadgeBackgroundColor({
        color: newState ? '#28a745' : '#dc3545' // Green for on, red for off
      });

      // Send a message to the active tab in the current window
      getCurrentTab().then(activeTab => {
        if (activeTab && activeTab.id) {
          // Validate tab has valid ID
          if (typeof activeTab.id !== 'number' || activeTab.id < 0) {
            console.error('Invalid tab ID:', activeTab.id);
            return;
          }

          /** @type {ExtensionMessage} */
          const message = { action: 'toggleAccessibilityHighlight', isEnabled: newState };

          chrome.tabs.sendMessage(
            activeTab.id,
            message,
            /**
             * Handles the response from content script message.
             * @param {string} response - Response from content script
             * @returns {void}
             */
            response => {
              if (chrome.runtime.lastError) {
                // Handle any errors that occur during messaging
                console.warn(
                  `Could not send message to tab ${activeTab.id}: ${chrome.runtime.lastError.message}`
                );
              } else {
                // Optionally handle the response from the content script
                console.log('Response from content script:', response);
              }
            }
          );
        } else {
          console.warn('No active tab found');
        }
      }).catch(error => {
        console.error('Error getting current tab:', error);
      });
    }).catch(error => {
      console.error('Error setting storage:', error);
    });
  }).catch(error => {
    console.error('Error getting storage:', error);
  });
}

/**
 * Handles browser action click events to toggle accessibility highlighting.
 * @function
 * @returns {void}
 */
chrome.action.onClicked.addListener(() => {
  toggleAccessibilityState();
});

/**
 * Handles keyboard command events to toggle accessibility highlighting.
 * @function
 * @param {string} command - The command name from manifest
 * @returns {void}
 */
chrome.commands.onCommand.addListener(command => {
  if (command === 'toggle-accessibility') {
    toggleAccessibilityState();
  }
});

/**
 * Handles extension installation and update events.
 * Sets initial icon state based on stored settings.
 * @function
 * @returns {void}
 */
chrome.runtime.onInstalled.addListener(() => {
  // Set the initial state when the extension is installed/updated
  chrome.storage.local.get(['isEnabled']).then(result => {
    // Validate storage result
    if (!result || typeof result !== 'object') {
      console.error('Invalid storage result during install:', result);
      // Set default state
      result = { isEnabled: false };
    }

    // Validate isEnabled value (default to false if not set)
    const isEnabled = result.isEnabled === true;

    chrome.action.setIcon({
      path: {
        16: isEnabled ? 'icons/icon-16.png' : 'icons/icon-disabled-16.png',
        48: isEnabled ? 'icons/icon-48.png' : 'icons/icon-disabled-48.png',
        128: isEnabled ? 'icons/icon-128.png' : 'icons/icon-disabled-128.png'
      }
    });

    // Set initial accessibility properties
    chrome.action.setTitle({
      title: isEnabled
        ? 'Accessibility Highlighter (ON) - Click to disable accessibility checking'
        : 'Accessibility Highlighter (OFF) - Click to enable accessibility checking'
    });

    chrome.action.setBadgeText({
      text: isEnabled ? 'ON' : 'OFF'
    });

    chrome.action.setBadgeBackgroundColor({
      color: isEnabled ? '#28a745' : '#dc3545' // Green for on, red for off
    });
  }).catch(error => {
    console.error('Error during extension install setup:', error);
  });

  // Log install complete
  console.log('Accessibility Highlighter extension installed successfully');
});

// Export functions for testing (when in test environment)
if (typeof global !== 'undefined' && global.process && global.process.env && global.process.env.NODE_ENV === 'test') {
  global.getCurrentTab = getCurrentTab;
  global.toggleAccessibilityState = toggleAccessibilityState;
}
