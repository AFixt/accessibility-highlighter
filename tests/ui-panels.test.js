/**
 * @fileoverview Tests for the panels in src/uiPanels.js (#139)
 *
 * The least-covered file in the project — 16.29% of statements, 11.47% of
 * functions — and the one that builds everything a user touches: the filter
 * panel, the summary panel, the configuration panel and the progress
 * indicator. The lines that were covered belonged to categorizeIssue and
 * analyzeLogs, reached incidentally because the report generators call them.
 * No test exercised a panel.
 *
 * None of this was testable until #133 removed the global document.createElement
 * stub, which made every DOM-building function fail at its first appendChild
 * and land in its own catch. #137 established the pattern used here: require
 * the content script, give Element.prototype a non-zero rect so overlay()
 * records anything at all, run the real scan, then assert on the DOM that
 * results.
 *
 * Assertions are on what the panels actually produce — the element is in the
 * document, the counts match the scan, the controls are wired. Not on whether
 * a function was called: `expect(mock).toHaveBeenCalled()` is what made the
 * old highlighter suite pass with its subject deleted (#137).
 *
 * Every case here is mutation-checked. Three assertions in this repository
 * have turned out to be unfalsifiable (#128, #130, #133), so a coverage
 * increase that does not survive mutation is not worth having.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

const realGetBoundingClientRect = Element.prototype.getBoundingClientRect;

/** Markup producing one error (missing alt) and one warning-ish link issue. */
const PAGE_WITH_ISSUES =
  '<main><img src="t.jpg"><a href="/x">click here</a><iframe src="t.html"></iframe></main>';

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 };
  };
});

afterAll(() => {
  Element.prototype.getBoundingClientRect = realGetBoundingClientRect;
});

beforeEach(() => {
  document.body.innerHTML = '';
  global.LOGS.length = 0;
  global.hideProgressIndicator();
});

/**
 * Run the real scan over a fixture so the panels have something to render.
 *
 * @param {string} [html] Markup to scan.
 * @returns {number} How many issues were recorded.
 */
function scan(html = PAGE_WITH_ISSUES) {
  document.body.innerHTML = html;
  global.LOGS.length = 0;
  global.resetThrottle();
  global.runAccessibilityChecks();
  return global.LOGS.length;
}

describe('the progress indicator', () => {
  it('puts a live region in the document carrying the message', () => {
    global.showProgressIndicator('Scanning the page', 25);

    const indicator = document.querySelector('.a11y-progress-indicator');
    expect(indicator).not.toBeNull();
    // aria-live is the point of this element: a scan that reports progress
    // only visually tells a screen reader user nothing.
    expect(indicator.getAttribute('aria-live')).toBe('polite');
    expect(indicator.textContent).toContain('Scanning the page');
  });

  it('replaces the previous one rather than stacking', () => {
    global.showProgressIndicator('First', 10);
    global.showProgressIndicator('Second', 20);

    expect(document.querySelectorAll('.a11y-progress-indicator')).toHaveLength(1);
    expect(document.querySelector('.a11y-progress-indicator').textContent).toContain('Second');
  });

  it('updates the message in place', () => {
    global.showProgressIndicator('Starting', 0);

    global.updateProgressIndicator('Half way', 50);

    expect(document.querySelector('.a11y-progress-indicator').textContent).toContain('Half way');
  });

  it('removes it again', () => {
    global.showProgressIndicator('Scanning', 25);
    expect(document.querySelector('.a11y-progress-indicator')).not.toBeNull();

    global.hideProgressIndicator();

    expect(document.querySelector('.a11y-progress-indicator')).toBeNull();
  });

  it('is safe to hide when nothing is showing', () => {
    expect(() => global.hideProgressIndicator()).not.toThrow();
  });
});

describe('the summary panel', () => {
  it('reports the counts the scan actually produced', () => {
    const issues = scan();
    const summary = global.analyzeLogs();

    global.createSummaryPanel();

    const panel = document.querySelector('.a11y-summary-panel');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain(String(issues));
    expect(panel.textContent).toContain(String(summary.errors));
  });

  it('lists the categories the scan found', () => {
    scan();
    const summary = global.analyzeLogs();

    global.createSummaryPanel();

    const text = document.querySelector('.a11y-summary-panel').textContent.toLowerCase();
    for (const category of Object.keys(summary.categories)) {
      expect(text).toContain(category);
    }
  });

  it('names the most common issue', () => {
    scan();
    const summary = global.analyzeLogs();

    global.createSummaryPanel();

    expect(document.querySelector('.a11y-summary-panel').textContent).toContain(
      summary.topIssues[0].message
    );
  });

  it('replaces the previous panel rather than stacking', () => {
    scan();

    global.createSummaryPanel();
    global.createSummaryPanel();

    expect(document.querySelectorAll('.a11y-summary-panel')).toHaveLength(1);
  });

  it('closes when its close button is pressed', () => {
    scan();
    global.createSummaryPanel();
    const panel = document.querySelector('.a11y-summary-panel');

    const close = [...panel.querySelectorAll('button')].find(
      button => /close|×/i.test(button.textContent) || button.getAttribute('aria-label')
    );
    expect(close).toBeDefined();
    close.click();

    expect(document.querySelector('.a11y-summary-panel')).toBeNull();
  });
});

