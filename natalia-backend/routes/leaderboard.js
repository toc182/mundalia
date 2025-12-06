const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get global leaderboard
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, COALESCE(s.total_points, 0) as total_points,
             COALESCE(s.correct_group_positions, 0) as correct_group_positions,
             COALESCE(s.correct_qualifiers, 0) as correct_qualifiers,
             COALESCE(s.correct_knockout_winners, 0) as correct_knockout_winners
      FROM users u
      LEFT JOIN user_scores s ON u.id = s.user_id
      ORDER BY total_points DESC, u.name
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user rank
router.get('/rank/:userId', async (req, res) => {
  try {
    const result = await db.query(`
      WITH ranked AS (
        SELECT u.id, u.name, COALESCE(s.total_points, 0) as total_points,
               RANK() OVER (ORDER BY COALESCE(s.total_points, 0) DESC) as rank
        FROM users u
        LEFT JOIN user_scores s ON u.id = s.user_id
      )
      SELECT * FROM ranked WHERE id = $1
    `, [req.params.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
