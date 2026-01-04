/**
 * useOptimisticState Hook
 * Requirements: 12.1, 12.2, 12.3, 12.4 - Optimistic UI Updates
 * 
 * This hook provides optimistic state management with:
 * - Immediate local state updates on user actions
 * - Sync indicator while awaiting server confirmation
 * - Automatic rollback on server errors
 * - Toast notifications for errors
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from '~/components/ui/toast';

/**
 * Status of an optimistic operation
 */
export type OptimisticStatus = 'idle' | 'pending' | 'confirmed' | 'error';

/**
 * Represents a pending optimistic update
 */
export interface PendingUpdate<T> {
  /** Unique identifier for this update */
  id: string;
  /** The optimistic value applied locally */
  optimisticValue: T;
  /** The previous value before the update (for rollback) */
  previousValue: T;
  /** Timestamp when the update was initiated */
  timestamp: number;
  /** Current status of the update */
  status: OptimisticStatus;
}

/**
 * Configuration for useOptimisticState
 */
export interface UseOptimisticStateConfig<T> {
  /** Initial state value */
  initialValue: T;
  /** Callback when an error occurs (optional, defaults to toast.error) */
  onError?: (error: Error, previousValue: T) => void;
  /** Callback when update is confirmed */
  onConfirm?: (value: T) => void;
  /** Timeout for pending updates in ms (default: 30000) */
  timeout?: number;
}

/**
 * Return type for useOptimisticState
 */
export interface UseOptimisticStateReturn<T> {
  /** Current state value (includes optimistic updates) */
  value: T;
  /** Whether there are any pending updates */
  isPending: boolean;
  /** Number of pending updates */
  pendingCount: number;
  /** List of pending update IDs */
  pendingIds: string[];
  /** Apply an optimistic update */
  applyOptimistic: (
    updateFn: (current: T) => T,
    serverAction: () => Promise<T | void>
  ) => Promise<{ success: boolean; updateId: string }>;
  /** Manually set the value (bypasses optimistic flow) */
  setValue: React.Dispatch<React.SetStateAction<T>>;
  /** Check if a specific update is pending */
  isUpdatePending: (updateId: string) => boolean;
  /** Cancel a pending update and rollback */
  cancelUpdate: (updateId: string) => void;
}

/**
 * Generate a unique ID for updates
 */
function generateUpdateId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * useOptimisticState - Hook for managing optimistic UI updates
 * 
 * This hook implements the optimistic UI pattern where:
 * 1. User action immediately updates local state (Requirement 12.1)
 * 2. A sync indicator shows while awaiting server (Requirement 12.2)
 * 3. On server confirmation, the indicator is removed (Requirement 12.3)
 * 4. On server error, state reverts and error toast shows (Requirement 12.4)
 * 
 * @example
 * ```tsx
 * const { value: stock, isPending, applyOptimistic } = useOptimisticState({
 *   initialValue: 10,
 * });
 * 
 * const handleDecrement = async () => {
 *   await applyOptimistic(
 *     (current) => current - 1,
 *     async () => {
 *       await api.decrementStock(itemId);
 *     }
 *   );
 * };
 * ```
 */
export function useOptimisticState<T>(
  config: UseOptimisticStateConfig<T>
): UseOptimisticStateReturn<T> {
  const {
    initialValue,
    onError,
    onConfirm,
    timeout = 30000,
  } = config;

  // Current state value
  const [value, setValue] = useState<T>(initialValue);
  
  // Track pending updates
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, PendingUpdate<T>>>(
    new Map()
  );

  // Ref to track the confirmed server value
  const confirmedValueRef = useRef<T>(initialValue);

  /**
   * Check if there are any pending updates
   */
  const isPending = pendingUpdates.size > 0;
  const pendingCount = pendingUpdates.size;
  const pendingIds = Array.from(pendingUpdates.keys());

  /**
   * Check if a specific update is pending
   */
  const isUpdatePending = useCallback(
    (updateId: string) => pendingUpdates.has(updateId),
    [pendingUpdates]
  );

  /**
   * Rollback to previous value
   */
  const rollback = useCallback(
    (updateId: string, error?: Error) => {
      setPendingUpdates((current) => {
        const update = current.get(updateId);
        if (!update) return current;

        // Rollback to previous value
        setValue(update.previousValue);
        confirmedValueRef.current = update.previousValue;

        // Show error toast (Requirement 12.4)
        const errorMessage = error?.message || 'Update failed';
        if (onError) {
          onError(error || new Error(errorMessage), update.previousValue);
        } else {
          toast.error(errorMessage);
        }

        // Remove from pending
        const next = new Map(current);
        next.delete(updateId);
        return next;
      });
    },
    [onError]
  );

  /**
   * Cancel a pending update and rollback
   */
  const cancelUpdate = useCallback(
    (updateId: string) => {
      rollback(updateId, new Error('Update cancelled'));
    },
    [rollback]
  );

  /**
   * Apply an optimistic update
   * 
   * @param updateFn - Function to compute the new optimistic value
   * @param serverAction - Async function to perform the server update
   * @returns Promise resolving to success status and update ID
   */
  const applyOptimistic = useCallback(
    async (
      updateFn: (current: T) => T,
      serverAction: () => Promise<T | void>
    ): Promise<{ success: boolean; updateId: string }> => {
      const updateId = generateUpdateId();
      const previousValue = confirmedValueRef.current;
      const optimisticValue = updateFn(previousValue);

      // Create pending update record
      const pendingUpdate: PendingUpdate<T> = {
        id: updateId,
        optimisticValue,
        previousValue,
        timestamp: Date.now(),
        status: 'pending',
      };

      // Apply optimistic update immediately (Requirement 12.1)
      setValue(optimisticValue);
      setPendingUpdates((current) => {
        const next = new Map(current);
        next.set(updateId, pendingUpdate);
        return next;
      });

      // Set up timeout for stale updates
      const timeoutId = setTimeout(() => {
        rollback(updateId, new Error('Update timed out'));
      }, timeout);

      try {
        // Execute server action
        const serverResult = await serverAction();

        // Clear timeout
        clearTimeout(timeoutId);

        // Update confirmed value
        const confirmedValue = serverResult !== undefined ? serverResult : optimisticValue;
        confirmedValueRef.current = confirmedValue as T;
        setValue(confirmedValue as T);

        // Remove from pending (Requirement 12.3)
        setPendingUpdates((current) => {
          const next = new Map(current);
          next.delete(updateId);
          return next;
        });

        // Call onConfirm callback
        onConfirm?.(confirmedValue as T);

        return { success: true, updateId };
      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);

        // Rollback on error (Requirement 12.4)
        rollback(updateId, error instanceof Error ? error : new Error(String(error)));

        return { success: false, updateId };
      }
    },
    [timeout, rollback, onConfirm]
  );

  return {
    value,
    isPending,
    pendingCount,
    pendingIds,
    applyOptimistic,
    setValue,
    isUpdatePending,
    cancelUpdate,
  };
}

