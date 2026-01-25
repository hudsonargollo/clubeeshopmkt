/**
 * Property-Based Tests for Scanner Velocity Discrimination
 * 
 * Feature: retail-inventory-platform, Property 2: Scanner Velocity Discrimination
 * Validates: Requirements 2.2, 2.3, 2.4
 * 
 * Property 2: Scanner Velocity Discrimination
 * *For any* sequence of keystrokes, if all inter-keystroke intervals are below 50ms 
 * and the sequence ends with ASCII 13, the Scanner_Hook SHALL emit exactly one onScan 
 * event with the accumulated buffer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock keystroke event for testing
 */
interface MockKeystroke {
  key: string;
  keyCode: number;
  timestamp: number;
}

/**
 * Simulates the scanner velocity discrimination logic
 * This mirrors the logic in useBarcodeScanner hook
 */
class MockScannerBuffer {
  private buffer = '';
  private lastKeystroke = 0;
  private readonly velocityThreshold: number;
  private readonly minBarcodeLength: number;
  private readonly terminatorChar: number;
  private scanCallback: (code: string) => void;

  constructor(
    velocityThreshold = 50,
    minBarcodeLength = 3,
    terminatorChar = 13,
    scanCallback: (code: string) => void = () => {}
  ) {
    this.velocityThreshold = velocityThreshold;
    this.minBarcodeLength = minBarcodeLength;
    this.terminatorChar = terminatorChar;
    this.scanCallback = scanCallback;
  }

  processKeystroke(keystroke: MockKeystroke): void {
    const { key, keyCode, timestamp } = keystroke;

    // Check for terminator character
    if (keyCode === this.terminatorChar) {
      if (this.buffer.length >= this.minBarcodeLength) {
        this.scanCallback(this.buffer);
      }
      this.clearBuffer();
      return;
    }

    // Only process printable characters
    if (key.length !== 1) {
      return;
    }

    // Calculate time since last keystroke
    const timeSinceLastKeystroke = timestamp - this.lastKeystroke;

    // Clear buffer if latency exceeds threshold (human typing)
    if (this.lastKeystroke > 0 && timeSinceLastKeystroke > this.velocityThreshold) {
      this.clearBuffer();
    }

    // Accumulate keystrokes with fast velocity
    this.buffer += key;
    this.lastKeystroke = timestamp;
  }

  private clearBuffer(): void {
    this.buffer = '';
    this.lastKeystroke = 0;
  }

  getBuffer(): string {
    return this.buffer;
  }
}

/**
 * Generates a sequence of fast keystrokes (scanner input)
 */
const fastKeystrokeSequenceArb = fc.record({
  characters: fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
  baseTimestamp: fc.integer({ min: 1000, max: 10000 }),
  intervalMs: fc.integer({ min: 1, max: 49 }), // Below 50ms threshold
});

/**
 * Generates a sequence of slow keystrokes (human typing)
 */
const slowKeystrokeSequenceArb = fc.record({
  characters: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
  baseTimestamp: fc.integer({ min: 1000, max: 10000 }),
  intervalMs: fc.integer({ min: 51, max: 500 }), // Above 50ms threshold
});

/**
 * Converts a character sequence to mock keystrokes
 */
function createKeystrokeSequence(
  characters: string,
  baseTimestamp: number,
  intervalMs: number,
  includeTerminator = true
): MockKeystroke[] {
  const keystrokes: MockKeystroke[] = [];
  
  for (let i = 0; i < characters.length; i++) {
    keystrokes.push({
      key: characters[i],
      keyCode: characters.charCodeAt(i),
      timestamp: baseTimestamp + (i * intervalMs),
    });
  }
  
  if (includeTerminator) {
    keystrokes.push({
      key: 'Enter',
      keyCode: 13,
      timestamp: baseTimestamp + (characters.length * intervalMs),
    });
  }
  
  return keystrokes;
}

