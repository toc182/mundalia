import express, { Request, Response, Router } from 'express';
import { PoolClient } from 'pg';
import db from '../config/db';
import { adminAuth } from '../middleware/auth';
import { success, validationError, serverError } from '../utils/response';

const router: Router = express.Router();

// All routes require admin authentication
router.use(adminAuth);

// ============================================
// PLAYOFF RESULTS
// ============================================

interface PlayoffResultRow {
  playoff_id: string;
  winner_team_id: number;
  created_at: Date;
  updated_at: Date;
}

// Get all real playoff results
router.get('/playoffs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT * FROM real_playoff_results ORDER BY playoff_id
    `);
    success(res, result.rows as PlayoffResultRow[]);
  } catch (err) {
    console.error('Error getting playoff results:', err);
    serverError(res, err as Error);
  }
});

interface SavePlayoffBody {
  playoff_id: string;
  winner_team_id: number;
}

// Save real playoff result
router.post('/playoffs', async (req: Request<unknown, unknown, SavePlayoffBody>, res: Response): Promise<void> => {
  const { playoff_id, winner_team_id } = req.body;

  if (!playoff_id || !winner_team_id) {
    validationError(res, 'Missing required fields');
    return;
  }

  try {
    await db.query(`
      INSERT INTO real_playoff_results (playoff_id, winner_team_id)
      VALUES ($1, $2)
      ON CONFLICT (playoff_id) DO UPDATE SET
        winner_team_id = $2,
        updated_at = CURRENT_TIMESTAMP
    `, [playoff_id, winner_team_id]);

    success(res, null, 'Playoff result saved');
  } catch (err) {
    console.error('Error saving playoff result:', err);
    serverError(res, err as Error);
  }
});

// ============================================
// GROUP MATCHES (Real scores)
// ============================================

interface GroupMatchRow {
  group_letter: string;
  match_index: number;
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
}

// Get all real group match scores
router.get('/groups', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT * FROM real_group_matches
      ORDER BY group_letter, match_index
    `);
    success(res, result.rows as GroupMatchRow[]);
  } catch (err) {
    console.error('Error getting group matches:', err);
    serverError(res, err as Error);
  }
});

interface SaveGroupMatchesBody {
  group_letter: string;
  matches: GroupMatchRow[];
}

