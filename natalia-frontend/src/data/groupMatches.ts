// World Cup 2026 - Group Stage Match Structure
// Each group has 6 matches (round-robin: every team plays each other once)
// 12 groups x 6 matches = 72 total group stage matches

import type { Team } from '@/types';

export interface GroupMatchStructure {
  matchNumber: number;
  teamAPosition: number;
  teamBPosition: number;
  matchDay: number;
}

export interface GroupMatch extends GroupMatchStructure {
  group: string;
  id: string;
}

export interface MatchTeams {
  teamA: Team | null;
  teamB: Team | null;
}

export interface MatchTeamIds {
  teamAId: number | undefined;
  teamBId: number | undefined;
}

/**
 * Structure of 6 matches per group
 * teamAPosition and teamBPosition are 1-4, corresponding to order in mockData.ts
 *
 * Group order in mockData.ts:
 * Position 1 = first team listed (e.g., Mexico for Group A)
 * Position 2 = second team listed (e.g., South Africa for Group A)
 * Position 3 = third team listed (e.g., Korea Republic for Group A)
 * Position 4 = fourth team listed (e.g., Playoff Europa D for Group A)
 */
export const GROUP_MATCH_STRUCTURE: GroupMatchStructure[] = [
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
export const ALL_GROUPS: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/**
 * Get matches for a specific group
 * @param groupLetter - Group letter (A-L)
 * @returns Array of match objects with group info
 */
export function getGroupMatches(groupLetter: string): GroupMatch[] {
  return GROUP_MATCH_STRUCTURE.map(match => ({
    ...match,
    group: groupLetter,
    id: `${groupLetter}-${match.matchNumber}`,
  }));
}

/**
 * Get all 72 group stage matches
 * @returns All matches across all groups
 */
export function getAllGroupMatches(): GroupMatch[] {
  const allMatches: GroupMatch[] = [];

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
 * @param groupTeams - Array of 4 team objects from that group
 * @param matchNumber - Match number 1-6
 * @returns { teamA, teamB }
 */
export function getMatchTeams(groupTeams: Team[], matchNumber: number): MatchTeams {
  const matchStructure = GROUP_MATCH_STRUCTURE.find(m => m.matchNumber === matchNumber);

  if (!matchStructure) {
    return { teamA: null, teamB: null };
  }

  return {
    teamA: groupTeams[matchStructure.teamAPosition - 1] || null,
    teamB: groupTeams[matchStructure.teamBPosition - 1] || null,
  };
}

/**
 * Given group teams and match number, get team IDs
 * @param groupTeams - Array of 4 team objects
 * @param matchNumber - Match number 1-6
 * @returns { teamAId, teamBId }
 */
export function getMatchTeamIds(groupTeams: Team[], matchNumber: number): MatchTeamIds {
  const { teamA, teamB } = getMatchTeams(groupTeams, matchNumber);

  return {
    teamAId: teamA?.id,
    teamBId: teamB?.id,
  };
}

/**
 * Total number of group stage matches
 */
export const TOTAL_GROUP_MATCHES: number = ALL_GROUPS.length * GROUP_MATCH_STRUCTURE.length; // 72
