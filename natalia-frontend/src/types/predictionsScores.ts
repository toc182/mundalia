/**
 * Types for PredictionsScores page
 */

import type { TeamStats, UnresolvableTie, ThirdPlaceTeam as ThirdPlaceTeamCalc } from '../utils/fifaTiebreaker';
import type { ThirdPlaceCombination } from '../data/thirdPlaceCombinations';

export interface MatchScore {
  a: number | string;
  b: number | string;
}

export interface ScoresState {
  [group: string]: {
    [matchNumber: number]: MatchScore;
  };
}

export interface TiebreakerDecisionData {
  tiedTeamIds: number[];
  resolvedOrder: number[];
}

export interface TiebreakerDecisionsState {
  [group: string]: TiebreakerDecisionData;
}

export interface GroupStandingsState {
  [group: string]: {
    standings: TeamStats[];
    unresolvableTie: UnresolvableTie | null;
    isComplete: boolean;
  };
}

export interface SavedStandingsState {
  [group: string]: number[];
}

export interface UnresolvableTieWithGroup extends UnresolvableTie {
  group: string;
}

export interface CurrentTiebreaker {
  group: string;
  reason: string;
  teams: TeamStats[];
}

export interface ThirdPlaceInfo {
  valid: boolean;
  reason?: string;
  qualifyingGroups?: string;
  combination?: ThirdPlaceCombination;
  best8?: ThirdPlaceTeamCalc[];
}
