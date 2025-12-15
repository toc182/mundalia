/**
 * FIFA World Cup Tiebreaker Algorithm
 *
 * Official FIFA tiebreaker criteria (in order):
 * a) Points obtained in matches between tied teams
 * b) Goal difference in matches between tied teams
 * c) Goals scored in matches between tied teams
 * d) If still tied after a-c: REAPPLY a-c exclusively among still-tied teams
 * e) Goal difference in ALL group matches
 * f) Goals scored in ALL group matches
 * g) Drawing of lots (in our system: user decides manually)
 */

import { GROUP_MATCH_STRUCTURE } from '../data/groupMatches';

/**
 * Calculate team statistics from match scores
 * @param {Array} teams - Array of 4 team objects with id, name
 * @param {Object} scores - { 1: {a: 2, b: 1}, 2: {a: 0, b: 0}, ... } (match 1-6)
 * @returns {Array} Array of team stats with points, gf, ga, gd
 */
export function calculateTeamStats(teams, scores) {
  const stats = teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    flagUrl: team.flag_url,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));

  // Create lookup for team position (1-4) to stats index
  const teamPositionToIndex = {};
  teams.forEach((team, index) => {
    teamPositionToIndex[index + 1] = index;
  });

  // Process each match
  GROUP_MATCH_STRUCTURE.forEach(match => {
    const score = scores[match.matchNumber];
    // Skip incomplete matches (undefined, null, empty string, or NaN)
    if (!score || score.a === undefined || score.b === undefined || score.a === '' || score.b === '') {
      return;
    }

    const teamAIndex = teamPositionToIndex[match.teamAPosition];
    const teamBIndex = teamPositionToIndex[match.teamBPosition];

    if (teamAIndex === undefined || teamBIndex === undefined) {
      return;
    }

    const teamA = stats[teamAIndex];
    const teamB = stats[teamBIndex];

    // Convert to numbers to prevent string concatenation
    const goalsA = Number(score.a) || 0;
    const goalsB = Number(score.b) || 0;

    // Update goals
    teamA.goalsFor += goalsA;
    teamA.goalsAgainst += goalsB;
    teamB.goalsFor += goalsB;
    teamB.goalsAgainst += goalsA;

    // Update matches played
    teamA.played++;
    teamB.played++;

    // Update W/D/L and points
    if (score.a > score.b) {
      teamA.won++;
      teamA.points += 3;
      teamB.lost++;
    } else if (score.a < score.b) {
      teamB.won++;
      teamB.points += 3;
      teamA.lost++;
    } else {
      teamA.drawn++;
      teamB.drawn++;
      teamA.points += 1;
      teamB.points += 1;
    }
  });

  // Calculate goal difference
  stats.forEach(team => {
    team.goalDifference = team.goalsFor - team.goalsAgainst;
  });

  return stats;
}

/**
 * Calculate head-to-head statistics between specific teams
 * @param {Array} tiedTeamIds - Array of team IDs that are tied
 * @param {Array} allTeams - All 4 teams in the group
 * @param {Object} scores - All match scores
 * @returns {Object} Map of teamId -> { h2hPoints, h2hGoalsFor, h2hGoalsAgainst, h2hGoalDiff }
 */
function calculateHeadToHead(tiedTeamIds, allTeams, scores) {
  const h2h = {};
  tiedTeamIds.forEach(id => {
    h2h[id] = {
      h2hPoints: 0,
      h2hGoalsFor: 0,
      h2hGoalsAgainst: 0,
      h2hGoalDiff: 0,
    };
  });

  // Create position lookup: teamId -> position (1-4)
  const teamIdToPosition = {};
  allTeams.forEach((team, index) => {
    teamIdToPosition[team.id] = index + 1;
  });

  // Find matches between tied teams
  GROUP_MATCH_STRUCTURE.forEach(match => {
    const score = scores[match.matchNumber];
    // Skip incomplete matches
    if (!score || score.a === undefined || score.b === undefined || score.a === '' || score.b === '') {
      return;
    }

    // Get team IDs for this match
    const teamAId = allTeams[match.teamAPosition - 1]?.id;
    const teamBId = allTeams[match.teamBPosition - 1]?.id;

    // Only count if BOTH teams are in the tied group
    if (!tiedTeamIds.includes(teamAId) || !tiedTeamIds.includes(teamBId)) {
      return;
    }

    // Convert to numbers to prevent string concatenation
    const goalsA = Number(score.a) || 0;
    const goalsB = Number(score.b) || 0;

    // Update head-to-head stats
    h2h[teamAId].h2hGoalsFor += goalsA;
    h2h[teamAId].h2hGoalsAgainst += goalsB;
    h2h[teamBId].h2hGoalsFor += goalsB;
    h2h[teamBId].h2hGoalsAgainst += goalsA;

    if (goalsA > goalsB) {
      h2h[teamAId].h2hPoints += 3;
    } else if (goalsA < goalsB) {
      h2h[teamBId].h2hPoints += 3;
    } else {
      h2h[teamAId].h2hPoints += 1;
      h2h[teamBId].h2hPoints += 1;
    }
  });

  // Calculate goal difference
  Object.keys(h2h).forEach(id => {
    h2h[id].h2hGoalDiff = h2h[id].h2hGoalsFor - h2h[id].h2hGoalsAgainst;
  });

  return h2h;
}

