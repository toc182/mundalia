const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Helper to get or create default prediction set
async function getOrCreateDefaultSet(userId) {
  // Check if user has any prediction sets
  let result = await db.query(
    'SELECT id FROM prediction_sets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (result.rows.length === 0) {
    // Create default set
    result = await db.query(
      "INSERT INTO prediction_sets (user_id, name) VALUES ($1, 'Mi Prediccion') RETURNING id",
      [userId]
    );
  }

  return result.rows[0].id;
}

// Get user's predictions (legacy - returns most recent set)
router.get('/my', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

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
        WHERE gp.user_id = $1 AND gp.prediction_set_id = $2
        ORDER BY gp.group_letter, gp.predicted_position
      `, [req.user.id, setId])
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
  const { predictions, setId: requestSetId } = req.body; // [{group_letter, team_id, predicted_position}]

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

    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Delete existing predictions for this set
    await db.query('DELETE FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    for (const pred of predictions) {
      await db.query(
        'INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position, prediction_set_id) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, pred.group_letter, pred.team_id, pred.predicted_position, setId]
      );
    }

    res.json({ message: 'Group predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save match prediction (knockout rounds) - OLD, kept for compatibility
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

// ============ PLAYOFFS (REPECHAJES) ============

// Get user's playoff predictions
router.get('/playoffs', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(
      'SELECT * FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [req.user.id, setId]
    );

    // Convert to object format { playoff_id: { semifinal_winner_1, semifinal_winner_2, final_winner } }
    const predictions = {};
    result.rows.forEach(row => {
      predictions[row.playoff_id] = {
        semi1: row.semifinal_winner_1,
        semi2: row.semifinal_winner_2,
        final: row.final_winner
      };
    });

    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save playoff predictions (all at once)
router.post('/playoffs', auth, async (req, res) => {
  const { predictions, setId: requestSetId } = req.body; // { playoff_id: { semi1, semi2, final } }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Delete existing predictions for this set
    await db.query('DELETE FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    for (const [playoffId, selection] of Object.entries(predictions)) {
      if (selection && (selection.semi1 || selection.semi2 || selection.final)) {
        await db.query(`
          INSERT INTO playoff_predictions (user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, prediction_set_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [req.user.id, playoffId, selection.semi1 || null, selection.semi2 || null, selection.final || null, setId]);
      }
    }

    res.json({ message: 'Playoff predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ THIRD PLACES (TERCEROS) ============

// Get user's third place predictions
router.get('/third-places', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(
      'SELECT selected_groups FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [req.user.id, setId]
    );

    if (result.rows.length === 0) {
      return res.json({ selectedGroups: null });
    }

    res.json({ selectedGroups: result.rows[0].selected_groups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save third place predictions
router.post('/third-places', auth, async (req, res) => {
  const { selectedGroups, setId: requestSetId } = req.body; // String like 'ABCDEFGH'

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Delete existing for this set and insert new
    await db.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);
    await db.query(`
      INSERT INTO third_place_predictions (user_id, selected_groups, prediction_set_id)
      VALUES ($1, $2, $3)
    `, [req.user.id, selectedGroups, setId]);

    res.json({ message: 'Third place predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ KNOCKOUT (ELIMINATORIAS) ============

// Get user's knockout predictions
router.get('/knockout', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(
      'SELECT match_key, winner_team_id FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [req.user.id, setId]
    );

    // Convert to object format { match_key: winner_team_id }
    const predictions = {};
    result.rows.forEach(row => {
      predictions[row.match_key] = row.winner_team_id;
    });

    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save knockout predictions (all at once)
router.post('/knockout', auth, async (req, res) => {
  const { predictions, setId: requestSetId } = req.body; // { match_key: winner_team_id }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Delete existing predictions for this set
    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    for (const [matchKey, winnerTeamId] of Object.entries(predictions)) {
      if (winnerTeamId) {
        await db.query(`
          INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, prediction_set_id)
          VALUES ($1, $2, $3, $4)
        `, [req.user.id, matchKey, winnerTeamId, setId]);
      }
    }

    res.json({ message: 'Knockout predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ ALL PREDICTIONS (for MyPredictions page) ============

// Get all user's predictions in one call
router.get('/all', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const [groupPredictions, playoffPredictions, thirdPlaces, knockoutPredictions] = await Promise.all([
      db.query(`
        SELECT gp.*, t.name as team_name, t.code as team_code, t.flag_url
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        WHERE gp.user_id = $1 AND gp.prediction_set_id = $2
        ORDER BY gp.group_letter, gp.predicted_position
      `, [req.user.id, setId]),
      db.query('SELECT * FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]),
      db.query('SELECT selected_groups FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]),
      db.query('SELECT match_key, winner_team_id FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId])
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
      setId,
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

module.exports = router;
