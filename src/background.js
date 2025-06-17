/**
 * Accessibility Highlighter - Background Service Worker
 * Handles extension state management and communication with content scripts
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
  /** @type {TabQueryOptions} */
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

/**
 * Handles browser action click events to toggle accessibility highlighting.
 * Updates extension state, icon, and sends message to active tab.
 * @function
 * @returns {void}
 */
chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get(["isEnabled"]).then(({ isEnabled = false }) => {
    console.log(isEnabled);
    isEnabled = !isEnabled; // Toggle the state

    chrome.storage.local.set({ isEnabled: isEnabled }).then(() => {
      console.log(`Extension is now ${isEnabled ? "enabled" : "disabled"}.`);

      // Update the extension icon based on the current state
      chrome.action.setIcon({
        path: {
          16: isEnabled ? "icons/icon-16.png" : "icons/icon-disabled-16.png",
          48: isEnabled ? "icons/icon-48.png" : "icons/icon-disabled-48.png",
          128: isEnabled ? "icons/icon-128.png" : "icons/icon-disabled-128.png",
        },
      });

      // Send a message to the active tab in the current window
      getCurrentTab().then(function (activeTab) {
        if (activeTab) {
          /** @type {ExtensionMessage} */
          const message = { action: "toggleAccessibilityHighlight", isEnabled: isEnabled };
          
          chrome.tabs.sendMessage(
            activeTab.id,
            message,
            /**
             * Handles the response from content script message.
             * @param {string} response - Response from content script
             * @returns {void}
             */
            function (response) {
              if (chrome.runtime.lastError) {
                // Handle any errors that occur during messaging
                console.warn(
                  `Could not send message to tab ${activeTab.id}: ${chrome.runtime.lastError.message}`
                );
              } else {
                // Optionally handle the response from the content script
                console.log("Response from content script:", response);
              }
            }
          );
        }
      });
    });
  });
});

/**
 * Handles extension installation and update events.
 * Sets initial icon state based on stored settings.
 * @function
 * @returns {void}
 */
chrome.runtime.onInstalled.addListener(() => {
  // Set the initial state when the extension is installed/updated
  chrome.storage.local.get(["isEnabled"]).then(({ isEnabled = false }) => {
    // Default to `false` to prevent impacting user experience on install
    chrome.action.setIcon({
      path: {
        16: isEnabled ? "icons/icon-16.png" : "icons/icon-disabled-16.png",
        48: isEnabled ? "icons/icon-48.png" : "icons/icon-disabled-48.png",
        128: isEnabled ? "icons/icon-128.png" : "icons/icon-disabled-128.png",
      },
    });
  });
  
  // Log install complete
  console.log("Accessibility Highlighter extension installed successfully");
});
