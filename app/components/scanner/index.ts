export { CameraScanner, type CameraScannerProps, type ScannerState, type BarcodeFormat } from './CameraScanner';

// Re-export scan handler utilities for convenience
export {
  createScanHandler,
  handleItemScan,
  detectScanType,
  type ScanResult,
  type ScanType,
  type InventoryItem,
  type OrderInfo,
  type ScanHandlerConfig,
  type ScanHandlerCallbacks,
} from '~/lib/scanHandler';