/**
 * useOptimisticList - Specialized hook for optimistic list operations
 * 
 * Provides convenient methods for common list operations like
 * add, remove, and update items with optimistic UI.
 */
export interface UseOptimisticListConfig<T> {
  /** Initial list items */
  initialItems: T[];
  /** Function to get unique ID from item */
  getItemId: (item: T) => string;
  /** Callback when an error occurs */
  onError?: (error: Error, previousItems: T[]) => void;
  /** Timeout for pending updates in ms */
  timeout?: number;
}

export interface UseOptimisticListReturn<T> {
  /** Current list items */
  items: T[];
  /** Whether there are any pending updates */
  isPending: boolean;
  /** Set of item IDs with pending updates */
  pendingItemIds: Set<string>;
  /** Add an item optimistically */
  addItem: (item: T, serverAction: () => Promise<T | void>) => Promise<boolean>;
  /** Remove an item optimistically */
  removeItem: (itemId: string, serverAction: () => Promise<void>) => Promise<boolean>;
  /** Update an item optimistically */
  updateItem: (
    itemId: string,
    updateFn: (item: T) => T,
    serverAction: () => Promise<T | void>
  ) => Promise<boolean>;
  /** Set items directly */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  /** Check if a specific item has pending updates */
  isItemPending: (itemId: string) => boolean;
}

export function useOptimisticList<T>(
  config: UseOptimisticListConfig<T>
): UseOptimisticListReturn<T> {
  const { initialItems, getItemId, onError, timeout } = config;

  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());

  const {
    value: items,
    isPending,
    applyOptimistic,
    setValue: setItems,
  } = useOptimisticState<T[]>({
    initialValue: initialItems,
    onError,
    timeout,
  });

  const isItemPending = useCallback(
    (itemId: string) => pendingItemIds.has(itemId),
    [pendingItemIds]
  );

  const addItem = useCallback(
    async (item: T, serverAction: () => Promise<T | void>): Promise<boolean> => {
      const itemId = getItemId(item);
      setPendingItemIds((prev) => new Set(prev).add(itemId));

      const { success } = await applyOptimistic(
        (current) => [...current, item],
        serverAction
      );

      setPendingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      return success;
    },
    [applyOptimistic, getItemId]
  );

  const removeItem = useCallback(
    async (itemId: string, serverAction: () => Promise<void>): Promise<boolean> => {
      setPendingItemIds((prev) => new Set(prev).add(itemId));

      const { success } = await applyOptimistic(
        (current) => current.filter((item) => getItemId(item) !== itemId),
        serverAction
      );

      setPendingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      return success;
    },
    [applyOptimistic, getItemId]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      updateFn: (item: T) => T,
      serverAction: () => Promise<T | void>
    ): Promise<boolean> => {
      setPendingItemIds((prev) => new Set(prev).add(itemId));

      const { success } = await applyOptimistic(
        (current) =>
          current.map((item) =>
            getItemId(item) === itemId ? updateFn(item) : item
          ),
        serverAction
      );

      setPendingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      return success;
    },
    [applyOptimistic, getItemId]
  );

  return {
    items,
    isPending,
    pendingItemIds,
    addItem,
    removeItem,
    updateItem,
    setItems,
    isItemPending,
  };
}

export default useOptimisticState;
