// World Cup 2026 - Group Stage Match Structure
// Each group has 6 matches (round-robin: every team plays each other once)
// 12 groups x 6 matches = 72 total group stage matches

/**
 * Structure of 6 matches per group
 * teamAPosition and teamBPosition are 1-4, corresponding to order in mockData.js
 *
 * Group order in mockData.js:
 * Position 1 = first team listed (e.g., Mexico for Group A)
 * Position 2 = second team listed (e.g., South Africa for Group A)
 * Position 3 = third team listed (e.g., Korea Republic for Group A)
 * Position 4 = fourth team listed (e.g., Playoff Europa D for Group A)
 */
export const GROUP_MATCH_STRUCTURE = [
  // Match Day 1
  { matchNumber: 1, teamAPosition: 1, teamBPosition: 2, matchDay: 1 },
  { matchNumber: 2, teamAPosition: 3, teamBPosition: 4, matchDay: 1 },
  // Match Day 2
  { matchNumber: 3, teamAPosition: 1, teamBPosition: 3, matchDay: 2 },
  { matchNumber: 4, teamAPosition: 2, teamBPosition: 4, matchDay: 2 },
  // Match Day 3
  { matchNumber: 5, teamAPosition: 1, teamBPosition: 4, matchDay: 3 },
  { matchNumber: 6, teamAPosition: 2, teamBPosition: 3, matchDay: 3 },
];

/**
 * All groups in the World Cup 2026
 */
export const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/**
 * Get matches for a specific group
 * @param {string} groupLetter - Group letter (A-L)
 * @returns {Array} Array of match objects with group info
 */
export function getGroupMatches(groupLetter) {
  return GROUP_MATCH_STRUCTURE.map(match => ({
    ...match,
    group: groupLetter,
    id: `${groupLetter}-${match.matchNumber}`,
  }));
}

/**
 * Get all 72 group stage matches
 * @returns {Array} All matches across all groups
 */
export function getAllGroupMatches() {
  const allMatches = [];

  ALL_GROUPS.forEach(group => {
    GROUP_MATCH_STRUCTURE.forEach(match => {
      allMatches.push({
        ...match,
        group,
        id: `${group}-${match.matchNumber}`,
      });
    });
  });

  return allMatches; // 72 matches total
}

/**
 * Given a group's teams array and a match number, get the actual team objects
 * @param {Array} groupTeams - Array of 4 team objects from that group
 * @param {number} matchNumber - Match number 1-6
 * @returns {Object} { teamA, teamB }
 */
export function getMatchTeams(groupTeams, matchNumber) {
  const matchStructure = GROUP_MATCH_STRUCTURE.find(m => m.matchNumber === matchNumber);

  if (!matchStructure) {
    return { teamA: null, teamB: null };
  }

  return {
    teamA: groupTeams[matchStructure.teamAPosition - 1],
    teamB: groupTeams[matchStructure.teamBPosition - 1],
  };
}

/**
 * Given group teams and match number, get team IDs
 * @param {Array} groupTeams - Array of 4 team objects
 * @param {number} matchNumber - Match number 1-6
 * @returns {Object} { teamAId, teamBId }
 */
export function getMatchTeamIds(groupTeams, matchNumber) {
  const { teamA, teamB } = getMatchTeams(groupTeams, matchNumber);

  return {
    teamAId: teamA?.id,
    teamBId: teamB?.id,
  };
}

/**
 * Total number of group stage matches
 */
export const TOTAL_GROUP_MATCHES = ALL_GROUPS.length * GROUP_MATCH_STRUCTURE.length; // 72
