/**
 * @file Accessibility Highlighter UI panels
 *
 * UI primitives for the in-page filter panel, summary panel, config panel,
 * and progress indicator. Also houses `analyzeLogs`, `categorizeIssue`, and
 * `applyFilters` since they are panel-side concerns.
 *
 * Loaded as a separate content script (see manifest.json
 * `content_scripts.js` array) and runs in the same isolated world as
 * `contentScript.js`. State (`LOGS`, `A11Y_CONFIG`, `customRules`,
 * `CURRENT_FILTERS`, `progressIndicator`) is declared in
 * `contentScript.js` and visible here through the shared Script lexical
 * environment.
 *
 * @author AFixt
 */

/* global LOGS, A11Y_CONFIG, CURRENT_FILTERS,
   runAccessibilityChecks, removeAccessibilityOverlays, createExportPanel */
/* global customRules:writable, progressIndicator:writable */
/**
 * Creates and shows a progress indicator for accessibility scanning.
 * @param {string} message - Progress message to display
 * @param {number} [percentage] - Progress percentage (0-100)
 * @returns {void}
 */
function showProgressIndicator(message, percentage = 0) {
  try {
    // Remove existing progress indicator
    hideProgressIndicator();

    // Create progress container
    progressIndicator = document.createElement('div');
    progressIndicator.className = 'a11y-progress-indicator';
    progressIndicator.setAttribute('aria-live', 'polite');
    progressIndicator.setAttribute('aria-label', 'Accessibility scan progress');

    // Style the progress indicator
    progressIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
      background: #007cba;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      min-width: 250px;
      max-width: 350px;
    `;

    // Create content
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.marginBottom = '8px';

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.3);
      border-radius: 3px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: white;
      width: ${Math.max(0, Math.min(100, percentage))}%;
      transition: width 0.3s ease;
    `;

    progressBar.appendChild(progressFill);
    progressIndicator.appendChild(messageDiv);
    progressIndicator.appendChild(progressBar);

    // Store references for updates
    progressIndicator._messageDiv = messageDiv;
    progressIndicator._progressFill = progressFill;

    document.body.appendChild(progressIndicator);
  } catch (error) {
    console.error('Error showing progress indicator:', error);
  }
}

/**
 * Updates the progress indicator with new message and percentage.
 * @param {string} message - Updated progress message
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {void}
 */
function updateProgressIndicator(message, percentage) {
  try {
    if (progressIndicator && progressIndicator._messageDiv && progressIndicator._progressFill) {
      progressIndicator._messageDiv.textContent = message;
      progressIndicator._progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
  } catch (error) {
    console.error('Error updating progress indicator:', error);
  }
}

/**
 * Hides and removes the progress indicator.
 * @returns {void}
 */
function hideProgressIndicator() {
  try {
    if (progressIndicator && progressIndicator.parentNode) {
      progressIndicator.parentNode.removeChild(progressIndicator);
    }
    progressIndicator = null;
  } catch (error) {
    console.error('Error hiding progress indicator:', error);
  }
}

/**
 * Categorizes an accessibility issue based on its message and element type.
 * @param {string} message - The issue message
 * @param {Element} element - The problematic element
 * @returns {string} The category name
 */
function categorizeIssue(message, element) {
  const tagName = element ? element.tagName.toLowerCase() : '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('alt') || lowerMessage.includes('image') || tagName === 'img') {
    return 'images';
  } else if (
    lowerMessage.includes('form') ||
    lowerMessage.includes('label') ||
    lowerMessage.includes('input') ||
    lowerMessage.includes('fieldset') ||
    ['input', 'form', 'fieldset', 'label'].includes(tagName)
  ) {
    return 'forms';
  } else if (lowerMessage.includes('link') || lowerMessage.includes('href') || tagName === 'a') {
    return 'links';
  } else if (
    lowerMessage.includes('landmark') ||
    lowerMessage.includes('heading') ||
    lowerMessage.includes('table') ||
    lowerMessage.includes('header') ||
    ['table', 'th', 'td', 'header', 'main', 'nav', 'aside', 'footer'].includes(tagName)
  ) {
    return 'structure';
  } else if (
    lowerMessage.includes('media') ||
    lowerMessage.includes('video') ||
    lowerMessage.includes('audio') ||
    lowerMessage.includes('captions') ||
    ['video', 'audio', 'iframe'].includes(tagName)
  ) {
    return 'multimedia';
  } else if (
    lowerMessage.includes('tabindex') ||
    lowerMessage.includes('navigation') ||
    lowerMessage.includes('keyboard')
  ) {
    return 'navigation';
  }

  return 'structure'; // Default category
}

