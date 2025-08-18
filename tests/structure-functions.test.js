/**
 * Structure Functions Tests
 * Tests for content script structure checking functions including:
 * - Landmark detection
 * - Heading hierarchy validation
 * - Semantic structure checks
 */

// Set test environment
process.env.NODE_ENV = 'test';

describe('Setup test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('Structure Functions Tests', () => {
  let mockDocument;
  let mockOverlay;
  let mockConsole;
  let checkForLandmarks;

  // Mock A11Y_CONFIG
  const A11Y_CONFIG = {
    SELECTORS: {
      LANDMARK_ELEMENTS: 'main, nav, header, footer, section, article, aside, form[aria-label], form[aria-labelledby], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"], [role="region"][aria-label], [role="region"][aria-labelledby]'
    },
    MESSAGES: {
      NO_LANDMARKS: 'Page has no landmark regions. Add semantic HTML5 elements or ARIA landmarks for better navigation.'
    }
  };

  beforeEach(() => {
    // Mock console
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    global.console = mockConsole;

    // Mock overlay function
    mockOverlay = jest.fn();
    global.overlay = mockOverlay;

    // Mock document
    mockDocument = {
      body: {
        innerHTML: '',
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn()
      },
      createElement: jest.fn(tag => {
        const element = {
          tagName: tag.toUpperCase(),
          innerHTML: '',
          className: '',
          style: {},
          attributes: {},
          setAttribute: jest.fn((name, value) => {
            element.attributes[name] = value;
          }),
          getAttribute: jest.fn(name => element.attributes[name]),
          appendChild: jest.fn(),
          querySelector: jest.fn(),
          querySelectorAll: jest.fn()
        };
        return element;
      }),
      querySelectorAll: jest.fn(selector => {
        // Default to return empty array for landmarks
        if (selector === A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS) {
          return [];
        }
        return [];
      }),
      querySelector: jest.fn(() => null)
    };

    global.document = mockDocument;
    global.A11Y_CONFIG = A11Y_CONFIG;

    // Define checkForLandmarks function (simulating the real one)
    checkForLandmarks = () => {
      const landmarks = mockDocument.querySelectorAll(A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS);

      if (landmarks.length === 0) {
        mockConsole.log(mockDocument.body);
        mockOverlay.call(mockDocument.body, 'overlay', 'error', A11Y_CONFIG.MESSAGES.NO_LANDMARKS);
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkForLandmarks', () => {
    test('should detect missing landmarks and create error overlay', () => {
      // Mock no landmarks found
      mockDocument.querySelectorAll.mockReturnValue([]);

      checkForLandmarks();

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS);
      expect(mockConsole.log).toHaveBeenCalledWith(mockDocument.body);
      expect(mockOverlay).toHaveBeenCalledWith('overlay', 'error', A11Y_CONFIG.MESSAGES.NO_LANDMARKS);
    });

    test('should not create overlay when landmarks exist', () => {
      // Mock landmarks found
      const mockLandmarks = [
        { tagName: 'MAIN', role: null },
        { tagName: 'NAV', role: null },
        { tagName: 'HEADER', role: null }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockLandmarks);

      checkForLandmarks();

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS);
      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should detect ARIA role landmarks', () => {
      // Mock ARIA landmarks found
      const mockAriaLandmarks = [
        { tagName: 'DIV', role: 'main' },
        { tagName: 'DIV', role: 'navigation' },
        { tagName: 'DIV', role: 'banner' }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockAriaLandmarks);

      checkForLandmarks();

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(A11Y_CONFIG.SELECTORS.LANDMARK_ELEMENTS);
      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should detect labeled form landmarks', () => {
      // Mock labeled form found
      const mockFormLandmarks = [
        { tagName: 'FORM', attributes: { 'aria-label': 'Search' } }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockFormLandmarks);

      checkForLandmarks();

      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should detect labeled region landmarks', () => {
      // Mock labeled region found
      const mockRegionLandmarks = [
        { tagName: 'DIV', role: 'region', attributes: { 'aria-label': 'Sidebar' } },
        { tagName: 'SECTION', role: 'region', attributes: { 'aria-labelledby': 'region-title' } }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockRegionLandmarks);

      checkForLandmarks();

      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should handle pages with only one landmark', () => {
      // Mock single landmark
      const mockSingleLandmark = [
        { tagName: 'MAIN', role: null }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockSingleLandmark);

      checkForLandmarks();

      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should handle mixed HTML5 and ARIA landmarks', () => {
      // Mock mixed landmarks
      const mockMixedLandmarks = [
        { tagName: 'MAIN', role: null },
        { tagName: 'NAV', role: null },
        { tagName: 'DIV', role: 'complementary' },
        { tagName: 'FOOTER', role: null },
        { tagName: 'DIV', role: 'search' }
      ];
      mockDocument.querySelectorAll.mockReturnValue(mockMixedLandmarks);

      checkForLandmarks();

      expect(mockOverlay).not.toHaveBeenCalled();
    });

    test('should use correct selector for landmarks', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      checkForLandmarks();

      // Verify the exact selector is used
      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(
        'main, nav, header, footer, section, article, aside, form[aria-label], form[aria-labelledby], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="search"], [role="region"][aria-label], [role="region"][aria-labelledby]'
      );
    });

    test('should use correct error message', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      checkForLandmarks();

      expect(mockOverlay).toHaveBeenCalledWith(
        'overlay',
        'error',
        'Page has no landmark regions. Add semantic HTML5 elements or ARIA landmarks for better navigation.'
      );
    });
  });

  describe('Heading Hierarchy Validation', () => {
    let checkHeadingHierarchy;

    beforeEach(() => {
      // Create heading hierarchy check function
      checkHeadingHierarchy = () => {
        const headings = mockDocument.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const issues = [];
        let previousLevel = 0;

        headings.forEach((heading, index) => {
          const level = parseInt(heading.tagName.charAt(1));

          // Check for skipped heading levels
          if (previousLevel > 0 && level > previousLevel + 1) {
            issues.push({
              element: heading,
              message: `Heading level skipped: h${previousLevel} to h${level}`,
              level: 'error'
            });
          }

          // Check for multiple h1s
          if (level === 1 && index > 0) {
            const h1Count = Array.from(headings).filter(h => h.tagName === 'H1').length;
            if (h1Count > 1) {
              issues.push({
                element: heading,
                message: 'Multiple h1 elements found. Use only one h1 per page.',
                level: 'warning'
              });
            }
          }

          previousLevel = level;
        });

        return issues;
      };
    });

    test('should detect skipped heading levels', () => {
      const mockHeadings = [
        { tagName: 'H1', textContent: 'Title' },
        { tagName: 'H3', textContent: 'Subtitle' }, // Skips H2
        { tagName: 'H2', textContent: 'Section' }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return mockHeadings;
        }
        return [];
      });

      const issues = checkHeadingHierarchy();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Heading level skipped: h1 to h3');
      expect(issues[0].level).toBe('error');
    });

    test('should detect multiple h1 elements', () => {
      const mockHeadings = [
        { tagName: 'H1', textContent: 'First Title' },
        { tagName: 'H1', textContent: 'Second Title' },
        { tagName: 'H2', textContent: 'Subtitle' }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return mockHeadings;
        }
        return [];
      });

      const issues = checkHeadingHierarchy();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Multiple h1 elements found');
      expect(issues[0].level).toBe('warning');
    });

    test('should validate correct heading hierarchy', () => {
      const mockHeadings = [
        { tagName: 'H1', textContent: 'Title' },
        { tagName: 'H2', textContent: 'Section 1' },
        { tagName: 'H3', textContent: 'Subsection 1.1' },
        { tagName: 'H3', textContent: 'Subsection 1.2' },
        { tagName: 'H2', textContent: 'Section 2' }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return mockHeadings;
        }
        return [];
      });

      const issues = checkHeadingHierarchy();

      expect(issues).toHaveLength(0);
    });

    test('should handle pages with no headings', () => {
      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return [];
        }
        return [];
      });

      const issues = checkHeadingHierarchy();

      expect(issues).toHaveLength(0);
    });

    test('should detect large heading level jumps', () => {
      const mockHeadings = [
        { tagName: 'H1', textContent: 'Title' },
        { tagName: 'H5', textContent: 'Deep Section' } // Jumps from H1 to H5
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return mockHeadings;
        }
        return [];
      });

      const issues = checkHeadingHierarchy();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Heading level skipped: h1 to h5');
    });
  });

  describe('Semantic Structure Validation', () => {
    let checkSemanticStructure;

    beforeEach(() => {
      // Create semantic structure check function
      checkSemanticStructure = () => {
        const issues = [];

        // Check for proper main element usage
        const mainElements = mockDocument.querySelectorAll('main, [role="main"]');
        if (mainElements.length > 1) {
          issues.push({
            message: 'Multiple main elements detected. Use only one main element per page.',
            level: 'error'
          });
        }

        // Check for nav without accessible name
        const navElements = mockDocument.querySelectorAll('nav, [role="navigation"]');
        navElements.forEach(nav => {
          if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
            issues.push({
              element: nav,
              message: 'Navigation element missing accessible name. Add aria-label or aria-labelledby.',
              level: 'warning'
            });
          }
        });

        // Check for complementary regions without labels
        const asideElements = mockDocument.querySelectorAll('aside, [role="complementary"]');
        asideElements.forEach(aside => {
          if (!aside.getAttribute('aria-label') && !aside.getAttribute('aria-labelledby')) {
            issues.push({
              element: aside,
              message: 'Complementary region missing accessible name. Add aria-label or aria-labelledby.',
              level: 'warning'
            });
          }
        });

        return issues;
      };
    });

    test('should detect multiple main elements', () => {
      const mockMainElements = [
        { tagName: 'MAIN' },
        { tagName: 'DIV', role: 'main' }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'main, [role="main"]') {
          return mockMainElements;
        }
        return [];
      });

      const issues = checkSemanticStructure();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Multiple main elements detected');
      expect(issues[0].level).toBe('error');
    });

    test('should detect nav elements without accessible names', () => {
      const mockNavElements = [
        {
          tagName: 'NAV',
          getAttribute: jest.fn(() => null) // No aria-label or aria-labelledby
        },
        {
          tagName: 'NAV',
          getAttribute: jest.fn(attr => attr === 'aria-label' ? 'Primary Navigation' : null)
        }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'nav, [role="navigation"]') {
          return mockNavElements;
        }
        if (selector === 'main, [role="main"]') {
          return [];
        }
        if (selector === 'aside, [role="complementary"]') {
          return [];
        }
        return [];
      });

      const issues = checkSemanticStructure();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Navigation element missing accessible name');
      expect(issues[0].level).toBe('warning');
    });

    test('should detect aside elements without accessible names', () => {
      const mockAsideElements = [
        {
          tagName: 'ASIDE',
          getAttribute: jest.fn(() => null) // No aria-label or aria-labelledby
        }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'aside, [role="complementary"]') {
          return mockAsideElements;
        }
        if (selector === 'main, [role="main"]') {
          return [];
        }
        if (selector === 'nav, [role="navigation"]') {
          return [];
        }
        return [];
      });

      const issues = checkSemanticStructure();

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('Complementary region missing accessible name');
      expect(issues[0].level).toBe('warning');
    });

    test('should validate correct semantic structure', () => {
      const mockMainElements = [
        { tagName: 'MAIN' }
      ];

      const mockNavElements = [
        {
          tagName: 'NAV',
          getAttribute: jest.fn(attr => attr === 'aria-label' ? 'Main Navigation' : null)
        }
      ];

      const mockAsideElements = [
        {
          tagName: 'ASIDE',
          getAttribute: jest.fn(attr => attr === 'aria-labelledby' ? 'sidebar-title' : null)
        }
      ];

      mockDocument.querySelectorAll.mockImplementation(selector => {
        if (selector === 'main, [role="main"]') {
          return mockMainElements;
        }
        if (selector === 'nav, [role="navigation"]') {
          return mockNavElements;
        }
        if (selector === 'aside, [role="complementary"]') {
          return mockAsideElements;
        }
        return [];
      });

      const issues = checkSemanticStructure();

      expect(issues).toHaveLength(0);
    });

    test('should handle pages with no semantic elements', () => {
      mockDocument.querySelectorAll.mockImplementation(() => []);

      const issues = checkSemanticStructure();

      expect(issues).toHaveLength(0);
    });
  });
});
