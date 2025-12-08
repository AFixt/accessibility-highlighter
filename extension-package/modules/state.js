/**
 * @fileoverview State management module for Accessibility Highlighter
 *
 * This module manages the global state of the accessibility highlighter including:
 * - Scan results and LOGS
 * - UI state (overlays, progress indicators)
 * - Keyboard navigation state
 * - Filter and configuration state
 *
 * @author AFixt
 * @version 1.0.1
 */

const { DEFAULT_FILTERS, DEFAULT_CUSTOM_RULES, loadCustomRules, loadFilterSettings } = require('./config.js');

/**
 * @typedef {Object} LogEntry
 * @property {string} Level - Log level (error/warning)
 * @property {string} Message - Error message
 * @property {string} Element - Element HTML snippet
 */

/**
 * Array to store accessibility check results for logging.
 * @type {LogEntry[]}
 */
const LOGS = [];

/**
 * Current overlay index for keyboard navigation.
 * @type {number}
 */
let currentOverlayIndex = -1;

/**
 * Flag to track if keyboard navigation is active.
 * @type {boolean}
 */
let keyboardNavigationActive = false;

/**
 * Progress indicator element for showing scan progress.
 * @type {HTMLElement|null}
 */
let progressIndicator = null;

/**
 * Flag to track if accessibility checks are currently running.
 * @type {boolean}
 */
let isRunning = false;

/**
 * Timestamp of the last accessibility check run.
 * @type {number}
 */
let lastRunTime = 0;

/**
 * Current filter settings for accessibility results.
 * @type {Object}
 */
let currentFilters = { ...DEFAULT_FILTERS };

/**
 * Current custom rules configuration for accessibility checks.
 * @type {Object}
 */
let customRules = { ...DEFAULT_CUSTOM_RULES };

/**
 * State for incremental scanning process.
 * @type {Object}
 */
let incrementalState = {
  isActive: false,
  currentIndex: 0,
  elements: [],
  startTime: 0,
  processedCount: 0,
  totalCount: 0,
  chunkTimeout: null
};

/**
 * Sets the current overlay index for keyboard navigation.
 * @param {number} index - The overlay index to set
 * @returns {void}
 */
function setCurrentOverlayIndex(index) {
  currentOverlayIndex = index;
}

/**
 * Gets the current overlay index.
 * @returns {number} Current overlay index
 */
function getCurrentOverlayIndex() {
  return currentOverlayIndex;
}

/**
 * Sets the keyboard navigation active state.
 * @param {boolean} active - Whether keyboard navigation is active
 * @returns {void}
 */
function setKeyboardNavigationActive(active) {
  keyboardNavigationActive = active;
}

/**
 * Gets the keyboard navigation active state.
 * @returns {boolean} Whether keyboard navigation is active
 */
function isKeyboardNavigationActive() {
  return keyboardNavigationActive;
}

/**
 * Sets the progress indicator element.
 * @param {HTMLElement|null} element - The progress indicator element
 * @returns {void}
 */
function setProgressIndicator(element) {
  progressIndicator = element;
}

/**
 * Gets the progress indicator element.
 * @returns {HTMLElement|null} The progress indicator element
 */
function getProgressIndicator() {
  return progressIndicator;
}

/**
 * Sets the running state of accessibility checks.
 * @param {boolean} running - Whether checks are running
 * @returns {void}
 */
function setIsRunning(running) {
  isRunning = running;
}

/**
 * Gets the running state of accessibility checks.
 * @returns {boolean} Whether checks are running
 */
function getIsRunning() {
  return isRunning;
}

/**
 * Sets the last run time of accessibility checks.
 * @param {number} time - Timestamp of last run
 * @returns {void}
 */
function setLastRunTime(time) {
  lastRunTime = time;
}

/**
 * Gets the last run time of accessibility checks.
 * @returns {number} Timestamp of last run
 */
function getLastRunTime() {
  return lastRunTime;
}

/**
 * Updates the current filter settings.
 * @param {Object} newFilters - New filter settings
 * @returns {void}
 */
function updateCurrentFilters(newFilters) {
  Object.assign(currentFilters, newFilters);
}

