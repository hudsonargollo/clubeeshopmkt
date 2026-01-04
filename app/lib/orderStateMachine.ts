/**
 * Order State Machine
 * Requirements: 14.5 - Validate order state transitions
 * 
 * Implements the order lifecycle state machine:
 * pending → paid → processing → ready → completed
 * 
 * With additional transitions:
 * - pending → cancelled (order cancellation)
 * - paid → cancelled (payment refund/cancellation)
 */

/**
 * Valid order statuses
 */
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'ready' | 'completed' | 'cancelled';

/**
 * Order types supported by the system
 */
export type OrderType = 'takeout' | 'delivery';

/**
 * Result of a state transition attempt
 */
export interface TransitionResult {
  success: boolean;
  newStatus?: OrderStatus;
  error?: string;
}

/**
 * Valid state transitions map
 * Key: current status
 * Value: array of valid next statuses
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'], // cancelled for refunds
  processing: ['ready'],
  ready: ['completed'],
  completed: [], // terminal state
  cancelled: [], // terminal state
};

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  processing: 'Processing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Status colors for UI display
 */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'yellow',
  paid: 'blue',
  processing: 'orange',
  ready: 'green',
  completed: 'gray',
  cancelled: 'red',
};

/**
 * Check if a status is a terminal state (no further transitions allowed)
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Get all valid next statuses from the current status
 */
export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a transition from one status to another is valid
 * 
 * @param from - Current order status
 * @param to - Desired next status
 * @returns true if the transition is valid
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validNextStatuses = VALID_TRANSITIONS[from];
  if (!validNextStatuses) {
    return false;
  }
  return validNextStatuses.includes(to);
}

/**
 * Attempt to transition an order to a new status
 * 
 * @param currentStatus - Current order status
 * @param newStatus - Desired new status
 * @returns TransitionResult with success/failure and error message
 * 
 * @example
 * ```ts
 * const result = transition('pending', 'paid');
 * if (result.success) {
 *   // Update order in database
 *   await updateOrder(orderId, { status: result.newStatus });
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function transition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): TransitionResult {
  // Validate current status is known
  if (!(currentStatus in VALID_TRANSITIONS)) {
    return {
      success: false,
      error: `Unknown current status: ${currentStatus}`,
    };
  }

  // Validate new status is known
  if (!(newStatus in VALID_TRANSITIONS)) {
    return {
      success: false,
      error: `Unknown target status: ${newStatus}`,
    };
  }

  // Check if already in target status
  if (currentStatus === newStatus) {
    return {
      success: true,
      newStatus: currentStatus,
    };
  }

  // Check if transition is valid
  if (!isValidTransition(currentStatus, newStatus)) {
    const validOptions = getValidNextStatuses(currentStatus);
    const validOptionsStr = validOptions.length > 0 
      ? validOptions.join(', ') 
      : 'none (terminal state)';
    
    return {
      success: false,
      error: `Invalid transition from '${currentStatus}' to '${newStatus}'. Valid transitions: ${validOptionsStr}`,
    };
  }

  return {
    success: true,
    newStatus,
  };
}

/**
 * Get the next logical status in the happy path
 * Useful for "advance order" buttons
 * 
 * @param currentStatus - Current order status
 * @returns Next status in happy path, or null if terminal
 */
export function getNextHappyPathStatus(currentStatus: OrderStatus): OrderStatus | null {
  const happyPath: Record<OrderStatus, OrderStatus | null> = {
    pending: 'paid',
    paid: 'processing',
    processing: 'ready',
    ready: 'completed',
    completed: null,
    cancelled: null,
  };
  
  return happyPath[currentStatus] ?? null;
}

/**
 * Check if an order can be cancelled
 * Orders can only be cancelled from pending status
 */
export function canCancel(currentStatus: OrderStatus): boolean {
  return currentStatus === 'pending';
}

/**
 * Check if an order can be refunded/cancelled after payment
 * Orders can be refunded from paid status (transitions to cancelled)
 */
export function canRefund(currentStatus: OrderStatus): boolean {
  return currentStatus === 'paid';
}

/**
 * Get all possible statuses an order can reach from current status
 * (including multi-step transitions)
 */
export function getReachableStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const reachable = new Set<OrderStatus>();
  const queue: OrderStatus[] = [currentStatus];
  
  while (queue.length > 0) {
    const status = queue.shift()!;
    const nextStatuses = VALID_TRANSITIONS[status] || [];
    
    for (const next of nextStatuses) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  
  return Array.from(reachable);
}

/**
 * Order state machine class for more complex scenarios
 */
export class OrderStateMachine {
  private status: OrderStatus;
  private history: { from: OrderStatus; to: OrderStatus; timestamp: Date }[] = [];

  constructor(initialStatus: OrderStatus = 'pending') {
    this.status = initialStatus;
  }

  /**
   * Get current status
   */
  getStatus(): OrderStatus {
    return this.status;
  }

  /**
   * Get transition history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Attempt to transition to a new status
   */
  transitionTo(newStatus: OrderStatus): TransitionResult {
    const result = transition(this.status, newStatus);
    
    if (result.success && result.newStatus && result.newStatus !== this.status) {
      this.history.push({
        from: this.status,
        to: result.newStatus,
        timestamp: new Date(),
      });
      this.status = result.newStatus;
    }
    
    return result;
  }

  /**
   * Advance to next status in happy path
   */
  advance(): TransitionResult {
    const nextStatus = getNextHappyPathStatus(this.status);
    if (!nextStatus) {
      return {
        success: false,
        error: `Cannot advance from terminal status: ${this.status}`,
      };
    }
    return this.transitionTo(nextStatus);
  }

  /**
   * Cancel the order (only from pending)
   */
  cancel(): TransitionResult {
    return this.transitionTo('cancelled');
  }

  /**
   * Refund the order (only from paid, transitions to cancelled)
   */
  refund(): TransitionResult {
    return this.transitionTo('cancelled');
  }

  /**
   * Check if order is in a terminal state
   */
  isTerminal(): boolean {
    return isTerminalStatus(this.status);
  }

  /**
   * Get valid next statuses
   */
  getValidNextStatuses(): OrderStatus[] {
    return getValidNextStatuses(this.status);
  }
}

export default OrderStateMachine;
