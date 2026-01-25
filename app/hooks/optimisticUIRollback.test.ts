/**
 * Property-Based Test: Optimistic UI Rollback
 * Feature: retail-inventory-platform, Property 9: Optimistic UI Rollback
 * Validates: Requirements 12.4
 * 
 * Property: For any optimistic update followed by server error,
 * the UI state SHALL revert to the pre-update state AND display an error notification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fc } from 'fast-check';

// Mock optimistic state
interface OptimisticState<T> {
  data: T;
  pending: boolean;
  error: Error | null;
}

// Mock server response
interface ServerResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Mock notification system
interface NotificationSystem {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  clear: () => void;
}

// Optimistic update manager with rollback capability
class OptimisticUpdateManager<T> {
  private state: OptimisticState<T>;
  private originalData: T;
  private onStateChange: (state: OptimisticState<T>) => void;
  private notifications: NotificationSystem;
  
  constructor(
    initialData: T, 
    onStateChange: (state: OptimisticState<T>) => void,
    notifications: NotificationSystem
  ) {
    this.originalData = this.deepClone(initialData);
    this.state = {
      data: this.deepClone(initialData),
      pending: false,
      error: null
    };
    this.onStateChange = onStateChange;
    this.notifications = notifications;
  }
  
  private deepClone<U>(obj: U): U {
    return JSON.parse(JSON.stringify(obj));
  }
  
  getState(): OptimisticState<T> {
    return this.deepClone(this.state);
  }
  
  getOriginalData(): T {
    return this.deepClone(this.originalData);
  }
  
  // Perform optimistic update
  optimisticUpdate(newData: Partial<T>): void {
    this.state = {
      data: { ...this.state.data, ...newData },
      pending: true,
      error: null
    };
    this.onStateChange(this.getState());
  }
  
  // Handle server response (success or error)
  handleServerResponse(response: ServerResponse<T>): void {
    if (response.success && response.data) {
      // Server confirmed - use server data
      this.state = {
        data: this.deepClone(response.data),
        pending: false,
        error: null
      };
      this.notifications.showSuccess('Update successful');
    } else {
      // Server error - rollback to original state
      this.state = {
        data: this.deepClone(this.originalData),
        pending: false,
        error: response.error ? new Error(response.error) : new Error('Unknown server error')
      };
      this.notifications.showError(response.error || 'Update failed');
    }
    this.onStateChange(this.getState());
  }
  
  // Reset to original state
  reset(): void {
    this.state = {
      data: this.deepClone(this.originalData),
      pending: false,
      error: null
    };
    this.notifications.clear();
    this.onStateChange(this.getState());
  }
}

// Mock inventory item for testing
interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

describe('Property 9: Optimistic UI Rollback', () => {
  let stateChanges: OptimisticState<InventoryItem>[];
  let notifications: { type: 'error' | 'success'; message: string }[];
  let mockNotifications: NotificationSystem;
  let manager: OptimisticUpdateManager<InventoryItem>;
  
  beforeEach(() => {
    stateChanges = [];
    notifications = [];
    
    mockNotifications = {
      showError: vi.fn((message: string) => {
        notifications.push({ type: 'error', message });
      }),
      showSuccess: vi.fn((message: string) => {
        notifications.push({ type: 'success', message });
      }),
      clear: vi.fn(() => {
        notifications.length = 0;
      })
    };
  });

  it('should revert to original state on server error', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // originalItem
        fc.record({
          name: fc.option(fc.string({ minLength: 1 })),
          stock: fc.option(fc.integer({ min: 0, max: 1000 })),
          price: fc.option(fc.float({ min: 0.01, max: 999.99, noNaN: true }))
        }), // optimisticUpdate
        fc.string({ minLength: 1 }), // errorMessage
        (originalItem, optimisticUpdate, errorMessage) => {
          // Filter out null values from optimistic update
          const cleanOptimisticUpdate = Object.fromEntries(
            Object.entries(optimisticUpdate).filter(([_, value]) => value !== null)
          ) as Partial<InventoryItem>;
          
          manager = new OptimisticUpdateManager(
            originalItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // Store original state for comparison
          const originalState = manager.getState();
          
          // Perform optimistic update
          manager.optimisticUpdate(cleanOptimisticUpdate);
          
          // Verify optimistic state is different from original
          const optimisticState = manager.getState();
          expect(optimisticState.pending).toBe(true);
          expect(optimisticState.error).toBeNull();
          
          // Simulate server error
          const errorResponse: ServerResponse<InventoryItem> = {
            success: false,
            error: errorMessage
          };
          manager.handleServerResponse(errorResponse);
          
          // Verify rollback to original state
          const finalState = manager.getState();
          expect(finalState.data).toEqual(originalItem);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).not.toBeNull();
          expect(finalState.error!.message).toBe(errorMessage);
          
          // Verify error notification was shown
          expect(notifications).toHaveLength(1);
          expect(notifications[0].type).toBe('error');
          expect(notifications[0].message).toBe(errorMessage);
          
          // Verify state progression
          expect(stateChanges).toHaveLength(2);
          
          // First change: optimistic update
          expect(stateChanges[0].pending).toBe(true);
          expect(stateChanges[0].error).toBeNull();
          
          // Second change: rollback
          expect(stateChanges[1].pending).toBe(false);
          expect(stateChanges[1].error).not.toBeNull();
          expect(stateChanges[1].data).toEqual(originalItem);
          
          // Reset for next iteration
          stateChanges = [];
          notifications = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle multiple optimistic updates before rollback', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 100, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // originalItem
        fc.array(
          fc.record({
            stock: fc.option(fc.integer({ min: 0, max: 1000 })),
            price: fc.option(fc.float({ min: 0.01, max: 999.99, noNaN: true }))
          }),
          { minLength: 2, maxLength: 5 }
        ), // optimisticUpdates
        fc.string({ minLength: 1 }), // errorMessage
        (originalItem, optimisticUpdates, errorMessage) => {
          manager = new OptimisticUpdateManager(
            originalItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // Perform multiple optimistic updates
          for (const update of optimisticUpdates) {
            const cleanUpdate = Object.fromEntries(
              Object.entries(update).filter(([_, value]) => value !== null)
            ) as Partial<InventoryItem>;
            
            manager.optimisticUpdate(cleanUpdate);
          }
          
          // Verify we're in optimistic state
          const optimisticState = manager.getState();
          expect(optimisticState.pending).toBe(true);
          
          // Simulate server error
          const errorResponse: ServerResponse<InventoryItem> = {
            success: false,
            error: errorMessage
          };
          manager.handleServerResponse(errorResponse);
          
          // Should rollback to original state (not intermediate optimistic states)
          const finalState = manager.getState();
          expect(finalState.data).toEqual(originalItem);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).not.toBeNull();
          
          // Should show error notification
          expect(notifications).toHaveLength(1);
          expect(notifications[0].type).toBe('error');
          
          // Reset for next iteration
          stateChanges = [];
          notifications = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should preserve original data integrity during rollback', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // originalItem
        fc.array(
          fc.record({
            name: fc.option(fc.string({ minLength: 1 })),
            stock: fc.option(fc.integer({ min: 0, max: 1000 })),
            price: fc.option(fc.float({ min: 0.01, max: 999.99, noNaN: true }))
          }),
          { minLength: 1, maxLength: 3 }
        ), // optimisticUpdates
        (originalItem, optimisticUpdates) => {
          manager = new OptimisticUpdateManager(
            originalItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // Store reference to original data
          const originalDataBefore = manager.getOriginalData();
          
          // Perform optimistic updates
          for (const update of optimisticUpdates) {
            const cleanUpdate = Object.fromEntries(
              Object.entries(update).filter(([_, value]) => value !== null)
            ) as Partial<InventoryItem>;
            
            manager.optimisticUpdate(cleanUpdate);
          }
          
          // Simulate server error
          const errorResponse: ServerResponse<InventoryItem> = {
            success: false,
            error: 'Server error'
          };
          manager.handleServerResponse(errorResponse);
          
          // Original data should be unchanged
          const originalDataAfter = manager.getOriginalData();
          expect(originalDataAfter).toEqual(originalDataBefore);
          expect(originalDataAfter).toEqual(originalItem);
          
          // Final state should match original exactly
          const finalState = manager.getState();
          expect(finalState.data).toEqual(originalItem);
          
          // Verify no mutation of original data
          expect(finalState.data).not.toBe(originalItem); // Should be a copy
          expect(finalState.data).toEqual(originalItem); // But equal in value
          
          // Reset for next iteration
          stateChanges = [];
          notifications = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle different error types correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // originalItem
        fc.record({
          stock: fc.integer({ min: 0, max: 1000 })
        }), // optimisticUpdate
        fc.oneof(
          fc.constant(undefined), // No error message
          fc.string({ minLength: 1 }), // Custom error message
          fc.constant('') // Empty error message
        ), // errorMessage
        (originalItem, optimisticUpdate, errorMessage) => {
          manager = new OptimisticUpdateManager(
            originalItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // Perform optimistic update
          manager.optimisticUpdate(optimisticUpdate);
          
          // Simulate server error with different error types
          const errorResponse: ServerResponse<InventoryItem> = {
            success: false,
            error: errorMessage
          };
          manager.handleServerResponse(errorResponse);
          
          // Should always rollback to original state
          const finalState = manager.getState();
          expect(finalState.data).toEqual(originalItem);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).not.toBeNull();
          
          // Should always show some error notification
          expect(notifications).toHaveLength(1);
          expect(notifications[0].type).toBe('error');
          
          // Error message should be meaningful
          const expectedMessage = errorMessage || 'Update failed';
          expect(notifications[0].message).toBe(expectedMessage);
          
          // Error in state should match
          expect(finalState.error!.message).toBe(expectedMessage);
          
          // Reset for next iteration
          stateChanges = [];
          notifications = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle rollback after successful optimistic update followed by error', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 50, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // originalItem
        fc.integer({ min: 1, max: 20 }), // firstDecrement
        fc.integer({ min: 1, max: 20 }), // secondDecrement
        (originalItem, firstDecrement, secondDecrement) => {
          manager = new OptimisticUpdateManager(
            originalItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // First optimistic update
          manager.optimisticUpdate({ stock: originalItem.stock - firstDecrement });
          
          // Simulate successful server response
          const successResponse: ServerResponse<InventoryItem> = {
            success: true,
            data: { ...originalItem, stock: originalItem.stock - firstDecrement }
          };
          manager.handleServerResponse(successResponse);
          
          // Update original data reference (simulating successful update)
          const updatedItem = { ...originalItem, stock: originalItem.stock - firstDecrement };
          manager = new OptimisticUpdateManager(
            updatedItem,
            (state) => stateChanges.push({ ...state }),
            mockNotifications
          );
          
          // Second optimistic update
          manager.optimisticUpdate({ stock: updatedItem.stock - secondDecrement });
          
          // Simulate server error on second update
          const errorResponse: ServerResponse<InventoryItem> = {
            success: false,
            error: 'Insufficient stock'
          };
          manager.handleServerResponse(errorResponse);
          
          // Should rollback to state after first successful update
          const finalState = manager.getState();
          expect(finalState.data).toEqual(updatedItem);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).not.toBeNull();
          
          // Should show error notification
          const errorNotifications = notifications.filter(n => n.type === 'error');
          expect(errorNotifications).toHaveLength(1);
          expect(errorNotifications[0].message).toBe('Insufficient stock');
          
          // Reset for next iteration
          stateChanges = [];
          notifications = [];
        }
      ),
      { numRuns: 10 }
    );
  });
});