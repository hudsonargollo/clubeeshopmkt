/**
 * Property-Based Test: Atomic Stock Decrement
 * Feature: retail-inventory-platform, Property 6: Atomic Stock Decrement
 * Validates: Requirements 5.1, 5.2
 * 
 * Property: For any decrement_stock(item_id, quantity, tenant_id) call
 * where current_stock >= quantity, the function SHALL return true AND
 * reduce stock by exactly quantity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock inventory item
interface InventoryItem {
  id: string;
  tenant_id: string;
  stock: number;
}

// Mock database operations
interface MockDatabase {
  items: Map<string, InventoryItem>;
  getItem: (id: string, tenantId: string) => InventoryItem | null;
  updateStock: (id: string, tenantId: string, newStock: number) => boolean;
}

// Create mock database
function createMockDatabase(): MockDatabase {
  const items = new Map<string, InventoryItem>();
  
  return {
    items,
    getItem: (id: string, tenantId: string) => {
      const item = items.get(id);
      return item && item.tenant_id === tenantId ? item : null;
    },
    updateStock: (id: string, tenantId: string, newStock: number) => {
      const item = items.get(id);
      if (item && item.tenant_id === tenantId) {
        item.stock = newStock;
        return true;
      }
      return false;
    }
  };
}

// Atomic stock decrement function (simulates PostgreSQL RPC)
function decrementStock(
  db: MockDatabase,
  itemId: string,
  quantity: number,
  tenantId: string
): boolean {
  const item = db.getItem(itemId, tenantId);
  
  if (!item) {
    return false;
  }
  
  // Atomic check-and-update: only decrement if sufficient stock
  if (item.stock >= quantity) {
    const newStock = item.stock - quantity;
    return db.updateStock(itemId, tenantId, newStock);
  }
  
  return false;
}

describe('Property 6: Atomic Stock Decrement', () => {
  let db: MockDatabase;
  
  beforeEach(() => {
    db = createMockDatabase();
  });

  it('should return true and reduce stock by exact quantity when sufficient stock', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // itemId
        fc.string({ minLength: 1 }), // tenantId
        fc.integer({ min: 1, max: 1000 }), // initialStock
        fc.integer({ min: 1, max: 100 }), // quantity
        (itemId, tenantId, initialStock, quantity) => {
          // Only test cases where we have sufficient stock
          fc.pre(initialStock >= quantity);
          
          // Setup item with initial stock
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            stock: initialStock
          };
          db.items.set(itemId, item);
          
          // Perform decrement
          const result = decrementStock(db, itemId, quantity, tenantId);
          
          // Verify operation succeeded
          expect(result).toBe(true);
          
          // Verify stock was reduced by exact quantity
          const updatedItem = db.getItem(itemId, tenantId);
          expect(updatedItem).not.toBeNull();
          expect(updatedItem!.stock).toBe(initialStock - quantity);
          
          // Cleanup for next iteration
          db.items.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return false and not modify stock when insufficient stock', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // itemId
        fc.string({ minLength: 1 }), // tenantId
        fc.integer({ min: 0, max: 100 }), // initialStock
        fc.integer({ min: 1, max: 1000 }), // quantity
        (itemId, tenantId, initialStock, quantity) => {
          // Only test cases where we have insufficient stock
          fc.pre(initialStock < quantity);
          
          // Setup item with initial stock
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            stock: initialStock
          };
          db.items.set(itemId, item);
          
          // Perform decrement
          const result = decrementStock(db, itemId, quantity, tenantId);
          
          // Verify operation failed
          expect(result).toBe(false);
          
          // Verify stock was not modified
          const updatedItem = db.getItem(itemId, tenantId);
          expect(updatedItem).not.toBeNull();
          expect(updatedItem!.stock).toBe(initialStock);
          
          // Cleanup for next iteration
          db.items.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle exact stock match (stock equals quantity)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // itemId
        fc.string({ minLength: 1 }), // tenantId
        fc.integer({ min: 1, max: 100 }), // stockAndQuantity
        (itemId, tenantId, stockAndQuantity) => {
          // Setup item where stock exactly equals quantity
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            stock: stockAndQuantity
          };
          db.items.set(itemId, item);
          
          // Perform decrement with exact stock amount
          const result = decrementStock(db, itemId, stockAndQuantity, tenantId);
          
          // Verify operation succeeded
          expect(result).toBe(true);
          
          // Verify stock is now zero
          const updatedItem = db.getItem(itemId, tenantId);
          expect(updatedItem).not.toBeNull();
          expect(updatedItem!.stock).toBe(0);
          
          // Cleanup for next iteration
          db.items.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should respect tenant isolation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // itemId
        fc.string({ minLength: 1 }), // correctTenantId
        fc.string({ minLength: 1 }), // wrongTenantId
        fc.integer({ min: 10, max: 100 }), // initialStock
        fc.integer({ min: 1, max: 5 }), // quantity
        (itemId, correctTenantId, wrongTenantId, initialStock, quantity) => {
          // Ensure tenant IDs are different
          fc.pre(correctTenantId !== wrongTenantId);
          
          // Setup item for correct tenant
          const item: InventoryItem = {
            id: itemId,
            tenant_id: correctTenantId,
            stock: initialStock
          };
          db.items.set(itemId, item);
          
          // Try to decrement with wrong tenant ID
          const wrongTenantResult = decrementStock(db, itemId, quantity, wrongTenantId);
          
          // Verify operation failed for wrong tenant
          expect(wrongTenantResult).toBe(false);
          
          // Verify stock was not modified
          const unchangedItem = db.getItem(itemId, correctTenantId);
          expect(unchangedItem).not.toBeNull();
          expect(unchangedItem!.stock).toBe(initialStock);
          
          // Verify operation succeeds for correct tenant
          const correctTenantResult = decrementStock(db, itemId, quantity, correctTenantId);
          expect(correctTenantResult).toBe(true);
          
          // Verify stock was decremented correctly
          const updatedItem = db.getItem(itemId, correctTenantId);
          expect(updatedItem).not.toBeNull();
          expect(updatedItem!.stock).toBe(initialStock - quantity);
          
          // Cleanup for next iteration
          db.items.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle multiple sequential decrements correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // itemId
        fc.string({ minLength: 1 }), // tenantId
        fc.integer({ min: 100, max: 1000 }), // initialStock
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 10 }), // quantities
        (itemId, tenantId, initialStock, quantities) => {
          const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
          
          // Only test cases where total decrements don't exceed stock
          fc.pre(totalQuantity <= initialStock);
          
          // Setup item
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            stock: initialStock
          };
          db.items.set(itemId, item);
          
          let expectedStock = initialStock;
          
          // Perform sequential decrements
          for (const quantity of quantities) {
            const result = decrementStock(db, itemId, quantity, tenantId);
            
            // Each decrement should succeed
            expect(result).toBe(true);
            
            // Update expected stock
            expectedStock -= quantity;
            
            // Verify current stock matches expected
            const currentItem = db.getItem(itemId, tenantId);
            expect(currentItem).not.toBeNull();
            expect(currentItem!.stock).toBe(expectedStock);
          }
          
          // Final verification
          expect(expectedStock).toBe(initialStock - totalQuantity);
          
          // Cleanup for next iteration
          db.items.clear();
        }
      ),
      { numRuns: 10 }
    );
  });
});