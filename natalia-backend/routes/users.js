const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Rate limiter para check-username (prevenir enumeración)
const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 checks por minuto
  message: { error: 'Demasiadas consultas. Intenta de nuevo en 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, username, role, country, birth_date, created_at FROM users WHERE id = $1',
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

// Check if username is available
router.get('/check-username/:username', checkUsernameLimiter, async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.json({ available: false, reason: 'invalid' });
    }

    const result = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  const { name, username, country, birth_date } = req.body;

  try {
    // If username is being set/changed, validate it
    if (username) {
      // Validate format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username debe tener 3-20 caracteres (letras, números, _)' });
      }

      // Check if taken by another user
      const existing = await db.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, req.user.id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Ese username ya está en uso' });
      }
    }

    const result = await db.query(
      `UPDATE users
       SET name = $1, username = $2, country = $3, birth_date = $4
       WHERE id = $5
       RETURNING id, email, name, username, role, country, birth_date, created_at`,
      [name, username || null, country || null, birth_date || null, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