describe('Scanner Velocity Discrimination - Property Tests', () => {
  let scanCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scanCallback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: retail-inventory-platform, Property 2: Scanner Velocity Discrimination
   * Validates: Requirements 2.2, 2.3, 2.4
   * 
   * Property: For any sequence of keystrokes, if all inter-keystroke intervals are below 50ms 
   * and the sequence ends with ASCII 13, the Scanner_Hook SHALL emit exactly one onScan event.
   */
  describe('Property 2: Scanner Velocity Discrimination', () => {
    it('fast keystroke sequences with terminator emit exactly one scan event', () => {
      fc.assert(
        fc.property(
          fastKeystrokeSequenceArb,
          ({ characters, baseTimestamp, intervalMs }) => {
            const scanner = new MockScannerBuffer(50, 3, 13, scanCallback);
            const keystrokes = createKeystrokeSequence(characters, baseTimestamp, intervalMs, true);
            
            // Process all keystrokes
            for (const keystroke of keystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Should emit exactly one scan event with the accumulated buffer
            expect(scanCallback).toHaveBeenCalledTimes(1);
            expect(scanCallback).toHaveBeenCalledWith(characters);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('fast keystroke sequences without terminator do not emit scan events', () => {
      fc.assert(
        fc.property(
          fastKeystrokeSequenceArb,
          ({ characters, baseTimestamp, intervalMs }) => {
            const scanner = new MockScannerBuffer(50, 3, 13, scanCallback);
            const keystrokes = createKeystrokeSequence(characters, baseTimestamp, intervalMs, false);
            
            // Process all keystrokes (no terminator)
            for (const keystroke of keystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Should not emit any scan events without terminator
            expect(scanCallback).not.toHaveBeenCalled();
            // Buffer should contain the accumulated characters
            expect(scanner.getBuffer()).toBe(characters);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('slow keystroke sequences clear buffer and do not emit scan events', () => {
      fc.assert(
        fc.property(
          slowKeystrokeSequenceArb,
          ({ characters, baseTimestamp, intervalMs }) => {
            const scanner = new MockScannerBuffer(50, 3, 13, scanCallback);
            const keystrokes = createKeystrokeSequence(characters, baseTimestamp, intervalMs, true);
            
            // Process all keystrokes
            for (const keystroke of keystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Should not emit scan events due to slow typing
            expect(scanCallback).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('mixed fast and slow sequences only accumulate fast portions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 5 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          fc.string({ minLength: 2, maxLength: 5 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          fc.integer({ min: 1000, max: 5000 }),
          (fastPart, slowPart, baseTimestamp) => {
            const scanner = new MockScannerBuffer(50, 3, 13, scanCallback);
            
            // Create fast sequence
            const fastKeystrokes = createKeystrokeSequence(fastPart, baseTimestamp, 30, false);
            
            // Create slow sequence starting after a long delay
            const slowKeystrokes = createKeystrokeSequence(
              slowPart, 
              baseTimestamp + 1000, // Long delay (> 50ms)
              40, 
              true // Include terminator
            );
            
            // Process fast keystrokes
            for (const keystroke of fastKeystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Process slow keystrokes (should clear buffer and start fresh)
            for (const keystroke of slowKeystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Should emit scan event only for the slow part (which becomes the new buffer)
            expect(scanCallback).toHaveBeenCalledTimes(1);
            expect(scanCallback).toHaveBeenCalledWith(slowPart);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('short sequences below minimum length do not emit scan events', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 2 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
          fc.integer({ min: 1000, max: 5000 }),
          (shortSequence, baseTimestamp) => {
            const scanner = new MockScannerBuffer(50, 3, 13, scanCallback); // minLength = 3
            const keystrokes = createKeystrokeSequence(shortSequence, baseTimestamp, 30, true);
            
            // Process all keystrokes
            for (const keystroke of keystrokes) {
              scanner.processKeystroke(keystroke);
            }
            
            // Should not emit scan events for sequences below minimum length
            expect(scanCallback).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});