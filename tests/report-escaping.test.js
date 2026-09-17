/**
 * @fileoverview Escaping tests for the HTML report (#131)
 *
 * generateHTMLReport embeds text taken from the page being scanned — its
 * title, its URL, and the outerHTML of each failing element. The extension
 * runs on <all_urls>, so every one of those is attacker-controlled, and the
 * report is a document the user opens. Seven interpolation sites went in raw.
 *
 * Separate from tests/report-generators.test.js on purpose: that suite covers
 * what the generators produce, this one covers what they must not produce, and
 * mixing "does it work" with "can it be subverted" makes both harder to read.
 *
 * Every case here fails without the escapeHtml calls in generateHTMLReport.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

const PAYLOAD = '<script>alert(1)</script>';

/**
 * A summary of the shape analyzeLogs produces.
 *
 * @returns {object} Summary statistics.
 */
function summaryFixture() {
  return {
    total: 1,
    errors: 1,
    warnings: 0,
    categories: { images: 1 },
    topIssues: [['Image missing alt text', 1]]
  };
}

let savedLogs;
let savedTitle;

beforeEach(() => {
  savedLogs = global.LOGS;
  savedTitle = document.title;
  document.body.innerHTML = '';
});

afterEach(() => {
  global.LOGS = savedLogs;
  document.title = savedTitle;
});

describe('escapeHtml', () => {
  it('escapes the five characters that can change markup', () => {
    expect(global.escapeHtml('<b>')).toBe('&lt;b&gt;');
    expect(global.escapeHtml('a & b')).toBe('a &amp; b');
    // Quotes matter because values land inside attributes too; the previous
    // textContent/innerHTML implementation left both of these untouched.
    expect(global.escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
    expect(global.escapeHtml("it's")).toBe('it&#39;s');
  });

  it('does not double-escape the ampersands it introduces', () => {
    // A sequential replace that handles & after < would turn &lt; into
    // &amp;lt; and corrupt every escaped value.
    expect(global.escapeHtml('<')).toBe('&lt;');
  });

  it('coerces null and undefined to an empty string rather than "null"', () => {
    expect(global.escapeHtml(null)).toBe('');
    expect(global.escapeHtml(undefined)).toBe('');
  });

  it('works without a DOM, so a stubbed createElement cannot neuter it', () => {
    // setup-jest.js replaces document.createElement globally with an object
    // that has no textContent or innerHTML (#133). The old implementation
    // round-tripped through those and returned undefined under that stub —
    // silently disabling the escaping in every test.
    expect(global.escapeHtml(PAYLOAD)).not.toBeUndefined();
    expect(global.escapeHtml(PAYLOAD)).toContain('&lt;script&gt;');
  });
});

describe('generateHTMLReport escaping', () => {
  it('escapes the scanned page markup it embeds', () => {
    // The worst of the seven sites: log.element.outerHTML is the page's own
    // markup, verbatim.
    document.body.innerHTML = '<img id="i">';
    const element = document.getElementById('i');
    Object.defineProperty(element, 'outerHTML', {
      value: `<img src=x onerror="alert(1)">${PAYLOAD}`,
      configurable: true
    });
    global.LOGS = [{ level: 'error', message: 'Image missing alt text', element }];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).not.toContain(PAYLOAD);
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes the page title, including inside the <title> element', () => {
    // <title> is RCDATA, so `</title><script>` closes the element and escapes
    // into the document. Both the <title> and the visible header interpolate
    // document.title.
    document.title = `</title>${PAYLOAD}`;
    global.LOGS = [];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).not.toContain(PAYLOAD);
    expect(html).not.toContain('</title><script>');
  });

  it('escapes the issue message', () => {
    global.LOGS = [{ level: 'error', message: PAYLOAD, element: null }];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a value interpolated into an attribute', () => {
    // log.level lands inside class="issue ${...}". A bare quote would close
    // the attribute and let the rest become new attributes.
    global.LOGS = [
      { level: '" onmouseover="alert(1)', message: 'Image missing alt text', element: null }
    ];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).not.toContain('onmouseover="alert(1)');
    expect(html).toContain('&quot;');
  });

  it('still produces a usable document for ordinary input', () => {
    // Escaping must not mangle the report it is protecting.
    document.title = 'Example & Co';
    global.LOGS = [{ level: 'error', message: 'Image missing alt text', element: null }];

    const html = global.generateHTMLReport(summaryFixture());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Example &amp; Co');
    expect(html).toContain('Image missing alt text');
  });
});

describe('generateTextReport', () => {
  it('leaves markup alone, because plain text has nothing to escape into', () => {
    // Escaping here would be a bug in the other direction: the text report is
    // not parsed as markup, and &lt; in a .txt file is just noise.
    global.LOGS = [{ level: 'error', message: PAYLOAD, element: null }];

    expect(global.generateTextReport(summaryFixture())).toContain(PAYLOAD);
  });
});
