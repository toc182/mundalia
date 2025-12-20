import { Request, Response, NextFunction } from 'express';
import { QueryResult, Pool, PoolClient } from 'pg';

// ============================================
// User Types
// ============================================

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  username?: string;
  country?: string;
  birth_date?: string;
  created_at: Date;
  updated_at?: Date;
}

// UserRow - Used for database query results
export interface UserRow {
  id: number;
  email: string;
  name: string;
  username?: string;
  role: string;
  password?: string;
  google_id?: string;
  country?: string;
  birth_date?: string;
  created_at: Date;
}

export interface JwtPayload {
  id: number;
  email: string;
  role?: string;
}

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ============================================
// Database Types
// ============================================

export interface DatabaseModule {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
  pool: Pool;
}

// ============================================
// Team Types
// ============================================

export interface Team {
  id: number;
  name: string;
  code: string;
  group_letter: string;
  flag_url?: string;
  is_playoff: boolean;
  playoff_id?: string;
}

// ============================================
// Prediction Types
// ============================================

export interface PredictionSet {
  id: number;
  user_id: number;
  name: string;
  mode: 'positions' | 'scores';
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface GroupPrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

export interface PlayoffPrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  playoff_id: string;
  semifinal_winner_1?: number;
  semifinal_winner_2?: number;
  final_winner?: number;
}

export interface ThirdPlacePrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  selected_groups: string[];
  combination_key?: string;
}

export interface KnockoutPrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  match_key: string;
  winner_team_id: number;
}

export interface ScorePrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  group_letter: string;
  match_index: number;
  home_score: number;
  away_score: number;
}

export interface TiebreakerPrediction {
  id: number;
  user_id: number;
  prediction_set_id: number;
  group_letter: string;
  tied_team_ids: number[];
  resolved_order: number[];
}

// ============================================
// Groups (Private Groups) Types
// ============================================

export interface PrivateGroup {
  id: number;
  name: string;
  code: string;
  created_by: number;
  created_at: Date;
}

export interface PrivateGroupMember {
  id: number;
  group_id: number;
  user_id: number;
  joined_at: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  code?: string;
}

// ============================================
// Leaderboard Types
// ============================================

export interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  prediction_id: number;
  prediction_name: string;
  total_points: number;
  points_breakdown: PointsBreakdown;
}

export interface PointsBreakdown {
  groupExact: number;
  groupQualifier: number;
  knockout: number;
  thirdPlace?: number;
}

// ============================================
// Middleware Types
// ============================================

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type AsyncHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// ============================================
// Validation Types
// ============================================

export type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export type PlayoffId = 'uefa_a' | 'uefa_b' | 'uefa_c' | 'uefa_d' | 'fifa_1' | 'fifa_2';

export type MatchKey = `M${number}`;

// ============================================
// Points Configuration
// ============================================

export interface PointsConfig {
  GROUP_EXACT_POSITION: number;
  GROUP_QUALIFIER: number;
  R32: number;
  R16: number;
  QUARTER: number;
  SEMI: number;
  FINALIST: number;
  CHAMPION: number;
  THIRD_PLACE: number;
}

export const POINTS: PointsConfig = {
  GROUP_EXACT_POSITION: 3,
  GROUP_QUALIFIER: 1,
  R32: 1,
  R16: 2,
  QUARTER: 4,
  SEMI: 6,
  FINALIST: 8,
  CHAMPION: 15,
  THIRD_PLACE: 2,
};
