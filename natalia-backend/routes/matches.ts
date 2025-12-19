import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { adminAuth } from '../middleware/auth';

const router: Router = express.Router();

interface MatchRow {
  id: number;
  phase: string;
  group_letter?: string;
  team_a_id?: number;
  team_b_id?: number;
  team_a_name?: string;
  team_a_code?: string;
  team_a_flag?: string;
  team_b_name?: string;
  team_b_code?: string;
  team_b_flag?: string;
  match_date: Date;
  result_a?: number;
  result_b?: number;
  winner_id?: number;
}

interface CreateMatchBody {
  phase: string;
  group_letter?: string;
  team_a_id?: number;
  team_b_id?: number;
  match_date: string;
}

interface UpdateResultBody {
  result_a: number;
  result_b: number;
  winner_id?: number;
}

// Get all matches
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT m.*,
             ta.name as team_a_name, ta.code as team_a_code, ta.flag_url as team_a_flag,
             tb.name as team_b_name, tb.code as team_b_code, tb.flag_url as team_b_flag
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
      ORDER BY m.match_date, m.id
    `);
    res.json(result.rows as MatchRow[]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get matches by phase
router.get('/phase/:phase', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(`
      SELECT m.*,
             ta.name as team_a_name, ta.code as team_a_code, ta.flag_url as team_a_flag,
             tb.name as team_b_name, tb.code as team_b_code, tb.flag_url as team_b_flag
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.phase = $1
      ORDER BY m.match_date, m.id
    `, [req.params.phase]);
    res.json(result.rows as MatchRow[]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create match
router.post('/', adminAuth, async (req: Request<unknown, unknown, CreateMatchBody>, res: Response): Promise<void> => {
  const { phase, group_letter, team_a_id, team_b_id, match_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO matches (phase, group_letter, team_a_id, team_b_id, match_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [phase, group_letter, team_a_id, team_b_id, match_date]
    );
    res.status(201).json(result.rows[0] as MatchRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update match result
router.put('/:id/result', adminAuth, async (req: Request<{ id: string }, unknown, UpdateResultBody>, res: Response): Promise<void> => {
  const { result_a, result_b, winner_id } = req.body;

  try {
    const result = await db.query(
      'UPDATE matches SET result_a = $1, result_b = $2, winner_id = $3 WHERE id = $4 RETURNING *',
      [result_a, result_b, winner_id, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    res.json(result.rows[0] as MatchRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
