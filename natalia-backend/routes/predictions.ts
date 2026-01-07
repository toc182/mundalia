import express, { Request, Response, Router } from 'express';
import db, { pool } from '../config/db';
import { auth } from '../middleware/auth';
import { isValidGroupLetter, isValidPosition, isValidTeamId, isValidMatchKey, isValidPlayoffId } from '../utils/validators';
import { success, error, notFound, validationError, serverError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const router: Router = express.Router();

// Helper to resolve public_id to internal id
async function resolveSetId(publicIdOrId: string | number | undefined, userId: number): Promise<number | null> {
  if (!publicIdOrId) return null;

  // Try to find by public_id first (new format - 8 char strings)
  const result = await db.query(
    'SELECT id FROM prediction_sets WHERE public_id = $1 AND user_id = $2',
    [publicIdOrId, userId]
  );

  if (result.rows.length > 0) {
    return (result.rows[0] as { id: number }).id;
  }

  // Fallback: try as numeric id (legacy support)
  if (!isNaN(Number(publicIdOrId))) {
    const legacyResult = await db.query(
      'SELECT id FROM prediction_sets WHERE id = $1 AND user_id = $2',
      [publicIdOrId, userId]
    );
    if (legacyResult.rows.length > 0) {
      return (legacyResult.rows[0] as { id: number }).id;
    }
  }

  return null;
}

// Helper to get setId from query param or create default
async function getSetIdFromQuery(querySetId: string | undefined, userId: number): Promise<number> {
  if (querySetId) {
    const resolved = await resolveSetId(querySetId, userId);
    if (resolved) return resolved;
  }
  return await getOrCreateDefaultSet(userId);
}

// Helper to get or create default prediction set
async function getOrCreateDefaultSet(userId: number): Promise<number> {
  // Check if user has any prediction sets
  let result = await db.query(
    'SELECT id FROM prediction_sets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (result.rows.length === 0) {
    // Create default set
    result = await db.query(
      "INSERT INTO prediction_sets (user_id, name) VALUES ($1, 'Mi Prediccion') RETURNING id",
      [userId]
    );
  }

  return (result.rows[0] as { id: number }).id;
}

// Get user's predictions (legacy - returns most recent set)
router.get('/my', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const [matchPredictions, groupPredictions] = await Promise.all([
      db.query(`
        SELECT mp.*, m.phase, m.group_letter, m.match_date,
               ta.name as team_a_name, tb.name as team_b_name,
               tw.name as predicted_winner_name
        FROM match_predictions mp
        JOIN matches m ON mp.match_id = m.id
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        LEFT JOIN teams tw ON mp.predicted_winner_id = tw.id
        WHERE mp.user_id = $1
        ORDER BY m.match_date
      `, [authReq.user.id]),
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.user_id = $1 AND gp.prediction_set_id = $2
        ORDER BY gp.group_letter, gp.predicted_position
      `, [authReq.user.id, setId])
    ]);

    success(res, {
      matchPredictions: matchPredictions.rows,
      groupPredictions: groupPredictions.rows
    });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Get user's group predictions
router.get('/groups', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const result = await db.query(`
      SELECT group_letter, team_id, predicted_position
      FROM group_predictions
      WHERE user_id = $1 AND prediction_set_id = $2
      ORDER BY group_letter, predicted_position
    `, [authReq.user.id, setId]);

    success(res, result.rows);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface GroupPredictionBody {
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

interface SaveGroupsBody {
  predictions: GroupPredictionBody[];
  setId?: number;
}

// Save group predictions (order of finish in a group)
router.post('/groups', auth, async (req: Request<unknown, unknown, SaveGroupsBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { predictions, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!Array.isArray(predictions)) {
    validationError(res, 'predictions must be an array');
    return;
  }

  for (const pred of predictions) {
    if (!isValidGroupLetter(pred.group_letter)) {
      validationError(res, `Invalid group_letter: ${pred.group_letter}`);
      return;
    }
    if (!isValidPosition(pred.predicted_position)) {
      validationError(res, `Invalid predicted_position: ${pred.predicted_position}`);
      return;
    }
    if (!isValidTeamId(pred.team_id)) {
      validationError(res, `Invalid team_id: ${pred.team_id}`);
      return;
    }
  }

  try {
    // Check deadline
    const deadline = await db.query(
      "SELECT value FROM settings WHERE key = 'group_predictions_deadline'"
    );

    if (deadline.rows.length > 0) {
      const deadlineDate = new Date((deadline.rows[0] as { value: string }).value);
      if (new Date() > deadlineDate) {
        error(res, 'Deadline for group predictions has passed', 400, 'DEADLINE_PASSED');
        return;
      }
    }

    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Use dedicated client for transaction (required for BEGIN/COMMIT to work)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing predictions for this set
      await client.query('DELETE FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);

      // Insert new predictions sequentially to avoid race conditions
      for (const pred of predictions) {
        await client.query(
          'INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position, prediction_set_id) VALUES ($1, $2, $3, $4, $5)',
          [authReq.user.id, pred.group_letter, pred.team_id, pred.predicted_position, setId]
        );
      }

      await client.query('COMMIT');
      success(res, { setId }, 'Group predictions saved successfully');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[GROUPS POST] Error:', err);
    serverError(res, err as Error);
  }
});

interface MatchPredictionBody {
  match_id: number;
  predicted_winner_id: number;
}

// Save match prediction (knockout rounds) - OLD, kept for compatibility
router.post('/match', auth, async (req: Request<unknown, unknown, MatchPredictionBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { match_id, predicted_winner_id } = req.body;

  try {
    // Check if match exists and deadline hasn't passed
    const match = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [match_id]
    );

    if (match.rows.length === 0) {
      notFound(res, 'Match not found');
      return;
    }

    const matchDate = new Date((match.rows[0] as { match_date: string }).match_date);
    if (new Date() > matchDate) {
      error(res, 'Match has already started', 400, 'MATCH_STARTED');
      return;
    }

    // Upsert prediction
    await db.query(`
      INSERT INTO match_predictions (user_id, match_id, predicted_winner_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET predicted_winner_id = $3, updated_at = NOW()
    `, [authReq.user.id, match_id, predicted_winner_id]);

    success(res, null, 'Prediction saved successfully');
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ PLAYOFFS (REPECHAJES) ============

// Get user's playoff predictions
router.get('/playoffs', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const result = await db.query(
      'SELECT * FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [authReq.user.id, setId]
    );

    // Helper to convert to number if it's a numeric string
    const toNumberIfPossible = (val: unknown): number | null => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      return !isNaN(num) ? num : null;
    };

    interface PlayoffRow {
      playoff_id: string;
      semifinal_winner_1: unknown;
      semifinal_winner_2: unknown;
      final_winner: unknown;
    }

    // Convert to object format { playoff_id: { semifinal_winner_1, semifinal_winner_2, final_winner } }
    const predictions: Record<string, { semi1: number | null; semi2: number | null; final: number | null }> = {};
    (result.rows as PlayoffRow[]).forEach(row => {
      predictions[row.playoff_id] = {
        semi1: toNumberIfPossible(row.semifinal_winner_1),
        semi2: toNumberIfPossible(row.semifinal_winner_2),
        final: toNumberIfPossible(row.final_winner)
      };
    });

    success(res, predictions);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface PlayoffSelection {
  semi1?: number;
  semi2?: number;
  final?: number;
}

interface SavePlayoffsBody {
  predictions: Record<string, PlayoffSelection>;
  setId?: number;
}

// Save playoff predictions (all at once)
router.post('/playoffs', auth, async (req: Request<unknown, unknown, SavePlayoffsBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { predictions, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!predictions || typeof predictions !== 'object') {
    validationError(res, 'predictions must be an object');
    return;
  }

  for (const [playoffId, selection] of Object.entries(predictions)) {
    if (!isValidPlayoffId(playoffId)) {
      validationError(res, `Invalid playoff_id: ${playoffId}`);
      return;
    }
    if (selection) {
      if (selection.semi1 && !isValidTeamId(selection.semi1)) {
        validationError(res, `Invalid semi1 team_id for ${playoffId}`);
        return;
      }
      if (selection.semi2 && !isValidTeamId(selection.semi2)) {
        validationError(res, `Invalid semi2 team_id for ${playoffId}`);
        return;
      }
      if (selection.final && !isValidTeamId(selection.final)) {
        validationError(res, `Invalid final team_id for ${playoffId}`);
        return;
      }
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing predictions for this set
      await client.query('DELETE FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);

      // Insert new predictions sequentially within transaction
      for (const [playoffId, selection] of Object.entries(predictions)) {
        if (selection && (selection.semi1 || selection.semi2 || selection.final)) {
          await client.query(`
            INSERT INTO playoff_predictions (user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, prediction_set_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [authReq.user.id, playoffId, selection.semi1 || null, selection.semi2 || null, selection.final || null, setId]);
        }
      }

      await client.query('COMMIT');
      success(res, { setId }, 'Playoff predictions saved successfully');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[PLAYOFFS POST] error:', err);
    serverError(res, err as Error);
  }
});

