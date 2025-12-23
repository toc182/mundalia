// ============================================
// TIPOS COMPARTIDOS - MUNDALIA FRONTEND
// ============================================

// ============ USUARIOS ============

export interface User {
  id: number;
  name: string;
  email: string;
  username?: string;
  country?: string;
  birth_date?: string;
  role?: 'user' | 'admin';
  google_id?: string;
  created_at?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

// ============ EQUIPOS ============

export interface Team {
  id: number;
  name: string;
  code: string;
  group_letter: string;
  flag_url?: string;
  is_playoff?: boolean;
  playoff_id?: string;
}

// ============ PREDICTION SETS ============

export interface PredictionSet {
  id: number;
  user_id: number;
  name: string;
  mode: 'positions' | 'scores';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Contadores (nombres del backend)
  group_count?: number;
  playoff_count?: number;
  knockout_count?: number;
  third_places?: string | null;
}

// ============ PREDICCIONES ============

export interface GroupPrediction {
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

export interface PlayoffPrediction {
  playoff_id: string;
  semi1?: number | null;
  semi2?: number | null;
  final?: number | null;
}

export interface KnockoutPrediction {
  match_key: string;
  winner_team_id: number;
  score_a?: number;
  score_b?: number;
}

// Score predictions are stored as nested objects:
// Record<group_letter, Record<match_number, { a: number; b: number }>>
// See api.ts for type definitions

export interface TiebreakerDecision {
  group_letter: string;
  team_order: number[];
}

// ============ GRUPOS Y PARTIDOS ============

export interface GroupMatch {
  matchIndex: number;
  teamAIndex: number;
  teamBIndex: number;
}

export interface GroupData {
  letter: string;
  teams: Team[];
}

// ============ KNOCKOUT ============

export interface KnockoutMatch {
  id: string;
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
  teamA: Team | null;
  teamB: Team | null;
  winner?: number;
  scoreA?: number;
  scoreB?: number;
  sourceA?: string;
  sourceB?: string;
}

export interface KnockoutBracket {
  roundOf32: KnockoutMatch[];
  roundOf16: KnockoutMatch[];
  quarterFinals: KnockoutMatch[];
  semiFinals: KnockoutMatch[];
  thirdPlace: KnockoutMatch;
  final: KnockoutMatch;
}

// ============ PLAYOFFS ============

export interface PlayoffTeam {
  id: number;
  name: string;
  code: string;
  flag_url?: string;
}

export interface PlayoffMatch {
  id: string;
  teamA: PlayoffTeam;
  teamB: PlayoffTeam;
}

export interface Playoff {
  id: string;
  name: string;
  destinationGroup: string;
  destinationTeamId: number;
  semifinals: PlayoffMatch[];
  final: PlayoffMatch;
}

// ============ TERCEROS LUGARES ============

export interface ThirdPlaceCombination {
  key: string;
  groups: string[];
  assignments: Record<string, string>;
}

export interface ThirdPlaceTeam {
  team: Team;
  group: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

// ============ LEADERBOARD ============

export interface LeaderboardEntry {
  prediction_set_id: number;
  prediction_name: string;
  mode: string;
  created_at: string;
  user_id: number;
  user_name: string;
  username?: string;
  country?: string;
  total_points: number;
  points_breakdown?: {
    groupExact: number;
    groupQualifier: number;
    knockout: number;
  };
}

// ============ GRUPOS PRIVADOS ============

export interface PrivateGroup {
  id: number;
  name: string;
  code: string;
  owner_id: number;
  owner_name: string;
  member_count: number;
  created_at: string;
}

// ============ ADMIN ============

export interface AdminStats {
  total_users: number;
  total_predictions: number;
  playoffs_entered: number;
  groups_entered: number;
  knockout_entered: number;
}

// ============ API RESPONSES ============

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

// ============ COMPONENTES ============

export interface MatchBoxProps {
  matchId: string;
  teamA: Team | null;
  teamB: Team | null;
  selectedWinner: number | null;
  onSelect: (matchId: string, teamId: number) => void;
  mode?: 'click' | 'scores' | 'readonly';
  scoreA?: number | string;
  scoreB?: number | string;
  onScoreChange?: (matchId: string, teamAId: number, teamBId: number, scoreA: string, scoreB: string) => void;
  disabled?: boolean;
}
