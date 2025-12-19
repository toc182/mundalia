import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { auth } from '../middleware/auth';
import { POINTS, getMatchPoints } from '../utils/scoring';
import { success, error, notFound, forbidden, serverError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const router: Router = express.Router();

interface PrivateGroupRow {
  id: number;
  name: string;
  code: string;
  owner_id: number;
  owner_name?: string;
  member_count?: number;
  created_at: Date;
}

interface GroupMember {
  id: number;
  name: string;
  username?: string;
  total_points?: number;
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

// Get all private groups
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await db.query(`
      SELECT pg.*, u.name as owner_name,
             (SELECT COUNT(*) FROM private_group_members WHERE group_id = pg.id) as member_count
      FROM private_groups pg
      JOIN users u ON pg.owner_id = u.id
      JOIN private_group_members pgm ON pg.id = pgm.group_id
      WHERE pgm.user_id = $1
      ORDER BY pg.created_at DESC
    `, [authReq.user.id]);
    success(res, result.rows as PrivateGroupRow[]);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Create private group
router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { name } = req.body as { name: string };

  try {
    // Generate unique code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.query(
      'INSERT INTO private_groups (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, authReq.user.id]
    );

    // Add owner as member
    await db.query(
      'INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, authReq.user.id]
    );

    success(res, result.rows[0] as PrivateGroupRow, 'Group created successfully', 201);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Join private group by code
router.post('/join', auth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { code } = req.body as { code: string };

  try {
    const group = await db.query(
      'SELECT * FROM private_groups WHERE code = $1',
      [code.toUpperCase()]
    );

    if (group.rows.length === 0) {
      notFound(res, 'Group not found');
      return;
    }

    // Check if already member
    const existing = await db.query(
      'SELECT * FROM private_group_members WHERE group_id = $1 AND user_id = $2',
      [group.rows[0].id, authReq.user.id]
    );

    if (existing.rows.length > 0) {
      error(res, 'Already a member of this group', 400, 'ALREADY_MEMBER');
      return;
    }

    await db.query(
      'INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)',
      [group.rows[0].id, authReq.user.id]
    );

    success(res, { group: group.rows[0] as PrivateGroupRow }, 'Joined group successfully');
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Calculate best score for a user (across all their prediction sets)
// OPTIMIZED: Load all predictions in 2 queries instead of 2N
async function calculateUserBestScore(userId: number): Promise<number> {
  // Get all complete prediction sets for user
  const predSets = await db.query(`
    SELECT ps.id FROM prediction_sets ps
    WHERE ps.user_id = $1
      AND EXISTS (
        SELECT 1 FROM knockout_predictions kp
        WHERE kp.prediction_set_id = ps.id
          AND kp.match_key = 'M104'
          AND kp.winner_team_id IS NOT NULL
      )
  `, [userId]);

  if (predSets.rows.length === 0) return 0;

  const setIds = predSets.rows.map((ps: { id: number }) => ps.id);

  // OPTIMIZED: Load ALL data in 4 parallel queries (instead of 2N+2)
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

  // Group predictions by set_id
  const groupPredsBySet: Record<number, GroupPrediction[]> = {};
  (allGroupPreds.rows as GroupPrediction[]).forEach(pred => {
    if (!groupPredsBySet[pred.prediction_set_id]) groupPredsBySet[pred.prediction_set_id] = [];
    groupPredsBySet[pred.prediction_set_id].push(pred);
  });

  const knockoutPredsBySet: Record<number, KnockoutPrediction[]> = {};
  (allKnockoutPreds.rows as KnockoutPrediction[]).forEach(pred => {
    if (!knockoutPredsBySet[pred.prediction_set_id]) knockoutPredsBySet[pred.prediction_set_id] = [];
    knockoutPredsBySet[pred.prediction_set_id].push(pred);
  });

  // Calculate best score across all sets (in memory, no more queries)
  let bestScore = 0;

  for (const ps of predSets.rows as { id: number }[]) {
    let score = 0;

    // Score group predictions
    const groupPreds = groupPredsBySet[ps.id] || [];
    groupPreds.forEach(pred => {
      const realPositions = realGroupMap[pred.group_letter];
      if (!realPositions) return;

      const realPosition = realPositions[pred.team_id];
      if (realPosition === undefined) return;

      if (pred.predicted_position === realPosition) {
        score += POINTS.GROUP_EXACT_POSITION;
      } else if (pred.predicted_position <= 2 && realPosition <= 2) {
        score += POINTS.GROUP_QUALIFIER;
      }
    });

    // Score knockout predictions
    const knockoutPreds = knockoutPredsBySet[ps.id] || [];
    knockoutPreds.forEach(pred => {
      const realWinner = realKnockoutMap[pred.match_key];
      if (realWinner === undefined) return;

      if (pred.winner_team_id === realWinner) {
        score += getMatchPoints(pred.match_key);
      }
    });

    if (score > bestScore) bestScore = score;
  }

  return bestScore;
}

// Get group leaderboard
router.get('/:id/leaderboard', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    // Verify user is member
    const isMember = await db.query(
      'SELECT * FROM private_group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, authReq.user.id]
    );

    if (isMember.rows.length === 0) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    // Get group members
    const members = await db.query(`
      SELECT u.id, u.name, u.username
      FROM private_group_members pgm
      JOIN users u ON pgm.user_id = u.id
      WHERE pgm.group_id = $1
    `, [req.params.id]);

    // Calculate points for each member
    const leaderboard = await Promise.all(
      (members.rows as GroupMember[]).map(async (member) => {
        const total_points = await calculateUserBestScore(member.id);
        return { ...member, total_points };
      })
    );

    // Sort by points descending
    leaderboard.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    success(res, leaderboard);
  } catch (err) {
    serverError(res, err as Error);
  }
});

export default router;