describe('the filter panel', () => {
  it('puts a labelled panel in the document', () => {
    scan();

    global.createFilterPanel();

    const panel = document.querySelector('.a11y-filter-panel');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-label')).toBeTruthy();
  });

  it('offers a checkbox per level and per category', () => {
    scan();

    global.createFilterPanel();

    const boxes = document.querySelectorAll('.a11y-filter-panel input[type="checkbox"]');
    // errors + warnings + the four categories
    expect(boxes.length).toBeGreaterThanOrEqual(6);
    for (const box of boxes) {
      // Every control needs a name, or the panel is unusable by keyboard and
      // screen reader alike.
      const id = box.getAttribute('id');
      expect(document.querySelector(`label[for="${id}"]`)).not.toBeNull();
    }
  });

  it('shows each checkbox in the state the filters are actually in', () => {
    // Found by mutation: changing `checkbox.checked = checked` to a hard
    // `true` in createFilterCheckbox failed nothing, because the cases above
    // only assert the boxes exist and are labelled. A panel that opens with
    // every box ticked, whatever the filters say, misreports the state it
    // exists to show.
    scan();
    global.CURRENT_FILTERS.showWarnings = false;
    global.CURRENT_FILTERS.categories.images = false;

    global.createFilterPanel();

    const panel = document.querySelector('.a11y-filter-panel');
    const byId = id => panel.querySelector(`input[id="${id}"]`);
    const warnings = [...panel.querySelectorAll('input[type="checkbox"]')].find(box =>
      /warning/i.test(box.id)
    );
    const images = [...panel.querySelectorAll('input[type="checkbox"]')].find(box =>
      /image/i.test(box.id)
    );

    expect(warnings).toBeDefined();
    expect(images).toBeDefined();
    expect(warnings.checked).toBe(false);
    expect(images.checked).toBe(false);
    expect(byId(warnings.id).checked).toBe(false);

    global.CURRENT_FILTERS.showWarnings = true;
    global.CURRENT_FILTERS.categories.images = true;
  });

  it('replaces the previous panel rather than stacking', () => {
    scan();

    global.createFilterPanel();
    global.createFilterPanel();

    expect(document.querySelectorAll('.a11y-filter-panel')).toHaveLength(1);
  });
});

describe('applyFilters', () => {
  it('hides the overlays whose level is switched off', () => {
    scan();
    const overlays = document.querySelectorAll('.a11y-error');
    expect(overlays.length).toBeGreaterThan(0);

    global.CURRENT_FILTERS.showErrors = false;
    global.applyFilters();

    for (const overlay of document.querySelectorAll('.a11y-error')) {
      expect(overlay.style.display).toBe('none');
    }

    global.CURRENT_FILTERS.showErrors = true;
  });

  it('shows them again when switched back on', () => {
    scan();
    global.CURRENT_FILTERS.showErrors = false;
    global.applyFilters();

    global.CURRENT_FILTERS.showErrors = true;
    global.applyFilters();

    for (const overlay of document.querySelectorAll('.a11y-error')) {
      expect(overlay.style.display).toBe('block');
    }
  });

  it('hides overlays whose category is switched off', () => {
    scan('<main><img src="t.jpg"></main>');
    expect(document.querySelectorAll('.a11y-error').length).toBeGreaterThan(0);

    global.CURRENT_FILTERS.categories.images = false;
    global.applyFilters();

    for (const overlay of document.querySelectorAll('.a11y-error')) {
      expect(overlay.style.display).toBe('none');
    }

    global.CURRENT_FILTERS.categories.images = true;
  });
});

describe('the configuration panel', () => {
  it('puts a panel in the document with a control per rule', () => {
    global.createConfigPanel();

    const panel = document.querySelector('.a11y-config-panel');
    expect(panel).not.toBeNull();
    expect(panel.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0);
  });

  it('reflects the current rule state rather than a fixed default', () => {
    global.resetCustomRules();
    global.customRules.images.checkMissingAlt = false;

    global.createConfigPanel();

    const box = document.querySelector('.a11y-config-panel input[id*="checkMissingAlt"]');
    expect(box).not.toBeNull();
    expect(box.checked).toBe(false);

    global.resetCustomRules();
  });

  it('replaces the previous panel rather than stacking', () => {
    global.createConfigPanel();
    global.createConfigPanel();

    expect(document.querySelectorAll('.a11y-config-panel')).toHaveLength(1);
  });
});

describe('custom rules', () => {
  it('resetCustomRules restores every rule to enabled', () => {
    global.customRules.images.checkMissingAlt = false;
    global.customRules.forms.enabled = false;

    global.resetCustomRules();

    expect(global.customRules.images.checkMissingAlt).toBe(true);
    expect(global.customRules.forms.enabled).toBe(true);
  });

  it('saveCustomRules writes the current rules to storage', async () => {
    global.resetCustomRules();
    global.customRules.images.checkMissingAlt = false;
    chrome.storage.local.set.mockClear();

    await global.saveCustomRules();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      customRules: expect.objectContaining({
        images: expect.objectContaining({ checkMissingAlt: false })
      })
    });

    global.resetCustomRules();
  });

  it('loadCustomRules merges what storage returns over the defaults', async () => {
    global.resetCustomRules();
    chrome.storage.local.get.mockResolvedValueOnce({
      customRules: { images: { enabled: true, checkMissingAlt: false } }
    });

    await global.loadCustomRules();

    expect(global.customRules.images.checkMissingAlt).toBe(false);
    // Categories storage said nothing about must survive the merge.
    expect(global.customRules.forms).toBeDefined();

    global.resetCustomRules();
  });

  it('loadCustomRules leaves the defaults alone when storage is empty', async () => {
    global.resetCustomRules();
    chrome.storage.local.get.mockResolvedValueOnce({});

    await global.loadCustomRules();

    expect(global.customRules.images.checkMissingAlt).toBe(true);
  });

  it('loadCustomRules survives storage rejecting', async () => {
    // A rejected read must not take down the scan; the rules simply stay as
    // they are.
    global.resetCustomRules();
    chrome.storage.local.get.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(global.loadCustomRules()).resolves.toBeUndefined();
    expect(global.customRules.images.checkMissingAlt).toBe(true);
  });
});
