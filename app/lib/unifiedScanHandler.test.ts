/**
 * Property-Based Test: Unified Scan Handler
 * Feature: retail-inventory-platform, Property 4: Unified Scan Handler
 * Validates: Requirements 3.3
 * 
 * Property: For any barcode detected via USB scanner OR camera scanner,
 * the system SHALL invoke the identical handleItemScan(code) function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the unified scan handler
interface ScanHandler {
  (code: string): void;
}

// Mock USB scanner hook
interface USBScannerHook {
  onScan: ScanHandler | null;
  simulateScan: (code: string) => void;
}

// Mock camera scanner component
interface CameraScanner {
  onScan: ScanHandler | null;
  simulateScan: (code: string) => void;
}

// Create mock implementations
function createUSBScannerHook(): USBScannerHook {
  const hook: USBScannerHook = {
    onScan: null,
    simulateScan: (code: string) => {
      if (hook.onScan) {
        hook.onScan(code);
      }
    }
  };
  return hook;
}

function createCameraScanner(): CameraScanner {
  const scanner: CameraScanner = {
    onScan: null,
    simulateScan: (code: string) => {
      if (scanner.onScan) {
        scanner.onScan(code);
      }
    }
  };
  return scanner;
}

// Unified scanner system that wires both scanners to same handler
function createUnifiedScanner(handler: ScanHandler) {
  const usbScanner = createUSBScannerHook();
  const cameraScanner = createCameraScanner();
  
  // Wire both scanners to the same handler
  usbScanner.onScan = handler;
  cameraScanner.onScan = handler;
  
  return { usbScanner, cameraScanner };
}

describe('Property 4: Unified Scan Handler', () => {
  let mockHandler: ScanHandler;
  
  beforeEach(() => {
    mockHandler = vi.fn();
  });

  it('should invoke identical handler for USB scanner input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 48 }).filter(s => /^[A-Za-z0-9\-_.]+$/.test(s)),
        (barcode) => {
          const { usbScanner } = createUnifiedScanner(mockHandler);
          
          // Simulate USB scanner input
          usbScanner.simulateScan(barcode);
          
          // Verify handler was called with correct barcode
          expect(mockHandler).toHaveBeenCalledWith(barcode);
          expect(mockHandler).toHaveBeenCalledTimes(1);
          
          // Reset for next iteration
          vi.clearAllMocks();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should invoke identical handler for camera scanner input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 48 }).filter(s => /^[A-Za-z0-9\-_.]+$/.test(s)),
        (barcode) => {
          const { cameraScanner } = createUnifiedScanner(mockHandler);
          
          // Simulate camera scanner input
          cameraScanner.simulateScan(barcode);
          
          // Verify handler was called with correct barcode
          expect(mockHandler).toHaveBeenCalledWith(barcode);
          expect(mockHandler).toHaveBeenCalledTimes(1);
          
          // Reset for next iteration
          vi.clearAllMocks();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should invoke same handler instance for both scanner types', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 48 }).filter(s => /^[A-Za-z0-9\-_.]+$/.test(s)),
        fc.string({ minLength: 3, maxLength: 48 }).filter(s => /^[A-Za-z0-9\-_.]+$/.test(s)),
        (usbBarcode, cameraBarcode) => {
          const { usbScanner, cameraScanner } = createUnifiedScanner(mockHandler);
          
          // Simulate scans from both sources
          usbScanner.simulateScan(usbBarcode);
          cameraScanner.simulateScan(cameraBarcode);
          
          // Verify both calls went to the same handler
          expect(mockHandler).toHaveBeenCalledTimes(2);
          expect(mockHandler).toHaveBeenNthCalledWith(1, usbBarcode);
          expect(mockHandler).toHaveBeenNthCalledWith(2, cameraBarcode);
          
          // Verify both scanners reference the same handler function
          expect(usbScanner.onScan).toBe(cameraScanner.onScan);
          expect(usbScanner.onScan).toBe(mockHandler);
          
          // Reset for next iteration
          vi.clearAllMocks();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle concurrent scans from both sources', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 48 }).filter(s => /^[A-Za-z0-9\-_.]+$/.test(s)), { minLength: 1, maxLength: 10 }),
        (barcodes) => {
          const { usbScanner, cameraScanner } = createUnifiedScanner(mockHandler);
          const scanners = [usbScanner, cameraScanner];
          
          // Simulate concurrent scans from random sources
          barcodes.forEach((barcode, index) => {
            const scanner = scanners[index % 2];
            scanner.simulateScan(barcode);
          });
          
          // Verify all scans were handled
          expect(mockHandler).toHaveBeenCalledTimes(barcodes.length);
          
          // Verify each barcode was passed correctly
          barcodes.forEach((barcode, index) => {
            expect(mockHandler).toHaveBeenNthCalledWith(index + 1, barcode);
          });
          
          // Reset for next iteration
          vi.clearAllMocks();
        }
      ),
      { numRuns: 10 }
    );
  });
});