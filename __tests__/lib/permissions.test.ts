/**
 * Tests for permission utilities
 * Critical: Security - ensures role-based access control works
 */

import { hasPermission } from '@/lib/use-permissions';
import { ProjectRole } from '@/types';

describe('hasPermission', () => {
  describe('VIEW Role', () => {
    test('VIEW role can view', () => {
      expect(hasPermission('VIEW', 'VIEW')).toBe(true);
    });

    test('VIEW role cannot edit', () => {
      expect(hasPermission('VIEW', 'EDIT')).toBe(false);
    });

    test('VIEW role cannot admin', () => {
      expect(hasPermission('VIEW', 'ADMIN')).toBe(false);
    });
  });

  describe('EDIT Role', () => {
    test('EDIT role can view', () => {
      expect(hasPermission('EDIT', 'VIEW')).toBe(true);
    });

    test('EDIT role can edit', () => {
      expect(hasPermission('EDIT', 'EDIT')).toBe(true);
    });

    test('EDIT role cannot admin', () => {
      expect(hasPermission('EDIT', 'ADMIN')).toBe(false);
    });
  });

  describe('ADMIN Role', () => {
    test('ADMIN role can view', () => {
      expect(hasPermission('ADMIN', 'VIEW')).toBe(true);
    });

    test('ADMIN role can edit', () => {
      expect(hasPermission('ADMIN', 'EDIT')).toBe(true);
    });

    test('ADMIN role can admin', () => {
      expect(hasPermission('ADMIN', 'ADMIN')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('returns false for null role', () => {
      expect(hasPermission(null, 'VIEW')).toBe(false);
    });

    test('handles role hierarchy correctly', () => {
      const roles: ProjectRole[] = ['VIEW', 'EDIT', 'ADMIN'];
      
      // VIEW < EDIT < ADMIN
      expect(hasPermission('VIEW', 'EDIT')).toBe(false);
      expect(hasPermission('EDIT', 'VIEW')).toBe(true);
      expect(hasPermission('ADMIN', 'EDIT')).toBe(true);
      expect(hasPermission('ADMIN', 'VIEW')).toBe(true);
    });

    test('same role always returns true', () => {
      expect(hasPermission('VIEW', 'VIEW')).toBe(true);
      expect(hasPermission('EDIT', 'EDIT')).toBe(true);
      expect(hasPermission('ADMIN', 'ADMIN')).toBe(true);
    });
  });
});
