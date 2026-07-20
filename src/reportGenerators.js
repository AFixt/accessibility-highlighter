/**
 * @file Accessibility report generation
 *
 * Functions for exporting accessibility scan results in JSON, CSV, HTML, and
 * text formats. Includes the export panel UI and a small DOM-XPath utility
 * used to identify problem elements in the reports.
 *
 * This file is loaded as a separate content script (see manifest.json
 * `content_scripts.js` array). It runs in the same isolated world as
 * `contentScript.js` and reads its top-level `const` state (`LOGS`,
 * `A11Y_CONFIG`, `customRules`) and helpers (`escapeHtml`,
 * `categorizeIssue`, `analyzeLogs`) through the shared Script lexical
 * environment.
 *
 * @author AFixt
 */

/* global LOGS, A11Y_CONFIG, customRules, categorizeIssue, analyzeLogs */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Creates an export panel for downloading accessibility reports.
 * @returns {void}
 */
function createExportPanel() {
  try {
    // Remove existing export panel
    const existing = document.querySelector('.a11y-export-panel');
    if (existing) {
      existing.remove();
    }

    const exportPanel = document.createElement('div');
    exportPanel.className = 'a11y-export-panel';
    exportPanel.setAttribute('aria-label', 'Export accessibility report panel');

    exportPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: ${A11Y_CONFIG.PERFORMANCE.Z_INDEX_OVERLAY + 3};
      background: white;
      border: 2px solid #28a745;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      width: 400px;
      max-width: 90vw;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Export Accessibility Report';
    title.style.cssText =
      'margin: 0 0 20px 0; color: #28a745; font-size: 18px; text-align: center;';
    exportPanel.appendChild(title);

    // Report info
    const summary = analyzeLogs();
    const infoSection = document.createElement('div');
    infoSection.style.cssText =
      'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;';
    infoSection.innerHTML = `
      <div><strong>Report Summary:</strong></div>
      <div style="margin-top: 8px;">
        <div>• Total Issues: ${summary.total}</div>
        <div>• Errors: ${summary.errors}</div>
        <div>• Warnings: ${summary.warnings}</div>
        <div>• Page: ${escapeHtml(document.title || 'Untitled')}</div>
        <div>• URL: ${escapeHtml(window.location.href)}</div>
        <div>• Generated: ${escapeHtml(new Date().toLocaleString())}</div>
      </div>
    `;
    exportPanel.appendChild(infoSection);

    // Export format options
    const formatSection = document.createElement('div');
    formatSection.style.cssText = 'margin-bottom: 20px;';

    const formatTitle = document.createElement('h4');
    formatTitle.textContent = 'Export Format:';
    formatTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px;';
    formatSection.appendChild(formatTitle);

    const formats = [
      { value: 'json', label: 'JSON (Developer-friendly)' },
      { value: 'csv', label: 'CSV (Spreadsheet)' },
      { value: 'html', label: 'HTML (Readable Report)' },
      { value: 'txt', label: 'Text (Simple List)' }
    ];

    let selectedFormat = 'json';

    formats.forEach(format => {
      const radioContainer = document.createElement('div');
      radioContainer.style.cssText = 'margin: 8px 0; display: flex; align-items: center;';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'exportFormat';
      radio.value = format.value;
      radio.id = `export-${format.value}`;
      radio.checked = format.value === selectedFormat;
      radio.style.marginRight = '8px';
      radio.addEventListener('change', () => {
        if (radio.checked) {
          selectedFormat = format.value;
        }
      });

      const label = document.createElement('label');
      label.setAttribute('for', `export-${format.value}`);
      label.textContent = format.label;
      label.style.cssText = 'cursor: pointer; font-size: 13px;';

      radioContainer.appendChild(radio);
      radioContainer.appendChild(label);
      formatSection.appendChild(radioContainer);
    });

    exportPanel.appendChild(formatSection);

    // Action buttons
    const buttonSection = document.createElement('div');
    buttonSection.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Download Report';
    exportBtn.style.cssText = `
      padding: 10px 20px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    exportBtn.addEventListener('click', () => {
      exportReport(selectedFormat);
      exportPanel.remove();
    });
    buttonSection.appendChild(exportBtn);

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.addEventListener('click', () => {
      exportPanel.remove();
    });
    buttonSection.appendChild(cancelBtn);

    exportPanel.appendChild(buttonSection);

    document.body.appendChild(exportPanel);
  } catch (error) {
    console.error('Error creating export panel:', error);
  }
}

/**
 * Exports accessibility report in the specified format.
 * @param {string} format - Export format (json, csv, html, txt)
 * @returns {void}
 */
function exportReport(format) {
  try {
    const summary = analyzeLogs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accessibility-report-${timestamp}`;

    let content, mimeType, extension;

    switch (format) {
      case 'json':
        content = generateJSONReport(summary);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = generateCSVReport();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'html':
        content = generateHTMLReport(summary);
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'txt':
        content = generateTextReport(summary);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Create and trigger download
    downloadFile(content, `${filename}.${extension}`, mimeType);

    console.log(`Accessibility report exported as ${format.toUpperCase()}`);
  } catch (error) {
    console.error('Error exporting report:', error);
    console.error(`Failed to export report: ${error.message}`);
  }
}

/**
 * Generates a JSON report of accessibility issues.
 * @param {object} summary - Summary statistics
 * @returns {string} JSON report content
 */
function generateJSONReport(summary) {
  const report = {
    metadata: {
      title: document.title || 'Untitled',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      generator: 'Accessibility Highlighter v1.0.1',
      scanType: 'automatic'
    },
    summary: {
      totalIssues: summary.total,
      errorCount: summary.errors,
      warningCount: summary.warnings,
      categories: summary.categories,
      topIssues: summary.topIssues.slice(0, 10)
    },
    issues: LOGS.map((log, index) => ({
      id: index + 1,
      level: log.level,
      message: log.message,
      category: categorizeIssue(log.message, log.element),
      element: {
        tagName: log.element ? log.element.tagName.toLowerCase() : 'unknown',
        xpath: getElementXPath(log.element),
        outerHTML: log.element ? log.element.outerHTML.substring(0, 200) : 'N/A'
      },
      timestamp: log.timestamp || new Date().toISOString()
    })),
    configuration: {
      rulesApplied: Object.keys(customRules).filter(key => customRules[key].enabled),
      scanSettings: customRules
    }
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generates a CSV report of accessibility issues.
 * @returns {string} CSV report content
 */
function generateCSVReport() {
  const headers = ['ID', 'Level', 'Category', 'Message', 'Element', 'XPath', 'Timestamp'];
  const rows = [headers.join(',')];

  LOGS.forEach((log, index) => {
    const row = [
      index + 1,
      log.level,
      categorizeIssue(log.message, log.element),
      `"${log.message.replace(/"/g, '""')}"`,
      log.element ? log.element.tagName.toLowerCase() : 'unknown',
      `"${getElementXPath(log.element)}"`,
      log.timestamp || new Date().toISOString()
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Generates an HTML report of accessibility issues.
 * @param {object} summary - Summary statistics
 * @returns {string} HTML report content
 */
function generateHTMLReport(summary) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${document.title || 'Untitled'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #007cba; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .issue { border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 15px; padding: 15px; }
        .issue.error { border-left: 4px solid #dc3545; }
        .issue.warning { border-left: 4px solid #ffc107; }
        .category { display: inline-block; background: #007cba; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 10px; }
        .element { background: #f8f9fa; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-item { text-align: center; padding: 15px; background: white; border-radius: 4px; border: 1px solid #dee2e6; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007cba; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Report</h1>
        <p><strong>Page:</strong> ${document.title || 'Untitled'}</p>
        <p><strong>URL:</strong> ${window.location.href}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Tool:</strong> Accessibility Highlighter v1.0.1</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${summary.total}</div>
                <div>Total Issues</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" style="color: #dc3545;">${summary.errors}</div>
                <div>Errors</div>
            </div>
            <div class="stat-item">
                <div class="stat-number" style="color: #ffc107;">${summary.warnings}</div>
                <div>Warnings</div>
            </div>
        </div>

        ${
          Object.keys(summary.categories).length > 0
            ? `
        <h3>Issues by Category</h3>
        <table>
            <thead>
                <tr><th>Category</th><th>Count</th></tr>
            </thead>
            <tbody>
                ${Object.entries(summary.categories)
                  .sort(([, a], [, b]) => b - a)
                  .map(
                    ([cat, count]) =>
                      `<tr><td>${cat.charAt(0).toUpperCase() + cat.slice(1)}</td><td>${count}</td></tr>`
                  )
                  .join('')}
            </tbody>
        </table>
        `
            : ''
        }
    </div>

    <div class="issues">
        <h2>Detailed Issues</h2>
        ${
          LOGS.length === 0
            ? '<p>No accessibility issues found.</p>'
            : LOGS.map(
                (log, index) => `
            <div class="issue ${log.level || 'error'}">
                <div>
                    <span class="category">${categorizeIssue(log.message, log.element)}</span>
                    <strong>Issue #${index + 1}</strong>
                </div>
                <p>${log.message}</p>
                ${
                  log.element
                    ? `
                <div class="element">
                    <strong>Element:</strong> &lt;${log.element.tagName.toLowerCase()}&gt;<br>
                    <strong>XPath:</strong> ${getElementXPath(log.element)}<br>
                    <strong>HTML:</strong> ${log.element.outerHTML.substring(0, 200)}${log.element.outerHTML.length > 200 ? '...' : ''}
                </div>
                `
                    : ''
                }
            </div>
          `
              ).join('')
        }
    </div>
</body>
</html>`;
}

/**
 * Generates a plain text report of accessibility issues.
 * @param {object} summary - Summary statistics
 * @returns {string} Text report content
 */
function generateTextReport(summary) {
  const lines = [];

  lines.push('ACCESSIBILITY REPORT');
  lines.push('===================');
  lines.push('');
  lines.push(`Page: ${document.title || 'Untitled'}`);
  lines.push(`URL: ${window.location.href}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Tool: Accessibility Highlighter v1.0.1`);
  lines.push('');

  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Total Issues: ${summary.total}`);
  lines.push(`Errors: ${summary.errors}`);
  lines.push(`Warnings: ${summary.warnings}`);
  lines.push('');

  if (Object.keys(summary.categories).length > 0) {
    lines.push('ISSUES BY CATEGORY');
    lines.push('------------------');
    Object.entries(summary.categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        lines.push(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${count}`);
      });
    lines.push('');
  }

  lines.push('DETAILED ISSUES');
  lines.push('---------------');

  if (LOGS.length === 0) {
    lines.push('No accessibility issues found.');
  } else {
    LOGS.forEach((log, index) => {
      lines.push(`${index + 1}. [${(log.level || 'error').toUpperCase()}] ${log.message}`);
      if (log.element) {
        lines.push(`   Element: <${log.element.tagName.toLowerCase()}>`);
        lines.push(`   XPath: ${getElementXPath(log.element)}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Gets the XPath of an element.
 * @param {Element} element - The element to get XPath for
 * @returns {string} XPath string
 */
function getElementXPath(element) {
  if (!element) {
    return 'N/A';
  }

  try {
    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const part = `${tagName}[${index}]`;
      parts.unshift(part);

      current = current.parentNode;
    }

    return '/' + parts.join('/');
  } catch (error) {
    return 'XPath generation failed';
  }
}

/**
 * Downloads a file with the given content.
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {void}
 */
function downloadFile(content, filename, mimeType) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Download failed');
  }
}

// Export to globals when running under Jest so tests that may add coverage
// for these functions can reach them. The runtime extension uses the
// shared Script lexical environment instead.
if (
  typeof global !== 'undefined' &&
  global.process &&
  global.process.env &&
  global.process.env.NODE_ENV === 'test'
) {
  global.createExportPanel = createExportPanel;
  global.exportReport = exportReport;
  global.generateJSONReport = generateJSONReport;
  global.generateCSVReport = generateCSVReport;
  global.generateHTMLReport = generateHTMLReport;
  global.generateTextReport = generateTextReport;
  global.getElementXPath = getElementXPath;
  global.downloadFile = downloadFile;
}
