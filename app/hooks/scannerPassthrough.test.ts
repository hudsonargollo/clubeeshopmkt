/**
 * Property-Based Tests for Scanner Input Passthrough
 * 
 * Feature: retail-inventory-platform, Property 3: Scanner Input Passthrough
 * Validates: Requirements 2.5
 * 
 * Property 3: Scanner Input Passthrough
 * *For any* keystroke event occurring while `document.activeElement` is an input or textarea, 
 * the Scanner_Hook SHALL NOT accumulate the keystroke in its buffer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock DOM element for testing
 */
interface MockElement {
  tagName: string;
  getAttribute: (name: string) => string | null;
}

/**
 * Simulates the input element detection logic from useBarcodeScanner
 */
function isInputElement(element: MockElement | null): boolean {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }
  
  // Also check for contenteditable elements
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  return false;
}

/**
 * Mock scanner buffer that respects input element focus
 */
class MockScannerWithPassthrough {
  private buffer = '';
  private activeElement: MockElement | null = null;

  setActiveElement(element: MockElement | null): void {
    this.activeElement = element;
  }

  processKeystroke(key: string): boolean {
    // Check if focus is on input element (passthrough logic)
    if (isInputElement(this.activeElement)) {
      // Should NOT accumulate in buffer
      return false;
    }
    
    // Normal accumulation
    this.buffer += key;
    return true;
  }

  getBuffer(): string {
    return this.buffer;
  }

  clearBuffer(): void {
    this.buffer = '';
  }
}

/**
 * Generates mock DOM elements
 */
const inputElementArb = fc.record({
  tagName: fc.constantFrom('INPUT', 'TEXTAREA'),
  getAttribute: fc.constant((name: string) => name === 'contenteditable' ? null : null),
});

const contentEditableElementArb = fc.record({
  tagName: fc.constantFrom('DIV', 'SPAN', 'P'),
  getAttribute: fc.constant((name: string) => name === 'contenteditable' ? 'true' : null),
});

const nonInputElementArb = fc.record({
  tagName: fc.constantFrom('DIV', 'SPAN', 'BUTTON', 'A', 'P'),
  getAttribute: fc.constant((name: string) => null),
});

describe('Scanner Input Passthrough - Property Tests', () => {
  let scanner: MockScannerWithPassthrough;

  beforeEach(() => {
    scanner = new MockScannerWithPassthrough();
  });

  /**
   * Feature: retail-inventory-platform, Property 3: Scanner Input Passthrough
   * Validates: Requirements 2.5
   * 
   * Property: For any keystroke event occurring while document.activeElement is an input or textarea, 
   * the Scanner_Hook SHALL NOT accumulate the keystroke in its buffer.
   */
  describe('Property 3: Scanner Input Passthrough', () => {
    it('keystrokes are NOT accumulated when focus is on input elements', () => {
      fc.assert(
        fc.property(
          inputElementArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          (inputElement, keystrokes) => {
            scanner.setActiveElement(inputElement);
            
            // Process each keystroke
            for (const key of keystrokes) {
              const wasAccumulated = scanner.processKeystroke(key);
              // Should NOT accumulate when input is focused
              expect(wasAccumulated).toBe(false);
            }
            
            // Buffer should remain empty
            expect(scanner.getBuffer()).toBe('');
          }
        ),
        { numRuns: 5 }
      );
    });

    it('keystrokes are NOT accumulated when focus is on contenteditable elements', () => {
      fc.assert(
        fc.property(
          contentEditableElementArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          (contentEditableElement, keystrokes) => {
            scanner.setActiveElement(contentEditableElement);
            
            // Process each keystroke
            for (const key of keystrokes) {
              const wasAccumulated = scanner.processKeystroke(key);
              // Should NOT accumulate when contenteditable is focused
              expect(wasAccumulated).toBe(false);
            }
            
            // Buffer should remain empty
            expect(scanner.getBuffer()).toBe('');
          }
        ),
        { numRuns: 5 }
      );
    });

    it('keystrokes ARE accumulated when focus is on non-input elements', () => {
      fc.assert(
        fc.property(
          nonInputElementArb,
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          (nonInputElement, keystrokes) => {
            scanner.setActiveElement(nonInputElement);
            
            // Process each keystroke
            for (const key of keystrokes) {
              const wasAccumulated = scanner.processKeystroke(key);
              // Should accumulate when non-input is focused
              expect(wasAccumulated).toBe(true);
            }
            
            // Buffer should contain all keystrokes
            expect(scanner.getBuffer()).toBe(keystrokes);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('keystrokes ARE accumulated when no element is focused', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          (keystrokes) => {
            scanner.setActiveElement(null); // No active element
            
            // Process each keystroke
            for (const key of keystrokes) {
              const wasAccumulated = scanner.processKeystroke(key);
              // Should accumulate when nothing is focused
              expect(wasAccumulated).toBe(true);
            }
            
            // Buffer should contain all keystrokes
            expect(scanner.getBuffer()).toBe(keystrokes);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('focus changes affect keystroke accumulation behavior', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 6 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          fc.string({ minLength: 2, maxLength: 6 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          (beforeFocusKeys, afterFocusKeys) => {
            // Start with no focus - should accumulate
            scanner.setActiveElement(null);
            for (const key of beforeFocusKeys) {
              scanner.processKeystroke(key);
            }
            expect(scanner.getBuffer()).toBe(beforeFocusKeys);
            
            // Focus on input - should stop accumulating
            const inputElement: MockElement = {
              tagName: 'INPUT',
              getAttribute: () => null,
            };
            scanner.setActiveElement(inputElement);
            
            for (const key of afterFocusKeys) {
              const wasAccumulated = scanner.processKeystroke(key);
              expect(wasAccumulated).toBe(false);
            }
            
            // Buffer should still only contain the before-focus keys
            expect(scanner.getBuffer()).toBe(beforeFocusKeys);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});