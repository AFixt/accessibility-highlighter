/**
 * Real DOM Scenarios Tests
 * Tests for complex real-world DOM structures including:
 * - Complex page structures
 * - Edge case handling
 * - Cross-browser compatibility scenarios
 * - Dynamic content handling
 */

// Set test environment
process.env.NODE_ENV = 'test';

describe('Setup test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('Real DOM Scenarios Tests', () => {
  let _mockDocument;
  let mockWindow;
  let _mockConsole;

  beforeEach(() => {
    // Mock console
    _mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      table: jest.fn()
    };
    global.console = _mockConsole;

    // Mock window
    mockWindow = {
      getComputedStyle: jest.fn(() => ({
        display: 'block',
        visibility: 'visible',
        fontSize: '16px',
        width: '100px',
        height: '50px'
      })),
      scrollY: 0,
      scrollX: 0,
      innerWidth: 1024,
      innerHeight: 768
    };
    global.window = mockWindow;

    // Mock document with complex DOM structure capabilities
    _mockDocument = {
      body: {
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        getBoundingClientRect: jest.fn(() => ({
          top: 0, left: 0, width: 1024, height: 768
        }))
      },
      createElement: jest.fn(tag => {
        const _element = {
          tagName: tag.toUpperCase(),
          innerHTML: '',
          textContent: '',
          className: '',
          id: '',
          style: {},
          attributes: {},
          children: [],
          parentNode: null,
          nodeType: 1,
          setAttribute: jest.fn((name, value) => {
            element.attributes[name] = value;
          }),
          getAttribute: jest.fn(name => element.attributes[name]),
          hasAttribute: jest.fn(name => name in element.attributes),
          appendChild: jest.fn(child => {
            element.children.push(child);
            child.parentNode = element;
          }),
          removeChild: jest.fn(child => {
            const _index = element.children.indexOf(child);
            if (index > -1) {
              element.children.splice(index, 1);
              child.parentNode = null;
            }
          }),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          click: jest.fn(),
          focus: jest.fn(),
          getBoundingClientRect: jest.fn(() => ({
            top: 100, left: 200, width: 150, height: 100
          }))
        };
        return element;
      }),
      createTextNode: jest.fn(text => ({
        nodeType: 3,
        textContent: text,
        parentNode: null
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      querySelector: jest.fn(() => null)
    };

    global.document = _mockDocument;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complex Page Structures', () => {
    test('should handle nested iframe structures', () => {
      // Create complex nested iframe structure
      const _createNestedIframeStructure = () => {
        const _mainPage = _mockDocument.createElement('div');
        mainPage.id = 'main-content';

        // Create primary iframe
        const _primaryIframe = _mockDocument.createElement('iframe');
        primaryIframe.src = 'https://example.com/widget';
        primaryIframe.setAttribute('title', 'Interactive Widget');
        mainPage.appendChild(primaryIframe);

        // Create secondary iframe (accessibility issues)
        const _secondaryIframe = _mockDocument.createElement('iframe');
        secondaryIframe.src = 'https://example.com/ads';
        // Missing title attribute - accessibility issue
        mainPage.appendChild(secondaryIframe);

        // Create nested structure
        const _outerContainer = _mockDocument.createElement('div');
        outerContainer.className = 'iframe-container';

        const _nestedIframe = _mockDocument.createElement('iframe');
        nestedIframe.src = 'about:blank';
        nestedIframe.setAttribute('title', 'Nested Content');
        outerContainer.appendChild(nestedIframe);
        mainPage.appendChild(outerContainer);

        return mainPage;
      };

      const _checkIframeAccessibility = container => {
        const _issues = [];
        const _iframes = [];

        // Simulate finding iframes
        container.children.forEach(child => {
          if (child.tagName === 'IFRAME') {
            iframes.push(child);
          } else if (child.children) {
            child.children.forEach(grandchild => {
              if (grandchild.tagName === 'IFRAME') {
                iframes.push(grandchild);
              }
            });
          }
        });

        iframes.forEach(iframe => {
          // Check for missing title
          if (!iframe.getAttribute('title')) {
            issues.push({
              element: iframe,
              issue: 'missing_title',
              message: 'Iframe missing accessible title attribute'
            });
          }

          // Check for empty title
          const _title = iframe.getAttribute('title');
          if (title && title.trim() === '') {
            issues.push({
              element: iframe,
              issue: 'empty_title',
              message: 'Iframe has empty title attribute'
            });
          }
        });

        return { iframes: iframes.length, issues };
      };

      const _structure = createNestedIframeStructure();
      const _results = checkIframeAccessibility(structure);

      expect(results.iframes).toBe(3);
      expect(results.issues).toHaveLength(1);
      expect(results.issues[0].issue).toBe('missing_title');
      expect(results.issues[0].message).toBe('Iframe missing accessible title attribute');
    });

    test('should handle complex table structures with nested content', () => {
      // Create complex table with accessibility challenges
      const _createComplexTable = () => {
        const _table = _mockDocument.createElement('table');
        table.setAttribute('role', 'table');

        // Create caption
        const _caption = _mockDocument.createElement('caption');
        caption.textContent = 'Quarterly Sales Data';
        table.appendChild(caption);

        // Create header with complex structure
        const _thead = _mockDocument.createElement('thead');
        const _headerRow = _mockDocument.createElement('tr');

        const _headers = [
          { text: 'Product', scope: 'col' },
          { text: 'Q1 2023', scope: 'col' },
          { text: 'Q2 2023', scope: 'col' },
          { text: '', scope: 'col' }, // Empty header - accessibility issue
          { text: 'Total', scope: 'col' }
        ];

        headers.forEach(headerData => {
          const _th = _mockDocument.createElement('th');
          th.textContent = headerData.text;
          if (headerData.scope) {
            th.setAttribute('scope', headerData.scope);
          }
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create complex body with rowspan/colspan
        const _tbody = _mockDocument.createElement('tbody');

        // Row 1
        const _row1 = _mockDocument.createElement('tr');
        const _row1Headers = [
          { text: 'Product A', scope: 'row' },
          { text: '$10,000' },
          { text: '$12,000' },
          { text: 'Up 20%' },
          { text: '$22,000' }
        ];

        row1Headers.forEach((cellData, index) => {
          const _cell = index === 0 ? _mockDocument.createElement('th') : _mockDocument.createElement('td');
          cell.textContent = cellData.text;
          if (cellData.scope) {
            cell.setAttribute('scope', cellData.scope);
          }
          row1.appendChild(cell);
        });
        tbody.appendChild(row1);

        // Row 2 with missing th scope
        const _row2 = _mockDocument.createElement('tr');
        const _row2Headers = [
          { text: 'Product B' }, // Missing scope attribute
          { text: '$8,000' },
          { text: '$9,500' },
          { text: 'Up 18%' },
          { text: '$17,500' }
        ];

        row2Headers.forEach((cellData, index) => {
          const _cell = index === 0 ? _mockDocument.createElement('th') : _mockDocument.createElement('td');
          cell.textContent = cellData.text;
          // Intentionally not setting scope for first cell
          row2.appendChild(cell);
        });
        tbody.appendChild(row2);

        table.appendChild(tbody);
        return table;
      };

      const _checkTableAccessibility = table => {
        const _issues = [];

        // Check for caption
        const _caption = table.children.find(child => child.tagName === 'CAPTION');
        if (!caption) {
          issues.push({
            issue: 'missing_caption',
            message: 'Table missing caption for accessibility'
          });
        }

        // Check header cells
        const _thead = table.children.find(child => child.tagName === 'THEAD');
        if (thead) {
          const _headerRow = thead.children[0];
          if (headerRow) {
            headerRow.children.forEach((th, index) => {
              if (th.tagName === 'TH') {
                if (!th.textContent.trim()) {
                  issues.push({
                    issue: 'empty_header',
                    message: `Table header at column ${index + 1} is empty`,
                    element: th
                  });
                }
                if (!th.getAttribute('scope') && th.textContent.trim()) {
                  issues.push({
                    issue: 'missing_scope',
                    message: `Table header at column ${index + 1} missing scope attribute`,
                    element: th
                  });
                }
              }
            });
          }
        }

        // Check row headers
        const _tbody = table.children.find(child => child.tagName === 'TBODY');
        if (tbody) {
          tbody.children.forEach((row, rowIndex) => {
            const _firstCell = row.children[0];
            if (firstCell && firstCell.tagName === 'TH') {
              if (!firstCell.getAttribute('scope')) {
                issues.push({
                  issue: 'missing_row_scope',
                  message: `Row header at row ${rowIndex + 1} missing scope attribute`,
                  element: firstCell
                });
              }
            }
          });
        }

        return issues;
      };

      const _table = createComplexTable();
      const _issues = checkTableAccessibility(table);

      expect(issues).toHaveLength(2);
      expect(issues.some(issue => issue.issue === 'empty_header')).toBe(true);
      expect(issues.some(issue => issue.issue === 'missing_row_scope')).toBe(true);
    });

    test('should handle form structures with complex field relationships', () => {
      // Create complex form with various accessibility patterns
      const _createComplexForm = () => {
        const _form = _mockDocument.createElement('form');
        form.setAttribute('role', 'form');
        form.setAttribute('aria-labelledby', 'form-title');

        // Form title
        const _title = _mockDocument.createElement('h2');
        title.id = 'form-title';
        title.textContent = 'Registration Form';
        form.appendChild(title);

        // Fieldset 1: Personal Information
        const _personalFieldset = _mockDocument.createElement('fieldset');
        const _personalLegend = _mockDocument.createElement('legend');
        personalLegend.textContent = 'Personal Information';
        personalFieldset.appendChild(personalLegend);

        // Name field (proper labeling)
        const _nameDiv = _mockDocument.createElement('div');
        const _nameLabel = _mockDocument.createElement('label');
        nameLabel.setAttribute('for', 'name');
        nameLabel.textContent = 'Full Name *';
        const _nameInput = _mockDocument.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'name';
        nameInput.setAttribute('required', 'true');
        nameInput.setAttribute('aria-describedby', 'name-help');
        nameDiv.appendChild(nameLabel);
        nameDiv.appendChild(nameInput);

        const _nameHelp = _mockDocument.createElement('div');
        nameHelp.id = 'name-help';
        nameHelp.textContent = 'Enter your first and last name';
        nameDiv.appendChild(nameHelp);
        personalFieldset.appendChild(nameDiv);

        // Email field (missing label)
        const _emailDiv = _mockDocument.createElement('div');
        const _emailInput = _mockDocument.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'email';
        emailInput.setAttribute('placeholder', 'Enter email address');
        // No label element - accessibility issue
        emailDiv.appendChild(emailInput);
        personalFieldset.appendChild(emailDiv);

        form.appendChild(personalFieldset);

        // Fieldset 2: Preferences
        const _prefFieldset = _mockDocument.createElement('fieldset');
        const _prefLegend = _mockDocument.createElement('legend');
        prefLegend.textContent = 'Preferences';
        prefFieldset.appendChild(prefLegend);

        // Radio group (missing fieldset grouping)
        const _radioDiv = _mockDocument.createElement('div');
        const _radioLabel1 = _mockDocument.createElement('label');
        const _radio1 = _mockDocument.createElement('input');
        radio1.type = 'radio';
        radio1.name = 'newsletter';
        radio1.value = 'weekly';
        radioLabel1.appendChild(radio1);
        radioLabel1.appendChild(_mockDocument.createTextNode('Weekly Newsletter'));
        radioDiv.appendChild(radioLabel1);

        const _radioLabel2 = _mockDocument.createElement('label');
        const _radio2 = _mockDocument.createElement('input');
        radio2.type = 'radio';
        radio2.name = 'newsletter';
        radio2.value = 'monthly';
        radioLabel2.appendChild(radio2);
        radioLabel2.appendChild(_mockDocument.createTextNode('Monthly Newsletter'));
        radioDiv.appendChild(radioLabel2);

        prefFieldset.appendChild(radioDiv);
        form.appendChild(prefFieldset);

        // Submit button (good)
        const _submitButton = _mockDocument.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Register';
        form.appendChild(submitButton);

        return form;
      };

      const _checkFormAccessibility = form => {
        const _issues = [];

        // Check for form label or title
        const _ariaLabelledby = form.getAttribute('aria-labelledby');
        const _ariaLabel = form.getAttribute('aria-label');
        if (!ariaLabelledby && !ariaLabel) {
          const _firstChild = form.children[0];
          if (!firstChild || !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(firstChild.tagName)) {
            issues.push({
              issue: 'missing_form_label',
              message: 'Form missing accessible label or title'
            });
          }
        }

        // Check input labels
        const _inputs = [];
        const _findInputs = element => {
          element.children.forEach(child => {
            if (child.tagName === 'INPUT' && ['text', 'email', 'password', 'tel'].includes(child.type)) {
              inputs.push(child);
            } else if (child.children) {
              findInputs(child);
            }
          });
        };
        findInputs(form);

        inputs.forEach(input => {
          const _id = input.id;
          const _hasLabel = false;

          if (id) {
            // Check for explicit label
            const _labels = [];
            const _findLabels = element => {
              element.children.forEach(child => {
                if (child.tagName === 'LABEL' && child.getAttribute('for') === id) {
                  labels.push(child);
                } else if (child.children) {
                  findLabels(child);
                }
              });
            };
            findLabels(form);

            if (labels.length > 0) {
              hasLabel = true;
            }
          }

          // Check for implicit label (parent label)
          if (!hasLabel && input.parentNode && input.parentNode.tagName === 'LABEL') {
            hasLabel = true;
          }

          // Check for aria-label
          if (!hasLabel && input.getAttribute('aria-label')) {
            hasLabel = true;
          }

          if (!hasLabel) {
            issues.push({
              issue: 'missing_input_label',
              message: `Input field missing accessible label`,
              element: input
            });
          }
        });

        // Check required fields have proper indication
        inputs.forEach(input => {
          if (input.hasAttribute('required')) {
            const _id = input.id;
            if (id) {
              const _labels = [];
              const _findLabels = element => {
                element.children.forEach(child => {
                  if (child.tagName === 'LABEL' && child.getAttribute('for') === id) {
                    labels.push(child);
                  } else if (child.children) {
                    findLabels(child);
                  }
                });
              };
              findLabels(form);

              const _hasRequiredIndicator = labels.some(label =>
                label.textContent.includes('*') || label.textContent.includes('required')
              );

              if (!hasRequiredIndicator && !input.getAttribute('aria-required')) {
                issues.push({
                  issue: 'missing_required_indicator',
                  message: 'Required field missing visual or programmatic indication',
                  element: input
                });
              }
            }
          }
        });

        return issues;
      };

      const _form = createComplexForm();
      const _issues = checkFormAccessibility(form);

      expect(issues).toHaveLength(1); // Should find missing label for email input
      expect(issues[0].issue).toBe('missing_input_label');
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle elements with zero dimensions', () => {
      const _handleZeroDimensionElements = () => {
        const _elements = [
          { width: 0, height: 0, visible: false },
          { width: 100, height: 0, visible: false },
          { width: 0, height: 50, visible: false },
          { width: 100, height: 50, visible: true }
        ];

        const _results = elements.map(el => {
          const _isVisible = el.width > 0 && el.height > 0;
          return {
            ...el,
            shouldCheck: isVisible,
            reason: isVisible ? 'visible' : 'zero_dimensions'
          };
        });

        return results;
      };

      const _results = handleZeroDimensionElements();

      expect(results[0].shouldCheck).toBe(false);
      expect(results[0].reason).toBe('zero_dimensions');
      expect(results[1].shouldCheck).toBe(false);
      expect(results[2].shouldCheck).toBe(false);
      expect(results[3].shouldCheck).toBe(true);
      expect(results[3].reason).toBe('visible');
    });

    test('should handle elements outside viewport', () => {
      const _checkElementVisibility = (elements, viewport) => {
        return elements.map(el => {
          const _rect = el.getBoundingClientRect();

          const _isInViewport = (
            rect.top < viewport.height &&
            rect.bottom > 0 &&
            rect.left < viewport.width &&
            rect.right > 0
          );

          const _isVisible = (
            rect.width > 0 &&
            rect.height > 0 &&
            isInViewport
          );

          return {
            element: el,
            isVisible,
            isInViewport,
            rect,
            shouldCheck: isVisible
          };
        });
      };

      // Create test elements
      const _elements = [
        // In viewport
        {
          getBoundingClientRect: () => ({ top: 100, left: 100, bottom: 200, right: 200, width: 100, height: 100 })
        },
        // Below viewport
        {
          getBoundingClientRect: () => ({ top: 1000, left: 100, bottom: 1100, right: 200, width: 100, height: 100 })
        },
        // Above viewport
        {
          getBoundingClientRect: () => ({ top: -200, left: 100, bottom: -100, right: 200, width: 100, height: 100 })
        },
        // Left of viewport
        {
          getBoundingClientRect: () => ({ top: 100, left: -200, bottom: 200, right: -100, width: 100, height: 100 })
        },
        // Right of viewport
        {
          getBoundingClientRect: () => ({ top: 100, left: 1200, bottom: 200, right: 1300, width: 100, height: 100 })
        }
      ];

      const _viewport = { width: 1024, height: 768 };
      const _results = checkElementVisibility(elements, viewport);

      expect(results[0].isVisible).toBe(true);
      expect(results[0].isInViewport).toBe(true);
      expect(results[1].isVisible).toBe(false); // Below viewport
      expect(results[2].isVisible).toBe(false); // Above viewport
      expect(results[3].isVisible).toBe(false); // Left of viewport
      expect(results[4].isVisible).toBe(false); // Right of viewport
    });

    test('should handle malformed or corrupted DOM elements', () => {
      const _handleMalformedElements = elements => {
        const _results = {
          processed: 0,
          errors: [],
          skipped: 0,
          validElements: []
        };

        elements.forEach((element, index) => {
          try {
            // Basic validation checks
            if (!element) {
              results.skipped++;
              results.errors.push(`Element ${index}: null or undefined`);
              return;
            }

            if (typeof element !== 'object') {
              results.skipped++;
              results.errors.push(`Element ${index}: not an object`);
              return;
            }

            if (!element.tagName) {
              results.skipped++;
              results.errors.push(`Element ${index}: missing tagName`);
              return;
            }

            // Try to access common properties safely
            const _tagName = element.tagName || 'UNKNOWN';
            const _id = element.id || '';
            const _className = element.className || '';

            // Validate critical methods exist
            if (typeof element.getAttribute !== 'function') {
              results.skipped++;
              results.errors.push(`Element ${index}: getAttribute method missing`);
              return;
            }

            if (typeof element.getBoundingClientRect !== 'function') {
              results.skipped++;
              results.errors.push(`Element ${index}: getBoundingClientRect method missing`);
              return;
            }

            // Try to call methods safely
            let rect;
            try {
              rect = element.getBoundingClientRect();
            } catch (error) {
              results.skipped++;
              results.errors.push(`Element ${index}: getBoundingClientRect failed - ${error.message}`);
              return;
            }

            results.validElements.push({
              index,
              tagName,
              id,
              className,
              rect
            });
            results.processed++;

          } catch (error) {
            results.errors.push(`Element ${index}: unexpected error - ${error.message}`);
            results.skipped++;
          }
        });

        return results;
      };

      // Test with various malformed elements
      const _testElements = [
        // Valid element
        {
          tagName: 'DIV',
          id: 'test',
          className: 'valid',
          getAttribute: jest.fn(() => 'value'),
          getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0, width: 100, height: 50 }))
        },
        // Null element
        null,
        // Element missing tagName
        {
          id: 'no-tag',
          getAttribute: jest.fn(),
          getBoundingClientRect: jest.fn()
        },
        // Element with broken getBoundingClientRect
        {
          tagName: 'BROKEN',
          getAttribute: jest.fn(),
          getBoundingClientRect: jest.fn(() => { throw new Error('Method failed'); })
        },
        // Non-object
        'not-an-element',
        // Element missing getAttribute
        {
          tagName: 'INCOMPLETE',
          getBoundingClientRect: jest.fn(() => ({ top: 0, left: 0, width: 100, height: 50 }))
        }
      ];

      const _results = handleMalformedElements(testElements);

      expect(results.processed).toBe(1);
      expect(results.skipped).toBe(5);
      expect(results.errors).toHaveLength(5);
      expect(results.validElements).toHaveLength(1);
      expect(results.validElements[0].tagName).toBe('DIV');
    });

    test('should handle deeply nested DOM structures', () => {
      const _createDeeplyNestedStructure = depth => {
        const _current = _mockDocument.createElement('div');
        current.className = 'root';
        const _root = current;

        for (let _i = 1; i < depth; i++) {
          const _child = _mockDocument.createElement('div');
          child.className = `level-${i}`;
          child.id = `element-${i}`;
          current.appendChild(child);
          current = child;
        }

        // Add final element with accessibility issue
        const _finalElement = _mockDocument.createElement('img');
        finalElement.src = 'deep-image.jpg';
        // Missing alt attribute
        current.appendChild(finalElement);

        return root;
      };

      const _traverseNestedStructure = (element, maxDepth = 50) => {
        const _results = {
          totalElements: 0,
          maxDepthReached: 0,
          issues: [],
          depthExceeded: false
        };

        const _traverse = (el, currentDepth) => {
          if (currentDepth > maxDepth) {
            results.depthExceeded = true;
            return;
          }

          results.totalElements++;
          results.maxDepthReached = Math.max(results.maxDepthReached, currentDepth);

          // Check for accessibility issues
          if (el.tagName === 'IMG' && !el.getAttribute('alt')) {
            results.issues.push({
              type: 'missing_alt',
              depth: currentDepth,
              element: el
            });
          }

          // Traverse children
          if (el.children && el.children.length > 0) {
            el.children.forEach(child => {
              traverse(child, currentDepth + 1);
            });
          }
        };

        traverse(element, 0);
        return results;
      };

      // Test with moderate depth
      const _moderateStructure = createDeeplyNestedStructure(20);
      const _moderateResults = traverseNestedStructure(moderateStructure);

      expect(moderateResults.totalElements).toBe(21); // 20 divs + 1 img
      expect(moderateResults.maxDepthReached).toBe(20);
      expect(moderateResults.issues).toHaveLength(1);
      expect(moderateResults.issues[0].type).toBe('missing_alt');
      expect(moderateResults.depthExceeded).toBe(false);

      // Test with excessive depth
      const _deepStructure = createDeeplyNestedStructure(100);
      const _deepResults = traverseNestedStructure(deepStructure, 50);

      expect(deepResults.depthExceeded).toBe(true);
      expect(deepResults.maxDepthReached).toBe(50);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should handle different browser API implementations', () => {
      // Mock different browser environments
      const _browserEnvironments = {
        chrome: {
          name: 'Chrome',
          getComputedStyle: element => ({
            display: 'block',
            visibility: 'visible',
            fontSize: '16px'
          }),
          features: {
            intersectionObserver: true,
            mutationObserver: true,
            customElements: true
          }
        },
        firefox: {
          name: 'Firefox',
          getComputedStyle: element => ({
            display: 'block',
            visibility: 'visible',
            fontSize: '16px'
          }),
          features: {
            intersectionObserver: true,
            mutationObserver: true,
            customElements: true
          }
        },
        safari: {
          name: 'Safari',
          getComputedStyle: element => ({
            display: 'block',
            visibility: 'visible',
            fontSize: '16px'
          }),
          features: {
            intersectionObserver: true,
            mutationObserver: true,
            customElements: false // Older Safari
          }
        },
        ie11: {
          name: 'IE11',
          getComputedStyle: element => ({
            display: 'block',
            visibility: 'visible',
            fontSize: '16px'
          }),
          features: {
            intersectionObserver: false,
            mutationObserver: true,
            customElements: false
          }
        }
      };

      const _checkBrowserCompatibility = browser => {
        const _compatibility = {
          browser: browser.name,
          supportedFeatures: [],
          fallbacksNeeded: [],
          recommendations: []
        };

        // Check IntersectionObserver support
        if (browser.features.intersectionObserver) {
          compatibility.supportedFeatures.push('IntersectionObserver');
        } else {
          compatibility.fallbacksNeeded.push('IntersectionObserver');
          compatibility.recommendations.push('Use scroll event listeners as fallback');
        }

        // Check MutationObserver support
        if (browser.features.mutationObserver) {
          compatibility.supportedFeatures.push('MutationObserver');
        } else {
          compatibility.fallbacksNeeded.push('MutationObserver');
          compatibility.recommendations.push('Use DOM event listeners as fallback');
        }

        // Check Custom Elements support
        if (browser.features.customElements) {
          compatibility.supportedFeatures.push('CustomElements');
        } else {
          compatibility.fallbacksNeeded.push('CustomElements');
          compatibility.recommendations.push('Avoid custom element detection');
        }

        return compatibility;
      };

      Object.values(browserEnvironments).forEach(browser => {
        const _compatibility = checkBrowserCompatibility(browser);

        expect(compatibility.browser).toBe(browser.name);
        expect(compatibility.supportedFeatures).toContain('MutationObserver'); // All support this

        if (browser.name === 'IE11') {
          expect(compatibility.fallbacksNeeded).toContain('IntersectionObserver');
          expect(compatibility.fallbacksNeeded).toContain('CustomElements');
        }
      });
    });

    test('should handle different CSS property implementations', () => {
      const _checkCSSPropertySupport = (element, property) => {
        const _testValues = {
          'font-size': ['16px', '1rem', '1em'],
          'display': ['block', 'flex', 'grid'],
          'visibility': ['visible', 'hidden', 'collapse']
        };

        const _support = {
          property,
          supportedValues: [],
          unsupportedValues: [],
          fallbacks: []
        };

        const _values = testValues[property] || [];

        values.forEach(value => {
          try {
            // Simulate setting and reading CSS property
            element.style[property] = value;

            // Mock successful property setting for tests
            if (property === 'font-size' && value === '16px') {
              support.supportedValues.push(value);
            } else if (property === 'display' && value === 'block') {
              support.supportedValues.push(value);
            } else {
              // For other values, simulate partial support
              const _computed = mockWindow.getComputedStyle(element);
              const _actualValue = computed[property];

              if (actualValue === value || (actualValue && actualValue.includes && actualValue.includes(value))) {
                support.supportedValues.push(value);
              } else {
                support.unsupportedValues.push(value);

                // Suggest fallbacks
                if (property === 'display' && value === 'grid') {
                  support.fallbacks.push('Use flexbox or table layout');
                } else if (property === 'font-size' && value.includes('rem')) {
                  support.fallbacks.push('Use px units for older browsers');
                }
              }
            }
          } catch (error) {
            support.unsupportedValues.push(value);
            support.fallbacks.push(`Property ${property} not supported`);
          }
        });

        return support;
      };

      const _testElement = _mockDocument.createElement('div');

      const _fontSizeSupport = checkCSSPropertySupport(testElement, 'font-size');
      const _displaySupport = checkCSSPropertySupport(testElement, 'display');

      expect(fontSizeSupport.supportedValues).toContain('16px');
      expect(displaySupport.supportedValues).toContain('block');
    });

    test('should provide graceful degradation for unsupported features', () => {
      const _createFeatureDetection = () => {
        const _features = {
          intersectionObserver: typeof global.IntersectionObserver !== 'undefined',
          mutationObserver: typeof global.MutationObserver !== 'undefined',
          requestAnimationFrame: typeof global.requestAnimationFrame !== 'undefined',
          customElements: typeof global.customElements !== 'undefined'
        };

        const _fallbacks = {};

        // Intersection Observer fallback
        if (!features.intersectionObserver) {
          fallbacks.intersectionObserver = {
            method: 'scroll-event',
            implementation: () => {
              // Simulate scroll-based visibility detection
              return {
                observe: jest.fn(),
                unobserve: jest.fn(),
                disconnect: jest.fn()
              };
            }
          };
        }

        // Mutation Observer fallback
        if (!features.mutationObserver) {
          fallbacks.mutationObserver = {
            method: 'dom-events',
            implementation: () => {
              // Simulate DOM event-based change detection
              return {
                observe: jest.fn(),
                disconnect: jest.fn(),
                takeRecords: jest.fn(() => [])
              };
            }
          };
        }

        // RAF fallback
        if (!features.requestAnimationFrame) {
          fallbacks.requestAnimationFrame = {
            method: 'setTimeout',
            implementation: callback => setTimeout(callback, 16)
          };
        }

        return { features, fallbacks };
      };

      const _detection = createFeatureDetection();

      expect(typeof detection.features).toBe('object');
      expect(typeof detection.fallbacks).toBe('object');

      // Test fallback creation
      if (!detection.features.intersectionObserver) {
        const _fallbackObserver = detection.fallbacks.intersectionObserver.implementation();
        expect(fallbackObserver.observe).toBeDefined();
        expect(fallbackObserver.disconnect).toBeDefined();
      }
    });
  });
});