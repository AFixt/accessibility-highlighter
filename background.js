let isEnabled = false; // Default state

chrome.action.onClicked.addListener(() => {
    isEnabled = !isEnabled; // Toggle the state
    chrome.storage.local.set({ isEnabled: isEnabled }, () => {
        console.log(`Extension is now ${isEnabled ? "enabled" : "disabled"}.`);
        
        // Update the extension icon based on the current state
        chrome.action.setIcon({
            path: {
                16: isEnabled ? "icon-16.png" : "icon-disabled-16.png",
                48: isEnabled ? "icon-48.png" : "icon-disabled-48.png",
                128: isEnabled ? "icon-128.png" : "icon-disabled-128.png",
            },
        });

        // Send a message to the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                let activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { action: "toggleAccessibilityHighlight", isEnabled: isEnabled }, function(response) {
                    if (chrome.runtime.lastError) {
                        // Handle any errors that occur during messaging
                        console.warn(`Could not send message to tab ${activeTab.id}: ${chrome.runtime.lastError.message}`);
                    } else {
                        // Optionally handle the response from the content script
                        console.log("Response from content script:", response);
                    }
                });
            }
        });
    });
});

chrome.runtime.onInstalled.addListener(() => {
    // Set the initial state when the extension is installed/updated
    chrome.storage.local.get(["isEnabled"], (result) => {
        isEnabled = result.isEnabled ?? true; // Default to true if not set
        chrome.action.setIcon({
            path: {
                16: isEnabled ? "icon-16.png" : "icon-disabled-16.png",
                48: isEnabled ? "icon-48.png" : "icon-disabled-48.png",
                128: isEnabled ? "icon-128.png" : "icon-disabled-128.png",
            },
        });
    });
});
