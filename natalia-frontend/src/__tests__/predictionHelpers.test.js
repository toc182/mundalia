/**
 * Tests for predictionHelpers utility
 */

import { describe, it, expect } from 'vitest';
import {
  PLAYOFF_TO_TEAM_ID,
  getPlayoffWinner,
  getTeamById,
  hasRealChanges,
  getPlayoffIdByTeamId,
  isPlayoffTeam,
} from '../utils/predictionHelpers';

describe('predictionHelpers', () => {
  // ============================================
  // PLAYOFF_TO_TEAM_ID constant
  // ============================================
  describe('PLAYOFF_TO_TEAM_ID', () => {
    it('should have all 6 playoff mappings', () => {
      expect(Object.keys(PLAYOFF_TO_TEAM_ID)).toHaveLength(6);
    });

    it('should have correct UEFA playoffs', () => {
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('UEFA_A');
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('UEFA_B');
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('UEFA_C');
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('UEFA_D');
    });

    it('should have correct FIFA playoffs', () => {
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('FIFA_1');
      expect(PLAYOFF_TO_TEAM_ID).toHaveProperty('FIFA_2');
    });
  });

  // ============================================
  // getPlayoffWinner
  // ============================================
  describe('getPlayoffWinner', () => {
    it('should return null when no selections', () => {
      const result = getPlayoffWinner('UEFA_A', {});
      expect(result).toBeNull();
    });

    it('should return null when playoff not selected', () => {
      const result = getPlayoffWinner('UEFA_A', { UEFA_B: { final: 1 } });
      expect(result).toBeNull();
    });

    it('should return null when final not selected', () => {
      const result = getPlayoffWinner('UEFA_A', { UEFA_A: { semi1: 1 } });
      expect(result).toBeNull();
    });

    it('should handle null playoffSelections', () => {
      const result = getPlayoffWinner('UEFA_A', null);
      expect(result).toBeNull();
    });
  });

  // ============================================
  // getTeamById
  // ============================================
  describe('getTeamById', () => {
    it('should return null for null id', () => {
      const result = getTeamById(null, {});
      expect(result).toBeNull();
    });

    it('should return null for undefined id', () => {
      const result = getTeamById(undefined, {});
      expect(result).toBeNull();
    });

    it('should return team for valid id', () => {
      const result = getTeamById(1, {});
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name');
    });

    it('should handle string id', () => {
      const result = getTeamById('1', {});
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id', 1);
    });

    it('should return null for non-existent team', () => {
      const result = getTeamById(99999, {});
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

  // ============================================
  // getPlayoffIdByTeamId
  // ============================================
  describe('getPlayoffIdByTeamId', () => {
    it('should return playoff id for playoff team', () => {
      const teamId = PLAYOFF_TO_TEAM_ID.UEFA_A;
      const result = getPlayoffIdByTeamId(teamId);
      expect(result).toBe('UEFA_A');
    });

    it('should return null for non-playoff team', () => {
      const result = getPlayoffIdByTeamId(1);
      expect(result).toBeNull();
    });
  });

  // ============================================
  // isPlayoffTeam
  // ============================================
  describe('isPlayoffTeam', () => {
    it('should return true for playoff team ids', () => {
      expect(isPlayoffTeam(PLAYOFF_TO_TEAM_ID.UEFA_A)).toBe(true);
      expect(isPlayoffTeam(PLAYOFF_TO_TEAM_ID.FIFA_1)).toBe(true);
    });

    it('should return false for regular team ids', () => {
      expect(isPlayoffTeam(1)).toBe(false);
      expect(isPlayoffTeam(99)).toBe(false);
    });
  });
});
