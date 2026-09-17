/**
 * @fileoverview The contract between what writes LOGS and what reads it (#132)
 *
 * Everything else that touches LOGS builds its entries by hand, in the shape
 * the readers want. That is why nobody noticed the writer produced a different
 * shape entirely: `{Level, Message, Element}` with Element a truncated,
 * tag-stripped string, against readers asking for `log.level`, `log.message`
 * and `log.element` — and calling `.tagName`, `.outerHTML` and getElementXPath
 * on the last one. Every field was undefined on real data, and
 * generateCSVReport threw on `log.message.replace(...)`.
 *
 * So this suite never constructs a LOGS entry. It drives the real writer,
 * `overlay()`, and then runs each report generator over what comes out. That
 * is the only arrangement that can catch the two halves drifting apart, and
 * every case here fails on the pre-fix writer.
 *
 * Two things have to be undone first, both from tests/setup-jest.js (#133):
 * document.createElement is replaced globally by a stub returning a plain
 * object, so overlay()'s own createElement call produces something
 * appendChild rejects — which lands the whole function in its catch and means
 * LOGS never gets written at all. jsdom also reports a zero-sized rect for
 * every element, and overlay() skips those by design.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

const realCreateElement = Document.prototype.createElement;

/**
 * Give an element a non-zero box, which overlay() requires before it will
 * record anything.
 *
 * @param {Element} element The element to size.
 * @returns {Element} The same element.
 */
function withSize(element) {
  element.getBoundingClientRect = () => ({
    top: 10,
    left: 20,
    width: 100,
    height: 50,
    right: 120,
    bottom: 60
  });
  return element;
}

let stubbedCreateElement;
let savedLogs;

beforeEach(() => {
  stubbedCreateElement = document.createElement;
  document.createElement = realCreateElement.bind(document);

  savedLogs = global.LOGS.slice();
  global.LOGS.length = 0;
  document.body.innerHTML = '';
});

afterEach(() => {
  document.createElement = stubbedCreateElement;
  global.LOGS.length = 0;
  global.LOGS.push(...savedLogs);
});

/**
 * Run the real writer against a fresh element and return the entry it made.
 *
 * @param {string} html Markup for the element to flag.
 * @param {string} message The issue message.
 * @returns {object} The single LOGS entry produced.
 */
function scanOne(html, message = 'Image missing alt text') {
  document.body.innerHTML = html;
  const element = withSize(document.body.firstElementChild);

  global.overlay.call(element, 'a11y-error', 'error', message);

  return global.LOGS[0];
}

describe('the entry overlay() writes', () => {
  it('uses the keys the readers ask for', () => {
    const entry = scanOne('<img src="x.png">');

    expect(entry).toBeDefined();
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Image missing alt text');
    // Not `Level`/`Message`/`Element`, which is what it used to write.
    expect(entry).not.toHaveProperty('Level');
    expect(entry).not.toHaveProperty('Message');
    expect(entry).not.toHaveProperty('Element');
  });

  it('stores the message escaped, which is what overlay() actually does', () => {
    // tests/unit.test.js carried a case for this that reimplemented overlay()
    // locally, with a comment claiming the copy "matches the source code". It
    // did not: the copy stripped < and > where the real function escapes the
    // five HTML characters, so it asserted
    // 'scriptalert("xss")/scriptTest message' — an output the shipped code has
    // never produced. Replaced by this, which drives the real function.
    const entry = scanOne('<div>x</div>', '<script>alert("xss")</script>Test message');

    expect(entry.message).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;Test message');
    expect(entry.message).not.toContain('<script>');
  });

  it('stores the element itself, not a string describing it', () => {
    // The readers call .tagName, .outerHTML and getElementXPath on this.
    const entry = scanOne('<img src="x.png">');

    expect(entry.element).toBeInstanceOf(Element);
    expect(entry.element.tagName).toBe('IMG');
    expect(entry.element.outerHTML).toContain('<img');
  });
});

describe('the reports, over what the writer actually produced', () => {
  it('generateCSVReport does not throw, and carries the real values', () => {
    // The sharpest regression: log.message was undefined, so
    // `log.message.replace(/"/g, '""')` was a TypeError and CSV export failed
    // outright as soon as there was one issue.
    scanOne('<a href="#">click here</a>', 'Link text is not descriptive');

    const rows = global.generateCSVReport().split('\n');

    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('error');
    expect(rows[1]).toContain('Link text is not descriptive');
    expect(rows[1]).toContain('a'); // the tagName, resolved from the node
    expect(rows[1]).not.toContain('undefined');
  });

  it('generateJSONReport resolves the element rather than reporting unknown', () => {
    scanOne('<img src="x.png">');

    const report = JSON.parse(global.generateJSONReport(global.analyzeLogs()));

    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].level).toBe('error');
    expect(report.issues[0].message).toBe('Image missing alt text');
    // These two were 'unknown' and 'N/A' for every issue, because log.element
    // did not exist.
    expect(report.issues[0].element.tagName).toBe('img');
    expect(report.issues[0].element.xpath).toContain('/img[');
  });

  it('generateHTMLReport renders the issue rather than the word undefined', () => {
    scanOne('<img src="x.png">');

    const html = global.generateHTMLReport(global.analyzeLogs());

    expect(html).toContain('Image missing alt text');
    expect(html).not.toContain('undefined');
  });

  it('generateTextReport renders the issue rather than the word undefined', () => {
    scanOne('<img src="x.png">');

    const text = global.generateTextReport(global.analyzeLogs());

    expect(text).toContain('Image missing alt text');
    expect(text).not.toContain('undefined');
  });

  it('analyzeLogs counts and categorises the entry', () => {
    // uiPanels.js reads the same three keys for the summary panel, so it broke
    // in the same way: every issue counted as neither error nor warning.
    scanOne('<img src="x.png">');

    const summary = global.analyzeLogs();

    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(0);
    expect(summary.categories.images).toBe(1);
  });
});