// ============ THIRD PLACES (TERCEROS) ============

// Get user's third place predictions
router.get('/third-places', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const result = await db.query(
      'SELECT selected_groups FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [authReq.user.id, setId]
    );

    if (result.rows.length === 0) {
      success(res, { selectedGroups: null });
      return;
    }

    success(res, { selectedGroups: (result.rows[0] as { selected_groups: string }).selected_groups });
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface SaveThirdPlacesBody {
  selectedGroups: string;
  setId?: number;
}

// Save third place predictions
router.post('/third-places', auth, async (req: Request<unknown, unknown, SaveThirdPlacesBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { selectedGroups, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!selectedGroups || typeof selectedGroups !== 'string') {
    validationError(res, 'selectedGroups must be a string');
    return;
  }

  // Debe ser exactamente 8 letras de grupo válidas
  if (selectedGroups.length !== 8) {
    validationError(res, 'selectedGroups must be exactly 8 groups');
    return;
  }

  for (const letter of selectedGroups) {
    if (!isValidGroupLetter(letter)) {
      validationError(res, `Invalid group letter: ${letter}`);
      return;
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing for this set and insert new
      await client.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query(`
        INSERT INTO third_place_predictions (user_id, selected_groups, prediction_set_id)
        VALUES ($1, $2, $3)
      `, [authReq.user.id, selectedGroups, setId]);

      await client.query('COMMIT');
      success(res, { setId }, 'Third place predictions saved successfully');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ KNOCKOUT (ELIMINATORIAS) ============

interface KnockoutRow {
  match_key: string;
  winner_team_id: number;
  score_a?: number;
  score_b?: number;
}

// Get user's knockout predictions
router.get('/knockout', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    // Check prediction set mode
    const setCheck = await db.query('SELECT mode FROM prediction_sets WHERE id = $1', [setId]);
    const mode = (setCheck.rows[0] as { mode?: string })?.mode || 'positions';

    const result = await db.query(
      'SELECT match_key, winner_team_id, score_a, score_b FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [authReq.user.id, setId]
    );

    // Convert to object format based on mode
    const predictions: Record<string, number | { winner: number; scoreA?: number; scoreB?: number }> = {};
    (result.rows as KnockoutRow[]).forEach(row => {
      if (mode === 'scores') {
        // Return full object with scores
        predictions[row.match_key] = {
          winner: row.winner_team_id,
          scoreA: row.score_a,
          scoreB: row.score_b
        };
      } else {
        // Legacy format: just winner ID
        predictions[row.match_key] = row.winner_team_id;
      }
    });

    success(res, predictions);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface KnockoutPredValue {
  winner?: number;
  scoreA?: number;
  scoreB?: number;
}

interface SaveKnockoutBody {
  predictions: Record<string, number | KnockoutPredValue>;
  setId?: number;
}

// Save knockout predictions (all at once)
router.post('/knockout', auth, async (req: Request<unknown, unknown, SaveKnockoutBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { predictions, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!predictions || typeof predictions !== 'object') {
    validationError(res, 'predictions must be an object');
    return;
  }

  for (const [matchKey, value] of Object.entries(predictions)) {
    if (!isValidMatchKey(matchKey)) {
      validationError(res, `Invalid matchKey: ${matchKey}`);
      return;
    }
    // Validar winner_team_id
    const winnerId = typeof value === 'object' ? (value as KnockoutPredValue)?.winner : value;
    if (winnerId && !isValidTeamId(winnerId)) {
      validationError(res, `Invalid winner_team_id for ${matchKey}: ${winnerId}`);
      return;
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing predictions for this set
      await client.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);

      // Insert new predictions sequentially within transaction
      for (const [matchKey, value] of Object.entries(predictions)) {
        if (value) {
          if (typeof value === 'object') {
            // Scores mode: { winner, scoreA, scoreB }
            const { winner, scoreA, scoreB } = value as KnockoutPredValue;
            if (winner) {
              await client.query(`
                INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, score_a, score_b, prediction_set_id)
                VALUES ($1, $2, $3, $4, $5, $6)
              `, [authReq.user.id, matchKey, winner, scoreA ?? null, scoreB ?? null, setId]);
            }
          } else {
            // Positions mode: just winner_team_id
            await client.query(`
              INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, prediction_set_id)
              VALUES ($1, $2, $3, $4)
            `, [authReq.user.id, matchKey, value, setId]);
          }
        }
      }

      await client.query('COMMIT');
      success(res, { setId }, 'Knockout predictions saved successfully');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ SCORE PREDICTIONS (MARCADORES EXACTOS) ============

interface ScoreRow {
  group_letter: string;
  match_number: number;
  score_a: number;
  score_b: number;
}

// Get user's score predictions
router.get('/scores', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const result = await db.query(
      `SELECT group_letter, match_number, score_a, score_b
       FROM score_predictions
       WHERE prediction_set_id = $1
       ORDER BY group_letter, match_number`,
      [setId]
    );

    // Convert to nested object { A: { 1: {a:2,b:1}, ... }, B: {...} }
    const scores: Record<string, Record<number, { a: number; b: number }>> = {};
    (result.rows as ScoreRow[]).forEach(row => {
      if (!scores[row.group_letter]) {
        scores[row.group_letter] = {};
      }
      scores[row.group_letter][row.match_number] = {
        a: row.score_a,
        b: row.score_b
      };
    });

    success(res, scores);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface ScoreValue {
  a?: number;
  b?: number;
}

interface SaveScoresBody {
  scores: Record<string, Record<string, ScoreValue>>;
  setId?: number;
}

// Save score predictions
router.post('/scores', auth, async (req: Request<unknown, unknown, SaveScoresBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { scores, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!scores || typeof scores !== 'object') {
    validationError(res, 'scores must be an object');
    return;
  }

  for (const [group, matches] of Object.entries(scores)) {
    if (!isValidGroupLetter(group)) {
      validationError(res, `Invalid group letter: ${group}`);
      return;
    }
    if (typeof matches !== 'object') {
      validationError(res, `Invalid matches for group ${group}`);
      return;
    }
    for (const [matchNum, score] of Object.entries(matches)) {
      const num = parseInt(matchNum, 10);
      if (!Number.isInteger(num) || num < 1 || num > 6) {
        validationError(res, `Invalid match number: ${matchNum}`);
        return;
      }
      if (score.a !== undefined && (!Number.isInteger(score.a) || score.a < 0 || score.a > 20)) {
        validationError(res, `Invalid score_a for ${group}-${matchNum}`);
        return;
      }
      if (score.b !== undefined && (!Number.isInteger(score.b) || score.b < 0 || score.b > 20)) {
        validationError(res, `Invalid score_b for ${group}-${matchNum}`);
        return;
      }
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Verify that the set is in 'scores' mode
    const setCheck = await db.query(
      'SELECT mode FROM prediction_sets WHERE id = $1',
      [setId]
    );

    if (setCheck.rows.length === 0) {
      notFound(res, 'Prediction set not found');
      return;
    }

    if ((setCheck.rows[0] as { mode: string }).mode !== 'scores') {
      error(res, 'Este set no está en modo marcadores', 400, 'INVALID_MODE');
      return;
    }

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing predictions
      await client.query(
        'DELETE FROM score_predictions WHERE prediction_set_id = $1',
        [setId]
      );

      // Insert new predictions sequentially within transaction
      for (const [group, matches] of Object.entries(scores)) {
        for (const [matchNum, score] of Object.entries(matches)) {
          if (score.a !== undefined && score.b !== undefined) {
            await client.query(
              `INSERT INTO score_predictions
               (user_id, prediction_set_id, group_letter, match_number, score_a, score_b)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [authReq.user.id, setId, group, parseInt(matchNum, 10), score.a, score.b]
            );
          }
        }
      }

      await client.query('COMMIT');
      success(res, { setId }, 'Score predictions saved successfully');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ TIEBREAKER DECISIONS ============

interface TiebreakerRow {
  group_letter: string;
  tied_team_ids: number[];
  resolved_order: number[];
}

// Get user's tiebreaker decisions
router.get('/tiebreaker', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const result = await db.query(
      `SELECT group_letter, tied_team_ids, resolved_order
       FROM tiebreaker_decisions
       WHERE prediction_set_id = $1`,
      [setId]
    );

    const decisions: Record<string, { tiedTeamIds: number[]; resolvedOrder: number[] }> = {};
    (result.rows as TiebreakerRow[]).forEach(row => {
      decisions[row.group_letter] = {
        tiedTeamIds: row.tied_team_ids,
        resolvedOrder: row.resolved_order
      };
    });

    success(res, decisions);
  } catch (err) {
    serverError(res, err as Error);
  }
});

interface SaveTiebreakerBody {
  setId?: number;
  group: string;
  tiedTeamIds: number[];
  resolvedOrder: number[];
}

// Save tiebreaker decision
router.post('/tiebreaker', auth, async (req: Request<unknown, unknown, SaveTiebreakerBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { setId: requestSetId, group, tiedTeamIds, resolvedOrder } = req.body;

  // Validacion de entrada
  if (!group || !isValidGroupLetter(group)) {
    validationError(res, 'Invalid group letter');
    return;
  }

  if (!Array.isArray(tiedTeamIds) || tiedTeamIds.length < 2) {
    validationError(res, 'tiedTeamIds must be an array with at least 2 teams');
    return;
  }

  for (const teamId of tiedTeamIds) {
    if (!isValidTeamId(teamId)) {
      validationError(res, `Invalid team_id in tiedTeamIds: ${teamId}`);
      return;
    }
  }

  if (!Array.isArray(resolvedOrder) || resolvedOrder.length !== tiedTeamIds.length) {
    validationError(res, 'resolvedOrder must match tiedTeamIds length');
    return;
  }

  for (const teamId of resolvedOrder) {
    if (!isValidTeamId(teamId)) {
      validationError(res, `Invalid team_id in resolvedOrder: ${teamId}`);
      return;
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(authReq.user.id);

    // Upsert decision
    await db.query(`
      INSERT INTO tiebreaker_decisions
      (prediction_set_id, group_letter, tied_team_ids, resolved_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (prediction_set_id, group_letter)
      DO UPDATE SET
        tied_team_ids = $3,
        resolved_order = $4
    `, [setId, group, tiedTeamIds, resolvedOrder]);

    success(res, null, 'Tiebreaker decision saved');
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ RESET ENDPOINTS (for cascade changes) ============

// Check if subsequent phases have data (for showing warning modal)
router.get('/has-subsequent-data', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const querySetId = req.query.setId as string;
    const phase = req.query.phase as string;

    if (!querySetId) {
      validationError(res, 'setId is required');
      return;
    }

    const setId = await resolveSetId(querySetId, authReq.user.id);
    if (!setId) {
      notFound(res, 'Prediction set not found');
      return;
    }

    let hasGroups = false;
    let hasThirds = false;
    let hasKnockout = false;

    if (phase === 'playoffs' || phase === 'groups' || phase === 'thirds') {
      const knockoutResult = await db.query(
        'SELECT COUNT(*) as count FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [authReq.user.id, setId]
      );
      hasKnockout = parseInt((knockoutResult.rows[0] as { count: string }).count, 10) > 0;
    }

    if (phase === 'playoffs' || phase === 'groups') {
      const thirdsResult = await db.query(
        'SELECT COUNT(*) as count FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [authReq.user.id, setId]
      );
      hasThirds = parseInt((thirdsResult.rows[0] as { count: string }).count, 10) > 0;
    }

    if (phase === 'playoffs') {
      const groupsResult = await db.query(
        'SELECT COUNT(*) as count FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [authReq.user.id, setId]
      );
      hasGroups = parseInt((groupsResult.rows[0] as { count: string }).count, 10) > 0;
    }

    success(res, { hasGroups, hasThirds, hasKnockout });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Reset from playoffs: delete groups + thirds + knockout
router.delete('/reset-from-playoffs', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const querySetId = req.query.setId as string;
    if (!querySetId) {
      validationError(res, 'setId is required');
      return;
    }

    const setId = await resolveSetId(querySetId, authReq.user.id);
    if (!setId) {
      notFound(res, 'Prediction set not found');
      return;
    }

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query('DELETE FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query('COMMIT');
      success(res, null, 'Reset from playoffs successful');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Reset from groups: delete thirds + knockout
router.delete('/reset-from-groups', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const querySetId = req.query.setId as string;
    if (!querySetId) {
      validationError(res, 'setId is required');
      return;
    }

    const setId = await resolveSetId(querySetId, authReq.user.id);
    if (!setId) {
      notFound(res, 'Prediction set not found');
      return;
    }

    // Use dedicated client for transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);
      await client.query('COMMIT');
      success(res, null, 'Reset from groups successful');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Reset from thirds: delete knockout only
router.delete('/reset-from-thirds', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const querySetId = req.query.setId as string;
    if (!querySetId) {
      validationError(res, 'setId is required');
      return;
    }

    const setId = await resolveSetId(querySetId, authReq.user.id);
    if (!setId) {
      notFound(res, 'Prediction set not found');
      return;
    }

    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]);

    success(res, null, 'Reset from thirds successful');
  } catch (err) {
    serverError(res, err as Error);
  }
});

// ============ ALL PREDICTIONS (for MyPredictions page) ============

interface PlayoffPredRow {
  playoff_id: string;
  semifinal_winner_1?: number;
  semifinal_winner_2?: number;
  final_winner?: number;
}

interface KnockoutPredRow {
  match_key: string;
  winner_team_id: number;
}

// Get all user's predictions in one call
router.get('/all', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const setId = await getSetIdFromQuery(req.query.setId as string | undefined, authReq.user.id);

    const [groupPredictions, playoffPredictions, thirdPlaces, knockoutPredictions] = await Promise.all([
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.user_id = $1 AND gp.prediction_set_id = $2
        ORDER BY gp.group_letter, gp.predicted_position
      `, [authReq.user.id, setId]),
      db.query('SELECT * FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]),
      db.query('SELECT selected_groups FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId]),
      db.query('SELECT match_key, winner_team_id FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [authReq.user.id, setId])
    ]);

    // Format playoff predictions
    const playoffs: Record<string, { semi1?: number; semi2?: number; final?: number }> = {};
    (playoffPredictions.rows as PlayoffPredRow[]).forEach(row => {
      playoffs[row.playoff_id] = {
        semi1: row.semifinal_winner_1,
        semi2: row.semifinal_winner_2,
        final: row.final_winner
      };
    });

    // Format knockout predictions
    const knockout: Record<string, number> = {};
    (knockoutPredictions.rows as KnockoutPredRow[]).forEach(row => {
      knockout[row.match_key] = row.winner_team_id;
    });

    success(res, {
      setId,
      groupPredictions: groupPredictions.rows,
      playoffPredictions: playoffs,
      thirdPlaces: (thirdPlaces.rows[0] as { selected_groups?: string })?.selected_groups || null,
      knockoutPredictions: knockout
    });
  } catch (err) {
    serverError(res, err as Error);
  }
});

export default router;
