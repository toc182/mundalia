const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Get user's predictions
router.get('/my', auth, async (req, res) => {
  try {
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
      `, [req.user.id]),
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.user_id = $1
        ORDER BY gp.group_letter, gp.predicted_position
      `, [req.user.id])
    ]);

    res.json({
      matchPredictions: matchPredictions.rows,
      groupPredictions: groupPredictions.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save group predictions (order of finish in a group)
router.post('/groups', auth, async (req, res) => {
  const { predictions } = req.body; // [{group_letter, team_id, predicted_position}]

  try {
    // Check deadline
    const deadline = await db.query(
      "SELECT value FROM settings WHERE key = 'group_predictions_deadline'"
    );

    if (deadline.rows.length > 0) {
      const deadlineDate = new Date(deadline.rows[0].value);
      if (new Date() > deadlineDate) {
        return res.status(400).json({ error: 'Deadline for group predictions has passed' });
      }
    }

    // Delete existing predictions for this user
    await db.query('DELETE FROM group_predictions WHERE user_id = $1', [req.user.id]);

    // Insert new predictions
    for (const pred of predictions) {
      await db.query(
        'INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position) VALUES ($1, $2, $3, $4)',
        [req.user.id, pred.group_letter, pred.team_id, pred.predicted_position]
      );
    }

    res.json({ message: 'Group predictions saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save match prediction (knockout rounds)
router.post('/match', auth, async (req, res) => {
  const { match_id, predicted_winner_id } = req.body;

  try {
    // Check if match exists and deadline hasn't passed
    const match = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [match_id]
    );

    if (match.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchDate = new Date(match.rows[0].match_date);
    if (new Date() > matchDate) {
      return res.status(400).json({ error: 'Match has already started' });
    }

    // Upsert prediction
    await db.query(`
      INSERT INTO match_predictions (user_id, match_id, predicted_winner_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET predicted_winner_id = $3, updated_at = NOW()
    `, [req.user.id, match_id, predicted_winner_id]);

    res.json({ message: 'Prediction saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