/**
 * Applies current filters to show/hide overlays based on filter settings.
 * @returns {void}
 */
function applyFilters() {
  try {
    const allOverlays = document.querySelectorAll(A11Y_CONFIG.SELECTORS.OVERLAY_ELEMENTS);
    let visibleCount = 0;

    allOverlays.forEach(overlay => {
      const level = overlay.classList.contains('a11y-error') ? 'error' : 'warning';
      const message = overlay.dataset.a11ymessage || '';
      const element = overlay.parentElement;
      const category = categorizeIssue(message, element);

      // Check if overlay should be visible based on filters
      const shouldShow =
        (level === 'error' && CURRENT_FILTERS.showErrors) ||
        (level === 'warning' && CURRENT_FILTERS.showWarnings);

      const categoryEnabled = CURRENT_FILTERS.categories[category];

      if (shouldShow && categoryEnabled) {
        overlay.style.display = 'block';
        visibleCount++;
      } else {
        overlay.style.display = 'none';
      }
    });

    console.log(`Showing ${visibleCount} of ${allOverlays.length} accessibility issues`);

    // Update progress indicator if it exists
    if (progressIndicator && progressIndicator._messageDiv) {
      progressIndicator._messageDiv.textContent = `Showing ${visibleCount} of ${allOverlays.length} issues`;
    }
  } catch (error) {
    console.error('Error applying filters:', error);
  }
}

/**
 * Creates a filter control panel for managing result visibility.
 * @returns {void}
 */
function createFilterPanel() {
  try {
    // Remove existing filter panel
    const existing = document.querySelector('.a11y-filter-panel');
    if (existing) {
      existing.remove();
    }

    const filterPanel = document.createElement('div');
    filterPanel.className = 'a11y-filter-panel';
    filterPanel.setAttribute('aria-label', 'Accessibility results filter panel');

    filterPanel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
      background: white;
      border: 2px solid #007cba;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      min-width: 200px;
      max-width: 300px;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Filter Results';
    title.style.cssText = 'margin: 0 0 10px 0; color: #007cba; font-size: 16px;';
    filterPanel.appendChild(title);

    // Severity filters
    const severityGroup = document.createElement('div');
    severityGroup.style.marginBottom = '15px';

    const severityTitle = document.createElement('h4');
    severityTitle.textContent = 'Severity';
    severityTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px;';
    severityGroup.appendChild(severityTitle);

    // Error checkbox
    const errorCheckbox = createFilterCheckbox(
      'show-errors',
      'Errors',
      CURRENT_FILTERS.showErrors,
      checked => {
        CURRENT_FILTERS.showErrors = checked;
        applyFilters();
      }
    );
    severityGroup.appendChild(errorCheckbox);

    // Warning checkbox
    const warningCheckbox = createFilterCheckbox(
      'show-warnings',
      'Warnings',
      CURRENT_FILTERS.showWarnings,
      checked => {
        CURRENT_FILTERS.showWarnings = checked;
        applyFilters();
      }
    );
    severityGroup.appendChild(warningCheckbox);

    filterPanel.appendChild(severityGroup);

    // Category filters
    const categoryGroup = document.createElement('div');
    categoryGroup.style.marginBottom = '15px';

    const categoryTitle = document.createElement('h4');
    categoryTitle.textContent = 'Categories';
    categoryTitle.style.cssText = 'margin: 0 0 8px 0; font-size: 14px;';
    categoryGroup.appendChild(categoryTitle);

    const categories = [
      { key: 'images', label: 'Images' },
      { key: 'forms', label: 'Forms' },
      { key: 'links', label: 'Links' },
      { key: 'structure', label: 'Structure' },
      { key: 'multimedia', label: 'Multimedia' },
      { key: 'navigation', label: 'Navigation' }
    ];

    categories.forEach(({ key, label }) => {
      const checkbox = createFilterCheckbox(
        `category-${key}`,
        label,
        CURRENT_FILTERS.categories[key],
        checked => {
          CURRENT_FILTERS.categories[key] = checked;
          applyFilters();
        }
      );
      categoryGroup.appendChild(checkbox);
    });

    filterPanel.appendChild(categoryGroup);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Filters';
    closeButton.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    closeButton.addEventListener('click', () => {
      filterPanel.remove();
    });
    filterPanel.appendChild(closeButton);

    document.body.appendChild(filterPanel);
  } catch (error) {
    console.error('Error creating filter panel:', error);
  }
}

