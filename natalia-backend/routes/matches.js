const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');

// Get all matches
router.get('/', async (req, res) => {
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
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get matches by phase
router.get('/phase/:phase', async (req, res) => {
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
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create match
router.post('/', adminAuth, async (req, res) => {
  const { phase, group_letter, team_a_id, team_b_id, match_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO matches (phase, group_letter, team_a_id, team_b_id, match_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [phase, group_letter, team_a_id, team_b_id, match_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update match result
router.put('/:id/result', adminAuth, async (req, res) => {
  const { result_a, result_b, winner_id } = req.body;

  try {
    const result = await db.query(
      'UPDATE matches SET result_a = $1, result_b = $2, winner_id = $3 WHERE id = $4 RETURNING *',
      [result_a, result_b, winner_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
