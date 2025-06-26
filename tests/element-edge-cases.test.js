/**
 * Element Checker Edge Cases Tests
 * Tests edge cases and boundary conditions for element checking functions
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({ isEnabled: true }),
      set: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    lastError: null
  }
};

// Mock window properties
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

// Import content script
require('../src/contentScript.js');

describe('Element Checker Edge Cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.logs = [];
    console.log = jest.fn();
  });

  describe('Image Element Edge Cases', () => {
    test('should handle img with empty alt attribute correctly', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = '';
      img.title = 'Chart showing quarterly results';
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).not.toHaveBeenCalled();
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should handle img with alt and title having subtle differences', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = 'Chart showing quarterly results';
      img.title = 'Chart showing quarterly results.'; // Note the period
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).toHaveBeenCalledWith(img);
    });

    test('should handle img with very long alt text', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = 'A'.repeat(1000); // Very long alt text
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle img with special characters in alt', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      img.alt = 'Chart with émojis 🎯 and spëciál characters';
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle img with data URI src', () => {
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).toHaveBeenCalledWith(img);
    });

    test('should handle img with blob URL src', () => {
      const img = document.createElement('img');
      img.src = 'blob:https://example.com/12345678-1234-1234-1234-123456789012';
      document.body.appendChild(img);

      global.checkImageElement(img);

      expect(console.log).toHaveBeenCalledWith(img);
    });
  });

  describe('Link Element Edge Cases', () => {
    test('should handle link with only whitespace text content', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.textContent = '   \n\t   ';
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).toHaveBeenCalledWith(link);
    });

    test('should handle link with nested elements containing text', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      const span = document.createElement('span');
      span.textContent = 'Click here';
      link.appendChild(span);
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle link with JavaScript protocol', () => {
      const link = document.createElement('a');
      link.href = 'javascript:void(0)';
      link.textContent = 'Click me';
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).toHaveBeenCalledWith(link);
    });

    test('should handle link with tel protocol', () => {
      const link = document.createElement('a');
      link.href = 'tel:+1234567890';
      link.textContent = 'Call us';
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle link with mailto protocol', () => {
      const link = document.createElement('a');
      link.href = 'mailto:test@example.com';
      link.textContent = 'Email us';
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle link with role="button"', () => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.role = 'button';
      link.textContent = 'Click here';
      document.body.appendChild(link);

      global.checkLinkElement(link);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle link with generic text variations', () => {
      const genericTexts = [
        'click here',
        'CLICK HERE',
        'Click Here',
        'read more',
        'READ MORE',
        'Read More',
        'more',
        'MORE',
        'here',
        'HERE'
      ];

      genericTexts.forEach(text => {
        document.body.innerHTML = '';
        const link = document.createElement('a');
        link.href = 'https://example.com';
        link.textContent = text;
        document.body.appendChild(link);

        global.checkLinkElement(link);

        expect(console.log).toHaveBeenCalledWith(link);
        console.log.mockClear();
      });
    });
  });

  describe('Table Element Edge Cases', () => {
    test('should handle table with empty th elements', () => {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      const th1 = document.createElement('th');
      const th2 = document.createElement('th');
      th1.textContent = ''; // Empty header
      th2.textContent = 'Valid Header';

      tr.appendChild(th1);
      tr.appendChild(th2);
      thead.appendChild(tr);
      table.appendChild(thead);
      document.body.appendChild(table);

      global.checkTableElement(table);

      expect(console.log).toHaveBeenCalledWith(table);
    });

    test('should handle table with whitespace-only th elements', () => {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = '   \n\t   ';

      tr.appendChild(th);
      thead.appendChild(tr);
      table.appendChild(thead);
      document.body.appendChild(table);

      global.checkTableElement(table);

      expect(console.log).toHaveBeenCalledWith(table);
    });

    test('should handle nested tables correctly', () => {
      const outerTable = document.createElement('table');
      const outerThead = document.createElement('thead');
      const outerTr = document.createElement('tr');
      const outerTh = document.createElement('th');
      outerTh.textContent = 'Outer Header';

      const innerTable = document.createElement('table');
      const innerTbody = document.createElement('tbody');
      const innerTr = document.createElement('tr');
      const innerTd = document.createElement('td');
      innerTd.textContent = 'Inner Cell';

      innerTr.appendChild(innerTd);
      innerTbody.appendChild(innerTr);
      innerTable.appendChild(innerTbody);

      outerTh.appendChild(innerTable);
      outerTr.appendChild(outerTh);
      outerThead.appendChild(outerTr);
      outerTable.appendChild(outerThead);
      document.body.appendChild(outerTable);

      global.checkTableElement(outerTable);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle table with summary attribute edge cases', () => {
      const table = document.createElement('table');
      table.summary = 'table'; // Uninformative summary
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = 'Header';

      tr.appendChild(th);
      thead.appendChild(tr);
      table.appendChild(thead);
      document.body.appendChild(table);

      global.checkTableElement(table);

      expect(console.log).toHaveBeenCalledWith(table);
    });
  });

  describe('Form Element Edge Cases', () => {
    test('should handle input with implicit label via parent label', () => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'username';

      label.textContent = 'Username: ';
      label.appendChild(input);
      document.body.appendChild(label);

      global.checkInputElement(input);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle input with aria-describedby', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'password';
      input.setAttribute('aria-describedby', 'pwd-help');

      const helpText = document.createElement('div');
      helpText.id = 'pwd-help';
      helpText.textContent = 'Password must be at least 8 characters';

      document.body.appendChild(input);
      document.body.appendChild(helpText);

      global.checkInputElement(input);

      expect(console.log).toHaveBeenCalledWith(input);
    });

    test('should handle input with multiple labels', () => {
      const label1 = document.createElement('label');
      label1.textContent = 'First Name';
      label1.htmlFor = 'name-input';

      const label2 = document.createElement('label');
      label2.textContent = 'Given Name';
      label2.htmlFor = 'name-input';

      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'name-input';
      input.name = 'firstName';

      document.body.appendChild(label1);
      document.body.appendChild(label2);
      document.body.appendChild(input);

      global.checkInputElement(input);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle input with placeholder as only label', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Enter your email';
      input.name = 'email';

      document.body.appendChild(input);

      global.checkInputElement(input);

      expect(console.log).toHaveBeenCalledWith(input);
    });
  });

  describe('Button Element Edge Cases', () => {
    test('should handle button with only icon font content', () => {
      const button = document.createElement('button');
      button.innerHTML = '<i class="fa fa-save"></i>'; // Icon font
      document.body.appendChild(button);

      global.checkButtonElement(button);

      expect(console.log).toHaveBeenCalledWith(button);
    });

    test('should handle button with nested elements containing text', () => {
      const button = document.createElement('button');
      const span = document.createElement('span');
      span.textContent = 'Save Document';
      button.appendChild(span);
      document.body.appendChild(button);

      global.checkButtonElement(button);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle button with mixed content', () => {
      const button = document.createElement('button');
      button.innerHTML = '<i class="icon"></i> Save';
      document.body.appendChild(button);

      global.checkButtonElement(button);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle button with only special characters', () => {
      const button = document.createElement('button');
      button.textContent = '×'; // Close button with × symbol
      document.body.appendChild(button);

      global.checkButtonElement(button);

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('Font Size Edge Cases', () => {
    test('should handle elements with font-size in different units', () => {
      const elements = [
        { fontSize: '8px', shouldFlag: true },
        { fontSize: '0.5em', shouldFlag: true },
        { fontSize: '0.6rem', shouldFlag: true },
        { fontSize: '12pt', shouldFlag: false },
        { fontSize: '14px', shouldFlag: false },
        { fontSize: '1em', shouldFlag: false },
        { fontSize: '100%', shouldFlag: false }
      ];

      elements.forEach(({ fontSize, shouldFlag }) => {
        document.body.innerHTML = '';
        const div = document.createElement('div');
        div.textContent = 'Test text content';
        div.style.fontSize = fontSize;
        document.body.appendChild(div);

        // Mock getComputedStyle to return the expected pixel value
        const pixelValue = fontSize.includes('px') ? parseInt(fontSize) :
          fontSize.includes('em') ? parseInt(fontSize) * 16 :
            fontSize.includes('rem') ? parseInt(fontSize) * 16 :
              fontSize.includes('pt') ? parseInt(fontSize) * 1.33 :
                16;

        window.getComputedStyle = jest.fn().mockReturnValue({
          fontSize: `${pixelValue}px`
        });

        global.checkFontSizes();

        if (shouldFlag) {
          expect(console.log).toHaveBeenCalledWith(div);
        } else {
          expect(console.log).not.toHaveBeenCalled();
        }

        console.log.mockClear();
      });
    });

    test('should handle elements with inherit font-size', () => {
      const parent = document.createElement('div');
      parent.style.fontSize = '10px';

      const child = document.createElement('p');
      child.textContent = 'Small text';
      child.style.fontSize = 'inherit';

      parent.appendChild(child);
      document.body.appendChild(parent);

      window.getComputedStyle = jest.fn().mockReturnValue({
        fontSize: '10px'
      });

      global.checkFontSizes();

      expect(console.log).toHaveBeenCalledWith(child);
    });
  });

  describe('Tabindex Edge Cases', () => {
    test('should handle negative tabindex values', () => {
      const div = document.createElement('div');
      div.tabIndex = -1;
      div.textContent = 'Focusable but not in tab order';
      document.body.appendChild(div);

      global.checkTabIndexElement(div);

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should handle very high tabindex values', () => {
      const div = document.createElement('div');
      div.tabIndex = 999999;
      div.textContent = 'Very high tab order';
      document.body.appendChild(div);

      global.checkTabIndexElement(div);

      expect(console.log).toHaveBeenCalledWith(div);
    });

    test('should handle elements with tabindex on non-interactive elements', () => {
      const span = document.createElement('span');
      span.tabIndex = 0;
      span.textContent = 'Focusable span';
      document.body.appendChild(span);

      global.checkTabIndexElement(span);

      expect(console.log).toHaveBeenCalledWith(span);
    });
  });

  describe('Overlay Creation Edge Cases', () => {
    test('should handle elements with zero dimensions', () => {
      const div = document.createElement('div');
      div.textContent = 'Hidden element';
      div.style.width = '0px';
      div.style.height = '0px';
      document.body.appendChild(div);

      // Mock getBoundingClientRect to return zero dimensions
      div.getBoundingClientRect = jest.fn().mockReturnValue({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      });

      global.overlay.call(div, 'overlay', 'error', 'Test message');

      // Should not create overlay for zero-sized elements
      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBe(0);
    });

    test('should handle elements outside viewport', () => {
      const div = document.createElement('div');
      div.textContent = 'Off-screen element';
      document.body.appendChild(div);

      // Mock getBoundingClientRect to return off-screen position
      div.getBoundingClientRect = jest.fn().mockReturnValue({
        width: 100,
        height: 50,
        top: -100,
        left: -200,
        right: -100,
        bottom: -50
      });

      global.overlay.call(div, 'overlay', 'error', 'Test message');

      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });

    test('should handle very large elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Large element';
      document.body.appendChild(div);

      // Mock getBoundingClientRect to return very large dimensions
      div.getBoundingClientRect = jest.fn().mockReturnValue({
        width: 10000,
        height: 5000,
        top: 0,
        left: 0,
        right: 10000,
        bottom: 5000
      });

      global.overlay.call(div, 'overlay', 'error', 'Test message');

      const overlays = document.querySelectorAll('.overlay');
      expect(overlays.length).toBeGreaterThan(0);
    });
  });
});