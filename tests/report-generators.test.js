/**
 * @fileoverview Tests for src/reportGenerators.js
 *
 * This file had 0% function coverage and 4.97% statement coverage, which made
 * the `functions: 0` entry in jest.config.js's ratchet a threshold that could
 * never fail (#128). A floor of zero reads exactly like a real floor and holds
 * nothing, and it sat on one of the two largest coverage gaps in the project.
 *
 * The exports are reached through the NODE_ENV=test bridge at the bottom of
 * reportGenerators.js, which promotes them onto `global`. That is the same
 * contract tests/config-constants.test.js uses: require contentScript.js, which
 * requires its siblings, and read what they publish.
 *
 * The report generators read LOGS, customRules and categorizeIssue out of the
 * shared lexical environment, so each case seeds `global.LOGS` and restores it
 * afterwards rather than relying on whatever a previous suite left behind.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

/**
 * Build a log entry of the shape the generators expect.
 *
 * @param {string} level 'error' or 'warning'.
 * @param {string} message The issue text.
 * @param {Element | null} element The offending element, or null.
 * @returns {object} One LOGS entry.
 */
function logEntry(level, message, element) {
  return { level, message, element, timestamp: '2026-01-01T00:00:00.000Z' };
}

/**
 * A summary of the shape analyzeLogs produces, which the generators consume.
 *
 * @returns {object} Summary statistics.
 */
function summaryFixture() {
  return {
    total: 2,
    errors: 1,
    warnings: 1,
    categories: { images: 1, links: 1 },
    topIssues: [['Image missing alt text', 1]]
  };
}

let savedLogs;

beforeEach(() => {
  savedLogs = global.LOGS;
  document.body.innerHTML = '';
});

afterEach(() => {
  global.LOGS = savedLogs;
});

describe('getElementXPath', () => {
  it('returns N/A for a missing element rather than throwing', () => {
    // The generators call this for every log entry, including ones whose
    // element has been removed from the DOM. Throwing here would take out the
    // whole report rather than one row.
    expect(global.getElementXPath(null)).toBe('N/A');
    expect(global.getElementXPath(undefined)).toBe('N/A');
  });

  it('builds a rooted path from the element up to the document', () => {
    document.body.innerHTML = '<div><p><span id="target">x</span></p></div>';

    expect(global.getElementXPath(document.getElementById('target'))).toBe(
      '/html[1]/body[1]/div[1]/p[1]/span[1]'
    );
  });

  it('indexes same-tag siblings so two of them get different paths', () => {
    // The index is the whole point: without it every <li> in a list would
    // report the same XPath and the report could not identify which one failed.
    document.body.innerHTML = '<ul><li>one</li><li id="second">two</li></ul>';

    expect(global.getElementXPath(document.getElementById('second'))).toBe(
      '/html[1]/body[1]/ul[1]/li[2]'
    );
  });

  it('counts only same-tag siblings, not every preceding sibling', () => {
    document.body.innerHTML = '<div><span>a</span><em>b</em><span id="s2">c</span></div>';

    // The <em> must not push the second <span> to index 3.
    expect(global.getElementXPath(document.getElementById('s2'))).toBe(
      '/html[1]/body[1]/div[1]/span[2]'
    );
  });
});

describe('generateCSVReport', () => {
  it('emits the header row even when there are no issues', () => {
    global.LOGS = [];

    expect(global.generateCSVReport()).toBe('ID,Level,Category,Message,Element,XPath,Timestamp');
  });

  it('writes one row per log entry, numbered from 1', () => {
    document.body.innerHTML = '<img id="i"><a id="a">x</a>';
    global.LOGS = [
      logEntry('error', 'Image missing alt text', document.getElementById('i')),
      logEntry('warning', 'Link text is not descriptive', document.getElementById('a'))
    ];

    const rows = global.generateCSVReport().split('\n');

    expect(rows).toHaveLength(3); // header + 2
    expect(rows[1]).toContain('1,error');
    expect(rows[1]).toContain('img');
    expect(rows[2]).toContain('2,warning');
    expect(rows[2]).toContain('/html[1]/body[1]/a[1]');
  });

  it('doubles embedded quotes so one message cannot break the column layout', () => {
    // A message containing a bare " would terminate the quoted field early and
    // shift every later column on that row. RFC 4180 escapes it by doubling.
    global.LOGS = [logEntry('error', 'Alt text is "image" which is redundant', null)];

    const row = global.generateCSVReport().split('\n')[1];

    expect(row).toContain('"Alt text is ""image"" which is redundant"');
  });

  it('reports an element-less entry as unknown rather than crashing', () => {
    global.LOGS = [logEntry('error', 'Page has no main landmark', null)];

    const row = global.generateCSVReport().split('\n')[1];

    expect(row).toContain('unknown');
    expect(row).toContain('"N/A"');
  });
});

