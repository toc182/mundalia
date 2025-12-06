const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');

// Get all teams
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM teams ORDER BY group_letter, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get teams by group
router.get('/group/:letter', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM teams WHERE group_letter = $1 ORDER BY name',
      [req.params.letter.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Create team
router.post('/', adminAuth, async (req, res) => {
  const { name, code, flag_url, group_letter } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO teams (name, code, flag_url, group_letter) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, flag_url, group_letter]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
