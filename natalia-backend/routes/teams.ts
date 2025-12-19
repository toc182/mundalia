import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { adminAuth } from '../middleware/auth';

const router: Router = express.Router();

interface TeamRow {
  id: number;
  name: string;
  code: string;
  flag_url?: string;
  group_letter: string;
  is_playoff: boolean;
  playoff_id?: string;
}

interface CreateTeamBody {
  name: string;
  code: string;
  flag_url?: string;
  group_letter: string;
}

// Get all teams
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      'SELECT * FROM teams ORDER BY group_letter, name'
    );
    res.json(result.rows as TeamRow[]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teams by group
router.get('/group/:letter', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      'SELECT * FROM teams WHERE group_letter = $1 ORDER BY name',
      [req.params.letter.toUpperCase()]
    );
    res.json(result.rows as TeamRow[]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create team
router.post('/', adminAuth, async (req: Request<unknown, unknown, CreateTeamBody>, res: Response): Promise<void> => {
  const { name, code, flag_url, group_letter } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO teams (name, code, flag_url, group_letter) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, flag_url, group_letter]
    );
    res.status(201).json(result.rows[0] as TeamRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
