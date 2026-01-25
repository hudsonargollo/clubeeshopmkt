/**
 * Property-Based Tests for QR Code Round Trip
 * 
 * Feature: retail-inventory-platform, Property 13: QR Code Round Trip
 * Validates: Requirements 8.2, 8.3
 * 
 * Property 13: QR Code Round Trip
 * *For any* generated pickup QR code containing an order_id, scanning that QR code 
 * SHALL resolve to the same order_id.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateOrderId,
  createOrderQRData,
  parseOrderQRData,
  isOrderId,
} from './orderUtils';

/**
 * Generates a valid UUID v4 format string
 */
const uuidArb = fc.uuid();

/**
 * Generates invalid UUID-like strings
 */
const invalidUuidArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 35 }).filter(s => !isValidUuid(s)),
  fc.string({ minLength: 37, maxLength: 50 }).filter(s => !isValidUuid(s)),
  fc.constantFrom(
    'not-a-uuid',
    '123456789012',
    'ORDER:123e4567-e89b-12d3-a456-426614174000', // Wrong format
    '123e4567-e89b-12d3-a456-42661417400', // Too short
    '123e4567-e89b-12d3-a456-426614174000x', // Too long
    '123g4567-e89b-12d3-a456-426614174000', // Invalid character
  )
);

/**
 * Check if a string is a valid UUID v4 format
 */
function isValidUuid(str: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}

describe('QR Code Round Trip - Property Tests', () => {
  /**
   * Feature: retail-inventory-platform, Property 13: QR Code Round Trip
   * Validates: Requirements 8.2, 8.3
   * 
   * Property: For any generated pickup QR code containing an order_id, 
   * scanning that QR code SHALL resolve to the same order_id.
   */
  describe('Property 13: QR Code Round Trip', () => {
    it('generated order IDs can be encoded and decoded correctly', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // We'll generate the order ID inside the test
          () => {
            // Generate a fresh order ID
            const originalOrderId = generateOrderId();
            
            // Encode to QR data
            const qrData = createOrderQRData(originalOrderId);
            
            // Decode from QR data
            const decodedOrderId = parseOrderQRData(qrData);
            
            // Should round-trip perfectly
            expect(decodedOrderId).toBe(originalOrderId);
            expect(isOrderId(qrData)).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('valid UUIDs can be round-tripped through QR encoding', () => {
      fc.assert(
        fc.property(
          uuidArb,
          (orderId) => {
            // Encode to QR data
            const qrData = createOrderQRData(orderId);
            
            // Decode from QR data
            const decodedOrderId = parseOrderQRData(qrData);
            
            // Should round-trip perfectly
            expect(decodedOrderId).toBe(orderId);
            expect(isOrderId(qrData)).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('invalid order ID formats are rejected', () => {
      fc.assert(
        fc.property(
          invalidUuidArb,
          (invalidData) => {
            // Should not be recognized as order ID
            expect(isOrderId(invalidData)).toBe(false);
            
            // Should return null when parsing
            expect(parseOrderQRData(invalidData)).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('QR data encoding is identity function for order IDs', () => {
      fc.assert(
        fc.property(
          uuidArb,
          (orderId) => {
            const qrData = createOrderQRData(orderId);
            
            // QR data should be identical to the order ID
            expect(qrData).toBe(orderId);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('order ID validation is consistent with parsing', () => {
      fc.assert(
        fc.property(
          fc.oneof(uuidArb, invalidUuidArb),
          (testData) => {
            const isValid = isOrderId(testData);
            const parsed = parseOrderQRData(testData);
            
            // Validation and parsing should be consistent
            if (isValid) {
              expect(parsed).toBe(testData);
            } else {
              expect(parsed).toBeNull();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('case insensitive UUID parsing works correctly', () => {
      fc.assert(
        fc.property(
          uuidArb,
          (orderId) => {
            const upperCaseId = orderId.toUpperCase();
            const lowerCaseId = orderId.toLowerCase();
            
            // Both cases should be valid
            expect(isOrderId(upperCaseId)).toBe(true);
            expect(isOrderId(lowerCaseId)).toBe(true);
            
            // Both should parse to the original format
            expect(parseOrderQRData(upperCaseId)).toBe(upperCaseId);
            expect(parseOrderQRData(lowerCaseId)).toBe(lowerCaseId);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('generated order IDs are always valid UUIDs', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // Generate fresh IDs each time
          () => {
            const orderId = generateOrderId();
            
            // Generated ID should be valid UUID format
            expect(isValidUuid(orderId)).toBe(true);
            expect(isOrderId(orderId)).toBe(true);
            
            // Should round-trip correctly
            const qrData = createOrderQRData(orderId);
            const parsed = parseOrderQRData(qrData);
            expect(parsed).toBe(orderId);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('multiple generated order IDs are unique', () => {
      const generatedIds = new Set<string>();
      
      // Generate multiple IDs
      for (let i = 0; i < 100; i++) {
        const orderId = generateOrderId();
        
        // Should be valid
        expect(isOrderId(orderId)).toBe(true);
        
        // Should be unique
        expect(generatedIds.has(orderId)).toBe(false);
        generatedIds.add(orderId);
      }
      
      // All IDs should be unique
      expect(generatedIds.size).toBe(100);
    });
  });
});