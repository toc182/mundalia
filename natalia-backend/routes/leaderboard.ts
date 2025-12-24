import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { POINTS, getMatchPoints } from '../utils/scoring';
import { success, serverError } from '../utils/response';
import { optionalAuth } from '../middleware/auth';

const router: Router = express.Router();

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

interface CacheEntry {
  data: LeaderboardEntry[] | null;
  timestamp: number;
}

interface LeaderboardCache {
  positions: CacheEntry;
  scores: CacheEntry;
  [key: string]: CacheEntry;
}

const cache: LeaderboardCache = {
  positions: { data: null, timestamp: 0 },
  scores: { data: null, timestamp: 0 }
};

interface PaginatedLeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  totalPages: number;
  userPosition: number | null;
  userPage: number | null;
}

interface PredictionSetRow {
  prediction_set_id: number;
  prediction_name: string;
  mode: string;
  created_at: Date;
  user_id: number;
  user_name: string;
  username?: string;
  country?: string;
}

interface GroupPrediction {
  prediction_set_id: number;
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

interface KnockoutPrediction {
  prediction_set_id: number;
  match_key: string;
  winner_team_id: number;
}

interface RealGroupStanding {
  group_letter: string;
  team_id: number;
  final_position: number;
}

interface RealKnockoutResult {
  match_key: string;
  winner_team_id: number;
}

interface PointsBreakdown {
  groupExact: number;
  groupQualifier: number;
  knockout: number;
}

interface LeaderboardEntry extends PredictionSetRow {
  total_points: number;
  points_breakdown: PointsBreakdown;
}

// Optimized: Calculate leaderboard with minimal queries
async function calculateLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
  // Single query to get all complete prediction sets with user info
  const predictionSets = await db.query(`
    SELECT
      ps.id as prediction_set_id,
      ps.name as prediction_name,
      ps.mode,
      ps.created_at,
      u.id as user_id,
      u.name as user_name,
      u.username,
      u.country
    FROM prediction_sets ps
    INNER JOIN users u ON ps.user_id = u.id
    WHERE ps.mode = $1
      AND EXISTS (
        SELECT 1 FROM knockout_predictions kp
        WHERE kp.prediction_set_id = ps.id
          AND kp.match_key = 'M104'
          AND kp.winner_team_id IS NOT NULL
      )
  `, [mode]);

  if (predictionSets.rows.length === 0) {
    return [];
  }

  // Get all prediction set IDs
  const setIds = (predictionSets.rows as PredictionSetRow[]).map(r => r.prediction_set_id);

  // OPTIMIZED: Load ALL data in just 4 queries total (instead of 2N+2)
  const [realGroupStandings, realKnockout, allGroupPreds, allKnockoutPreds] = await Promise.all([
    db.query('SELECT * FROM real_group_standings'),
    db.query('SELECT * FROM real_knockout_results'),
    db.query('SELECT * FROM group_predictions WHERE prediction_set_id = ANY($1)', [setIds]),
    db.query('SELECT * FROM knockout_predictions WHERE prediction_set_id = ANY($1)', [setIds])
  ]);

  // Build lookup maps for real results
  const realGroupMap: Record<string, Record<number, number>> = {};
  (realGroupStandings.rows as RealGroupStanding[]).forEach(row => {
    if (!realGroupMap[row.group_letter]) realGroupMap[row.group_letter] = {};
    realGroupMap[row.group_letter][row.team_id] = row.final_position;
  });

  const realKnockoutMap: Record<string, number> = {};
  (realKnockout.rows as RealKnockoutResult[]).forEach(row => {
    realKnockoutMap[row.match_key] = row.winner_team_id;
  });

  // Build prediction maps grouped by prediction_set_id
  const groupPredsBySet: Record<number, GroupPrediction[]> = {};
  (allGroupPreds.rows as GroupPrediction[]).forEach(pred => {
    if (!groupPredsBySet[pred.prediction_set_id]) {
      groupPredsBySet[pred.prediction_set_id] = [];
    }
    groupPredsBySet[pred.prediction_set_id].push(pred);
  });

