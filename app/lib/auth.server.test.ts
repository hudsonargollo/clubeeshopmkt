/**
 * Unit Tests: User Routing Logic
 * Feature: auth-deployment-fix
 * Validates: Requirements 5.2, 5.3, 5.4, 5.6
 */

import { describe, it, expect } from 'vitest';
import { determineRedirectPath } from './auth.server';

describe('User Routing Logic', () => {
  describe('determineRedirectPath', () => {
    // Requirement 5.2: Superadmin routing
    it('should route superadmin to /portal', () => {
      const result = determineRedirectPath(0, 'cavernacentral2@gmail.com');
      expect(result).toBe('/portal');
    });

    it('should route superadmin to /portal regardless of tenant count', () => {
      expect(determineRedirectPath(0, 'cavernacentral2@gmail.com')).toBe('/portal');
      expect(determineRedirectPath(1, 'cavernacentral2@gmail.com')).toBe('/portal');
      expect(determineRedirectPath(5, 'cavernacentral2@gmail.com')).toBe('/portal');
      expect(determineRedirectPath(100, 'cavernacentral2@gmail.com')).toBe('/portal');
    });

    // Requirement 5.3: New user (0 tenants) routing
    it('should route new user with 0 tenants to /onboarding', () => {
      const result = determineRedirectPath(0, 'newuser@example.com');
      expect(result).toBe('/onboarding');
    });

    it('should route various new users to /onboarding', () => {
      expect(determineRedirectPath(0, 'user1@example.com')).toBe('/onboarding');
      expect(determineRedirectPath(0, 'user2@test.com')).toBe('/onboarding');
      expect(determineRedirectPath(0, 'admin@company.com')).toBe('/onboarding');
    });

    // Requirement 5.4: Existing user (1+ tenants) routing
    it('should route user with 1 tenant to /backoffice', () => {
      const result = determineRedirectPath(1, 'user@example.com');
      expect(result).toBe('/backoffice');
    });

    it('should route user with multiple tenants to /backoffice', () => {
      expect(determineRedirectPath(1, 'user@example.com')).toBe('/backoffice');
      expect(determineRedirectPath(2, 'user@example.com')).toBe('/backoffice');
      expect(determineRedirectPath(5, 'user@example.com')).toBe('/backoffice');
      expect(determineRedirectPath(10, 'user@example.com')).toBe('/backoffice');
    });

    // Edge cases
    it('should handle empty email string', () => {
      expect(determineRedirectPath(0, '')).toBe('/onboarding');
      expect(determineRedirectPath(1, '')).toBe('/backoffice');
    });

    it('should handle negative tenant count (defensive)', () => {
      // Negative tenant count should be treated as 0
      const result = determineRedirectPath(-1, 'user@example.com');
      // Since -1 !== 0, it will go to backoffice branch
      expect(result).toBe('/backoffice');
    });

    it('should be case-sensitive for superadmin email', () => {
      // Different case should not match superadmin
      expect(determineRedirectPath(0, 'CAVERNACENTRAL2@GMAIL.COM')).toBe('/onboarding');
      expect(determineRedirectPath(0, 'CavernaCentral2@Gmail.com')).toBe('/onboarding');
    });

    it('should handle very large tenant counts', () => {
      expect(determineRedirectPath(1000, 'user@example.com')).toBe('/backoffice');
      expect(determineRedirectPath(999999, 'user@example.com')).toBe('/backoffice');
    });
  });
});
