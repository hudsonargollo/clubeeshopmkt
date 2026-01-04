/**
 * Unified Scan Handler
 * Requirements: 3.3 - Both USB scanner and camera scanner invoke the same handleItemScan function
 * 
 * This module provides a shared scan handler that processes barcodes from any source
 * (USB scanner hook or camera scanner component) and routes them appropriately.
 */

/**
 * Types of scanned codes the system can handle
 */
export type ScanType = 'product' | 'order' | 'unknown';

/**
 * Result of a scan operation
 */
export interface ScanResult {
  success: boolean;
  type: ScanType;
  data?: InventoryItem | OrderInfo;
  error?: string;
  stockUpdated?: boolean;
}

/**
 * Inventory item returned from scan
 */
export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
}

/**
 * Order info for order QR code scans
 */
export interface OrderInfo {
  id: string;
  pickup_code?: string;
}

/**
 * Configuration for the scan handler
 */
export interface ScanHandlerConfig {
  /** Base URL for API calls (defaults to current origin) */
  baseUrl?: string;
  /** Operation to perform on product scans */
  operation?: 'lookup' | 'decrement' | 'increment';
  /** Quantity for stock operations (default: 1) */
  quantity?: number;
}

/**
 * Callbacks for scan events
 */
export interface ScanHandlerCallbacks {
  /** Called when a product is successfully scanned */
  onProductScan?: (item: InventoryItem, stockUpdated: boolean) => void;
  /** Called when an order QR code is scanned */
  onOrderScan?: (order: OrderInfo) => void;
  /** Called when scan fails */
  onError?: (error: string, code: string) => void;
  /** Called when scan starts processing */
  onScanStart?: (code: string) => void;
  /** Called when scan processing completes (success or failure) */
  onScanComplete?: (result: ScanResult) => void;
}

/**
 * API response type for scan endpoint
 */
interface ScanApiResponse {
  success: boolean;
  item?: InventoryItem;
  error?: string;
  stockUpdated?: boolean;
}

/**
 * Pattern to detect Order ID format in scanned codes
 * Order IDs are UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Determine the type of scanned code
 */
export function detectScanType(code: string): ScanType {
  if (!code || code.trim().length === 0) {
    return 'unknown';
  }

  // Check if it's an Order ID (UUID format)
  if (ORDER_ID_PATTERN.test(code)) {
    return 'order';
  }

  // Default to product barcode
  return 'product';
}

/**
 * Create a unified scan handler function
 * 
 * This factory function creates a handleItemScan function that can be passed
 * to both the useBarcodeScanner hook and the CameraScanner component.
 * 
 * @param callbacks - Event callbacks for scan results
 * @param config - Configuration options
 * @returns A scan handler function compatible with both scanner types
 * 
 * @example
 * ```tsx
 * const handleScan = createScanHandler({
 *   onProductScan: (item) => addToCart(item),
 *   onOrderScan: (order) => navigateToOrder(order.id),
 *   onError: (error) => showToast(error),
 * });
 * 
 * // Use with USB scanner hook
 * useBarcodeScanner({}, handleScan);
 * 
 * // Use with camera scanner
 * <CameraScanner onScan={handleScan} />
 * ```
 */
export function createScanHandler(
  callbacks: ScanHandlerCallbacks = {},
  config: ScanHandlerConfig = {}
): (code: string) => Promise<ScanResult> {
  const {
    onProductScan,
    onOrderScan,
    onError,
    onScanStart,
    onScanComplete,
  } = callbacks;

  const {
    baseUrl = '',
    operation = 'lookup',
    quantity = 1,
  } = config;

  return async (code: string): Promise<ScanResult> => {
    // Notify scan start
    onScanStart?.(code);

    const scanType = detectScanType(code);

    try {
      if (scanType === 'order') {
        // Handle order QR code scan
        const orderInfo: OrderInfo = { id: code };
        
        const result: ScanResult = {
          success: true,
          type: 'order',
          data: orderInfo,
        };

        onOrderScan?.(orderInfo);
        onScanComplete?.(result);
        return result;
      }

      if (scanType === 'product') {
        // Handle product barcode scan
        const response = await fetch(`${baseUrl}/api/inventory/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            barcode: code,
            operation,
            quantity,
          }),
        });

        const data: ScanApiResponse = await response.json();

        if (!response.ok || !data.success) {
          const errorMessage = data.error || 'Scan failed';
          const result: ScanResult = {
            success: false,
            type: 'product',
            error: errorMessage,
          };

          onError?.(errorMessage, code);
          onScanComplete?.(result);
          return result;
        }

        const result: ScanResult = {
          success: true,
          type: 'product',
          data: data.item,
          stockUpdated: data.stockUpdated ?? false,
        };

        if (data.item) {
          onProductScan?.(data.item, data.stockUpdated ?? false);
        }
        onScanComplete?.(result);
        return result;
      }

      // Unknown scan type
      const result: ScanResult = {
        success: false,
        type: 'unknown',
        error: 'Unrecognized barcode format',
      };

      onError?.('Unrecognized barcode format', code);
      onScanComplete?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      const result: ScanResult = {
        success: false,
        type: scanType,
        error: errorMessage,
      };

      onError?.(errorMessage, code);
      onScanComplete?.(result);
      return result;
    }
  };
}

/**
 * Simple synchronous scan handler for cases where async handling isn't needed
 * 
 * This is useful when you just want to detect the scan type and handle it
 * synchronously without making API calls.
 * 
 * @param code - The scanned barcode
 * @param callbacks - Callbacks for different scan types
 */
export function handleItemScan(
  code: string,
  callbacks: {
    onProduct?: (barcode: string) => void;
    onOrder?: (orderId: string) => void;
    onUnknown?: (code: string) => void;
  }
): ScanType {
  const scanType = detectScanType(code);

  switch (scanType) {
    case 'product':
      callbacks.onProduct?.(code);
      break;
    case 'order':
      callbacks.onOrder?.(code);
      break;
    default:
      callbacks.onUnknown?.(code);
  }

  return scanType;
}

export default createScanHandler;
