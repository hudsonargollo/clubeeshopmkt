/**
 * Property-Based Test: Optimistic UI Consistency
 * Feature: retail-inventory-platform, Property 8: Optimistic UI Consistency
 * Validates: Requirements 12.1, 12.3
 * 
 * Property: For any optimistic update followed by server confirmation,
 * the final UI state SHALL match the server-confirmed state.
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

// Optimistic update manager
class OptimisticUpdateManager<T> {
  private state: OptimisticState<T>;
  private originalData: T;
  private onStateChange: (state: OptimisticState<T>) => void;
  
  constructor(initialData: T, onStateChange: (state: OptimisticState<T>) => void) {
    this.originalData = { ...initialData } as T;
    this.state = {
      data: { ...initialData } as T,
      pending: false,
      error: null
    };
    this.onStateChange = onStateChange;
  }
  
  getState(): OptimisticState<T> {
    return { ...this.state };
  }
  
  // Perform optimistic update
  optimisticUpdate(newData: Partial<T>): void {
    this.state = {
      data: { ...this.state.data, ...newData },
      pending: true,
      error: null
    };
    this.onStateChange(this.state);
  }
  
  // Handle server confirmation
  confirmUpdate(response: ServerResponse<T>): void {
    if (response.success && response.data) {
      // Server confirmed - use server data
      this.state = {
        data: { ...response.data },
        pending: false,
        error: null
      };
    } else {
      // Server rejected - revert to original
      this.state = {
        data: { ...this.originalData },
        pending: false,
        error: response.error ? new Error(response.error) : null
      };
    }
    this.onStateChange(this.state);
  }
  
  // Reset to original state
  reset(): void {
    this.state = {
      data: { ...this.originalData },
      pending: false,
      error: null
    };
    this.onStateChange(this.state);
  }
}

// Mock inventory item for testing
interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  price: number;
}

describe('Property 8: Optimistic UI Consistency', () => {
  let stateChanges: OptimisticState<InventoryItem>[];
  let manager: OptimisticUpdateManager<InventoryItem>;
  
  beforeEach(() => {
    stateChanges = [];
  });

  it('should match server state after successful confirmation', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // initialItem
        fc.record({
          name: fc.option(fc.string({ minLength: 1 })),
          stock: fc.option(fc.integer({ min: 0, max: 1000 })),
          price: fc.option(fc.float({ min: 0.01, max: 999.99, noNaN: true }))
        }), // optimisticUpdate
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // serverConfirmedData
        (initialItem, optimisticUpdate, serverConfirmedData) => {
          // Ensure server data has same ID
          serverConfirmedData.id = initialItem.id;
          
          // Filter out null values from optimistic update
          const cleanOptimisticUpdate = Object.fromEntries(
            Object.entries(optimisticUpdate).filter(([_, value]) => value !== null)
          ) as Partial<InventoryItem>;
          
          manager = new OptimisticUpdateManager(
            initialItem,
            (state) => stateChanges.push({ ...state })
          );
          
          // Perform optimistic update
          manager.optimisticUpdate(cleanOptimisticUpdate);
          
          // Confirm with server data
          const serverResponse: ServerResponse<InventoryItem> = {
            success: true,
            data: serverConfirmedData
          };
          manager.confirmUpdate(serverResponse);
          
          // Final state should match server data exactly
          const finalState = manager.getState();
          expect(finalState.data).toEqual(serverConfirmedData);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).toBeNull();
          
          // Verify state progression
          expect(stateChanges).toHaveLength(2);
          
          // First change: optimistic update (pending = true)
          expect(stateChanges[0].pending).toBe(true);
          expect(stateChanges[0].error).toBeNull();
          
          // Second change: server confirmation (pending = false, data = server data)
          expect(stateChanges[1].pending).toBe(false);
          expect(stateChanges[1].error).toBeNull();
          expect(stateChanges[1].data).toEqual(serverConfirmedData);
          
          // Reset for next iteration
          stateChanges = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should maintain consistency across multiple optimistic updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // initialItem
        fc.array(
          fc.record({
            name: fc.option(fc.string({ minLength: 1 })),
            stock: fc.option(fc.integer({ min: 0, max: 1000 })),
            price: fc.option(fc.float({ min: 0.01, max: 999.99, noNaN: true }))
          }),
          { minLength: 1, maxLength: 5 }
        ), // optimisticUpdates
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // finalServerData
        (initialItem, optimisticUpdates, finalServerData) => {
          // Ensure server data has same ID
          finalServerData.id = initialItem.id;
          
          manager = new OptimisticUpdateManager(
            initialItem,
            (state) => stateChanges.push({ ...state })
          );
          
          // Perform multiple optimistic updates
          for (const update of optimisticUpdates) {
            const cleanUpdate = Object.fromEntries(
              Object.entries(update).filter(([_, value]) => value !== null)
            ) as Partial<InventoryItem>;
            
            manager.optimisticUpdate(cleanUpdate);
          }
          
          // Confirm with final server data
          const serverResponse: ServerResponse<InventoryItem> = {
            success: true,
            data: finalServerData
          };
          manager.confirmUpdate(serverResponse);
          
          // Final state should match server data exactly
          const finalState = manager.getState();
          expect(finalState.data).toEqual(finalServerData);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).toBeNull();
          
          // Should have one state change per optimistic update + one for confirmation
          expect(stateChanges).toHaveLength(optimisticUpdates.length + 1);
          
          // All optimistic updates should have pending = true
          for (let i = 0; i < optimisticUpdates.length; i++) {
            expect(stateChanges[i].pending).toBe(true);
            expect(stateChanges[i].error).toBeNull();
          }
          
          // Final confirmation should have pending = false and server data
          const lastChange = stateChanges[stateChanges.length - 1];
          expect(lastChange.pending).toBe(false);
          expect(lastChange.error).toBeNull();
          expect(lastChange.data).toEqual(finalServerData);
          
          // Reset for next iteration
          stateChanges = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle server data that differs from optimistic update', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 0, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // initialItem
        fc.record({
          stock: fc.integer({ min: 0, max: 1000 })
        }), // optimisticUpdate
        fc.integer({ min: 0, max: 1000 }), // differentServerStock
        (initialItem, optimisticUpdate, differentServerStock) => {
          // Ensure server stock is different from optimistic update
          fc.pre(differentServerStock !== optimisticUpdate.stock);
          
          const serverConfirmedData = {
            ...initialItem,
            stock: differentServerStock
          };
          
          manager = new OptimisticUpdateManager(
            initialItem,
            (state) => stateChanges.push({ ...state })
          );
          
          // Perform optimistic update
          manager.optimisticUpdate(optimisticUpdate);
          
          // Verify optimistic state
          const optimisticState = manager.getState();
          expect(optimisticState.data.stock).toBe(optimisticUpdate.stock);
          expect(optimisticState.pending).toBe(true);
          
          // Confirm with different server data
          const serverResponse: ServerResponse<InventoryItem> = {
            success: true,
            data: serverConfirmedData
          };
          manager.confirmUpdate(serverResponse);
          
          // Final state should match server data (not optimistic data)
          const finalState = manager.getState();
          expect(finalState.data.stock).toBe(differentServerStock);
          expect(finalState.data).toEqual(serverConfirmedData);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).toBeNull();
          
          // Reset for next iteration
          stateChanges = [];
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle concurrent optimistic updates correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stock: fc.integer({ min: 100, max: 1000 }),
          price: fc.float({ min: 0.01, max: 999.99, noNaN: true })
        }), // initialItem
        fc.integer({ min: 1, max: 50 }), // stockDecrement1
        fc.integer({ min: 1, max: 50 }), // stockDecrement2
        fc.integer({ min: 0, max: 1000 }), // finalServerStock
        (initialItem, stockDecrement1, stockDecrement2, finalServerStock) => {
          manager = new OptimisticUpdateManager(
            initialItem,
            (state) => stateChanges.push({ ...state })
          );
          
          // Simulate concurrent stock decrements
          manager.optimisticUpdate({ stock: initialItem.stock - stockDecrement1 });
          manager.optimisticUpdate({ stock: initialItem.stock - stockDecrement1 - stockDecrement2 });
          
          const serverConfirmedData = {
            ...initialItem,
            stock: finalServerStock
          };
          
          // Confirm with server data
          const serverResponse: ServerResponse<InventoryItem> = {
            success: true,
            data: serverConfirmedData
          };
          manager.confirmUpdate(serverResponse);
          
          // Final state should match server data exactly
          const finalState = manager.getState();
          expect(finalState.data).toEqual(serverConfirmedData);
          expect(finalState.pending).toBe(false);
          expect(finalState.error).toBeNull();
          
          // Should have 3 state changes: 2 optimistic + 1 confirmation
          expect(stateChanges).toHaveLength(3);
          
          // Final state should be server-authoritative
          expect(stateChanges[2].data.stock).toBe(finalServerStock);
          
          // Reset for next iteration
          stateChanges = [];
        }
      ),
      { numRuns: 10 }
    );
  });
});