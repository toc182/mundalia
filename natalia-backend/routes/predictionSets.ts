import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { auth } from '../middleware/auth';
import { success, created, notFound, validationError, serverError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const router: Router = express.Router();

interface PredictionSetRow {
  id: number;
  user_id: number;
  name: string;
  mode: 'positions' | 'scores';
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
  group_count?: number;
  playoff_count?: number;
  knockout_count?: number;
  third_places?: string[];
}

interface CreateSetBody {
  name: string;
  mode?: 'positions' | 'scores';
}

interface UpdateSetBody {
  name: string;
}

interface DuplicateSetBody {
  name?: string;
}

// Get all prediction sets for user
router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await db.query(
      `SELECT ps.*,
        (SELECT COUNT(*) FROM group_predictions WHERE prediction_set_id = ps.id) as group_count,
        (SELECT COUNT(*) FROM playoff_predictions WHERE prediction_set_id = ps.id) as playoff_count,
        (SELECT COUNT(*) FROM knockout_predictions WHERE prediction_set_id = ps.id) as knockout_count,
        (SELECT selected_groups FROM third_place_predictions WHERE prediction_set_id = ps.id) as third_places
      FROM prediction_sets ps
      WHERE ps.user_id = $1
      ORDER BY ps.created_at DESC`,
      [authReq.user.id]
    );

    success(res, result.rows as PredictionSetRow[]);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Get single prediction set with all data
router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = req.params.id;

    // Verify ownership
    const setResult = await db.query(
      'SELECT * FROM prediction_sets WHERE id = $1 AND user_id = $2',
      [setId, authReq.user.id]
    );

    if (setResult.rows.length === 0) {
      notFound(res, 'Prediction set not found');
      return;
    }

    // Get all predictions for this set
    const [groupPredictions, playoffPredictions, thirdPlaces, knockoutPredictions] = await Promise.all([
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.prediction_set_id = $1
        ORDER BY gp.group_letter, gp.predicted_position
      `, [setId]),
      db.query('SELECT * FROM playoff_predictions WHERE prediction_set_id = $1', [setId]),
      db.query('SELECT selected_groups FROM third_place_predictions WHERE prediction_set_id = $1', [setId]),
      db.query('SELECT match_key, winner_team_id FROM knockout_predictions WHERE prediction_set_id = $1', [setId])
    ]);

    // Format playoff predictions
    interface PlayoffPredRow {
      playoff_id: string;
      semifinal_winner_1?: number;
      semifinal_winner_2?: number;
      final_winner?: number;
    }

    const playoffs: Record<string, { semi1?: number; semi2?: number; final?: number }> = {};
    (playoffPredictions.rows as PlayoffPredRow[]).forEach(row => {
      playoffs[row.playoff_id] = {
        semi1: row.semifinal_winner_1,
        semi2: row.semifinal_winner_2,
        final: row.final_winner
      };
    });

    // Format knockout predictions
    interface KnockoutPredRow {
      match_key: string;
      winner_team_id: number;
    }

    const knockout: Record<string, number> = {};
    (knockoutPredictions.rows as KnockoutPredRow[]).forEach(row => {
      knockout[row.match_key] = row.winner_team_id;
    });

    success(res, {
      ...setResult.rows[0],
      groupPredictions: groupPredictions.rows,
      playoffPredictions: playoffs,
      thirdPlaces: (thirdPlaces.rows[0] as { selected_groups?: string[] })?.selected_groups || null,
      knockoutPredictions: knockout
    });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Create new prediction set
router.post('/', auth, async (req: Request<unknown, unknown, CreateSetBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { name, mode = 'positions' } = req.body;

  if (!name || name.trim().length === 0) {
    validationError(res, 'Name is required');
    return;
  }

  if (!['positions', 'scores'].includes(mode)) {
    validationError(res, 'Invalid mode. Must be "positions" or "scores"');
    return;
  }

  try {
    const result = await db.query(
      'INSERT INTO prediction_sets (user_id, name, mode) VALUES ($1, $2, $3) RETURNING *',
      [authReq.user.id, name.trim(), mode]
    );

    created(res, result.rows[0] as PredictionSetRow);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Update prediction set name
router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  const { name } = req.body as UpdateSetBody;
  const setId = req.params.id;

  if (!name || name.trim().length === 0) {
    validationError(res, 'Name is required');
    return;
  }

  try {
    const result = await db.query(
      'UPDATE prediction_sets SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), setId, authReq.user.id]
    );

    if (result.rows.length === 0) {
      notFound(res, 'Prediction set not found');
      return;
    }

    success(res, result.rows[0] as PredictionSetRow);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Delete prediction set
router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const setId = req.params.id;

  try {
    const result = await db.query(
      'DELETE FROM prediction_sets WHERE id = $1 AND user_id = $2 RETURNING id',
      [setId, authReq.user.id]
    );

    if (result.rows.length === 0) {
      notFound(res, 'Prediction set not found');
      return;
    }

    success(res, null, 'Prediction set deleted');
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Duplicate a prediction set (with transaction for data consistency)
router.post('/:id/duplicate', auth, async (req: Request, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  const sourceSetId = req.params.id;
  const { name } = req.body;

  // Use transaction to ensure all-or-nothing duplication
  const client = await db.pool.connect();

  try {
    // Verify ownership of source (before starting transaction)
    const sourceSet = await client.query(
      'SELECT * FROM prediction_sets WHERE id = $1 AND user_id = $2',
      [sourceSetId, authReq.user.id]
    );

    if (sourceSet.rows.length === 0) {
      notFound(res, 'Source prediction set not found');
      return;
    }

    // Start transaction
    await client.query('BEGIN');

    // Create new set (preserve mode from source)
    const sourceRow = sourceSet.rows[0] as PredictionSetRow;
    const newName = name || `${sourceRow.name} (copia)`;
    const sourceMode = sourceRow.mode || 'positions';
    const newSet = await client.query(
      'INSERT INTO prediction_sets (user_id, name, mode) VALUES ($1, $2, $3) RETURNING *',
      [authReq.user.id, newName, sourceMode]
    );
    const newSetId = (newSet.rows[0] as PredictionSetRow).id;

    // Copy group predictions
    await client.query(`
      INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position, prediction_set_id)
      SELECT user_id, group_letter, team_id, predicted_position, $1
      FROM group_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy playoff predictions
    await client.query(`
      INSERT INTO playoff_predictions (user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, prediction_set_id)
      SELECT user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, $1
      FROM playoff_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy third place predictions
    await client.query(`
      INSERT INTO third_place_predictions (user_id, selected_groups, prediction_set_id)
      SELECT user_id, selected_groups, $1
      FROM third_place_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy knockout predictions
    await client.query(`
      INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, prediction_set_id)
      SELECT user_id, match_key, winner_team_id, $1
      FROM knockout_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Commit transaction
    await client.query('COMMIT');

    created(res, newSet.rows[0] as PredictionSetRow);
  } catch (err) {
    // Rollback on any error
    await client.query('ROLLBACK');
    console.error('[DUPLICATE] Transaction error:', err);
    serverError(res, err as Error);
  } finally {
    client.release();
  }
});

export default router;
