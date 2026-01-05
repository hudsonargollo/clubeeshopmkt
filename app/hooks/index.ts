export { useBarcodeScanner } from './useBarcodeScanner';
export type { ScannerConfig, UseBarcodeScanner } from './useBarcodeScanner';

export { useInventorySearch } from './useInventorySearch';
export type { SearchResult, UseInventorySearchOptions, UseInventorySearchReturn } from './useInventorySearch';

export { useUnifiedScanner, detectScanType } from './useUnifiedScanner';
export type {
  UnifiedScannerConfig,
  UnifiedScannerState,
  UseUnifiedScannerReturn,
  ScanResult,
  ScanType,
  InventoryItem,
  OrderInfo,
  ScanHandlerConfig,
  ScanHandlerCallbacks,
} from './useUnifiedScanner';

export { useRealtimeInventory } from './useRealtimeInventory';
export type {
  UseRealtimeInventoryConfig,
  UseRealtimeInventoryReturn,
  InventoryChangePayload,
  InventoryItem as RealtimeInventoryItem,
} from './useRealtimeInventory';

// Note: usePresence temporarily disabled due to build issues
// export { usePresence } from './usePresence';
// export type {
//   UsePresenceConfig,
//   UsePresenceReturn,
//   PresenceUser,
// } from './usePresence';

export { useOptimisticState, useOptimisticList } from './useOptimisticState';
export type {
  OptimisticStatus,
  PendingUpdate,
  UseOptimisticStateConfig,
  UseOptimisticStateReturn,
  UseOptimisticListConfig,
  UseOptimisticListReturn,
} from './useOptimisticState';