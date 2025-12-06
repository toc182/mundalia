const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

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

    const result = await db.query(`
      SELECT u.id, u.name, COALESCE(s.total_points, 0) as total_points
      FROM private_group_members pgm
      JOIN users u ON pgm.user_id = u.id
      LEFT JOIN user_scores s ON u.id = s.user_id
      WHERE pgm.group_id = $1
      ORDER BY total_points DESC, u.name
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