/**
 * Gets the current filter settings.
 * @returns {Object} Current filter settings
 */
function getCurrentFilters() {
  return currentFilters;
}

/**
 * Updates the custom rules configuration.
 * @param {Object} newRules - New custom rules
 * @returns {void}
 */
function updateCustomRules(newRules) {
  Object.assign(customRules, newRules);
}

/**
 * Gets the current custom rules configuration.
 * @returns {Object} Current custom rules
 */
function getCustomRules() {
  return customRules;
}

/**
 * Updates the incremental scan state.
 * @param {Object} newState - New incremental state properties
 * @returns {void}
 */
function updateIncrementalState(newState) {
  Object.assign(incrementalState, newState);
}

/**
 * Gets the current incremental scan state.
 * @returns {Object} Current incremental state
 */
function getIncrementalState() {
  return incrementalState;
}

/**
 * Resets the incremental scan state to initial values.
 * @returns {void}
 */
function resetIncrementalState() {
  incrementalState = {
    isActive: false,
    currentIndex: 0,
    elements: [],
    startTime: 0,
    processedCount: 0,
    totalCount: 0,
    chunkTimeout: null
  };
}

/**
 * Adds a log entry to the LOGS array.
 * @param {LogEntry} logEntry - The log entry to add
 * @returns {void}
 */
function addLogEntry(logEntry) {
  LOGS.push(logEntry);
}

/**
 * Clears all log entries.
 * @returns {void}
 */
function clearLogs() {
  LOGS.length = 0;
}

/**
 * Gets all log entries.
 * @returns {LogEntry[]} Array of log entries
 */
function getLogs() {
  return LOGS;
}

/**
 * Gets the count of log entries.
 * @returns {number} Number of log entries
 */
function getLogCount() {
  return LOGS.length;
}

/**
 * Initializes the state management system by loading persisted settings.
 * @returns {Promise<void>} Promise that resolves when initialization is complete
 */
async function initializeState() {
  try {
    // Load persisted filter settings
    const savedFilters = await loadFilterSettings();
    updateCurrentFilters(savedFilters);

    // Load persisted custom rules
    const savedRules = await loadCustomRules();
    updateCustomRules(savedRules);

    console.log('State initialized successfully');
  } catch (error) {
    console.error('Error initializing state:', error);
  }
}

/**
 * Resets all state to initial values.
 * @returns {void}
 */
function resetState() {
  // Reset LOGS
  clearLogs();

  // Reset navigation state
  currentOverlayIndex = -1;
  keyboardNavigationActive = false;

  // Reset progress indicator
  progressIndicator = null;

  // Reset scan state
  isRunning = false;
  lastRunTime = 0;

  // Reset incremental state
  resetIncrementalState();

  // Reset filters and rules to defaults
  currentFilters = { ...DEFAULT_FILTERS };
  customRules = { ...DEFAULT_CUSTOM_RULES };

  console.log('State reset to initial values');
}

/**
 * Gets a summary of the current state for debugging.
 * @returns {Object} State summary object
 */
function getStateSummary() {
  return {
    logCount: LOGS.length,
    currentOverlayIndex,
    keyboardNavigationActive,
    hasProgressIndicator: progressIndicator !== null,
    isRunning,
    lastRunTime: new Date(lastRunTime).toISOString(),
    incrementalActive: incrementalState.isActive,
    filtersActive: Object.values(currentFilters.categories).some(active => active),
    rulesEnabled: Object.values(customRules).filter(rule => rule.enabled).length
  };
}

// Export all state variables and functions for CommonJS
module.exports = {
  LOGS,
  setCurrentOverlayIndex,
  getCurrentOverlayIndex,
  setKeyboardNavigationActive,
  isKeyboardNavigationActive,
  setProgressIndicator,
  getProgressIndicator,
  setIsRunning,
  getIsRunning,
  setLastRunTime,
  getLastRunTime,
  updateCurrentFilters,
  getCurrentFilters,
  updateCustomRules,
  getCustomRules,
  updateIncrementalState,
  getIncrementalState,
  resetIncrementalState,
  addLogEntry,
  clearLogs,
  getLogs,
  getLogCount,
  initializeState,
  resetState,
  getStateSummary
};