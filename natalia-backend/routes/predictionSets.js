const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Get all prediction sets for user
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ps.*,
        (SELECT COUNT(*) FROM group_predictions WHERE prediction_set_id = ps.id) as group_count,
        (SELECT COUNT(*) FROM playoff_predictions WHERE prediction_set_id = ps.id) as playoff_count,
        (SELECT COUNT(*) FROM knockout_predictions WHERE prediction_set_id = ps.id) as knockout_count,
        (SELECT selected_groups FROM third_place_predictions WHERE prediction_set_id = ps.id) as third_places
      FROM prediction_sets ps
      WHERE ps.user_id = $1
      ORDER BY ps.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single prediction set with all data
router.get('/:id', auth, async (req, res) => {
  try {
    const setId = req.params.id;

    // Verify ownership
    const setResult = await db.query(
      'SELECT * FROM prediction_sets WHERE id = $1 AND user_id = $2',
      [setId, req.user.id]
    );

    if (setResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction set not found' });
    }

    // Get all predictions for this set
    const [groupPredictions, playoffPredictions, thirdPlaces, knockoutPredictions] = await Promise.all([
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.prediction_set_id = $1
        ORDER BY gp.group_letter, gp.predicted_position
      `, [setId]),
      db.query('SELECT * FROM playoff_predictions WHERE prediction_set_id = $1', [setId]),
      db.query('SELECT selected_groups FROM third_place_predictions WHERE prediction_set_id = $1', [setId]),
      db.query('SELECT match_key, winner_team_id FROM knockout_predictions WHERE prediction_set_id = $1', [setId])
    ]);

    // Format playoff predictions
    const playoffs = {};
    playoffPredictions.rows.forEach(row => {
      playoffs[row.playoff_id] = {
        semi1: row.semifinal_winner_1,
        semi2: row.semifinal_winner_2,
        final: row.final_winner
      };
    });

    // Format knockout predictions
    const knockout = {};
    knockoutPredictions.rows.forEach(row => {
      knockout[row.match_key] = row.winner_team_id;
    });

    res.json({
      ...setResult.rows[0],
      groupPredictions: groupPredictions.rows,
      playoffPredictions: playoffs,
      thirdPlaces: thirdPlaces.rows[0]?.selected_groups || null,
      knockoutPredictions: knockout
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new prediction set
router.post('/', auth, async (req, res) => {
  const { name, mode = 'positions' } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!['positions', 'scores'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode. Must be "positions" or "scores"' });
  }

  try {
    const result = await db.query(
      'INSERT INTO prediction_sets (user_id, name, mode) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name.trim(), mode]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update prediction set name
router.put('/:id', auth, async (req, res) => {
  const { name } = req.body;
  const setId = req.params.id;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await db.query(
      'UPDATE prediction_sets SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), setId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction set not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete prediction set
router.delete('/:id', auth, async (req, res) => {
  const setId = req.params.id;

  try {
    const result = await db.query(
      'DELETE FROM prediction_sets WHERE id = $1 AND user_id = $2 RETURNING id',
      [setId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction set not found' });
    }

    res.json({ message: 'Prediction set deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Duplicate a prediction set (with transaction for data consistency)
router.post('/:id/duplicate', auth, async (req, res) => {
  const sourceSetId = req.params.id;
  const { name } = req.body;

  // Use transaction to ensure all-or-nothing duplication
  const client = await db.pool.connect();

  try {
    // Verify ownership of source (before starting transaction)
    const sourceSet = await client.query(
      'SELECT * FROM prediction_sets WHERE id = $1 AND user_id = $2',
      [sourceSetId, req.user.id]
    );

    if (sourceSet.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Source prediction set not found' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Create new set (preserve mode from source)
    const newName = name || `${sourceSet.rows[0].name} (copia)`;
    const sourceMode = sourceSet.rows[0].mode || 'positions';
    const newSet = await client.query(
      'INSERT INTO prediction_sets (user_id, name, mode) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, newName, sourceMode]
    );
    const newSetId = newSet.rows[0].id;

    // Copy group predictions
    await client.query(`
      INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position, prediction_set_id)
      SELECT user_id, group_letter, team_id, predicted_position, $1
      FROM group_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy playoff predictions
    await client.query(`
      INSERT INTO playoff_predictions (user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, prediction_set_id)
      SELECT user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, $1
      FROM playoff_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy third place predictions
    await client.query(`
      INSERT INTO third_place_predictions (user_id, selected_groups, prediction_set_id)
      SELECT user_id, selected_groups, $1
      FROM third_place_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Copy knockout predictions
    await client.query(`
      INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, prediction_set_id)
      SELECT user_id, match_key, winner_team_id, $1
      FROM knockout_predictions WHERE prediction_set_id = $2
    `, [newSetId, sourceSetId]);

    // Commit transaction
    await client.query('COMMIT');

    res.json(newSet.rows[0]);
  } catch (err) {
    // Rollback on any error
    await client.query('ROLLBACK');
    console.error('[DUPLICATE] Transaction error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
