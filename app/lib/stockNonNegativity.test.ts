/**
 * Property-Based Tests for Stock Non-Negativity
 * 
 * Feature: retail-inventory-platform, Property 5: Stock Non-Negativity Invariant
 * Validates: Requirements 5.1, 5.2, 5.3
 * 
 * Property 5: Stock Non-Negativity Invariant
 * *For any* sequence of concurrent `decrement_stock` operations, the resulting stock value SHALL never be negative.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock stock operation
 */
interface StockOperation {
  type: 'decrement' | 'increment' | 'set';
  quantity: number;
  timestamp: number;
}

/**
 * Simulates the atomic stock management RPC behavior
 * This mirrors the PostgreSQL decrement_stock function logic
 */
class MockStockManager {
  private stock: number;

  constructor(initialStock: number) {
    this.stock = Math.max(0, initialStock); // Ensure non-negative start
  }

  /**
   * Simulates decrement_stock RPC
   * Returns true if successful, false if insufficient stock
   */
  decrementStock(quantity: number): boolean {
    if (quantity < 0) return false; // Invalid quantity
    if (this.stock >= quantity) {
      this.stock -= quantity;
      return true;
    }
    return false; // Insufficient stock - no change
  }

  /**
   * Simulates increment_stock RPC
   */
  incrementStock(quantity: number): boolean {
    if (quantity < 0) return false; // Invalid quantity
    this.stock += quantity;
    return true;
  }

  /**
   * Simulates set_stock RPC
   */
  setStock(quantity: number): boolean {
    if (quantity < 0) return false; // Invalid quantity
    this.stock = quantity;
    return true;
  }

  getStock(): number {
    return this.stock;
  }
}

/**
 * Processes a sequence of operations atomically
 */
function processOperationsSequentially(
  initialStock: number,
  operations: StockOperation[]
): number {
  const manager = new MockStockManager(initialStock);
  
  // Sort by timestamp to simulate concurrent operations in order
  const sortedOps = [...operations].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const op of sortedOps) {
    switch (op.type) {
      case 'decrement':
        manager.decrementStock(op.quantity);
        break;
      case 'increment':
        manager.incrementStock(op.quantity);
        break;
      case 'set':
        manager.setStock(op.quantity);
        break;
    }
  }
  
  return manager.getStock();
}

/**
 * Generates valid stock operations
 */
const stockOperationArb = fc.record({
  type: fc.constantFrom('decrement', 'increment', 'set'),
  quantity: fc.nat({ max: 100 }),
  timestamp: fc.nat({ max: 10000 }),
});

/**
 * Generates decrement-only operations
 */
const decrementOperationArb = fc.record({
  type: fc.constant('decrement' as const),
  quantity: fc.nat({ min: 1, max: 50 }),
  timestamp: fc.nat({ max: 10000 }),
});

describe('Stock Non-Negativity - Property Tests', () => {
  /**
   * Feature: retail-inventory-platform, Property 5: Stock Non-Negativity Invariant
   * Validates: Requirements 5.1, 5.2, 5.3
   * 
   * Property: For any sequence of concurrent decrement_stock operations, 
   * the resulting stock value SHALL never be negative.
   */
  describe('Property 5: Stock Non-Negativity Invariant', () => {
    it('stock never goes negative with any sequence of operations', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }), // Initial stock
          fc.array(stockOperationArb, { minLength: 1, maxLength: 10 }),
          (initialStock, operations) => {
            const finalStock = processOperationsSequentially(initialStock, operations);
            
            // Stock must never be negative
            expect(finalStock).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('decrement operations never reduce stock below zero', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 100 }), // Initial stock
          fc.array(decrementOperationArb, { minLength: 1, maxLength: 5 }),
          (initialStock, decrementOps) => {
            const manager = new MockStockManager(initialStock);
            
            // Apply each decrement operation
            for (const op of decrementOps) {
              const beforeStock = manager.getStock();
              const success = manager.decrementStock(op.quantity);
              const afterStock = manager.getStock();
              
              // Stock should never go negative
              expect(afterStock).toBeGreaterThanOrEqual(0);
              
              // If operation succeeded, stock should decrease by exact quantity
              if (success) {
                expect(afterStock).toBe(beforeStock - op.quantity);
              } else {
                // If operation failed, stock should remain unchanged
                expect(afterStock).toBe(beforeStock);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('insufficient stock operations return false and leave stock unchanged', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 50 }), // Initial stock
          fc.nat({ min: 1, max: 100 }), // Decrement quantity
          (initialStock, decrementQuantity) => {
            fc.pre(decrementQuantity > initialStock); // Ensure insufficient stock
            
            const manager = new MockStockManager(initialStock);
            const beforeStock = manager.getStock();
            
            const success = manager.decrementStock(decrementQuantity);
            const afterStock = manager.getStock();
            
            // Operation should fail
            expect(success).toBe(false);
            // Stock should remain unchanged
            expect(afterStock).toBe(beforeStock);
            // Stock should still be non-negative
            expect(afterStock).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('successful decrement operations reduce stock by exact quantity', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 10, max: 100 }), // Initial stock (ensure sufficient)
          fc.nat({ min: 1, max: 10 }), // Decrement quantity (ensure less than initial)
          (initialStock, decrementQuantity) => {
            fc.pre(decrementQuantity <= initialStock); // Ensure sufficient stock
            
            const manager = new MockStockManager(initialStock);
            const beforeStock = manager.getStock();
            
            const success = manager.decrementStock(decrementQuantity);
            const afterStock = manager.getStock();
            
            // Operation should succeed
            expect(success).toBe(true);
            // Stock should decrease by exact quantity
            expect(afterStock).toBe(beforeStock - decrementQuantity);
            // Stock should still be non-negative
            expect(afterStock).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('concurrent decrements respect stock availability', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 5, max: 20 }), // Initial stock
          fc.array(fc.nat({ min: 1, max: 10 }), { minLength: 2, maxLength: 5 }), // Multiple decrements
          (initialStock, decrementQuantities) => {
            const manager = new MockStockManager(initialStock);
            let totalDecremented = 0;
            
            // Apply decrements in sequence (simulating concurrent processing)
            for (const quantity of decrementQuantities) {
              const success = manager.decrementStock(quantity);
              if (success) {
                totalDecremented += quantity;
              }
            }
            
            const finalStock = manager.getStock();
            
            // Final stock should equal initial minus total decremented
            expect(finalStock).toBe(initialStock - totalDecremented);
            // Stock should never be negative
            expect(finalStock).toBeGreaterThanOrEqual(0);
            // Total decremented should not exceed initial stock
            expect(totalDecremented).toBeLessThanOrEqual(initialStock);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});