/**
 * Check if array of teams can be differentiated by a key
 * Returns resolved teams and still-tied teams
 */
function checkDifferentiation(teams, key) {
  const resolved = [];
  let stillTied = [];

  let i = 0;
  while (i < teams.length) {
    const current = teams[i];
    const sameValue = [current];

    while (i + 1 < teams.length && teams[i + 1][key] === current[key]) {
      i++;
      sameValue.push(teams[i]);
    }

    if (sameValue.length === 1) {
      resolved.push(current);
    } else {
      stillTied = stillTied.concat(sameValue);
    }
    i++;
  }

  return {
    isFullyResolved: stillTied.length === 0,
    resolved,
    stillTied,
  };
}

/**
 * Resolve tied teams using FIFA criteria (recursive)
 * @param {Array} tiedStats - Array of team stats that are tied on points
 * @param {Array} allTeams - All 4 teams in the group
 * @param {Object} scores - All match scores
 * @param {Object} tiebreakerDecision - User's manual decision (if any)
 * @param {number} depth - Recursion depth (to prevent infinite loops)
 * @returns {Object} { resolved: Array, unresolvableTie: { teams, reason } | null }
 */
function resolveTiedTeams(tiedStats, allTeams, scores, tiebreakerDecision, depth = 0) {
  // Safety: prevent infinite recursion
  if (depth > 3) {
    return {
      resolved: tiedStats,
      unresolvableTie: {
        teams: tiedStats,
        reason: 'Máxima profundidad de desempate alcanzada',
      },
    };
  }

  const tiedTeamIds = tiedStats.map(s => s.teamId);

  // If only one team, already resolved
  if (tiedStats.length === 1) {
    return { resolved: tiedStats, unresolvableTie: null };
  }

  // Calculate head-to-head for these specific tied teams
  const h2h = calculateHeadToHead(tiedTeamIds, allTeams, scores);

  // Merge h2h stats into team stats
  const teamsWithH2H = tiedStats.map(team => ({
    ...team,
    ...h2h[team.teamId],
  }));

  // Criteria a) H2H Points
  teamsWithH2H.sort((a, b) => b.h2hPoints - a.h2hPoints);
  let result = checkDifferentiation(teamsWithH2H, 'h2hPoints');

  if (result.isFullyResolved) {
    return { resolved: teamsWithH2H, unresolvableTie: null };
  }

  // Some teams still tied after h2h points
  let stillTied = result.stillTied;
  let finalResolved = [...result.resolved];

  // Criteria b) H2H Goal Difference
  stillTied.sort((a, b) => b.h2hGoalDiff - a.h2hGoalDiff);
  result = checkDifferentiation(stillTied, 'h2hGoalDiff');

  if (result.isFullyResolved) {
    finalResolved = finalResolved.concat(stillTied);
    // Re-sort to ensure correct order
    finalResolved.sort((a, b) => {
      if (b.h2hPoints !== a.h2hPoints) return b.h2hPoints - a.h2hPoints;
      return b.h2hGoalDiff - a.h2hGoalDiff;
    });
    return { resolved: finalResolved, unresolvableTie: null };
  }

  stillTied = result.stillTied;
  finalResolved = finalResolved.concat(result.resolved);

  // Criteria c) H2H Goals For
  stillTied.sort((a, b) => b.h2hGoalsFor - a.h2hGoalsFor);
  result = checkDifferentiation(stillTied, 'h2hGoalsFor');

  if (result.isFullyResolved) {
    finalResolved = finalResolved.concat(stillTied);
    return { resolved: finalResolved, unresolvableTie: null };
  }

  stillTied = result.stillTied;
  finalResolved = finalResolved.concat(result.resolved);

  // Criteria d) RECURSIVE: If fewer teams remain tied, reapply a-c
  if (stillTied.length > 1 && stillTied.length < tiedStats.length) {
    const subResult = resolveTiedTeams(stillTied, allTeams, scores, null, depth + 1);
    if (!subResult.unresolvableTie) {
      finalResolved = finalResolved.concat(subResult.resolved);
      return { resolved: finalResolved, unresolvableTie: null };
    }
    stillTied = subResult.resolved;
  }

  // Criteria e) Overall Goal Difference
  stillTied.sort((a, b) => b.goalDifference - a.goalDifference);
  result = checkDifferentiation(stillTied, 'goalDifference');

  if (result.isFullyResolved) {
    finalResolved = finalResolved.concat(stillTied);
    return { resolved: finalResolved, unresolvableTie: null };
  }

  stillTied = result.stillTied;
  finalResolved = finalResolved.concat(result.resolved);

  // Criteria f) Overall Goals For
  stillTied.sort((a, b) => b.goalsFor - a.goalsFor);
  result = checkDifferentiation(stillTied, 'goalsFor');

  if (result.isFullyResolved) {
    finalResolved = finalResolved.concat(stillTied);
    return { resolved: finalResolved, unresolvableTie: null };
  }

  stillTied = result.stillTied;
  finalResolved = finalResolved.concat(result.resolved);

  // Criteria g) User decision or unresolvable
  if (tiebreakerDecision) {
    // Apply user's decision
    const userOrder = tiebreakerDecision.resolvedOrder || [];
    stillTied.sort((a, b) => {
      const aIndex = userOrder.indexOf(a.teamId);
      const bIndex = userOrder.indexOf(b.teamId);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    finalResolved = finalResolved.concat(stillTied);
    return { resolved: finalResolved, unresolvableTie: null };
  }

  // Unresolvable tie - needs user input
  return {
    resolved: finalResolved.concat(stillTied),
    unresolvableTie: {
      teams: stillTied,
      reason: `Empate irresoluble entre: ${stillTied.map(t => t.teamName).join(', ')}`,
    },
  };
}

/**
 * Main function: Calculate group standings from scores
 * @param {Array} teams - Array of 4 team objects
 * @param {Object} scores - { 1: {a: 2, b: 1}, ... } match scores
 * @param {Object} tiebreakerDecision - User's manual decision for this group
 * @returns {Object} { standings: Array, unresolvableTie: Object | null, isComplete: boolean }
 */
export function calculateGroupStandings(teams, scores, tiebreakerDecision = null) {
  // Check if all 6 matches are complete (not empty strings)
  const completedMatches = Object.values(scores).filter(
    s => s && s.a !== undefined && s.b !== undefined && s.a !== '' && s.b !== ''
  ).length;
  const isComplete = completedMatches === 6;

  // Calculate basic stats
  const stats = calculateTeamStats(teams, scores);

  // Initial sort by points
  stats.sort((a, b) => b.points - a.points);

  // Find and resolve ties
  const finalStandings = [];
  let currentUnresolvableTie = null;
  let i = 0;

  while (i < stats.length) {
    // Find teams with same points
    const currentPoints = stats[i].points;
    const tiedGroup = [stats[i]];

    while (i + 1 < stats.length && stats[i + 1].points === currentPoints) {
      i++;
      tiedGroup.push(stats[i]);
    }

    if (tiedGroup.length === 1) {
      // No tie
      finalStandings.push(tiedGroup[0]);
    } else {
      // Resolve tie
      const result = resolveTiedTeams(tiedGroup, teams, scores, tiebreakerDecision);
      finalStandings.push(...result.resolved);

      if (result.unresolvableTie && !currentUnresolvableTie) {
        currentUnresolvableTie = result.unresolvableTie;
      }
    }

    i++;
  }

  // Assign positions 1-4
  finalStandings.forEach((team, index) => {
    team.position = index + 1;
  });

  return {
    standings: finalStandings,
    unresolvableTie: currentUnresolvableTie,
    isComplete,
  };
}

/**
 * Sort third-place teams to determine best 8
 * Uses similar criteria: points, goal diff, goals for
 * @param {Array} thirdPlaceTeams - Array of { group, team: teamStats }
 * @returns {Array} Sorted array with best teams first
 */
export function sortThirdPlaceTeams(thirdPlaceTeams) {
  return [...thirdPlaceTeams].sort((a, b) => {
    // 1. Points
    if (b.team.points !== a.team.points) {
      return b.team.points - a.team.points;
    }
    // 2. Goal difference
    if (b.team.goalDifference !== a.team.goalDifference) {
      return b.team.goalDifference - a.team.goalDifference;
    }
    // 3. Goals for
    if (b.team.goalsFor !== a.team.goalsFor) {
      return b.team.goalsFor - a.team.goalsFor;
    }
    // 4. Alphabetical by group (arbitrary but consistent)
    return a.group.localeCompare(b.group);
  });
}