// Save real group match scores (bulk for one group - 6 matches)
// Uses transaction to ensure data consistency
router.post('/groups', async (req: Request<unknown, unknown, SaveGroupMatchesBody>, res: Response): Promise<void> => {
  const { group_letter, matches } = req.body;

  if (!group_letter || !matches || matches.length !== 6) {
    validationError(res, 'Invalid data. Need group_letter and 6 matches.');
    return;
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Delete existing matches for this group
    await client.query('DELETE FROM real_group_matches WHERE group_letter = $1', [group_letter]);

    // Insert new matches
    for (const match of matches) {
      await client.query(`
        INSERT INTO real_group_matches (group_letter, match_index, team_a_id, team_b_id, score_a, score_b)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [group_letter, match.match_index, match.team_a_id, match.team_b_id, match.score_a, match.score_b]);
    }

    // Also update/calculate standings in real_group_standings
    await updateGroupStandings(client, group_letter, matches);

    await client.query('COMMIT');
    success(res, null, 'Group matches saved');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving group matches:', err);
    serverError(res, err as Error);
  } finally {
    client.release();
  }
});

interface TeamStats {
  points: number;
  gd: number;
  gf: number;
}

// Helper function to calculate and update group standings from match results
async function updateGroupStandings(client: PoolClient, groupLetter: string, matches: GroupMatchRow[]): Promise<void> {
  const teamStats: Record<number, TeamStats> = {};

  for (const match of matches) {
    if (match.score_a === null || match.score_b === null) continue;

    const scoreA = match.score_a;
    const scoreB = match.score_b;

    if (!teamStats[match.team_a_id]) {
      teamStats[match.team_a_id] = { points: 0, gd: 0, gf: 0 };
    }
    if (!teamStats[match.team_b_id]) {
      teamStats[match.team_b_id] = { points: 0, gd: 0, gf: 0 };
    }

    teamStats[match.team_a_id].gf += scoreA;
    teamStats[match.team_a_id].gd += (scoreA - scoreB);
    teamStats[match.team_b_id].gf += scoreB;
    teamStats[match.team_b_id].gd += (scoreB - scoreA);

    if (scoreA > scoreB) {
      teamStats[match.team_a_id].points += 3;
    } else if (scoreB > scoreA) {
      teamStats[match.team_b_id].points += 3;
    } else {
      teamStats[match.team_a_id].points += 1;
      teamStats[match.team_b_id].points += 1;
    }
  }

  const sorted = Object.entries(teamStats)
    .sort((a, b) => {
      if (b[1].points !== a[1].points) return b[1].points - a[1].points;
      if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
      return b[1].gf - a[1].gf;
    });

  await client.query('DELETE FROM real_group_standings WHERE group_letter = $1', [groupLetter]);

  for (let i = 0; i < sorted.length; i++) {
    await client.query(`
      INSERT INTO real_group_standings (group_letter, team_id, final_position)
      VALUES ($1, $2, $3)
    `, [groupLetter, parseInt(sorted[i][0], 10), i + 1]);
  }
}

// Get calculated standings (from match results)
router.get('/groups/standings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT rgs.*, t.name as team_name, t.code as team_code
      FROM real_group_standings rgs
      LEFT JOIN teams t ON rgs.team_id = t.id
      ORDER BY rgs.group_letter, rgs.final_position
    `);
    success(res, result.rows);
  } catch (err) {
    console.error('Error getting group standings:', err);
    serverError(res, err as Error);
  }
});

// ============================================
// KNOCKOUT RESULTS
// ============================================

// Get all real knockout results
router.get('/knockout', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT rkr.*, t.name as team_name, t.code as team_code
      FROM real_knockout_results rkr
      LEFT JOIN teams t ON rkr.winner_team_id = t.id
      ORDER BY rkr.match_key
    `);
    success(res, result.rows);
  } catch (err) {
    console.error('Error getting knockout results:', err);
    serverError(res, err as Error);
  }
});

interface SaveKnockoutBody {
  match_key: string;
  winner_team_id: number;
  score_a?: number;
  score_b?: number;
}

// Save real knockout result
router.post('/knockout', async (req: Request<unknown, unknown, SaveKnockoutBody>, res: Response): Promise<void> => {
  const { match_key, winner_team_id, score_a, score_b } = req.body;

  if (!match_key || !winner_team_id) {
    validationError(res, 'Missing required fields');
    return;
  }

  try {
    await db.query(`
      INSERT INTO real_knockout_results (match_key, winner_team_id, score_a, score_b)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_key) DO UPDATE SET
        winner_team_id = $2,
        score_a = $3,
        score_b = $4,
        updated_at = CURRENT_TIMESTAMP
    `, [match_key, winner_team_id, score_a ?? null, score_b ?? null]);

    success(res, null, 'Knockout result saved');
  } catch (err) {
    console.error('Error saving knockout result:', err);
    serverError(res, err as Error);
  }
});

// ============================================
// DELETE ENDPOINTS
// ============================================

// Delete a knockout result
router.delete('/knockout/:matchKey', async (req: Request, res: Response): Promise<void> => {
  try {
    await db.query('DELETE FROM real_knockout_results WHERE match_key = $1', [req.params.matchKey]);
    success(res, null, 'Knockout result deleted');
  } catch (err) {
    console.error('Error deleting knockout result:', err);
    serverError(res, err as Error);
  }
});

// Delete a playoff result
router.delete('/playoffs/:playoffId', async (req: Request, res: Response): Promise<void> => {
  try {
    await db.query('DELETE FROM real_playoff_results WHERE playoff_id = $1', [req.params.playoffId]);
    success(res, null, 'Playoff result deleted');
  } catch (err) {
    console.error('Error deleting playoff result:', err);
    serverError(res, err as Error);
  }
});

// ============================================
// STATISTICS
// ============================================

interface StatsResult {
  total_users: number;
  total_predictions: number;
  playoffs_entered: number;
  groups_entered: number;
  knockout_entered: number;
}

// Get admin dashboard stats
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [users, predictions, playoffResults, groupResults, knockoutResults] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM prediction_sets'),
      db.query('SELECT COUNT(*) FROM real_playoff_results'),
      db.query('SELECT COUNT(DISTINCT group_letter) FROM real_group_standings'),
      db.query('SELECT COUNT(*) FROM real_knockout_results')
    ]);

    const stats: StatsResult = {
      total_users: parseInt((users.rows[0] as { count: string }).count, 10),
      total_predictions: parseInt((predictions.rows[0] as { count: string }).count, 10),
      playoffs_entered: parseInt((playoffResults.rows[0] as { count: string }).count, 10),
      groups_entered: parseInt((groupResults.rows[0] as { count: string }).count, 10),
      knockout_entered: parseInt((knockoutResults.rows[0] as { count: string }).count, 10)
    };

    success(res, stats);
  } catch (err) {
    console.error('Error getting stats:', err);
    serverError(res, err as Error);
  }
});

export default router;
