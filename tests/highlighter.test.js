/**
 * @fileoverview End-to-end tests for the accessibility scan (#137)
 *
 * This file used to describe itself as testing "the extension functionality
 * using real fixtures" while binding to mocks that tests/setup-jest.js defined
 * for the extension's own functions. `runAccessibilityChecks` was a jest.fn()
 * that matched one magic phrase in document.body.innerHTML and pushed six
 * hardcoded log entries; every assertion here checked that those literals had
 * been pushed. All fifteen cases would have passed with src/ deleted.
 *
 * The hardcoded entries also used `{Level, Message, Element}`, the shape #132
 * established matches no reader in the codebase. So the one suite calling
 * itself integration agreed with the writer and with nothing else, which is
 * how generateCSVReport came to throw on every real scan without a test
 * noticing.
 *
 * It now requires the content script and runs the real scan. Two things have
 * to be arranged for that to work, and both are properties of jsdom rather
 * than of the code under test:
 *
 *   - Every element reports a zero-sized box, and overlay() skips those by
 *     design, so nothing would ever be recorded. Element.prototype gets a
 *     non-zero rect for the duration of this suite.
 *   - runAccessibilityChecks throttles repeat calls, so each scan resets it.
 *
 * Mutation-checked: breaking a detector in elementChecks.js turns exactly the
 * case for that detector red.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

const realGetBoundingClientRect = Element.prototype.getBoundingClientRect;
// The incremental scan yields mid-chunk when `performance.now() -
// chunkStartTime` exceeds CHUNK_DELAY (16ms), deferring the rest to
// requestAnimationFrame. runAccessibilityChecks defaults to incremental, so
// every scan below races that wall clock: on a loaded machine a chunk can
// exceed 16ms and the assertions then run against a half-finished scan (#142).
//
// Freezing performance.now makes the difference exactly 0 — both sides of that
// comparison read it — so the timing branch can never fire. The chunk still
// ends after CHUNK_SIZE (25) elements, so this only yields a fully synchronous
// scan for fixtures smaller than that; every fixture here is a handful of
// elements. The yield path itself is covered deliberately in
// tests/incremental-scan.test.js rather than by chance here.
const realPerformanceNow = performance.now;

/**
 * A page with no accessibility problems, used as the control. It carries a
 * landmark deliberately: without one the scan reports "No landmark elements
 * found", and a control fixture that trips a check is not a control.
 */
const CLEAN_PAGE =
  '<main>' +
  '<h1>Quarterly report</h1>' +
  '<img src="chart.png" alt="Revenue rose in the third quarter">' +
  '<label for="name">Name</label><input id="name" type="text">' +
  '<table><tr><th>Region</th></tr><tr><td>North</td></tr></table>' +
  '<iframe src="embed.html" title="Revenue breakdown"></iframe>' +
  '<a href="/about">About the team</a>' +
  '</main>';

beforeAll(() => {
  performance.now = () => 0;
  Element.prototype.getBoundingClientRect = function () {
    return { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 };
  };
});

afterAll(() => {
  performance.now = realPerformanceNow;
  Element.prototype.getBoundingClientRect = realGetBoundingClientRect;
});

beforeEach(() => {
  document.body.innerHTML = '';
  global.LOGS.length = 0;
});

/**
 * Run the real scan over a fixture and return the messages it recorded.
 *
 * @param {string} html Markup to place in the body.
 * @returns {string[]} One message per issue found.
 */
function scan(html) {
  document.body.innerHTML = html;
  global.LOGS.length = 0;
  global.resetThrottle();
  global.runAccessibilityChecks();
  return global.LOGS.map(log => log.message);
}

/**
 * Wrap a fragment in a landmark so the scan's landmark check stays quiet and
 * each case is left asserting only the thing it is about.
 *
 * @param {string} fragment Markup to wrap.
 * @returns {string} The wrapped markup.
 */
function inLandmark(fragment) {
  return `<main>${fragment}</main>`;
}

describe('a page with no problems', () => {
  it('records nothing at all', () => {
    expect(scan(CLEAN_PAGE)).toEqual([]);
  });

  it('adds no overlay elements to the document', () => {
    scan(CLEAN_PAGE);

    expect(document.querySelectorAll('.overlay')).toHaveLength(0);
  });
});

