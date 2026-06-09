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

// Check whether a user belongs to a group
async function isMember(groupId: string | number, userId: number): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM private_group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return result.rows.length > 0;
}

// Check whether predictions are closed (past the global deadline).
// Uses the same 'predictions_deadline' setting the admin sets and the UI reads.
async function predictionsClosed(): Promise<boolean> {
  const result = await db.query(
    "SELECT value FROM settings WHERE key = 'predictions_deadline'"
  );
  if (result.rows.length === 0) return false; // no deadline set => always open
  const deadlineDate = new Date((result.rows[0] as { value: string }).value);
  return new Date() > deadlineDate;
}

// Score a set of prediction sets against the real results.
// Returns a map of prediction_set_id -> total points (0 for sets with no scoring preds).
// OPTIMIZED: loads all data in 4 parallel queries regardless of how many sets.
async function calculateScoresForSets(setIds: number[]): Promise<Record<number, number>> {
  const scores: Record<number, number> = {};
  setIds.forEach(id => { scores[id] = 0; });
  if (setIds.length === 0) return scores;

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

  // Score group predictions
  (allGroupPreds.rows as GroupPrediction[]).forEach(pred => {
    const realPositions = realGroupMap[pred.group_letter];
    if (!realPositions) return;
    const realPosition = realPositions[pred.team_id];
    if (realPosition === undefined) return;

    if (pred.predicted_position === realPosition) {
      scores[pred.prediction_set_id] += POINTS.GROUP_EXACT_POSITION;
    } else if (pred.predicted_position <= 2 && realPosition <= 2) {
      scores[pred.prediction_set_id] += POINTS.GROUP_QUALIFIER;
    }
  });

  // Score knockout predictions
  (allKnockoutPreds.rows as KnockoutPrediction[]).forEach(pred => {
    const realWinner = realKnockoutMap[pred.match_key];
    if (realWinner === undefined) return;
    if (pred.winner_team_id === realWinner) {
      scores[pred.prediction_set_id] += getMatchPoints(pred.match_key);
    }
  });

  return scores;
}

// Calculate best score for a user (across all their complete prediction sets)
async function calculateUserBestScore(userId: number): Promise<number> {
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
  const scores = await calculateScoresForSets(setIds);
  return Math.max(0, ...Object.values(scores));
}

// Get group details
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!(await isMember(req.params.id, authReq.user.id))) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    const result = await db.query(`
      SELECT pg.id, pg.name, pg.code, pg.owner_id,
             (SELECT COUNT(*) FROM private_group_members WHERE group_id = pg.id) as member_count
      FROM private_groups pg
      WHERE pg.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      notFound(res, 'Group not found');
      return;
    }

    const g = result.rows[0];
    success(res, {
      id: g.id,
      name: g.name,
      code: g.code,
      member_count: Number(g.member_count),
      is_owner: g.owner_id === authReq.user.id
    });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Get group leaderboard (one row per linked prediction)
router.get('/:id/leaderboard', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!(await isMember(req.params.id, authReq.user.id))) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    // All predictions linked to this group, with owner info and completeness
    const linked = await db.query(`
      SELECT ps.id as set_id, ps.public_id, ps.name as prediction_name,
             ps.user_id as owner_id, u.name as owner_name, u.username as owner_username,
             EXISTS (
               SELECT 1 FROM knockout_predictions kp
               WHERE kp.prediction_set_id = ps.id
                 AND kp.match_key = 'M104' AND kp.winner_team_id IS NOT NULL
             ) as is_complete
      FROM group_prediction_links gpl
      JOIN prediction_sets ps ON gpl.prediction_set_id = ps.id
      JOIN users u ON ps.user_id = u.id
      WHERE gpl.group_id = $1
    `, [req.params.id]);

    // Only complete sets are scored; incomplete ones show 0
    const completeIds = linked.rows.filter((r: any) => r.is_complete).map((r: any) => r.set_id);
    const scores = await calculateScoresForSets(completeIds);

    const leaderboard = (linked.rows as any[]).map(r => ({
      public_id: r.public_id,
      prediction_name: r.prediction_name,
      owner_name: r.owner_username || r.owner_name,
      is_complete: r.is_complete,
      total_points: scores[r.set_id] || 0,
      is_mine: r.owner_id === authReq.user.id
    }));

    leaderboard.sort((a, b) => b.total_points - a.total_points);

    success(res, leaderboard);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Get the caller's prediction sets with a flag for whether each is linked to this group
router.get('/:id/linkable', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!(await isMember(req.params.id, authReq.user.id))) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    const sets = await db.query(`
      SELECT ps.public_id, ps.name, ps.mode, ps.created_at,
             EXISTS (
               SELECT 1 FROM group_prediction_links gpl
               WHERE gpl.group_id = $1 AND gpl.prediction_set_id = ps.id
             ) as is_linked
      FROM prediction_sets ps
      WHERE ps.user_id = $2
      ORDER BY ps.created_at DESC
    `, [req.params.id, authReq.user.id]);

    success(res, sets.rows);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Link one of the caller's predictions to the group
router.post('/:id/predictions', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { predictionSetId } = req.body as { predictionSetId: string };

    if (!(await isMember(req.params.id, authReq.user.id))) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    if (await predictionsClosed()) {
      error(res, 'Predictions are closed', 403, 'DEADLINE_PASSED');
      return;
    }

    // Resolve the set by public_id and verify ownership
    const set = await db.query(
      'SELECT id FROM prediction_sets WHERE public_id = $1 AND user_id = $2',
      [predictionSetId, authReq.user.id]
    );
    if (set.rows.length === 0) {
      notFound(res, 'Prediction not found');
      return;
    }

    const ins = await db.query(
      `INSERT INTO group_prediction_links (group_id, prediction_set_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, prediction_set_id) DO NOTHING
       RETURNING id`,
      [req.params.id, set.rows[0].id]
    );

    if (ins.rows.length === 0) {
      error(res, 'Prediction already linked to this group', 409, 'ALREADY_LINKED');
      return;
    }

    success(res, null, 'Prediction linked to group', 201);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Unlink one of the caller's predictions from the group (does not delete the prediction)
router.delete('/:id/predictions/:publicId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    if (!(await isMember(req.params.id, authReq.user.id))) {
      forbidden(res, 'Not a member of this group');
      return;
    }

    if (await predictionsClosed()) {
      error(res, 'Predictions are closed', 403, 'DEADLINE_PASSED');
      return;
    }

    const set = await db.query(
      'SELECT id FROM prediction_sets WHERE public_id = $1 AND user_id = $2',
      [req.params.publicId, authReq.user.id]
    );
    if (set.rows.length === 0) {
      notFound(res, 'Prediction not found');
      return;
    }

    await db.query(
      'DELETE FROM group_prediction_links WHERE group_id = $1 AND prediction_set_id = $2',
      [req.params.id, set.rows[0].id]
    );

    success(res, null, 'Prediction unlinked from group');
  } catch (err) {
    serverError(res, err as Error);
  }
});

export default router;
