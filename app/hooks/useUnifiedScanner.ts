/**
 * Unified Scanner Hook
 * Requirements: 3.3 - Wire both USB scanner hook and camera scanner to same handler
 * 
 * This hook provides a unified interface for barcode scanning that works with
 * both the USB scanner (via useBarcodeScanner) and camera scanner (via CameraScanner).
 */

import { useCallback, useState, useMemo } from 'react';
import { useBarcodeScanner, type ScannerConfig } from './useBarcodeScanner';
import {
  createScanHandler,
  detectScanType,
  type ScanResult,
  type ScanHandlerConfig,
  type ScanHandlerCallbacks,
  type InventoryItem,
  type OrderInfo,
  type ScanType,
} from '~/lib/scanHandler';

/**
 * Configuration for the unified scanner
 */
export interface UnifiedScannerConfig {
  /** USB scanner configuration */
  usbScanner?: ScannerConfig;
  /** Scan handler configuration */
  handler?: ScanHandlerConfig;
  /** Whether USB scanner is enabled (default: true) */
  enableUsb?: boolean;
}

/**
 * State returned by the unified scanner hook
 */
export interface UnifiedScannerState {
  /** Whether a scan is currently being processed */
  isProcessing: boolean;
  /** The last scan result */
  lastResult: ScanResult | null;
  /** The last scanned code */
  lastCode: string | null;
  /** Error from the last scan, if any */
  error: string | null;
}

/**
 * Return type for the useUnifiedScanner hook
 */
export interface UseUnifiedScannerReturn {
  /** Current scanner state */
  state: UnifiedScannerState;
  /** The unified scan handler - pass this to CameraScanner's onScan prop */
  handleScan: (code: string) => Promise<ScanResult>;
  /** USB scanner state from useBarcodeScanner */
  usbScanner: {
    isActive: boolean;
    lastScannedCode: string | null;
    reset: () => void;
  };
  /** Reset the scanner state */
  reset: () => void;
  /** Manually trigger a scan (useful for testing or manual input) */
  triggerScan: (code: string) => Promise<ScanResult>;
}

/**
 * useUnifiedScanner - React hook for unified barcode scanning
 * 
 * This hook combines the USB barcode scanner hook with a unified scan handler
 * that can also be used with the CameraScanner component. Both scanner types
 * invoke the same handleItemScan function as required by Requirement 3.3.
 * 
 * @param callbacks - Event callbacks for scan results
 * @param config - Configuration options
 * @returns Unified scanner state and handlers
 * 
 * @example
 * ```tsx
 * function ScannerPage() {
 *   const { state, handleScan, usbScanner } = useUnifiedScanner({
 *     onProductScan: (item) => {
 *       console.log('Product scanned:', item.name);
 *       addToCart(item);
 *     },
 *     onOrderScan: (order) => {
 *       navigate(`/orders/${order.id}`);
 *     },
 *     onError: (error) => {
 *       toast.error(error);
 *     },
 *   });
 * 
 *   return (
 *     <div>
 *       {state.isProcessing && <Spinner />}
 *       
 *       {/* USB scanner is automatically active via the hook *\/}
 *       <p>USB Scanner: {usbScanner.isActive ? 'Ready' : 'Inactive'}</p>
 *       
 *       {/* Camera scanner uses the same handler *\/}
 *       <CameraScanner onScan={handleScan} enabled={showCamera} />
 *       
 *       {state.lastResult?.success && (
 *         <p>Last scan: {state.lastResult.data?.name}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnifiedScanner(
  callbacks: ScanHandlerCallbacks = {},
  config: UnifiedScannerConfig = {}
): UseUnifiedScannerReturn {
  const {
    usbScanner: usbConfig = {},
    handler: handlerConfig = {},
    enableUsb = true,
  } = config;

  // Scanner state
  const [state, setState] = useState<UnifiedScannerState>({
    isProcessing: false,
    lastResult: null,
    lastCode: null,
    error: null,
  });

  // Wrap callbacks to update local state
  const wrappedCallbacks = useMemo<ScanHandlerCallbacks>(() => ({
    ...callbacks,
    onScanStart: (code: string) => {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        lastCode: code,
        error: null,
      }));
      callbacks.onScanStart?.(code);
    },
    onScanComplete: (result: ScanResult) => {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
        error: result.success ? null : result.error ?? null,
      }));
      callbacks.onScanComplete?.(result);
    },
    onError: (error: string, code: string) => {
      setState(prev => ({
        ...prev,
        error,
      }));
      callbacks.onError?.(error, code);
    },
  }), [callbacks]);

  // Create the unified scan handler
  const handleScan = useMemo(
    () => createScanHandler(wrappedCallbacks, handlerConfig),
    [wrappedCallbacks, handlerConfig]
  );

  // Wrapper for USB scanner that calls the async handler
  const handleUsbScan = useCallback((code: string) => {
    // Fire and forget - the state updates happen via callbacks
    handleScan(code);
  }, [handleScan]);

  // Initialize USB scanner with the unified handler
  const usbScannerResult = useBarcodeScanner(
    enableUsb ? usbConfig : { ...usbConfig, patterns: [] }, // Disable by using empty patterns
    handleUsbScan
  );

  // Reset function
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      lastResult: null,
      lastCode: null,
      error: null,
    });
    usbScannerResult.reset();
  }, [usbScannerResult]);

  // Manual trigger function
  const triggerScan = useCallback(async (code: string): Promise<ScanResult> => {
    return handleScan(code);
  }, [handleScan]);

  return {
    state,
    handleScan,
    usbScanner: usbScannerResult,
    reset,
    triggerScan,
  };
}

// Re-export types for convenience
export type {
  ScanResult,
  ScanType,
  InventoryItem,
  OrderInfo,
  ScanHandlerConfig,
  ScanHandlerCallbacks,
};

export { detectScanType };

export default useUnifiedScanner;