/**
 * Creates a checkbox input for filter controls.
 * @param {string} id - Input ID
 * @param {string} label - Label text
 * @param {boolean} checked - Initial checked state
 * @param {Function} onChange - Change handler function
 * @returns {HTMLElement} Checkbox container element
 */
function createFilterCheckbox(id, label, checked, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 4px 0; display: flex; align-items: center;';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = checked;
  checkbox.style.marginRight = '8px';
  checkbox.addEventListener('change', e => onChange(e.target.checked));

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;
  labelElement.style.cursor = 'pointer';

  container.appendChild(checkbox);
  container.appendChild(labelElement);

  return container;
}

/**
 * Creates a summary panel showing accessibility results overview.
 * @returns {void}
 */
function createSummaryPanel() {
  try {
    // Remove existing summary panel
    removePreviousSummaryPanel();

    // Analyze LOGS to create summary
    const summary = analyzeLogs();

    // Create main panel structure
    const summaryPanel = createBaseSummaryPanel();

    // Add all sections to the panel
    addSummaryTitle(summaryPanel);
    addOverallStatsSection(summaryPanel, summary);
    addCategoryBreakdownSection(summaryPanel, summary);
    addTopIssuesSection(summaryPanel, summary);
    addSummaryActionButtons(summaryPanel);

    // Add panel to DOM
    document.body.appendChild(summaryPanel);
  } catch (error) {
    console.error('Error creating summary panel:', error);
  }
}

/**
 * Removes any existing summary panel from the DOM.
 * @returns {void}
 */
function removePreviousSummaryPanel() {
  const existing = document.querySelector('.a11y-summary-panel');
  if (existing) {
    existing.remove();
  }
}

/**
 * Creates the base structure for the summary panel.
 * @returns {HTMLElement} The base panel element
 */
