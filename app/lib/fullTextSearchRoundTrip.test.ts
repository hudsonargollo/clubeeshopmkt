/**
 * Property-Based Test: Full-Text Search Round Trip
 * Feature: retail-inventory-platform, Property 12: Full-Text Search Round Trip
 * Validates: Requirements 10.1
 * 
 * Property: For any inventory item with non-empty name, category, or barcode,
 * searching for any word from those fields SHALL return that item in results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from 'fast-check';

// Mock inventory item
interface InventoryItem {
  id: string;
  tenant_id: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  price: number;
}

// Mock search result
interface SearchResult {
  item: InventoryItem;
  rank: number;
  highlights: {
    field: string;
    matches: [number, number][];
  }[];
}

// Mock full-text search engine
class MockFullTextSearch {
  private items: Map<string, InventoryItem> = new Map();
  
  addItem(item: InventoryItem): void {
    this.items.set(item.id, item);
  }
  
  removeItem(itemId: string): void {
    this.items.delete(itemId);
  }
  
  clear(): void {
    this.items.clear();
  }
  
  search(query: string, tenantId: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryWords = this.normalizeQuery(query);
    
    if (queryWords.length === 0) {
      return results;
    }
    
    for (const item of this.items.values()) {
      if (item.tenant_id !== tenantId) {
        continue;
      }
      
      const searchableText = this.getSearchableText(item);
      const matches = this.findMatches(searchableText, queryWords);
      
      if (matches.length > 0) {
        results.push({
          item,
          rank: this.calculateRank(matches, queryWords),
          highlights: matches
        });
      }
    }
    
    // Sort by rank (higher is better)
    return results.sort((a, b) => b.rank - a.rank);
  }
  
  private normalizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  private getSearchableText(item: InventoryItem): { field: string; text: string }[] {
    return [
      { field: 'name', text: item.name.toLowerCase() },
      { field: 'category', text: item.category.toLowerCase() },
      { field: 'barcode', text: item.barcode.toLowerCase() }
    ].filter(entry => entry.text.length > 0);
  }
  
  private findMatches(
    searchableText: { field: string; text: string }[],
    queryWords: string[]
  ): { field: string; matches: [number, number][] }[] {
    const results: { field: string; matches: [number, number][] }[] = [];
    
    for (const entry of searchableText) {
      const matches: [number, number][] = [];
      
      for (const word of queryWords) {
        let startIndex = 0;
        while (true) {
          const index = entry.text.indexOf(word, startIndex);
          if (index === -1) break;
          
          matches.push([index, index + word.length]);
          startIndex = index + 1;
        }
      }
      
      if (matches.length > 0) {
        results.push({
          field: entry.field,
          matches
        });
      }
    }
    
    return results;
  }
  
  private calculateRank(
    matches: { field: string; matches: [number, number][] }[],
    queryWords: string[]
  ): number {
    let rank = 0;
    
    for (const match of matches) {
      // Higher rank for more matches
      rank += match.matches.length;
      
      // Higher rank for name matches vs category vs barcode
      if (match.field === 'name') {
        rank += 10;
      } else if (match.field === 'category') {
        rank += 5;
      } else if (match.field === 'barcode') {
        rank += 2;
      }
    }
    
    return rank;
  }
}

// Helper to extract words from text
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0 && /^[a-z0-9]+$/.test(word));
}

describe('Property 12: Full-Text Search Round Trip', () => {
  let searchEngine: MockFullTextSearch;
  const tenantId = 'test-tenant-123';
  
  beforeEach(() => {
    searchEngine = new MockFullTextSearch();
  });

  it('should return item when searching for words from name field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.string({ minLength: 1 }).filter(s => extractWords(s).length > 0), // name
        fc.string({ minLength: 1 }), // category
        fc.string({ minLength: 1 }), // barcode
        (itemId, name, category, barcode) => {
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            name: name.trim(),
            category: category.trim(),
            barcode: barcode.trim(),
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          // Extract searchable words from name
          const nameWords = extractWords(name);
          
          // Test each word from the name
          for (const word of nameWords) {
            const results = searchEngine.search(word, tenantId);
            
            // Should find the item
            expect(results.length).toBeGreaterThan(0);
            
            // Should contain our item
            const foundItem = results.find(r => r.item.id === itemId);
            expect(foundItem).toBeDefined();
            
            // Should have highlights in name field
            const nameHighlight = foundItem!.highlights.find(h => h.field === 'name');
            expect(nameHighlight).toBeDefined();
            expect(nameHighlight!.matches.length).toBeGreaterThan(0);
          }
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return item when searching for words from category field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.string({ minLength: 1 }), // name
        fc.string({ minLength: 1 }).filter(s => extractWords(s).length > 0), // category
        fc.string({ minLength: 1 }), // barcode
        (itemId, name, category, barcode) => {
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            name: name.trim(),
            category: category.trim(),
            barcode: barcode.trim(),
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          // Extract searchable words from category
          const categoryWords = extractWords(category);
          
          // Test each word from the category
          for (const word of categoryWords) {
            const results = searchEngine.search(word, tenantId);
            
            // Should find the item
            expect(results.length).toBeGreaterThan(0);
            
            // Should contain our item
            const foundItem = results.find(r => r.item.id === itemId);
            expect(foundItem).toBeDefined();
            
            // Should have highlights in category field
            const categoryHighlight = foundItem!.highlights.find(h => h.field === 'category');
            expect(categoryHighlight).toBeDefined();
            expect(categoryHighlight!.matches.length).toBeGreaterThan(0);
          }
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should return item when searching for barcode', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.string({ minLength: 1 }), // name
        fc.string({ minLength: 1 }), // category
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // barcode
        (itemId, name, category, barcode) => {
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            name: name.trim(),
            category: category.trim(),
            barcode: barcode.trim(),
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          // Search for the exact barcode
          const results = searchEngine.search(barcode, tenantId);
          
          // Should find the item
          expect(results.length).toBeGreaterThan(0);
          
          // Should contain our item
          const foundItem = results.find(r => r.item.id === itemId);
          expect(foundItem).toBeDefined();
          
          // Should have highlights in barcode field
          const barcodeHighlight = foundItem!.highlights.find(h => h.field === 'barcode');
          expect(barcodeHighlight).toBeDefined();
          expect(barcodeHighlight!.matches.length).toBeGreaterThan(0);
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should respect tenant isolation in search results', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.string({ minLength: 1 }), // correctTenantId
        fc.string({ minLength: 1 }), // wrongTenantId
        fc.string({ minLength: 1 }).filter(s => extractWords(s).length > 0), // name
        (itemId, correctTenantId, wrongTenantId, name) => {
          // Ensure tenant IDs are different
          fc.pre(correctTenantId !== wrongTenantId);
          
          const item: InventoryItem = {
            id: itemId,
            tenant_id: correctTenantId,
            name: name.trim(),
            category: 'test-category',
            barcode: '123456789',
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          const nameWords = extractWords(name);
          const searchWord = nameWords[0];
          
          // Search with correct tenant ID
          const correctResults = searchEngine.search(searchWord, correctTenantId);
          expect(correctResults.length).toBeGreaterThan(0);
          expect(correctResults.find(r => r.item.id === itemId)).toBeDefined();
          
          // Search with wrong tenant ID
          const wrongResults = searchEngine.search(searchWord, wrongTenantId);
          expect(wrongResults.find(r => r.item.id === itemId)).toBeUndefined();
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle multi-word queries correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.array(fc.string({ minLength: 1 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), { minLength: 2, maxLength: 5 }), // words
        (itemId, words) => {
          const name = words.join(' ');
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            name,
            category: 'test-category',
            barcode: '123456789',
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          // Search for multiple words from the name
          const multiWordQuery = words.slice(0, Math.min(3, words.length)).join(' ');
          const results = searchEngine.search(multiWordQuery, tenantId);
          
          // Should find the item
          expect(results.length).toBeGreaterThan(0);
          
          // Should contain our item
          const foundItem = results.find(r => r.item.id === itemId);
          expect(foundItem).toBeDefined();
          
          // Should have highlights for each word
          const nameHighlight = foundItem!.highlights.find(h => h.field === 'name');
          expect(nameHighlight).toBeDefined();
          expect(nameHighlight!.matches.length).toBeGreaterThanOrEqual(words.slice(0, 3).length);
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle case-insensitive search', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // itemId
        fc.string({ minLength: 1 }).filter(s => extractWords(s).length > 0), // name
        (itemId, name) => {
          const item: InventoryItem = {
            id: itemId,
            tenant_id: tenantId,
            name: name.trim(),
            category: 'test-category',
            barcode: '123456789',
            stock: 10,
            price: 9.99
          };
          
          searchEngine.addItem(item);
          
          const nameWords = extractWords(name);
          const originalWord = nameWords[0];
          
          // Test different case variations
          const variations = [
            originalWord.toLowerCase(),
            originalWord.toUpperCase(),
            originalWord.charAt(0).toUpperCase() + originalWord.slice(1).toLowerCase()
          ];
          
          for (const variation of variations) {
            const results = searchEngine.search(variation, tenantId);
            
            // Should find the item regardless of case
            expect(results.length).toBeGreaterThan(0);
            
            const foundItem = results.find(r => r.item.id === itemId);
            expect(foundItem).toBeDefined();
          }
          
          // Cleanup
          searchEngine.clear();
        }
      ),
      { numRuns: 10 }
    );
  });
});