import type { LucideIcon } from 'lucide-react';
import type { MockTeam } from '@/data/mockData';
import type { UnresolvableTie } from '@/utils/fifaTiebreaker';

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface RealPlayoffResult {
  playoff_id: string;
  winner_team_id: number;
}

export interface RealGroupMatch {
  group_letter: string;
  match_index: number;
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
}

export interface RealGroupStanding {
  group_letter: string;
  team_id: number;
  final_position: number;
  points: number;
  goal_difference: number;
}

export interface RealKnockoutResult {
  match_key: string;
  winner_team_id: number;
  score_a: number | null;
  score_b: number | null;
}

export interface LocalScore {
  a: number | string;
  b: number | string;
  team_a_id?: number;
  team_b_id?: number;
}

export interface LocalScores {
  [groupLetter: string]: {
    [matchNumber: number]: LocalScore;
  };
}

export interface TiebreakerDecision {
  tiedTeamIds: number[];
  resolvedOrder: number[];
}

export interface TiebreakerDecisions {
  [groupLetter: string]: TiebreakerDecision;
}

export interface CurrentTiebreaker extends UnresolvableTie {
  group: string;
}

export interface LocalKnockoutResult {
  winner: number | null;
  scoreA: number | string;
  scoreB: number | string;
}

export interface LocalKnockoutResults {
  [matchKey: string]: LocalKnockoutResult;
}

export interface ExtendedMockTeam extends MockTeam {
  actualTeamId?: number;
  thirdPlaceFrom?: string;
  isPlayoffWinner?: boolean;
}

export interface AdminBracketMatchData {
  matchId: string;
  matchNumber: number;
  teamA: ExtendedMockTeam | null;
  teamB: ExtendedMockTeam | null;
  selectedWinner: number | null;
  scoreA: number | string;
  scoreB: number | string;
  fromA?: string;
  fromB?: string;
}

// Common props shared across tabs
export interface AdminTabBaseProps {
  showSuccess: (msg: string) => void;
  setError: (msg: string | null) => void;
}

export interface StatsTabProps {
  stats: import('@/types').AdminStats | null;
}

export interface PlayoffsTabProps extends AdminTabBaseProps {
  realPlayoffs: RealPlayoffResult[];
  onSave: () => Promise<void>;
}

export interface GroupsTabProps extends AdminTabBaseProps {
  realPlayoffs: RealPlayoffResult[];
  realGroupMatches: RealGroupMatch[];
}

export interface KnockoutTabProps extends AdminTabBaseProps {
  realPlayoffs: RealPlayoffResult[];
  realGroupStandings: RealGroupStanding[];
  realKnockout: RealKnockoutResult[];
  onSave: () => Promise<void>;
}

export interface AdminBracketMatchProps {
  match: AdminBracketMatchData;
  onScoreChange: (matchId: string, teamAId: number | null, teamBId: number | null, scoreA: string, scoreB: string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  matchWidth: number;
}

export interface AdminBracketProps {
  r32Matches: AdminBracketMatchData[];
  r16Matches: AdminBracketMatchData[];
  qfMatches: AdminBracketMatchData[];
  sfMatches: AdminBracketMatchData[];
  final: AdminBracketMatchData;
  thirdPlace: AdminBracketMatchData;
  onScoreChange: (matchId: string, teamAId: number | null, teamBId: number | null, scoreA: string, scoreB: string) => void;
  onSelectWinner: (matchId: string, teamId: number) => void;
  getTeamById: (id: number | null) => ExtendedMockTeam | null;
}