function createBaseSummaryPanel() {
  const summaryPanel = document.createElement('div');
  summaryPanel.className = 'a11y-summary-panel';
  summaryPanel.setAttribute('aria-label', 'Accessibility results summary');

  summaryPanel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 1};
    background: white;
    border: 2px solid #007cba;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    min-width: 280px;
    max-width: 400px;
    max-height: 70vh;
    overflow-y: auto;
  `;

  return summaryPanel;
}

/**
 * Adds the title to the summary panel.
 * @param {HTMLElement} panel - The panel to add the title to
 * @returns {void}
 */
function addSummaryTitle(panel) {
  const title = document.createElement('h3');
  title.textContent = 'Accessibility Summary';
  title.style.cssText = 'margin: 0 0 15px 0; color: #007cba; font-size: 18px; text-align: center;';
  panel.appendChild(title);
}

/**
 * Adds the overall statistics section to the summary panel.
 * @param {HTMLElement} panel - The panel to add the stats to
 * @param {object} summary - The summary data
 * @returns {void}
 */
function addOverallStatsSection(panel, summary) {
  const overallStats = document.createElement('div');
  overallStats.style.cssText =
    'margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px;';

  const totalIssues = document.createElement('div');
  totalIssues.innerHTML = `<strong>Total Issues: ${summary.total}</strong>`;
  totalIssues.style.fontSize = '16px';
  overallStats.appendChild(totalIssues);

  const severityBreakdown = document.createElement('div');
  severityBreakdown.innerHTML = `
    <div style="margin-top: 8px;">
      <span style="color: #dc3545;">● Errors: ${summary.errors}</span>
      <span style="margin-left: 15px; color: #ffc107;">● Warnings: ${summary.warnings}</span>
    </div>
  `;
  overallStats.appendChild(severityBreakdown);

  panel.appendChild(overallStats);
}

/**
 * Adds the category breakdown section to the summary panel.
 * @param {HTMLElement} panel - The panel to add the breakdown to
 * @param {object} summary - The summary data
 * @returns {void}
 */
function addCategoryBreakdownSection(panel, summary) {
  if (Object.keys(summary.categories).length === 0) {
    return;
  }

  const categoryTitle = document.createElement('h4');
  categoryTitle.textContent = 'Issues by Category';
  categoryTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; color: #333;';
  panel.appendChild(categoryTitle);

  const categoryList = createCategoryList(summary.categories);
  panel.appendChild(categoryList);
}

/**
 * Creates a list of categories with their issue counts.
 * @param {object} categories - Categories with their counts
 * @returns {HTMLElement} The category list element
 */
function createCategoryList(categories) {
  const categoryList = document.createElement('div');

  Object.entries(categories)
    .sort(([, a], [, b]) => b - a) // Sort by count descending
    .forEach(([category, count]) => {
      const categoryItem = createCategoryItem(category, count);
      categoryList.appendChild(categoryItem);
    });

  return categoryList;
}

/**
 * Creates a single category item with name and count.
 * @param {string} category - The category name
 * @param {number} count - The issue count
 * @returns {HTMLElement} The category item element
 */
function createCategoryItem(category, count) {
  const categoryItem = document.createElement('div');
  categoryItem.style.cssText =
    'display: flex; justify-content: space-between; margin: 5px 0; padding: 5px 0; border-bottom: 1px solid #eee;';

  const categoryName = document.createElement('span');
  categoryName.textContent = category.charAt(0).toUpperCase() + category.slice(1);

  const categoryCount = document.createElement('span');
  categoryCount.textContent = count;
  categoryCount.style.cssText = 'font-weight: bold; color: #007cba;';

  categoryItem.appendChild(categoryName);
  categoryItem.appendChild(categoryCount);

  return categoryItem;
}

/**
 * Adds the top issues section to the summary panel.
 * @param {HTMLElement} panel - The panel to add the top issues to
 * @param {object} summary - The summary data
 * @returns {void}
 */
function addTopIssuesSection(panel, summary) {
  if (summary.topIssues.length === 0) {
    return;
  }

  const topIssuesTitle = document.createElement('h4');
  topIssuesTitle.textContent = 'Most Common Issues';
  topIssuesTitle.style.cssText = 'margin: 20px 0 10px 0; font-size: 14px; color: #333;';
  panel.appendChild(topIssuesTitle);

  const topIssuesList = createTopIssuesList(summary.topIssues);
  panel.appendChild(topIssuesList);
}

/**
 * Creates a list of the most common issues.
 * @param {Array} topIssues - Array of top issues with counts
 * @returns {HTMLElement} The top issues list element
 */
function createTopIssuesList(topIssues) {
  const topIssuesList = document.createElement('div');

  topIssues.slice(0, 5).forEach(({ message, count }) => {
    const issueItem = createTopIssueItem(message, count);
    topIssuesList.appendChild(issueItem);
  });

  return topIssuesList;
}

/**
 * Creates a single top issue item with message and count.
 * @param {string} message - The issue message
 * @param {number} count - The occurrence count
 * @returns {HTMLElement} The issue item element
 */
function createTopIssueItem(message, count) {
  const issueItem = document.createElement('div');
  issueItem.style.cssText =
    'margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;';

  const issueText = document.createElement('div');
  issueText.textContent = message;
  issueText.style.cssText = 'margin-bottom: 4px;';

  const issueCount = document.createElement('div');
  issueCount.textContent = `Occurrences: ${count}`;
  issueCount.style.cssText = 'font-weight: bold; color: #666; font-size: 11px;';

  issueItem.appendChild(issueText);
  issueItem.appendChild(issueCount);

  return issueItem;
}

/**
 * Adds action buttons to the summary panel.
 * @param {HTMLElement} panel - The panel to add buttons to
 * @returns {void}
 */
function addSummaryActionButtons(panel) {
  const actionsSection = document.createElement('div');
  actionsSection.style.cssText = 'margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;';

  const buttonGroup = createSummaryButtonGroup();
  actionsSection.appendChild(buttonGroup);

  const closeButton = createSummaryCloseButton(panel);
  actionsSection.appendChild(closeButton);

  panel.appendChild(actionsSection);
}

/**
 * Creates the button group for summary actions.
 * @returns {HTMLElement} The button group element
 */
function createSummaryButtonGroup() {
  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

  const filterButton = createSummaryActionButton('Filter Results', '#007cba', () => {
    const existingFilter = document.querySelector('.a11y-filter-panel');
    if (existingFilter) {
      existingFilter.remove();
    } else {
      createFilterPanel();
    }
  });

  const configButton = createSummaryActionButton('Configure Rules', '#17a2b8', () => {
    const existingConfig = document.querySelector('.a11y-config-panel');
    if (existingConfig) {
      existingConfig.remove();
    } else {
      createConfigPanel();
    }
  });

  const exportButton = createSummaryActionButton('Export Report', '#28a745', () => {
    createExportPanel();
  });

  buttonGroup.appendChild(filterButton);
  buttonGroup.appendChild(configButton);
  buttonGroup.appendChild(exportButton);

  return buttonGroup;
}

/**
 * Creates a standardized action button for the summary panel.
 * @param {string} text - Button text
 * @param {string} backgroundColor - Button background color
 * @param {Function} clickHandler - Click event handler
 * @returns {HTMLElement} The button element
 */
function createSummaryActionButton(text, backgroundColor, clickHandler) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    background: ${backgroundColor};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  button.addEventListener('click', clickHandler);
  return button;
}

/**
 * Creates the close button for the summary panel.
 * @param {HTMLElement} panel - The panel to close
 * @returns {HTMLElement} The close button element
 */
function createSummaryCloseButton(panel) {
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close Summary';
  closeButton.style.cssText = `
    width: 100%;
    margin-top: 10px;
    padding: 8px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  closeButton.addEventListener('click', () => {
    panel.remove();
  });
  return closeButton;
}

