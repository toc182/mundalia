/**
 * Centralized prediction helper functions
 */

import { mockTeams, type MockTeam } from '@/data/mockData';

// Re-export MockTeam as Team for backward compatibility
export type { MockTeam as Team };

/**
 * Get all teams
 */
export const getAllTeams = (): MockTeam[] => mockTeams;

/**
 * Get team by ID — simple direct lookup
 */
export const getTeamById = (
  id: number | string | null | undefined
): MockTeam | null => {
  if (!id) return null;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return mockTeams.find(t => t.id === numId) ?? null;
};

/**
 * Deep comparison to detect real changes between two objects
 */
export const hasRealChanges = <T>(original: T, current: T): boolean => {
  return JSON.stringify(original) !== JSON.stringify(current);
};
