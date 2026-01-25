/**
 * Property-Based Tests for Order State Machine Validity
 * 
 * Feature: retail-inventory-platform, Property 10: Order State Machine Validity
 * Validates: Requirements 14.5
 * 
 * Property 10: Order State Machine Validity
 * *For any* order status transition, the transition SHALL only occur along valid edges 
 * in the state machine (pending→paid→processing→ready→completed).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  type OrderStatus,
  isValidTransition,
  transition,
  getValidNextStatuses,
  isTerminalStatus,
  OrderStateMachine,
} from './orderStateMachine';

/**
 * All possible order statuses
 */
const orderStatusArb = fc.constantFrom(
  'pending',
  'paid', 
  'processing',
  'ready',
  'completed',
  'cancelled'
) as fc.Arbitrary<OrderStatus>;

/**
 * Valid state transitions as defined in the state machine
 */
const VALID_TRANSITIONS_MAP: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['ready'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
};

/**
 * Generates a sequence of status transitions
 */
const transitionSequenceArb = fc.array(
  fc.record({
    from: orderStatusArb,
    to: orderStatusArb,
  }),
  { minLength: 1, maxLength: 5 }
);

/**
 * Generates a valid transition path
 */
const validTransitionPathArb = fc.constantFrom(
  ['pending', 'paid', 'processing', 'ready', 'completed'],
  ['pending', 'cancelled'],
  ['paid', 'cancelled'],
  ['pending', 'paid', 'processing', 'ready'],
  ['pending', 'paid', 'cancelled']
) as fc.Arbitrary<OrderStatus[]>;

describe('Order State Machine Validity - Property Tests', () => {
  /**
   * Feature: retail-inventory-platform, Property 10: Order State Machine Validity
   * Validates: Requirements 14.5
   * 
   * Property: For any order status transition, the transition SHALL only occur along 
   * valid edges in the state machine.
   */
  describe('Property 10: Order State Machine Validity', () => {
    it('only valid transitions are allowed', () => {
      fc.assert(
        fc.property(
          orderStatusArb,
          orderStatusArb,
          (fromStatus, toStatus) => {
            const isValid = isValidTransition(fromStatus, toStatus);
            const expectedValid = VALID_TRANSITIONS_MAP[fromStatus].includes(toStatus);
            
            // The transition validity should match our expected mapping
            expect(isValid).toBe(expectedValid);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('transition function respects state machine rules', () => {
      fc.assert(
        fc.property(
          orderStatusArb,
          orderStatusArb,
          (fromStatus, toStatus) => {
            const result = transition(fromStatus, toStatus);
            const isValidTransitionExpected = VALID_TRANSITIONS_MAP[fromStatus].includes(toStatus);
            
            if (fromStatus === toStatus) {
              // Same status transitions should always succeed
              expect(result.success).toBe(true);
              expect(result.newStatus).toBe(fromStatus);
            } else if (isValidTransitionExpected) {
              // Valid transitions should succeed
              expect(result.success).toBe(true);
              expect(result.newStatus).toBe(toStatus);
            } else {
              // Invalid transitions should fail
              expect(result.success).toBe(false);
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('terminal statuses have no valid next transitions', () => {
      fc.assert(
        fc.property(
          orderStatusArb,
          (status) => {
            const isTerminal = isTerminalStatus(status);
            const validNextStatuses = getValidNextStatuses(status);
            
            if (isTerminal) {
              // Terminal statuses should have no valid next transitions
              expect(validNextStatuses).toEqual([]);
            } else {
              // Non-terminal statuses should have at least one valid transition
              expect(validNextStatuses.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('valid transition paths can be followed completely', () => {
      fc.assert(
        fc.property(
          validTransitionPathArb,
          (transitionPath) => {
            fc.pre(transitionPath.length >= 2); // Need at least one transition
            
            const machine = new OrderStateMachine(transitionPath[0]);
            
            // Follow the entire path
            for (let i = 1; i < transitionPath.length; i++) {
              const targetStatus = transitionPath[i];
              const result = machine.transitionTo(targetStatus);
              
              // Each step should succeed
              expect(result.success).toBe(true);
              expect(machine.getStatus()).toBe(targetStatus);
            }
            
            // Final status should match the end of the path
            expect(machine.getStatus()).toBe(transitionPath[transitionPath.length - 1]);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('invalid transitions are rejected consistently', () => {
      fc.assert(
        fc.property(
          orderStatusArb,
          orderStatusArb,
          (fromStatus, toStatus) => {
            fc.pre(!VALID_TRANSITIONS_MAP[fromStatus].includes(toStatus) && fromStatus !== toStatus);
            
            const machine = new OrderStateMachine(fromStatus);
            const result = machine.transitionTo(toStatus);
            
            // Invalid transition should fail
            expect(result.success).toBe(false);
            // Status should remain unchanged
            expect(machine.getStatus()).toBe(fromStatus);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('state machine maintains transition history correctly', () => {
      fc.assert(
        fc.property(
          validTransitionPathArb,
          (transitionPath) => {
            fc.pre(transitionPath.length >= 3); // Need multiple transitions
            
            const machine = new OrderStateMachine(transitionPath[0]);
            
            // Apply all transitions
            for (let i = 1; i < transitionPath.length; i++) {
              machine.transitionTo(transitionPath[i]);
            }
            
            const history = machine.getHistory();
            
            // History should have correct number of transitions
            expect(history.length).toBe(transitionPath.length - 1);
            
            // Each history entry should match the path
            for (let i = 0; i < history.length; i++) {
              expect(history[i].from).toBe(transitionPath[i]);
              expect(history[i].to).toBe(transitionPath[i + 1]);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('completed and cancelled are terminal states', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('completed', 'cancelled'),
          orderStatusArb,
          (terminalStatus, targetStatus) => {
            fc.pre(targetStatus !== terminalStatus); // Don't test same-status transitions
            
            const machine = new OrderStateMachine(terminalStatus);
            const result = machine.transitionTo(targetStatus);
            
            // All transitions from terminal states should fail
            expect(result.success).toBe(false);
            expect(machine.getStatus()).toBe(terminalStatus);
            expect(machine.isTerminal()).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('happy path advancement follows correct sequence', () => {
      const machine = new OrderStateMachine('pending');
      
      // Advance through happy path
      let result = machine.advance(); // pending → paid
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('paid');
      
      result = machine.advance(); // paid → processing
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('processing');
      
      result = machine.advance(); // processing → ready
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('ready');
      
      result = machine.advance(); // ready → completed
      expect(result.success).toBe(true);
      expect(machine.getStatus()).toBe('completed');
      
      // Cannot advance from terminal state
      result = machine.advance();
      expect(result.success).toBe(false);
      expect(machine.getStatus()).toBe('completed');
    });
  });
});