/**
 * Analyzes the LOGS array to create summary statistics.
 * @returns {object} Summary object with statistics
 */
function analyzeLogs() {
  const summary = {
    total: LOGS.length,
    errors: 0,
    warnings: 0,
    categories: {},
    topIssues: []
  };

  const messageCount = {};

  LOGS.forEach(log => {
    // Count by severity
    if (log.level === 'error') {
      summary.errors++;
    } else if (log.level === 'warning') {
      summary.warnings++;
    }

    // Count by category
    const category = categorizeIssue(log.message, log.element);
    summary.categories[category] = (summary.categories[category] || 0) + 1;

    // Count message occurrences
    messageCount[log.message] = (messageCount[log.message] || 0) + 1;
  });

  // Create top issues list
  summary.topIssues = Object.entries(messageCount)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);

  return summary;
}

/**
 * Loads custom rules from Chrome storage.
 * @async
 * @returns {Promise<void>}
 */
async function loadCustomRules() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(['customRules']);
      if (result.customRules && typeof result.customRules === 'object') {
        // Merge loaded rules with defaults to ensure all properties exist
        customRules = { ...customRules, ...result.customRules };
        console.log('Custom rules loaded from storage');
      }
    }
  } catch (error) {
    console.warn('Failed to load custom rules:', error);
  }
}

/**
 * Saves custom rules to Chrome storage.
 * @async
 * @returns {Promise<void>}
 */
async function saveCustomRules() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ customRules });
      console.log('Custom rules saved to storage');
    }
  } catch (error) {
    console.warn('Failed to save custom rules:', error);
  }
}

/**
 * Resets custom rules to default values.
 * @returns {void}
 */