  const knockoutPredsBySet: Record<number, KnockoutPrediction[]> = {};
  (allKnockoutPreds.rows as KnockoutPrediction[]).forEach(pred => {
    if (!knockoutPredsBySet[pred.prediction_set_id]) {
      knockoutPredsBySet[pred.prediction_set_id] = [];
    }
    knockoutPredsBySet[pred.prediction_set_id].push(pred);
  });

  // Calculate points for each prediction set (in memory, no more queries)
  const leaderboard: LeaderboardEntry[] = (predictionSets.rows as PredictionSetRow[]).map(row => {
    let totalPoints = 0;
    const breakdown: PointsBreakdown = { groupExact: 0, groupQualifier: 0, knockout: 0 };

    // Score group predictions
    const groupPreds = groupPredsBySet[row.prediction_set_id] || [];
    groupPreds.forEach(pred => {
      const realPositions = realGroupMap[pred.group_letter];
      if (!realPositions) return;

      const realPosition = realPositions[pred.team_id];
      if (realPosition === undefined) return;

      if (pred.predicted_position === realPosition) {
        totalPoints += POINTS.GROUP_EXACT_POSITION;
        breakdown.groupExact += POINTS.GROUP_EXACT_POSITION;
      } else if (pred.predicted_position <= 2 && realPosition <= 2) {
        totalPoints += POINTS.GROUP_QUALIFIER;
        breakdown.groupQualifier += POINTS.GROUP_QUALIFIER;
      }
    });

    // Score knockout predictions
    const knockoutPreds = knockoutPredsBySet[row.prediction_set_id] || [];
    knockoutPreds.forEach(pred => {
      const realWinner = realKnockoutMap[pred.match_key];
      if (realWinner === undefined) return;

      if (pred.winner_team_id === realWinner) {
        const points = getMatchPoints(pred.match_key);
        totalPoints += points;
        breakdown.knockout += points;
      }
    });

    return {
      ...row,
      total_points: totalPoints,
      points_breakdown: breakdown
    };
  });

  // Sort by points descending, then by name
  leaderboard.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.user_name.localeCompare(b.user_name);
  });

  return leaderboard;
}

// Get global leaderboard with caching and pagination
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const mode = (req.query.mode as string) || 'positions';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_PAGE_SIZE));
  const userId = (req as any).user?.id || null;

  try {
    // Check cache for full leaderboard
    let leaderboard: LeaderboardEntry[];
    const cached = cache[mode];
    if (cached && cached.data && (Date.now() - cached.timestamp < CACHE_TTL)) {
      leaderboard = cached.data;
    } else {
      // Calculate fresh leaderboard
      leaderboard = await calculateLeaderboard(mode);
      // Update cache
      cache[mode] = { data: leaderboard, timestamp: Date.now() };
    }

    // Find user's position and page
    let userPosition: number | null = null;
    let userPage: number | null = null;
    if (userId) {
      const userIndex = leaderboard.findIndex(e => e.user_id === userId);
      if (userIndex !== -1) {
        userPosition = userIndex + 1;
        userPage = Math.ceil(userPosition / limit);
      }
    }

    // Paginate
    const total = leaderboard.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const entries = leaderboard.slice(startIndex, startIndex + limit);

    const response: PaginatedLeaderboardResponse = {
      entries,
      total,
      page,
      totalPages,
      userPosition,
      userPage
    };

    success(res, response);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface CountRow {
  mode: string;
  count: string;
}

// Get count of complete predictions by mode
router.get('/counts', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT
        ps.mode,
        COUNT(*) as count
      FROM prediction_sets ps
      WHERE EXISTS (
        SELECT 1 FROM knockout_predictions kp
        WHERE kp.prediction_set_id = ps.id
          AND kp.match_key = 'M104'
          AND kp.winner_team_id IS NOT NULL
      )
      GROUP BY ps.mode
    `);

    const counts: Record<string, number> = { positions: 0, scores: 0 };
    (result.rows as CountRow[]).forEach(row => {
      counts[row.mode] = parseInt(row.count, 10);
    });

    success(res, counts);
  } catch (err) {
    serverError(res, err as Error);
  }
});

export default router;
