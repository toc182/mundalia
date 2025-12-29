import type { MockTeam } from '@/data/mockData';
import type { RefObject } from 'react';

// Extended team type with thirdPlaceFrom property
export interface PlayoffWinnerTeam extends MockTeam {
  originalPlayoffId?: string;
  isPlayoffWinner?: boolean;
  thirdPlaceFrom?: string;
}

// MatchTeam interface for MatchBox component compatibility
export interface MatchTeam {
  id: number | string;
  name: string;
  flag_url: string;
  thirdPlaceFrom?: string;
}

// Types for component state
export type PredictionMode = 'positions' | 'scores';
export type RoundId = 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export interface GroupPredictions {
  [groupLetter: string]: number[];
}

export interface KnockoutPredictions {
  [matchId: string]: number;
}

export interface KnockoutScores {
  [matchId: string]: {
    a: number | string;
    b: number | string;
  };
}

export interface KnockoutSaveData {
  [matchId: string]: {
    winner: number | null;
    scoreA: number | null;
    scoreB: number | null;
  };
}

export interface MobileRound {
  id: RoundId;
  label: string;
  count: number;
  total: number;
  next: RoundId | null;
}

export interface Round {
  id: RoundId;
  label: string;
  count: number;
  total: number;
  next: RoundId | null;
}

// Extended match types with computed team data
export interface BuildR32Match {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  selectedWinner: number | null;
  label?: string;
}

export interface BuildKnockoutMatch {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  fromA: string;
  fromB: string;
  selectedWinner: number | null;
  label?: string;
}

export interface BuildSpecialMatch {
  matchId: string;
  matchNumber: number;
  teamA: PlayoffWinnerTeam | null;
  teamB: PlayoffWinnerTeam | null;
  fromA: string;
  fromB: string;
  selectedWinner: number | null;
  label: string;
}

export interface MatchPair {
  m1: string;
  m2: string;
  next: string;
}

// Component Props interfaces
export interface MobileMatchBoxProps {
  match: BuildR32Match | BuildKnockoutMatch | BuildSpecialMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
}

export interface MobileMatchPairProps {
  match1: BuildR32Match | BuildKnockoutMatch | null;
  match2: BuildR32Match | BuildKnockoutMatch | null;
  nextMatch: BuildR32Match | BuildKnockoutMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
}

export interface MobileKnockoutSlidesProps {
  r32Matches: BuildR32Match[];
  r16Matches: BuildKnockoutMatch[];
  qfMatches: BuildKnockoutMatch[];
  sfMatches: BuildKnockoutMatch[];
  final: BuildSpecialMatch;
  thirdPlace: BuildSpecialMatch;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  getTeamById: (id: number) => PlayoffWinnerTeam | null;
}

export interface DesktopBracketMatchProps {
  match: BuildR32Match | BuildKnockoutMatch | BuildSpecialMatch | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  matchWidth: number;
}

export interface FullBracketProps {
  r32Matches: BuildR32Match[];
  r16Matches: BuildKnockoutMatch[];
  qfMatches: BuildKnockoutMatch[];
  sfMatches: BuildKnockoutMatch[];
  final: BuildSpecialMatch;
  thirdPlace: BuildSpecialMatch;
  onSelectWinner: (matchId: string, teamId: number) => void;
  getTeamById: (id: number) => PlayoffWinnerTeam | null;
  predictionMode: PredictionMode;
  knockoutScores: KnockoutScores;
  onScoreChange: (matchId: string, teamAId: number | undefined, teamBId: number | undefined, newScoreA: number | string, newScoreB: number | string) => void;
}

// Helper to convert PlayoffWinnerTeam to MatchTeam
export const toMatchTeam = (team: PlayoffWinnerTeam | null): MatchTeam | null => {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    flag_url: team.flag_url,
    thirdPlaceFrom: team.thirdPlaceFrom,
  };
};