function resetCustomRules() {
  customRules = {
    images: {
      enabled: true,
      checkMissingAlt: true,
      checkUninformativeAlt: true,
      checkEmptyAltWithTitle: true,
      checkDifferentAltTitle: true,
      allowDecorativeImages: true
    },
    forms: {
      enabled: true,
      checkMissingLabels: true,
      checkInputImageAlt: true,
      checkFieldsetLegend: true,
      requireExplicitLabels: false
    },
    links: {
      enabled: true,
      checkEmptyLinks: true,
      checkGenericLinkText: true,
      checkInvalidHref: true,
      checkMatchingTitleText: true,
      allowJavaScriptLinks: false
    },
    structure: {
      enabled: true,
      checkMissingLandmarks: true,
      checkTableHeaders: true,
      checkNestedTables: true,
      checkUninformativeSummary: true,
      requireMainLandmark: true,
      requireHeadingStructure: false
    },
    multimedia: {
      enabled: true,
      checkAutoplay: true,
      checkIframeTitles: true,
      checkMediaCaptions: false,
      allowAutoplayWithControls: false
    },
    navigation: {
      enabled: true,
      checkTabIndex: true,
      checkKeyboardTraps: false,
      checkFocusIndicators: false,
      allowPositiveTabIndex: false
    },
    typography: {
      enabled: true,
      checkFontSize: true,
      minimumFontSize: 12,
      checkColorContrast: false,
      checkLineHeight: false
    },
    aria: {
      enabled: true,
      checkRoleBasedElements: true,
      requireAriaLabels: false,
      checkAriaReferences: false,
      allowRedundantRoles: true
    }
  };
}

/**
 * Creates a configuration panel for customizing accessibility rules.
 * @returns {void}
 */
function createConfigPanel() {
  try {
    // Remove existing config panel
    const existing = document.querySelector('.a11y-config-panel');
    if (existing) {
      existing.remove();
    }

    const configPanel = document.createElement('div');
    configPanel.className = 'a11y-config-panel';
    configPanel.setAttribute('aria-label', 'Accessibility rules configuration panel');

    configPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 2};
      background: white;
      border: 2px solid #007cba;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      width: 600px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Accessibility Rules Configuration';
    title.style.cssText =
      'margin: 0 0 20px 0; color: #007cba; font-size: 18px; text-align: center;';
    configPanel.appendChild(title);

    // Create sections for each rule category
    const categories = [
      { key: 'images', label: 'Image Accessibility' },
      { key: 'forms', label: 'Form Accessibility' },
      { key: 'links', label: 'Link Accessibility' },
      { key: 'structure', label: 'Document Structure' },
      { key: 'multimedia', label: 'Multimedia Content' },
      { key: 'navigation', label: 'Navigation & Interaction' },
      { key: 'typography', label: 'Text & Typography' },
      { key: 'aria', label: 'ARIA & Semantics' }
    ];

    categories.forEach(({ key, label }) => {
      const section = createConfigSection(key, label, customRules[key]);
      configPanel.appendChild(section);
    });

    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText =
      'margin-top: 20px; display: flex; gap: 10px; justify-content: center; border-top: 1px solid #eee; padding-top: 20px;';

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Configuration';
    saveButton.style.cssText = `
      padding: 10px 20px;
      background: #007cba;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    saveButton.addEventListener('click', async () => {
      await saveCustomRules();
      configPanel.remove();
      // Optionally re-run checks with new rules
      if (LOGS.length > 0) {
        removeAccessibilityOverlays();
        setTimeout(() => runAccessibilityChecks(), 100);
      }
    });
    actionButtons.appendChild(saveButton);

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Defaults';
    resetButton.style.cssText = `
      padding: 10px 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    resetButton.addEventListener('click', () => {
      // Use console.warn instead of confirm for ESLint compliance
      console.warn(
        'Resetting all rules to default values. This will overwrite your current configuration.'
      );
      resetCustomRules();
      configPanel.remove();
      createConfigPanel(); // Recreate with default values
    });
    actionButtons.appendChild(resetButton);

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelButton.addEventListener('click', () => {
      configPanel.remove();
    });
    actionButtons.appendChild(cancelButton);

    configPanel.appendChild(actionButtons);

    document.body.appendChild(configPanel);
  } catch (error) {
    console.error('Error creating config panel:', error);
  }
}

/**
 * Creates a configuration section for a specific rule category.
 * @param {string} categoryKey - The category key
 * @param {string} categoryLabel - The display label for the category
 * @param {object} rules - The rules object for this category
 * @returns {HTMLElement} The section element
 */
