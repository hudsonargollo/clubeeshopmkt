/**
 * Order Utilities
 * Requirements: 8.1, 8.2 - Generate unique order_id and pickup_code
 * 
 * Utilities for order creation and management
 */

import type { OrderStatus, OrderType } from './orderStateMachine';

/**
 * Order data structure
 */
export interface Order {
  id: string;
  tenant_id: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  fulfillment_data: TakeoutData | DeliveryData;
  pickup_code: string | null;
  total: number;
  created_at: string;
  updated_at: string;
}

/**
 * Order item in an order
 */
export interface OrderItem {
  id: string;
  order_id: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  name?: string;
}

/**
 * Takeout fulfillment data
 */
export interface TakeoutData {
  pickup_time?: string;
}

/**
 * Delivery fulfillment data
 */
export interface DeliveryData {
  address: ValidatedAddress;
  delivery_notes?: string;
}

/**
 * Validated address structure
 */
export interface ValidatedAddress {
  street: string;
  city: string;
  postal_code: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Generate a unique order ID (UUID v4)
 */
export function generateOrderId(): string {
  // Use crypto.randomUUID if available (modern browsers and Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short, human-readable pickup code
 * Format: 4-6 alphanumeric characters (uppercase)
 * Avoids ambiguous characters: 0, O, I, L, 1
 * 
 * @param length - Length of the pickup code (default: 6)
 */
export function generatePickupCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Format pickup code for display (add dash in middle for readability)
 * e.g., "ABC123" -> "ABC-123"
 */
export function formatPickupCode(code: string): string {
  if (code.length <= 3) return code;
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}

/**
 * Create QR code data for an order
 * The QR code contains the order ID which can be scanned to look up the order
 */
export function createOrderQRData(orderId: string): string {
  return orderId;
}

/**
 * Parse QR code data to extract order ID
 * Returns null if the data is not a valid order ID format
 */
export function parseOrderQRData(data: string): string | null {
  // Order IDs are UUIDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidPattern.test(data)) {
    return data;
  }
  
  return null;
}

/**
 * Check if a scanned code is an order ID
 */
export function isOrderId(code: string): boolean {
  return parseOrderQRData(code) !== null;
}

/**
 * Create a new takeout order object
 */
export function createTakeoutOrder(
  tenantId: string,
  items: Omit<OrderItem, 'id' | 'order_id'>[],
  pickupTime?: string
): Omit<Order, 'created_at' | 'updated_at'> {
  const orderId = generateOrderId();
  const pickupCode = generatePickupCode();
  
  const orderItems: OrderItem[] = items.map((item, index) => ({
    ...item,
    id: `${orderId}-item-${index}`,
    order_id: orderId,
  }));
  
  const total = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  
  return {
    id: orderId,
    tenant_id: tenantId,
    type: 'takeout',
    status: 'pending',
    items: orderItems,
    fulfillment_data: {
      pickup_time: pickupTime,
    } as TakeoutData,
    pickup_code: pickupCode,
    total,
  };
}

/**
 * Create a new delivery order object
 */
export function createDeliveryOrder(
  tenantId: string,
  items: Omit<OrderItem, 'id' | 'order_id'>[],
  address: ValidatedAddress,
  deliveryNotes?: string
): Omit<Order, 'created_at' | 'updated_at'> {
  const orderId = generateOrderId();
  
  const orderItems: OrderItem[] = items.map((item, index) => ({
    ...item,
    id: `${orderId}-item-${index}`,
    order_id: orderId,
  }));
  
  const total = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  
  return {
    id: orderId,
    tenant_id: tenantId,
    type: 'delivery',
    status: 'pending',
    items: orderItems,
    fulfillment_data: {
      address,
      delivery_notes: deliveryNotes,
    } as DeliveryData,
    pickup_code: null,
    total,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date/time for display
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
