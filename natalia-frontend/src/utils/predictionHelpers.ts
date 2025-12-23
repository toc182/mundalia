/**
 * Centralized prediction helper functions
 * Used across Predictions, ThirdPlaces, Knockout, PredictionsScores, Playoffs, and Admin pages
 */

import { mockTeams, type Team } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';

// Extended team interface for playoff winners
export interface PlayoffWinnerTeam extends Team {
  originalPlayoffId?: string;
  isPlayoffWinner?: boolean;
}

// Playoff selection interface
export interface PlayoffSelection {
  semi1?: number | string;
  semi2?: number | string;
  final?: number | string;
}

export type PlayoffSelections = Record<string, PlayoffSelection>;

/**
 * Mapping of playoff ID to team ID in mockTeams
 * These are the placeholder team IDs for playoff winners
 */
export const PLAYOFF_TO_TEAM_ID: Record<string, number> = {
  'UEFA_A': 6,   // Group B
  'UEFA_B': 23,  // Group F
  'UEFA_C': 16,  // Group D
  'UEFA_D': 4,   // Group A
  'FIFA_1': 42,  // Group K
  'FIFA_2': 35,  // Group I
};

/**
 * Get all teams including playoff teams from playoffsData
 */
export const getAllTeams = (): Team[] => {
  const teams: Team[] = [...mockTeams];
  playoffs.forEach(p => {
    p.teams.forEach(t => {
      if (!teams.find(at => at.id === t.id)) {
        teams.push(t as Team);
      }
    });
  });
  return teams;
};

/**
 * Get the winning team from a playoff
 */
export const getPlayoffWinner = (
  playoffId: string,
  playoffSelections: PlayoffSelections | null | undefined
): Team | null => {
  const selection = playoffSelections?.[playoffId];
  if (!selection?.final) return null;

  const playoff = playoffs.find(p => p.id === playoffId);
  if (!playoff) return null;

  // Handle string vs number comparison
  const finalId = typeof selection.final === 'string'
    ? parseInt(selection.final, 10)
    : selection.final;

  return playoff.teams.find(t => t.id === finalId) as Team | undefined ?? null;
};

/**
 * Get team by ID, replacing playoff placeholders with actual winners
 */
export const getTeamById = (
  id: number | string | null | undefined,
  playoffSelections: PlayoffSelections | null | undefined
): PlayoffWinnerTeam | null => {
  if (!id) return null;

  // Handle string vs number comparison
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const team = mockTeams.find(t => t.id === numId);
  if (!team) return null;

  // Check if this is a playoff placeholder
  if (team.is_playoff) {
    const playoffEntry = Object.entries(PLAYOFF_TO_TEAM_ID).find(
      ([, teamId]) => teamId === numId
    );
    if (playoffEntry) {
      const [playoffId] = playoffEntry;
      const winner = getPlayoffWinner(playoffId, playoffSelections);
      if (winner) {
        return {
          ...winner,
          id: team.id, // Keep original ID for predictions
          originalPlayoffId: playoffId,
          isPlayoffWinner: true,
        };
      }
    }
  }

  return team;
};

/**
 * Deep comparison to detect real changes between two objects
 */
export const hasRealChanges = <T>(original: T, current: T): boolean => {
  return JSON.stringify(original) !== JSON.stringify(current);
};

/**
 * Get the playoff ID for a given team ID
 */
export const getPlayoffIdByTeamId = (teamId: number): string | null => {
  const entry = Object.entries(PLAYOFF_TO_TEAM_ID).find(
    ([, id]) => id === teamId
  );
  return entry ? entry[0] : null;
};

/**
 * Check if a team is a playoff placeholder
 */
export const isPlayoffTeam = (teamId: number): boolean => {
  return Object.values(PLAYOFF_TO_TEAM_ID).includes(teamId);
};