function createConfigSection(categoryKey, categoryLabel, rules) {
  const section = document.createElement('div');
  section.style.cssText =
    'margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px;';

  // Section header with enable/disable toggle
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; margin-bottom: 10px;';

  const enableCheckbox = document.createElement('input');
  enableCheckbox.type = 'checkbox';
  enableCheckbox.checked = rules.enabled;
  enableCheckbox.style.marginRight = '10px';
  enableCheckbox.addEventListener('change', e => {
    rules.enabled = e.target.checked;
    // Enable/disable all other checkboxes in this section
    const otherCheckboxes = section.querySelectorAll('input[type="checkbox"]:not(:first-child)');
    otherCheckboxes.forEach(cb => (cb.disabled = !e.target.checked));
  });

  const headerLabel = document.createElement('h4');
  headerLabel.textContent = categoryLabel;
  headerLabel.style.cssText = 'margin: 0; font-size: 16px; color: #333;';

  header.appendChild(enableCheckbox);
  header.appendChild(headerLabel);
  section.appendChild(header);

  // Create checkboxes for each rule
  Object.entries(rules).forEach(([key, value]) => {
    if (key === 'enabled') {
      return;
    } // Skip the enabled flag

    if (typeof value === 'boolean') {
      const checkbox = createConfigCheckbox(key, formatRuleLabel(key), value, checked => {
        rules[key] = checked;
      });
      checkbox.style.marginLeft = '20px';
      if (!rules.enabled) {
        checkbox.querySelector('input').disabled = true;
      }
      section.appendChild(checkbox);
    } else if (typeof value === 'number') {
      const numberInput = createConfigNumberInput(key, formatRuleLabel(key), value, newValue => {
        rules[key] = newValue;
      });
      numberInput.style.marginLeft = '20px';
      if (!rules.enabled) {
        numberInput.querySelector('input').disabled = true;
      }
      section.appendChild(numberInput);
    }
  });

  return section;
}

/**
 * Creates a checkbox input for configuration.
 * @param {string} key - The rule key
 * @param {string} label - The display label
 * @param {boolean} checked - Initial checked state
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Checkbox container
 */
function createConfigCheckbox(key, label, checked, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `config-${key}`;
  checkbox.checked = checked;
  checkbox.style.marginRight = '8px';
  checkbox.addEventListener('change', e => onChange(e.target.checked));

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', `config-${key}`);
  labelElement.textContent = label;
  labelElement.style.cssText = 'cursor: pointer; font-size: 13px;';

  container.appendChild(checkbox);
  container.appendChild(labelElement);

  return container;
}

/**
 * Creates a number input for configuration.
 * @param {string} key - The rule key
 * @param {string} label - The display label
 * @param {number} value - Initial value
 * @param {Function} onChange - Change handler
 * @returns {HTMLElement} Number input container
 */
function createConfigNumberInput(key, label, value, onChange) {
  const container = document.createElement('div');
  container.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', `config-${key}`);
  labelElement.textContent = label;
  labelElement.style.cssText = 'margin-right: 10px; font-size: 13px; min-width: 150px;';

  const input = document.createElement('input');
  input.type = 'number';
  input.id = `config-${key}`;
  input.value = value;
  input.min = key === 'minimumFontSize' ? '8' : '0';
  input.max = key === 'minimumFontSize' ? '24' : '100';
  input.style.cssText = 'width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 3px;';
  input.addEventListener('change', e => onChange(parseInt(e.target.value) || value));

  container.appendChild(labelElement);
  container.appendChild(input);

  return container;
}

/**
 * Formats a rule key into a readable label.
 * @param {string} key - The rule key
 * @returns {string} Formatted label
 */
function formatRuleLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Alt/g, 'Alt Text')
    .replace(/Href/g, 'Link Target')
    .replace(/Aria/g, 'ARIA');
}

// Export to globals when running under Jest so tests can reach these
// functions. The runtime extension uses the shared Script lexical
// environment instead.
if (
  typeof global !== 'undefined' &&
  global.process &&
  global.process.env &&
  global.process.env.NODE_ENV === 'test'
) {
  global.showProgressIndicator = showProgressIndicator;
  global.updateProgressIndicator = updateProgressIndicator;
  global.hideProgressIndicator = hideProgressIndicator;
  global.categorizeIssue = categorizeIssue;
  global.applyFilters = applyFilters;
  global.createFilterPanel = createFilterPanel;
  global.createSummaryPanel = createSummaryPanel;
  global.analyzeLogs = analyzeLogs;
  global.resetCustomRules = resetCustomRules;
  global.createConfigPanel = createConfigPanel;
  global.loadCustomRules = loadCustomRules;
  global.saveCustomRules = saveCustomRules;
}