describe('what the scan detects', () => {
  // One fixture per detector, each the smallest markup that trips it. The
  // messages are compared against A11Y_CONFIG rather than typed out, so a
  // reworded message updates both sides at once and cannot drift.
  const cases = [
    ['an image with no alt attribute', '<img src="t.jpg">', 'MISSING_ALT'],
    ['alt text that describes nothing', '<img src="t.jpg" alt="image">', 'UNINFORMATIVE_ALT'],
    ['a form field with no label', '<input type="text">', 'FORM_FIELD_NO_LABEL'],
    ['a table with no header cells', '<table><tr><td>Cell</td></tr></table>', 'TABLE_NO_HEADERS'],
    [
      'a table nested inside a cell',
      '<table><tr><td><table><tr><th>H</th></tr></table></td></tr></table>',
      'NESTED_TABLE'
    ],
    [
      'a table whose summary describes layout',
      '<table summary="Layout"><tr><th>H</th></tr></table>',
      'UNINFORMATIVE_SUMMARY'
    ],
    ['an iframe with no title', '<iframe src="t.html"></iframe>', 'IFRAME_NO_TITLE'],
    ['link text that says nothing', '<a href="/x">click here</a>', 'GENERIC_LINK_TEXT']
  ];

  it.each(cases)('flags %s', (_label, fragment, messageKey) => {
    const expected = global.A11Y_CONFIG.MESSAGES[messageKey];

    expect(expected).toBeDefined(); // the key really exists, so a typo fails loudly
    expect(scan(inLandmark(fragment))).toContain(expected);
  });

  it('flags a non-actionable element in the tab order, naming the value', () => {
    // NON_ACTIONABLE_TABINDEX is a prefix — the code appends the tabindex it
    // found — so this cannot go in the table above, which compares exactly.
    const messages = scan(inLandmark('<div tabindex="0">x</div>'));

    expect(global.A11Y_CONFIG.MESSAGES.NON_ACTIONABLE_TABINDEX).toBe(
      'Non-actionable element with tabindex='
    );
    expect(messages).toContain('Non-actionable element with tabindex=0');
  });

  it('flags a page with no landmarks', () => {
    expect(scan('<div><p>Content with no landmark around it</p></div>')).toContain(
      global.A11Y_CONFIG.MESSAGES.NO_LANDMARKS
    );
  });
});

describe('what the scan leaves alone', () => {
  it('does not flag an element removed from the tab order', () => {
    // tabindex="-1" is the supported way to make something focusable only in
    // script. Flagging it would punish correct code.
    const messages = scan(inLandmark('<div tabindex="-1">x</div>'));

    expect(messages).toEqual([]);
  });

  it('does not flag a labelled input or a described image', () => {
    const messages = scan(
      inLandmark(
        '<label for="e">Email</label><input id="e" type="text">' +
          '<img src="c.png" alt="A line chart showing steady growth">'
      )
    );

    expect(messages).toEqual([]);
  });
});

describe('overlays', () => {
  it('puts an overlay in the document for each issue found', () => {
    const messages = scan(inLandmark('<img src="t.jpg"><iframe src="t.html"></iframe>'));

    expect(messages.length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.overlay').length).toBe(messages.length);
  });

  it('removes them again', () => {
    scan(inLandmark('<img src="t.jpg"><iframe src="t.html"></iframe>'));
    expect(document.querySelectorAll('.overlay').length).toBeGreaterThan(0);

    global.removeAccessibilityOverlays();

    // Asserted on the document, not on a spy. "the function was called" was
    // what the old suite checked, and it cannot tell whether anything happened.
    expect(document.querySelectorAll('.overlay')).toHaveLength(0);
  });
});

describe('toggleAccessibilityHighlight', () => {
  it('scans when switched on', () => {
    document.body.innerHTML = inLandmark('<img src="t.jpg">');
    global.LOGS.length = 0;
    global.resetThrottle();

    global.toggleAccessibilityHighlight(true);

    expect(global.LOGS.length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.overlay').length).toBeGreaterThan(0);
  });

  it('clears the overlays when switched off', () => {
    scan(inLandmark('<img src="t.jpg">'));
    expect(document.querySelectorAll('.overlay').length).toBeGreaterThan(0);

    global.toggleAccessibilityHighlight(false);

    expect(document.querySelectorAll('.overlay')).toHaveLength(0);
  });
});
