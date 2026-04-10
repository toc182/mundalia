/**
 * Tests for predictionHelpers utility
 */

import { describe, it, expect } from 'vitest';
import {
  getTeamById,
  hasRealChanges,
} from '../utils/predictionHelpers';

describe('predictionHelpers', () => {
  // ============================================
  // getTeamById
  // ============================================
  describe('getTeamById', () => {
    it('should return null for null id', () => {
      const result = getTeamById(null as unknown as number);
      expect(result).toBeNull();
    });

    it('should return null for undefined id', () => {
      const result = getTeamById(undefined as unknown as number);
      expect(result).toBeNull();
    });

    it('should return team for valid id', () => {
      const result = getTeamById(1);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name');
    });

    it('should handle string id', () => {
      const result = getTeamById('1' as unknown as number);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 1);
    });

    it('should return null for non-existent team', () => {
      const result = getTeamById(99999);
      expect(result).toBeNull();
    });
  });

  // ============================================
  // hasRealChanges
  // ============================================
  describe('hasRealChanges', () => {
    it('should return false for identical objects', () => {
      const obj = { a: 1, b: 2 };
      expect(hasRealChanges(obj, obj)).toBe(false);
    });

    it('should return false for equal objects', () => {
      const original = { a: 1, b: 2 };
      const current = { a: 1, b: 2 };
      expect(hasRealChanges(original, current)).toBe(false);
    });

    it('should return true for different objects', () => {
      const original = { a: 1, b: 2 };
      const current = { a: 1, b: 3 };
      expect(hasRealChanges(original, current)).toBe(true);
    });

    it('should return true for different arrays', () => {
      const original = [1, 2, 3];
      const current = [1, 3, 2];
      expect(hasRealChanges(original, current)).toBe(true);
    });

    it('should return false for equal arrays', () => {
      const original = [1, 2, 3];
      const current = [1, 2, 3];
      expect(hasRealChanges(original, current)).toBe(false);
    });
  });
});
