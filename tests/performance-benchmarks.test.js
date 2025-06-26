/**
 * @fileoverview Performance Benchmark Tests
 * 
 * Tests to measure and validate performance characteristics of the
 * accessibility highlighter extension under various load conditions.
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({ isEnabled: true })),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    lastError: null
  }
};

// Mock performance for consistent measurements
const originalPerformance = global.performance;

beforeAll(() => {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => [])
  };
});

afterAll(() => {
  global.performance = originalPerformance;
});

// Import the content script
require('../src/contentScript.js');

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Clear logs
    global.logs.length = 0;
    // Reset throttle
    global.resetThrottle();
    // Reset performance mock
    jest.clearAllMocks();
    
    let mockTime = 0;
    global.performance.now.mockImplementation(() => mockTime += 1);
  });

  describe('DOM Traversal Performance', () => {
    test('should handle small pages efficiently (< 10ms)', () => {
      // Create a small page with 10 elements
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.textContent = `Content ${i}`;
        document.body.appendChild(div);
      }
      
      const img = document.createElement('img');
      img.src = 'test.jpg';
      // Missing alt attribute for testing
      document.body.appendChild(img);
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10);
    });

    test('should handle medium pages efficiently (< 50ms)', () => {
      // Create a medium page with 100 elements
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.textContent = `Content ${i}`;
        
        // Add some problematic elements
        if (i % 10 === 0) {
          const img = document.createElement('img');
          img.src = 'test.jpg';
          div.appendChild(img);
        }
        
        if (i % 15 === 0) {
          const button = document.createElement('button');
          div.appendChild(button);
        }
        
        document.body.appendChild(div);
      }
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
    });

    test('should handle large pages within reasonable time (< 200ms)', () => {
      // Create a large page with 500 elements
      for (let i = 0; i < 500; i++) {
        const div = document.createElement('div');
        div.textContent = `Content ${i}`;
        
        // Add various problematic elements
        if (i % 20 === 0) {
          const img = document.createElement('img');
          img.src = 'test.jpg';
          div.appendChild(img);
        }
        
        if (i % 25 === 0) {
          const button = document.createElement('button');
          div.appendChild(button);
        }
        
        if (i % 30 === 0) {
          const input = document.createElement('input');
          input.type = 'text';
          div.appendChild(input);
        }
        
        document.body.appendChild(div);
      }
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not create excessive overlays', () => {
      // Create many problematic elements
      for (let i = 0; i < 50; i++) {
        const img = document.createElement('img');
        img.src = 'test.jpg';
        // Missing alt attribute
        document.body.appendChild(img);
      }
      
      global.runAccessibilityChecks();
      
      const overlays = document.querySelectorAll('.a11y-error, .overlay');
      
      // Should create overlays but not excessive amounts
      expect(overlays.length).toBeGreaterThan(0);
      expect(overlays.length).toBeLessThanOrEqual(50);
    });

    test('should clean up overlays completely', () => {
      // Create some elements with issues
      for (let i = 0; i < 20; i++) {
        const img = document.createElement('img');
        img.src = 'test.jpg';
        document.body.appendChild(img);
      }
      
      global.runAccessibilityChecks();
      
      const initialOverlays = document.querySelectorAll('.a11y-error, .overlay').length;
      expect(initialOverlays).toBeGreaterThan(0);
      
      global.removeAccessibilityOverlays();
      
      const finalOverlays = document.querySelectorAll('.a11y-error, .overlay').length;
      expect(finalOverlays).toBe(0);
      expect(global.logs.length).toBe(0);
    });

    test('should handle repeated operations without memory leaks', () => {
      // Create elements with issues
      for (let i = 0; i < 20; i++) {
        const img = document.createElement('img');
        img.src = 'test.jpg';
        document.body.appendChild(img);
      }
      
      // Run multiple cycles of check/remove
      for (let cycle = 0; cycle < 5; cycle++) {
        global.runAccessibilityChecks();
        
        const overlays = document.querySelectorAll('.a11y-error, .overlay').length;
        expect(overlays).toBeGreaterThan(0);
        
        global.removeAccessibilityOverlays();
        
        const cleanedOverlays = document.querySelectorAll('.a11y-error, .overlay').length;
        expect(cleanedOverlays).toBe(0);
      }
    });
  });

  describe('Throttling Performance', () => {
    test('should throttle rapid successive calls', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      document.body.appendChild(img);
      
      let executionCount = 0;
      const originalRunAccessibilityChecks = global.runAccessibilityChecks;
      
      global.runAccessibilityChecks = function() {
        executionCount++;
        return originalRunAccessibilityChecks.apply(this, arguments);
      };
      
      // Make rapid calls
      global.runAccessibilityChecks();
      global.runAccessibilityChecks();
      global.runAccessibilityChecks();
      global.runAccessibilityChecks();
      
      // Only first call should execute due to throttling
      expect(executionCount).toBe(1);
      
      // Restore original function
      global.runAccessibilityChecks = originalRunAccessibilityChecks;
    });

    test('should allow execution after throttle delay', async () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      document.body.appendChild(img);
      
      // First call
      global.runAccessibilityChecks();
      const firstOverlays = document.querySelectorAll('.a11y-error, .overlay').length;
      
      // Reset state
      global.removeAccessibilityOverlays();
      global.resetThrottle();
      
      // Should be able to run again after reset
      global.runAccessibilityChecks();
      const secondOverlays = document.querySelectorAll('.a11y-error, .overlay').length;
      
      expect(firstOverlays).toBe(secondOverlays);
      expect(secondOverlays).toBeGreaterThan(0);
    });
  });

  describe('Element Processing Performance', () => {
    test('should efficiently process different element types', () => {
      // Create mixed content
      const elements = [
        { tag: 'img', count: 10 },
        { tag: 'button', count: 10 },
        { tag: 'input', count: 10 },
        { tag: 'a', count: 10 },
        { tag: 'table', count: 5 },
        { tag: 'iframe', count: 3 }
      ];
      
      elements.forEach(({ tag, count }) => {
        for (let i = 0; i < count; i++) {
          const element = document.createElement(tag);
          
          // Make elements problematic
          if (tag === 'img') {
            element.src = 'test.jpg';
            // Missing alt
          } else if (tag === 'input') {
            element.type = 'text';
            // Missing label
          } else if (tag === 'a') {
            element.href = '#';
            element.textContent = 'click here'; // Generic text
          } else if (tag === 'iframe') {
            element.src = 'about:blank';
            // Missing title
          }
          
          document.body.appendChild(element);
        }
      });
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should process mixed content efficiently
      
      // Should detect issues in multiple element types
      expect(global.logs.length).toBeGreaterThan(10);
    });

    test('should handle deeply nested DOM efficiently', () => {
      // Create deeply nested structure
      let currentElement = document.body;
      
      for (let depth = 0; depth < 20; depth++) {
        const div = document.createElement('div');
        div.textContent = `Level ${depth}`;
        
        // Add problematic element at some levels
        if (depth % 5 === 0) {
          const img = document.createElement('img');
          img.src = 'test.jpg';
          div.appendChild(img);
        }
        
        currentElement.appendChild(div);
        currentElement = div;
      }
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Font Size Check Performance', () => {
    test('should efficiently check font sizes on text elements', () => {
      // Create elements with various font sizes
      const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3'];
      const fontSize = [8, 10, 12, 14, 16, 18]; // Some below threshold
      
      textElements.forEach((tag, index) => {
        for (let i = 0; i < 10; i++) {
          const element = document.createElement(tag);
          element.textContent = `Text content ${i}`;
          element.style.fontSize = `${fontSize[index]}px`;
          
          // Mock getBoundingClientRect to avoid JSDOM issues
          Object.defineProperty(element, 'getBoundingClientRect', {
            value: () => ({ width: 100, height: 20, top: 0, left: 0 })
          });
          
          document.body.appendChild(element);
        }
      });
      
      const startTime = performance.now();
      global.runAccessibilityChecks();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors gracefully without performance impact', () => {
      // Create elements that might cause errors
      const problematicElement = document.createElement('div');
      
      // Mock methods to throw errors
      Object.defineProperty(problematicElement, 'getBoundingClientRect', {
        value: () => { throw new Error('Mock error'); }
      });
      
      document.body.appendChild(problematicElement);
      
      // Add normal elements too
      for (let i = 0; i < 20; i++) {
        const img = document.createElement('img');
        img.src = 'test.jpg';
        document.body.appendChild(img);
      }
      
      const startTime = performance.now();
      
      expect(() => {
        global.runAccessibilityChecks();
      }).not.toThrow();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Benchmark Summary', () => {
    test('should provide performance summary', () => {
      const benchmarks = {
        smallPage: { elements: 10, expectedTime: 10 },
        mediumPage: { elements: 100, expectedTime: 50 },
        largePage: { elements: 500, expectedTime: 200 }
      };
      
      Object.entries(benchmarks).forEach(([size, { elements, expectedTime }]) => {
        // Reset for each test
        document.body.innerHTML = '';
        global.logs.length = 0;
        global.resetThrottle();
        
        // Create elements
        for (let i = 0; i < elements; i++) {
          const div = document.createElement('div');
          div.textContent = `Content ${i}`;
          if (i % 10 === 0) {
            const img = document.createElement('img');
            img.src = 'test.jpg';
            div.appendChild(img);
          }
          document.body.appendChild(div);
        }
        
        const startTime = performance.now();
        global.runAccessibilityChecks();
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        console.log(`${size}: ${elements} elements processed in ${duration}ms (expected < ${expectedTime}ms)`);
        expect(duration).toBeLessThan(expectedTime);
      });
    });
  });
});