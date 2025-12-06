const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  const { name } = req.body;

  try {
    const result = await db.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, role',
      [name, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
