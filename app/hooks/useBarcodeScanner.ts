import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Configuration for the barcode scanner hook
 */
export interface ScannerConfig {
  /** Maximum time between keystrokes to consider as scanner input (default: 50ms) */
  velocityThreshold?: number;
  /** Minimum barcode length to be considered valid (default: 3) */
  minBarcodeLength?: number;
  /** ASCII code for the terminator character (default: 13 for Carriage Return) */
  terminatorChar?: number;
  /** Array of regex patterns to validate scanned barcodes */
  patterns?: RegExp[];
}

/**
 * Internal state for tracking scanner buffer
 */
interface ScannerState {
  buffer: string;
  lastKeystroke: number;
}

/**
 * Return type for the useBarcodeScanner hook
 */
export interface UseBarcodeScanner {
  /** Whether the scanner is actively listening */
  isActive: boolean;
  /** The last successfully scanned barcode */
  lastScannedCode: string | null;
  /** Reset the scanner state */
  reset: () => void;
}

/**
 * Default barcode patterns for common formats:
 * - UPC-A: 12 digits
 * - UPC-E: 8 digits
 * - EAN-13: 13 digits
 * - EAN-8: 8 digits
 * - Code128: alphanumeric, variable length
 * - QR Code: alphanumeric, variable length
 */
const DEFAULT_PATTERNS: RegExp[] = [
  /^\d{8}$/,           // UPC-E, EAN-8
  /^\d{12}$/,          // UPC-A
  /^\d{13}$/,          // EAN-13
  /^[A-Za-z0-9\-_.]+$/ // Code128, QR codes (alphanumeric)
];

const DEFAULT_CONFIG: Required<ScannerConfig> = {
  velocityThreshold: 50,
  minBarcodeLength: 3,
  terminatorChar: 13, // ASCII 13 = Carriage Return
  patterns: DEFAULT_PATTERNS,
};

/**
 * Check if the currently focused element is an input or textarea
 * where we should pass through keystrokes instead of capturing them
 */
function isInputElement(element: Element | null): boolean {
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
 * Validate a barcode against the configured patterns
 */
function validateBarcode(code: string, patterns: RegExp[]): boolean {
  if (patterns.length === 0) return true;
  return patterns.some(pattern => pattern.test(code));
}

/**
 * useBarcodeScanner - React hook for capturing barcode scanner input
 * 
 * This hook intercepts HID keyboard events from USB barcode scanners like
 * the Honeywell MS9520 Voyager. It discriminates between scanner input and
 * human typing based on keystroke velocity.
 * 
 * Requirements implemented:
 * - 2.1: Global window.onkeydown listener regardless of focus
 * - 2.2: Accumulate keystrokes with inter-character latency below 50ms
 * - 2.3: Clear buffer when latency exceeds 50ms (human typing noise)
 * - 2.4: Dispatch onScan when ASCII 13 detected and buffer > 3 chars
 * - 2.5: Pass-through events when focus is on input/textarea
 * - 2.6: Validate scanned data against barcode patterns
 * 
 * @param config - Scanner configuration options
 * @param onScan - Callback function invoked when a valid barcode is scanned
 * @returns Scanner state and control functions
 */
export function useBarcodeScanner(
  config: ScannerConfig = {},
  onScan: (code: string) => void
): UseBarcodeScanner {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { velocityThreshold, minBarcodeLength, terminatorChar, patterns } = mergedConfig;

  // Use refs to avoid re-renders during buffer accumulation
  const stateRef = useRef<ScannerState>({
    buffer: '',
    lastKeystroke: 0,
  });
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track last scanned code for UI feedback
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  /**
   * Clear the buffer and reset timeout
   */
  const clearBuffer = useCallback(() => {
    stateRef.current.buffer = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Reset the scanner state
   */
  const reset = useCallback(() => {
    clearBuffer();
    setLastScannedCode(null);
  }, [clearBuffer]);

  /**
   * Process a completed scan
   */
  const processScan = useCallback((code: string) => {
    // Validate minimum length (Requirement 2.4)
    if (code.length < minBarcodeLength) {
      clearBuffer();
      return;
    }

    // Validate against patterns (Requirement 2.6)
    if (!validateBarcode(code, patterns)) {
      clearBuffer();
      return;
    }

    // Valid barcode - dispatch callback
    setLastScannedCode(code);
    onScan(code);
    clearBuffer();
  }, [minBarcodeLength, patterns, onScan, clearBuffer]);

  useEffect(() => {
    /**
     * Global keydown handler (Requirement 2.1)
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      const state = stateRef.current;

      // Requirement 2.5: Pass-through when focus is on input/textarea
      if (isInputElement(document.activeElement)) {
        clearBuffer();
        return;
      }

      // Check for terminator character (Requirement 2.4)
      if (event.keyCode === terminatorChar || event.key === 'Enter') {
        if (state.buffer.length > 0) {
          processScan(state.buffer);
        }
        return;
      }

      // Only capture printable characters
      if (event.key.length !== 1) {
        return;
      }

      // Calculate time since last keystroke
      const timeSinceLastKeystroke = now - state.lastKeystroke;

      // Requirement 2.3: Clear buffer if latency exceeds threshold (human typing)
      if (state.lastKeystroke > 0 && timeSinceLastKeystroke > velocityThreshold) {
        clearBuffer();
      }

      // Requirement 2.2: Accumulate keystrokes with fast velocity
      state.buffer += event.key;
      state.lastKeystroke = now;

      // Set timeout to clear buffer if no more keystrokes arrive
      // This handles the case where scanning stops without a terminator
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        clearBuffer();
      }, velocityThreshold * 2);
    };

    // Attach global listener (Requirement 2.1)
    window.addEventListener('keydown', handleKeyDown);
    setIsActive(true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearBuffer();
      setIsActive(false);
    };
  }, [velocityThreshold, terminatorChar, processScan, clearBuffer]);

  return {
    isActive,
    lastScannedCode,
    reset,
  };
}

export default useBarcodeScanner;
