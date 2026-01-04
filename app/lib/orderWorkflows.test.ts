/**
 * Order Workflows Checkpoint Tests
 * Task 10: Verify order workflows work correctly
 * 
 * Tests:
 * - Takeout QR code flow (generate → encode → decode)
 * - Delivery address validation
 * - Order state transitions
 */

import { describe, it, expect } from 'vitest';
import {
  generateOrderId,
  generatePickupCode,
  formatPickupCode,
  createOrderQRData,
  parseOrderQRData,
  isOrderId,
  createTakeoutOrder,
  createDeliveryOrder,
  type ValidatedAddress,
} from './orderUtils';
import {
  transition,
  isValidTransition,
  getValidNextStatuses,
  getNextHappyPathStatus,
  isTerminalStatus,
  canCancel,
  canRefund,
  OrderStateMachine,
  type OrderStatus,
} from './orderStateMachine';
import { detectScanType } from './scanHandler';

describe('Takeout QR Code Flow', () => {
  describe('Order ID Generation', () => {
    it('generates valid UUID format order IDs', () => {
      const orderId = generateOrderId();
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(orderId).toMatch(uuidPattern);
    });

    it('generates unique order IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateOrderId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('Pickup Code Generation', () => {
    it('generates pickup codes of correct length', () => {
      const code = generatePickupCode(6);
      expect(code.length).toBe(6);
    });

    it('generates codes without ambiguous characters', () => {
      const ambiguousChars = /[0OIL1]/;
      for (let i = 0; i < 50; i++) {
        const code = generatePickupCode();
        expect(code).not.toMatch(ambiguousChars);
      }
    });

    it('formats pickup codes with dash', () => {
      expect(formatPickupCode('ABC123')).toBe('ABC-123');
      expect(formatPickupCode('ABCD')).toBe('AB-CD');
      expect(formatPickupCode('AB')).toBe('AB');
    });
  });

  describe('QR Code Round Trip', () => {
    it('encodes and decodes order ID correctly', () => {
      const orderId = generateOrderId();
      const qrData = createOrderQRData(orderId);
      const decoded = parseOrderQRData(qrData);
      expect(decoded).toBe(orderId);
    });

    it('detects order ID format in scanned codes', () => {
      const orderId = generateOrderId();
      expect(isOrderId(orderId)).toBe(true);
      expect(detectScanType(orderId)).toBe('order');
    });

    it('rejects non-UUID formats as order IDs', () => {
      expect(isOrderId('ABC123')).toBe(false);
      expect(isOrderId('123456789012')).toBe(false);
      expect(parseOrderQRData('not-a-uuid')).toBeNull();
    });
  });

  describe('Takeout Order Creation', () => {
    it('creates takeout order with pickup code', () => {
      const order = createTakeoutOrder(
        'tenant-123',
        [{ inventory_id: 'item-1', quantity: 2, unit_price: 10 }],
        '2024-01-15T12:00:00Z'
      );

      expect(order.type).toBe('takeout');
      expect(order.status).toBe('pending');
      expect(order.pickup_code).toBeTruthy();
      expect(order.pickup_code!.length).toBe(6);
      expect(order.total).toBe(20);
      expect(order.items.length).toBe(1);
    });
  });
});

describe('Delivery Address Validation', () => {
  describe('Delivery Order Creation', () => {
    it('creates delivery order with validated address', () => {
      const address: ValidatedAddress = {
        street: '123 Main St',
        city: 'New York',
        postal_code: '10001',
        country: 'USA',
        coordinates: { lat: 40.7128, lng: -74.006 },
      };

      const order = createDeliveryOrder(
        'tenant-123',
        [{ inventory_id: 'item-1', quantity: 1, unit_price: 25 }],
        address,
        'Leave at door'
      );

      expect(order.type).toBe('delivery');
      expect(order.status).toBe('pending');
      expect(order.pickup_code).toBeNull();
      expect(order.fulfillment_data).toEqual({
        address,
        delivery_notes: 'Leave at door',
      });
    });

    it('requires all address fields', () => {
      const address: ValidatedAddress = {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        postal_code: '90001',
        country: 'USA',
      };

      const order = createDeliveryOrder(
        'tenant-456',
        [{ inventory_id: 'item-2', quantity: 3, unit_price: 15 }],
        address
      );

      const fulfillment = order.fulfillment_data as { address: ValidatedAddress };
      expect(fulfillment.address.street).toBe('456 Oak Ave');
      expect(fulfillment.address.city).toBe('Los Angeles');
      expect(fulfillment.address.postal_code).toBe('90001');
      expect(fulfillment.address.country).toBe('USA');
    });
  });
});

describe('Order State Transitions', () => {
  describe('Valid Transitions', () => {
    it('allows pending → paid', () => {
      expect(isValidTransition('pending', 'paid')).toBe(true);
      const result = transition('pending', 'paid');
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('paid');
    });

    it('allows paid → processing', () => {
      expect(isValidTransition('paid', 'processing')).toBe(true);
    });

    it('allows processing → ready', () => {
      expect(isValidTransition('processing', 'ready')).toBe(true);
    });

    it('allows ready → completed', () => {
      expect(isValidTransition('ready', 'completed')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(isValidTransition('pending', 'cancelled')).toBe(true);
    });

    it('allows paid → cancelled (refund)', () => {
      expect(isValidTransition('paid', 'cancelled')).toBe(true);
    });
  });

  describe('Invalid Transitions', () => {
    it('rejects pending → processing (must pay first)', () => {
      expect(isValidTransition('pending', 'processing')).toBe(false);
      const result = transition('pending', 'processing');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('rejects completed → any (terminal state)', () => {
      expect(isValidTransition('completed', 'pending')).toBe(false);
      expect(isValidTransition('completed', 'ready')).toBe(false);
    });

    it('rejects cancelled → any (terminal state)', () => {
      expect(isValidTransition('cancelled', 'pending')).toBe(false);
      expect(isValidTransition('cancelled', 'paid')).toBe(false);
    });

    it('rejects processing → cancelled (too late)', () => {
      expect(isValidTransition('processing', 'cancelled')).toBe(false);
    });
  });

  describe('State Machine Helpers', () => {
    it('identifies terminal states', () => {
      expect(isTerminalStatus('completed')).toBe(true);
      expect(isTerminalStatus('cancelled')).toBe(true);
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('processing')).toBe(false);
    });

    it('returns valid next statuses', () => {
      expect(getValidNextStatuses('pending')).toEqual(['paid', 'cancelled']);
      expect(getValidNextStatuses('paid')).toEqual(['processing', 'cancelled']);
      expect(getValidNextStatuses('completed')).toEqual([]);
    });

    it('returns next happy path status', () => {
      expect(getNextHappyPathStatus('pending')).toBe('paid');
      expect(getNextHappyPathStatus('paid')).toBe('processing');
      expect(getNextHappyPathStatus('processing')).toBe('ready');
      expect(getNextHappyPathStatus('ready')).toBe('completed');
      expect(getNextHappyPathStatus('completed')).toBeNull();
    });

    it('checks cancel eligibility', () => {
      expect(canCancel('pending')).toBe(true);
      expect(canCancel('paid')).toBe(false);
      expect(canCancel('processing')).toBe(false);
    });

    it('checks refund eligibility', () => {
      expect(canRefund('paid')).toBe(true);
      expect(canRefund('pending')).toBe(false);
      expect(canRefund('processing')).toBe(false);
    });
  });

  describe('OrderStateMachine Class', () => {
    it('tracks state transitions', () => {
      const machine = new OrderStateMachine('pending');
      expect(machine.getStatus()).toBe('pending');

      machine.transitionTo('paid');
      expect(machine.getStatus()).toBe('paid');

      machine.transitionTo('processing');
      expect(machine.getStatus()).toBe('processing');

      const history = machine.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].from).toBe('pending');
      expect(history[0].to).toBe('paid');
    });

    it('advances through happy path', () => {
      const machine = new OrderStateMachine('pending');
      
      machine.advance();
      expect(machine.getStatus()).toBe('paid');
      
      machine.advance();
      expect(machine.getStatus()).toBe('processing');
      
      machine.advance();
      expect(machine.getStatus()).toBe('ready');
      
      machine.advance();
      expect(machine.getStatus()).toBe('completed');
      
      // Cannot advance from terminal state
      const result = machine.advance();
      expect(result.success).toBe(false);
    });

    it('handles cancellation', () => {
      const machine = new OrderStateMachine('pending');
      const result = machine.cancel();
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('cancelled');
      expect(machine.isTerminal()).toBe(true);
    });

    it('handles refund from paid status', () => {
      const machine = new OrderStateMachine('paid');
      const result = machine.refund();
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('cancelled');
    });
  });
});

describe('Scan Type Detection', () => {
  it('detects product barcodes', () => {
    expect(detectScanType('123456789012')).toBe('product');
    expect(detectScanType('ABC123')).toBe('product');
    expect(detectScanType('PROD-001')).toBe('product');
  });

  it('detects order IDs (UUIDs)', () => {
    expect(detectScanType('123e4567-e89b-12d3-a456-426614174000')).toBe('order');
    expect(detectScanType('550e8400-e29b-41d4-a716-446655440000')).toBe('order');
  });

  it('handles empty/invalid input', () => {
    expect(detectScanType('')).toBe('unknown');
    expect(detectScanType('   ')).toBe('unknown'); // whitespace-only is treated as unknown
  });
});
