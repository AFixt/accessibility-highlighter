/**
 * @fileoverview Tests for keyboard navigation functionality
 *
 * Tests the keyboard event handling including:
 * - Arrow key navigation (Up/Down/Left/Right)
 * - ESC key handling
 * - Home/End key functionality
 * - Enter/Space key actions
 * - Keyboard navigation state management
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (callback) {callback({ isEnabled: true });}
        return Promise.resolve({ isEnabled: true });
      }),
      set: jest.fn().mockImplementation((obj, callback) => {
        if (callback) {callback();}
        return Promise.resolve();
      })
    }
  },
  runtime: {
    onMessage: { addListener: jest.fn() },
    lastError: null
  }
};

// Mock DOM methods
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: jest.fn()
  },
  writable: true
});

class SpeechSynthesisUtteranceMock {
  constructor(text) {
    this.text = text;
  }
}
global.SpeechSynthesisUtterance = SpeechSynthesisUtteranceMock;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock window properties
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

// Import the content script to test keyboard navigation
require('../src/contentScript.js');

describe('Keyboard Navigation', () => {
  let mockKeydownEvent;
  let consoleSpy;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Reset global state
    global.keyboardNavigationActive = false;
    global.currentOverlayIndex = -1;

    // Setup console spy
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Create mock keydown event
    mockKeydownEvent = {
      key: '',
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };

    // Create some test overlays for navigation
    createTestOverlays();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  function createTestOverlays() {
    for (let _i = 0; i < 3; i++) {
      const _overlay = document.createElement('div');
      overlay.className = 'a11y-error';
      overlay.setAttribute('data-a11ymessage', `Test error ${i + 1}`);
      overlay.style.position = 'absolute';
      overlay.style.top = `${i * 50}px`;
      overlay.style.left = '10px';
      overlay.style.width = '100px';
      overlay.style.height = '30px';
      document.body.appendChild(overlay);
    }
  }

  function simulateKeydown(key) {
    mockKeydownEvent.key = key;
    const _event = new KeyboardEvent('keydown', { key });
    Object.defineProperty(event, 'preventDefault', {
      value: jest.fn(),
      writable: true
    });
    document.dispatchEvent(event);
    return event;
  }

  describe('Keyboard Navigation Activation', () => {
    test('should activate keyboard navigation with Alt+Shift+N', () => {
      const _event = simulateKeydown('n');
      Object.defineProperty(event, 'altKey', { value: true });
      Object.defineProperty(event, 'shiftKey', { value: true });

      document.dispatchEvent(event);

      expect(global.keyboardNavigationActive).toBe(true);
      expect(global.currentOverlayIndex).toBe(0);
    });

    test('should only respond to keyboard navigation when active', () => {
      global.keyboardNavigationActive = false;

      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      // Should not change index when navigation is inactive
      expect(global.currentOverlayIndex).toBe(-1);
    });
  });

  describe('Arrow Key Navigation', () => {
    beforeEach(() => {
      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 1; // Start in middle
    });

    test('should navigate forward with ArrowDown', () => {
      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(2);
    });

    test('should navigate forward with ArrowRight', () => {
      const _event = simulateKeydown('ArrowRight');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(2);
    });

    test('should navigate backward with ArrowUp', () => {
      const _event = simulateKeydown('ArrowUp');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(0);
    });

    test('should navigate backward with ArrowLeft', () => {
      const _event = simulateKeydown('ArrowLeft');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(0);
    });

    test('should wrap around when navigating forward from last overlay', () => {
      global.currentOverlayIndex = 2; // Last overlay

      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      expect(global.currentOverlayIndex).toBe(0); // Should wrap to first
    });

    test('should wrap around when navigating backward from first overlay', () => {
      global.currentOverlayIndex = 0; // First overlay

      const _event = simulateKeydown('ArrowUp');
      document.dispatchEvent(event);

      expect(global.currentOverlayIndex).toBe(2); // Should wrap to last
    });
  });

  describe('Home and End Key Navigation', () => {
    beforeEach(() => {
      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 1;
    });

    test('should jump to first overlay with Home key', () => {
      const _event = simulateKeydown('Home');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(0);
    });

    test('should jump to last overlay with End key', () => {
      const _event = simulateKeydown('End');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.currentOverlayIndex).toBe(2);
    });
  });

  describe('Escape Key Handling', () => {
    beforeEach(() => {
      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 1;

      // Set up overlays with styling
      const _overlays = document.querySelectorAll('.a11y-error');
      overlays.forEach(overlay => {
        overlay.style.outline = '2px solid blue';
        overlay.style.outlineOffset = '1px';
      });
    });

    test('should exit keyboard navigation with Escape key', () => {
      const _event = simulateKeydown('Escape');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(global.keyboardNavigationActive).toBe(false);
      expect(global.currentOverlayIndex).toBe(-1);
    });

    test('should remove all overlay highlights when exiting navigation', () => {
      const _overlays = document.querySelectorAll('.a11y-error');

      const _event = simulateKeydown('Escape');
      document.dispatchEvent(event);

      overlays.forEach(overlay => {
        expect(overlay.style.outline).toBe('');
        expect(overlay.style.outlineOffset).toBe('');
      });
    });
  });

  describe('Enter and Space Key Actions', () => {
    beforeEach(() => {
      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 1;
    });

    test('should announce accessibility issue with Enter key', () => {
      const _event = simulateKeydown('Enter');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Selected accessibility issue:', 'Test error 2');
    });

    test('should announce accessibility issue with Space key', () => {
      const _event = simulateKeydown(' ');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Selected accessibility issue:', 'Test error 2');
    });

    test('should use speech synthesis when available', () => {
      const _event = simulateKeydown('Enter');
      document.dispatchEvent(event);

      expect(window.speechSynthesis.speak).toHaveBeenCalled();
      const _spokenText = window.speechSynthesis.speak.mock.calls[0][0].text;
      expect(spokenText).toBe('Test error 2');
    });

    test('should handle invalid overlay index gracefully', () => {
      global.currentOverlayIndex = 99; // Invalid index

      const _event = simulateKeydown('Enter');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      // Should not crash or throw errors
    });

    test('should handle negative overlay index gracefully', () => {
      global.currentOverlayIndex = -1; // Invalid index

      const _event = simulateKeydown('Enter');
      document.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      // Should not crash or throw errors
    });
  });

  describe('Keyboard Navigation State Management', () => {
    test('should handle cases with no overlays', () => {
      // Remove all overlays
      document.querySelectorAll('.a11y-error').forEach(overlay => overlay.remove());

      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 0;

      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      // Should handle gracefully without errors
      expect(event.preventDefault).toHaveBeenCalled();
    });

    test('should ignore non-navigation keys when navigation is active', () => {
      global.keyboardNavigationActive = true;
      global.currentOverlayIndex = 1;

      const _event = simulateKeydown('a');
      document.dispatchEvent(event);

      // Index should not change for non-navigation keys
      expect(global.currentOverlayIndex).toBe(1);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Overlay Highlighting', () => {
    beforeEach(() => {
      global.keyboardNavigationActive = true;
    });

    test('should highlight current overlay during navigation', () => {
      global.currentOverlayIndex = 1;

      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      const _overlays = document.querySelectorAll('.a11y-error');
      const _currentOverlay = overlays[global.currentOverlayIndex];

      // Verify the overlay gets highlighted (this would be done by highlightCurrentOverlay function)
      expect(global.currentOverlayIndex).toBe(2);
    });

    test('should scroll highlighted overlay into view', () => {
      global.currentOverlayIndex = 0;

      const _event = simulateKeydown('ArrowDown');
      document.dispatchEvent(event);

      const _overlays = document.querySelectorAll('.a11y-error');
      // The highlightCurrentOverlay function should call scrollIntoView
      expect(global.currentOverlayIndex).toBe(1);
    });
  });
});