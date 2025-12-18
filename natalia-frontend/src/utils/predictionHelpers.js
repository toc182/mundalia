/**
 * Centralized prediction helper functions
 * Used across Predictions, ThirdPlaces, Knockout, PredictionsScores, Playoffs, and Admin pages
 */

import { mockTeams } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';

/**
 * Mapping of playoff ID to team ID in mockTeams
 * These are the placeholder team IDs for playoff winners
 */
export const PLAYOFF_TO_TEAM_ID = {
  'UEFA_A': 6,   // Group B
  'UEFA_B': 23,  // Group F
  'UEFA_C': 16,  // Group D
  'UEFA_D': 4,   // Group A
  'FIFA_1': 42,  // Group K
  'FIFA_2': 35,  // Group I
};

/**
 * Get all teams including playoff teams from playoffsData
 * @returns {Array} Combined array of all teams
 */
export const getAllTeams = () => {
  const teams = [...mockTeams];
  playoffs.forEach(p => {
    p.teams.forEach(t => {
      if (!teams.find(at => at.id === t.id)) {
        teams.push(t);
      }
    });
  });
  return teams;
};

/**
 * Get the winning team from a playoff
 * @param {string} playoffId - The playoff ID (e.g., 'UEFA_A', 'FIFA_1')
 * @param {Object} playoffSelections - Object with playoff selections { playoffId: { semi1, semi2, final } }
 * @returns {Object|null} The winning team object or null if not selected
 */
export const getPlayoffWinner = (playoffId, playoffSelections) => {
  const selection = playoffSelections?.[playoffId];
  if (!selection?.final) return null;

  const playoff = playoffs.find(p => p.id === playoffId);
  if (!playoff) return null;

  // Handle string vs number comparison
  const finalId = typeof selection.final === 'string'
    ? parseInt(selection.final, 10)
    : selection.final;

  return playoff.teams.find(t => t.id === finalId);
};

/**
 * Get team by ID, replacing playoff placeholders with actual winners
 * @param {number|string} id - The team ID (handles string or number)
 * @param {Object} playoffSelections - Object with playoff selections
 * @returns {Object|null} The team object (with playoff winner substituted if applicable)
 */
export const getTeamById = (id, playoffSelections) => {
  if (!id) return null;

  // Handle string vs number comparison
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const team = mockTeams.find(t => t.id === numId);
  if (!team) return null;

  // Check if this is a playoff placeholder
  if (team.is_playoff) {
    const playoffEntry = Object.entries(PLAYOFF_TO_TEAM_ID).find(
      ([, teamId]) => teamId === id
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
 * @param {any} original - Original value
 * @param {any} current - Current value
 * @returns {boolean} True if there are real changes
 */
export const hasRealChanges = (original, current) => {
  return JSON.stringify(original) !== JSON.stringify(current);
};

/**
 * Get the playoff ID for a given team ID
 * @param {number} teamId - The team ID
 * @returns {string|null} The playoff ID or null
 */
export const getPlayoffIdByTeamId = (teamId) => {
  const entry = Object.entries(PLAYOFF_TO_TEAM_ID).find(
    ([, id]) => id === teamId
  );
  return entry ? entry[0] : null;
};

/**
 * Check if a team is a playoff placeholder
 * @param {number} teamId - The team ID
 * @returns {boolean} True if the team is a playoff placeholder
 */
export const isPlayoffTeam = (teamId) => {
  return Object.values(PLAYOFF_TO_TEAM_ID).includes(teamId);
};
