const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { POINTS, getMatchPoints } = require('../utils/scoring');

// Get all private groups
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pg.*, u.name as owner_name,
             (SELECT COUNT(*) FROM private_group_members WHERE group_id = pg.id) as member_count
      FROM private_groups pg
      JOIN users u ON pg.owner_id = u.id
      JOIN private_group_members pgm ON pg.id = pgm.group_id
      WHERE pgm.user_id = $1
      ORDER BY pg.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create private group
router.post('/', auth, async (req, res) => {
  const { name } = req.body;

  try {
    // Generate unique code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.query(
      'INSERT INTO private_groups (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.user.id]
    );

    // Add owner as member
    await db.query(
      'INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join private group by code
router.post('/join', auth, async (req, res) => {
  const { code } = req.body;

  try {
    const group = await db.query(
      'SELECT * FROM private_groups WHERE code = $1',
      [code.toUpperCase()]
    );

    if (group.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already member
    const existing = await db.query(
      'SELECT * FROM private_group_members WHERE group_id = $1 AND user_id = $2',
      [group.rows[0].id, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    await db.query(
      'INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)',
      [group.rows[0].id, req.user.id]
    );

    res.json({ message: 'Joined group successfully', group: group.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POINTS and getMatchPoints imported from utils/scoring.js

// Calculate best score for a user (across all their prediction sets)
// OPTIMIZED: Load all predictions in 2 queries instead of 2N
async function calculateUserBestScore(userId) {
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

  const setIds = predSets.rows.map(ps => ps.id);

  // OPTIMIZED: Load ALL data in 4 parallel queries (instead of 2N+2)
  const [realGroupStandings, realKnockout, allGroupPreds, allKnockoutPreds] = await Promise.all([
    db.query('SELECT * FROM real_group_standings'),
    db.query('SELECT * FROM real_knockout_results'),
    db.query('SELECT * FROM group_predictions WHERE prediction_set_id = ANY($1)', [setIds]),
    db.query('SELECT * FROM knockout_predictions WHERE prediction_set_id = ANY($1)', [setIds])
  ]);

  // Build lookup maps for real results
  const realGroupMap = {};
  realGroupStandings.rows.forEach(row => {
    if (!realGroupMap[row.group_letter]) realGroupMap[row.group_letter] = {};
    realGroupMap[row.group_letter][row.team_id] = row.final_position;
  });

  const realKnockoutMap = {};
  realKnockout.rows.forEach(row => {
    realKnockoutMap[row.match_key] = row.winner_team_id;
  });

  // Group predictions by set_id
  const groupPredsBySet = {};
  allGroupPreds.rows.forEach(pred => {
    if (!groupPredsBySet[pred.prediction_set_id]) groupPredsBySet[pred.prediction_set_id] = [];
    groupPredsBySet[pred.prediction_set_id].push(pred);
  });

  const knockoutPredsBySet = {};
  allKnockoutPreds.rows.forEach(pred => {
    if (!knockoutPredsBySet[pred.prediction_set_id]) knockoutPredsBySet[pred.prediction_set_id] = [];
    knockoutPredsBySet[pred.prediction_set_id].push(pred);
  });

  // Calculate best score across all sets (in memory, no more queries)
  let bestScore = 0;

  for (const ps of predSets.rows) {
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
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    // Verify user is member
    const isMember = await db.query(
      'SELECT * FROM private_group_members WHERE group_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (isMember.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
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
      members.rows.map(async (member) => {
        const total_points = await calculateUserBestScore(member.id);
        return { ...member, total_points };
      })
    );

    // Sort by points descending
    leaderboard.sort((a, b) => b.total_points - a.total_points);

    res.json(leaderboard);
  } catch (err) {
    console.error('Group leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