describe('generateJSONReport', () => {
  it('produces parseable JSON carrying metadata, summary and issues', () => {
    document.body.innerHTML = '<img id="i">';
    global.LOGS = [logEntry('error', 'Image missing alt text', document.getElementById('i'))];

    const report = JSON.parse(global.generateJSONReport(summaryFixture()));

    expect(report.metadata.url).toBe(window.location.href);
    expect(report.metadata.scanType).toBe('automatic');
    expect(report.summary.totalIssues).toBe(2);
    expect(report.summary.errorCount).toBe(1);
    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      id: 1,
      level: 'error',
      message: 'Image missing alt text'
    });
    expect(report.issues[0].element.tagName).toBe('img');
    expect(report.issues[0].element.xpath).toBe('/html[1]/body[1]/img[1]');
  });

  it('caps topIssues at ten so a pathological page cannot bloat the report', () => {
    global.LOGS = [];
    const summary = summaryFixture();
    summary.topIssues = Array.from({ length: 25 }, (_, i) => [`issue ${i}`, 1]);

    const report = JSON.parse(global.generateJSONReport(summary));

    expect(report.summary.topIssues).toHaveLength(10);
  });

  it('truncates outerHTML at 200 characters', () => {
    // Without the cap a single large element could dominate the file.
    document.body.innerHTML = `<div id="big">${'x'.repeat(5000)}</div>`;
    global.LOGS = [logEntry('error', 'Contrast too low', document.getElementById('big'))];

    const report = JSON.parse(global.generateJSONReport(summaryFixture()));

    expect(report.issues[0].element.outerHTML).toHaveLength(200);
  });

  it('records N/A for an issue with no element', () => {
    global.LOGS = [logEntry('error', 'Page has no main landmark', null)];

    const report = JSON.parse(global.generateJSONReport(summaryFixture()));

    expect(report.issues[0].element.tagName).toBe('unknown');
    expect(report.issues[0].element.xpath).toBe('N/A');
    expect(report.issues[0].element.outerHTML).toBe('N/A');
  });
});

describe('generateTextReport', () => {
  it('includes the totals from the summary', () => {
    global.LOGS = [logEntry('error', 'Image missing alt text', null)];

    const text = global.generateTextReport(summaryFixture());

    expect(typeof text).toBe('string');
    expect(text).toContain('Image missing alt text');
  });
});

describe('generateHTMLReport', () => {
  it('returns a complete document', () => {
    global.LOGS = [logEntry('error', 'Image missing alt text', null)];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  // Escaping is not tested here. It was raw when this suite was written — a
  // live injection bug rather than a coverage gap (#131) — so it was filed
  // and fixed separately rather than pinned by a test asserting the broken
  // behaviour. tests/report-escaping.test.js now covers it; this suite stays
  // about what the generators produce.
});

describe('downloadFile', () => {
  // tests/setup-jest.js replaces document.createElement globally, for every
  // suite, with a stub returning a plain object. downloadFile builds a real
  // anchor and appends it, so under that stub appendChild rejects the value
  // outright ("parameter 1 is not of type 'Node'") and every path through the
  // function lands in its catch. Restoring the real implementation for this
  // block is what lets the function be exercised at all — and is a large part
  // of why this file sat at 0% function coverage.
  const realCreateElement = Document.prototype.createElement;
  let stubbedCreateElement;

  let createObjectURL;
  let revokeObjectURL;
  let clicked;

  beforeEach(() => {
    stubbedCreateElement = document.createElement;
    document.createElement = realCreateElement.bind(document);

    clicked = 0;
    createObjectURL = jest.fn(() => 'blob:mock-url');
    revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      clicked += 1;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.createElement = stubbedCreateElement;
  });

  it('creates an object URL, clicks the link, and cleans up after itself', () => {
    // Asserted through spies on the real appendChild/removeChild rather than
    // by querying the document. setup-jest.js mocks document.querySelectorAll
    // globally, so `expect(document.querySelectorAll('a[download]')).toHaveLength(0)`
    // passes whether or not the anchor is removed — a non-discriminating
    // assertion, which is the same class of problem as the coverage floor this
    // PR exists to fix. Mutation-checked: deleting the removeChild call fails
    // this test.
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    global.downloadFile('a,b,c', 'report.csv', 'text/csv');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toBe(1);

    const appended = appendSpy.mock.calls[0][0];
    expect(appended.download).toBe('report.csv');
    expect(appended.href).toBe('blob:mock-url');
    // The very same node must be taken back out; a leaked anchor accumulates
    // one per export for the lifetime of the page.
    expect(removeSpy).toHaveBeenCalledWith(appended);
    expect(appended.parentNode).toBeNull();
  });

  it('throws a wrapped error when the blob cannot be created', () => {
    // The caller shows a failure message; a silent return would look like a
    // successful download that produced no file.
    global.URL.createObjectURL = jest.fn(() => {
      throw new Error('quota exceeded');
    });

    expect(() => global.downloadFile('x', 'f.txt', 'text/plain')).toThrow('Download failed');
  });
});
