/**
 * Property-Based Test: Search Debounce Behavior
 * Feature: retail-inventory-platform, Property 11: Search Debounce Behavior
 * Validates: Requirements 10.2
 * 
 * Property: For any sequence of search input keystrokes within 300ms,
 * the system SHALL execute at most one search query.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock search function
type SearchFunction = (query: string) => Promise<any[]>;

// Debounced search hook simulation
class DebouncedSearch {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private searchFn: SearchFunction;
  private debounceMs: number;
  
  constructor(searchFn: SearchFunction, debounceMs: number = 300) {
    this.searchFn = searchFn;
    this.debounceMs = debounceMs;
  }
  
  search(query: string): void {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Set new timeout
    this.timeoutId = setTimeout(() => {
      this.searchFn(query);
      this.timeoutId = null;
    }, this.debounceMs);
  }
  
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// Simulate keystroke timing
interface Keystroke {
  char: string;
  timestamp: number;
}

// Generate keystroke sequence with timing
function simulateKeystrokes(
  search: DebouncedSearch,
  keystrokes: Keystroke[]
): Promise<void> {
  return new Promise((resolve) => {
    let currentQuery = '';
    let index = 0;
    
    function processNextKeystroke() {
      if (index >= keystrokes.length) {
        // Wait for final debounce to complete
        setTimeout(resolve, 350);
        return;
      }
      
      const keystroke = keystrokes[index];
      const delay = index === 0 ? 0 : keystroke.timestamp - keystrokes[index - 1].timestamp;
      
      setTimeout(() => {
        currentQuery += keystroke.char;
        search.search(currentQuery);
        index++;
        processNextKeystroke();
      }, delay);
    }
    
    processNextKeystroke();
  });
}

describe('Property 11: Search Debounce Behavior', () => {
  let mockSearchFn: SearchFunction;
  let search: DebouncedSearch;
  
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearchFn = vi.fn().mockResolvedValue([]);
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute at most one query for rapid keystrokes within 300ms', () => {
    fc.assert(
      fc.property(
        fc.array(fc.char(), { minLength: 1, maxLength: 20 }), // characters
        fc.integer({ min: 1, max: 50 }), // intervalMs (rapid typing)
        (chars, intervalMs) => {
          // Only test rapid typing (within debounce window)
          fc.pre(intervalMs < 300);
          
          search = new DebouncedSearch(mockSearchFn, 300);
          
          // Generate keystroke sequence with consistent rapid timing
          const keystrokes: Keystroke[] = chars.map((char, index) => ({
            char,
            timestamp: index * intervalMs
          }));
          
          // Simulate rapid keystrokes
          keystrokes.forEach((keystroke, index) => {
            if (index > 0) {
              vi.advanceTimersByTime(intervalMs);
            }
            search.search(keystrokes.slice(0, index + 1).map(k => k.char).join(''));
          });
          
          // Advance past debounce window
          vi.advanceTimersByTime(300);
          
          // Should have executed exactly one search (the final one)
          expect(mockSearchFn).toHaveBeenCalledTimes(1);
          expect(mockSearchFn).toHaveBeenCalledWith(chars.join(''));
          
          // Reset for next iteration
          vi.clearAllMocks();
          search.cancel();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should execute multiple queries for slow keystrokes beyond 300ms', () => {
    fc.assert(
      fc.property(
        fc.array(fc.char(), { minLength: 2, maxLength: 5 }), // characters
        fc.integer({ min: 350, max: 1000 }), // intervalMs (slow typing)
        (chars, intervalMs) => {
          search = new DebouncedSearch(mockSearchFn, 300);
          
          // Simulate slow keystrokes (each triggers a search)
          let currentQuery = '';
          chars.forEach((char, index) => {
            if (index > 0) {
              vi.advanceTimersByTime(intervalMs);
            }
            currentQuery += char;
            search.search(currentQuery);
            
            // Advance past debounce window to trigger search
            vi.advanceTimersByTime(300);
          });
          
          // Should have executed one search per character
          expect(mockSearchFn).toHaveBeenCalledTimes(chars.length);
          
          // Verify each call had the correct cumulative query
          chars.forEach((_, index) => {
            const expectedQuery = chars.slice(0, index + 1).join('');
            expect(mockSearchFn).toHaveBeenNthCalledWith(index + 1, expectedQuery);
          });
          
          // Reset for next iteration
          vi.clearAllMocks();
          search.cancel();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle mixed timing patterns correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            char: fc.char(),
            delay: fc.integer({ min: 10, max: 500 })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (keystrokes) => {
          search = new DebouncedSearch(mockSearchFn, 300);
          
          let currentQuery = '';
          let expectedSearches = 0;
          let timeSinceLastSearch = 0;
          
          keystrokes.forEach((keystroke, index) => {
            // Advance time
            vi.advanceTimersByTime(keystroke.delay);
            timeSinceLastSearch += keystroke.delay;
            
            // Add character to query
            currentQuery += keystroke.char;
            search.search(currentQuery);
            
            // If this is the last keystroke or next delay is > 300ms, expect a search
            const isLast = index === keystrokes.length - 1;
            const nextDelay = isLast ? 0 : keystrokes[index + 1].delay;
            
            if (isLast || nextDelay >= 300) {
              // Advance past debounce window
              vi.advanceTimersByTime(300);
              expectedSearches++;
              timeSinceLastSearch = 0;
            }
          });
          
          // Verify correct number of searches executed
          expect(mockSearchFn).toHaveBeenCalledTimes(expectedSearches);
          
          // Reset for next iteration
          vi.clearAllMocks();
          search.cancel();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should cancel pending search when new input arrives', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }), // firstQuery
        fc.string({ minLength: 1, maxLength: 10 }), // secondQuery
        fc.integer({ min: 50, max: 250 }), // delayMs (within debounce window)
        (firstQuery, secondQuery, delayMs) => {
          search = new DebouncedSearch(mockSearchFn, 300);
          
          // First search
          search.search(firstQuery);
          
          // Second search before debounce completes
          vi.advanceTimersByTime(delayMs);
          search.search(secondQuery);
          
          // Complete debounce window
          vi.advanceTimersByTime(300);
          
          // Should only execute the second search
          expect(mockSearchFn).toHaveBeenCalledTimes(1);
          expect(mockSearchFn).toHaveBeenCalledWith(secondQuery);
          
          // Reset for next iteration
          vi.clearAllMocks();
          search.cancel();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle empty queries correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.char(), fc.constant('')), { minLength: 1, maxLength: 10 }),
        (queries) => {
          search = new DebouncedSearch(mockSearchFn, 300);
          
          // Simulate rapid queries including empty ones
          queries.forEach((query, index) => {
            if (index > 0) {
              vi.advanceTimersByTime(50); // Rapid typing
            }
            search.search(query);
          });
          
          // Complete debounce
          vi.advanceTimersByTime(300);
          
          // Should execute exactly one search with the final query
          expect(mockSearchFn).toHaveBeenCalledTimes(1);
          expect(mockSearchFn).toHaveBeenCalledWith(queries[queries.length - 1]);
          
          // Reset for next iteration
          vi.clearAllMocks();
          search.cancel();
        }
      ),
      { numRuns: 10 }
    );
  });
});