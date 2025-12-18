const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { isValidGroupLetter, isValidPosition, isValidTeamId, isValidMatchKey, isValidPlayoffId } = require('../utils/validators');

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

// Get user's group predictions
router.get('/groups', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(`
      SELECT group_letter, team_id, predicted_position
      FROM group_predictions
      WHERE user_id = $1 AND prediction_set_id = $2
      ORDER BY group_letter, predicted_position
    `, [req.user.id, setId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save group predictions (order of finish in a group)
router.post('/groups', auth, async (req, res) => {
  const { predictions, setId: requestSetId } = req.body; // [{group_letter, team_id, predicted_position}]

  // Validacion de entrada
  if (!Array.isArray(predictions)) {
    return res.status(400).json({ error: 'predictions must be an array' });
  }

  for (const pred of predictions) {
    if (!isValidGroupLetter(pred.group_letter)) {
      return res.status(400).json({ error: `Invalid group_letter: ${pred.group_letter}` });
    }
    if (!isValidPosition(pred.predicted_position)) {
      return res.status(400).json({ error: `Invalid predicted_position: ${pred.predicted_position}` });
    }
    if (!isValidTeamId(pred.team_id)) {
      return res.status(400).json({ error: `Invalid team_id: ${pred.team_id}` });
    }
  }

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
    const deleteResult = await db.query('DELETE FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    let insertCount = 0;
    for (const pred of predictions) {
      await db.query(
        'INSERT INTO group_predictions (user_id, group_letter, team_id, predicted_position, prediction_set_id) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, pred.group_letter, pred.team_id, pred.predicted_position, setId]
      );
      insertCount++;
    }

    res.json({ message: 'Group predictions saved successfully', setId });
  } catch (err) {
    console.error('[GROUPS POST] Error:', err);
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

    // Helper to convert to number if it's a numeric string
    const toNumberIfPossible = (val) => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      return !isNaN(num) ? num : val;
    };

    // Convert to object format { playoff_id: { semifinal_winner_1, semifinal_winner_2, final_winner } }
    const predictions = {};
    result.rows.forEach(row => {
      predictions[row.playoff_id] = {
        semi1: toNumberIfPossible(row.semifinal_winner_1),
        semi2: toNumberIfPossible(row.semifinal_winner_2),
        final: toNumberIfPossible(row.final_winner)
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
    const deleteResult = await db.query('DELETE FROM playoff_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    let insertedCount = 0;
    for (const [playoffId, selection] of Object.entries(predictions)) {
      if (selection && (selection.semi1 || selection.semi2 || selection.final)) {
        await db.query(`
          INSERT INTO playoff_predictions (user_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner, prediction_set_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [req.user.id, playoffId, selection.semi1 || null, selection.semi2 || null, selection.final || null, setId]);
        insertedCount++;
      }
    }

    res.json({ message: 'Playoff predictions saved successfully', setId });
  } catch (err) {
    console.error('[PLAYOFFS POST] error:', err);
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

    // Check prediction set mode
    const setCheck = await db.query('SELECT mode FROM prediction_sets WHERE id = $1', [setId]);
    const mode = setCheck.rows[0]?.mode || 'positions';

    const result = await db.query(
      'SELECT match_key, winner_team_id, score_a, score_b FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2',
      [req.user.id, setId]
    );

    // Convert to object format based on mode
    const predictions = {};
    result.rows.forEach(row => {
      if (mode === 'scores') {
        // Return full object with scores
        predictions[row.match_key] = {
          winner: row.winner_team_id,
          scoreA: row.score_a,
          scoreB: row.score_b
        };
      } else {
        // Legacy format: just winner ID
        predictions[row.match_key] = row.winner_team_id;
      }
    });

    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save knockout predictions (all at once)
// Accepts two formats:
// - Positions mode: { match_key: winner_team_id }
// - Scores mode: { match_key: { winner, scoreA, scoreB } }
router.post('/knockout', auth, async (req, res) => {
  const { predictions, setId: requestSetId } = req.body;

  // Validacion de entrada
  if (!predictions || typeof predictions !== 'object') {
    return res.status(400).json({ error: 'predictions must be an object' });
  }

  for (const [matchKey, value] of Object.entries(predictions)) {
    if (!isValidMatchKey(matchKey)) {
      return res.status(400).json({ error: `Invalid matchKey: ${matchKey}` });
    }
    // Validar winner_team_id
    const winnerId = typeof value === 'object' ? value?.winner : value;
    if (winnerId && !isValidTeamId(winnerId)) {
      return res.status(400).json({ error: `Invalid winner_team_id for ${matchKey}: ${winnerId}` });
    }
  }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Delete existing predictions for this set
    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    // Insert new predictions
    for (const [matchKey, value] of Object.entries(predictions)) {
      if (value && typeof value === 'object') {
        // Scores mode: { winner, scoreA, scoreB }
        const { winner, scoreA, scoreB } = value;
        if (winner) {
          await db.query(`
            INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, score_a, score_b, prediction_set_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [req.user.id, matchKey, winner, scoreA ?? null, scoreB ?? null, setId]);
        }
      } else if (value) {
        // Positions mode: just winner_team_id
        await db.query(`
          INSERT INTO knockout_predictions (user_id, match_key, winner_team_id, prediction_set_id)
          VALUES ($1, $2, $3, $4)
        `, [req.user.id, matchKey, value, setId]);
      }
    }

    res.json({ message: 'Knockout predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ SCORE PREDICTIONS (MARCADORES EXACTOS) ============

// Get user's score predictions
router.get('/scores', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(
      `SELECT group_letter, match_number, score_a, score_b
       FROM score_predictions
       WHERE prediction_set_id = $1
       ORDER BY group_letter, match_number`,
      [setId]
    );

    // Convert to nested object { A: { 1: {a:2,b:1}, ... }, B: {...} }
    const scores = {};
    result.rows.forEach(row => {
      if (!scores[row.group_letter]) {
        scores[row.group_letter] = {};
      }
      scores[row.group_letter][row.match_number] = {
        a: row.score_a,
        b: row.score_b
      };
    });

    res.json(scores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save score predictions
router.post('/scores', auth, async (req, res) => {
  const { scores, setId: requestSetId } = req.body;
  // scores = { A: { 1: {a:2,b:1}, ... }, B: {...} }

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Verify that the set is in 'scores' mode
    const setCheck = await db.query(
      'SELECT mode FROM prediction_sets WHERE id = $1',
      [setId]
    );

    if (setCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Prediction set not found' });
    }

    if (setCheck.rows[0].mode !== 'scores') {
      return res.status(400).json({ error: 'Este set no está en modo marcadores' });
    }

    // Delete existing predictions
    await db.query(
      'DELETE FROM score_predictions WHERE prediction_set_id = $1',
      [setId]
    );

    // Insert new predictions
    for (const [group, matches] of Object.entries(scores)) {
      for (const [matchNum, score] of Object.entries(matches)) {
        if (score.a !== undefined && score.b !== undefined) {
          await db.query(
            `INSERT INTO score_predictions
             (user_id, prediction_set_id, group_letter, match_number, score_a, score_b)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, setId, group, parseInt(matchNum), score.a, score.b]
          );
        }
      }
    }

    res.json({ message: 'Score predictions saved successfully', setId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ TIEBREAKER DECISIONS ============

// Get user's tiebreaker decisions
router.get('/tiebreaker', auth, async (req, res) => {
  try {
    const setId = req.query.setId || await getOrCreateDefaultSet(req.user.id);

    const result = await db.query(
      `SELECT group_letter, tied_team_ids, resolved_order
       FROM tiebreaker_decisions
       WHERE prediction_set_id = $1`,
      [setId]
    );

    const decisions = {};
    result.rows.forEach(row => {
      decisions[row.group_letter] = {
        tiedTeamIds: row.tied_team_ids,
        resolvedOrder: row.resolved_order
      };
    });

    res.json(decisions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save tiebreaker decision
router.post('/tiebreaker', auth, async (req, res) => {
  const { setId: requestSetId, group, tiedTeamIds, resolvedOrder } = req.body;

  try {
    const setId = requestSetId || await getOrCreateDefaultSet(req.user.id);

    // Upsert decision
    await db.query(`
      INSERT INTO tiebreaker_decisions
      (prediction_set_id, group_letter, tied_team_ids, resolved_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (prediction_set_id, group_letter)
      DO UPDATE SET
        tied_team_ids = $3,
        resolved_order = $4
    `, [setId, group, tiedTeamIds, resolvedOrder]);

    res.json({ message: 'Tiebreaker decision saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ RESET ENDPOINTS (for cascade changes) ============

// Check if subsequent phases have data (for showing warning modal)
router.get('/has-subsequent-data', auth, async (req, res) => {
  try {
    const setId = req.query.setId;
    const phase = req.query.phase; // 'playoffs', 'groups', 'thirds'

    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }

    let hasGroups = false;
    let hasThirds = false;
    let hasKnockout = false;

    if (phase === 'playoffs' || phase === 'groups' || phase === 'thirds') {
      // Check knockout
      const knockoutResult = await db.query(
        'SELECT COUNT(*) as count FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [req.user.id, setId]
      );
      hasKnockout = parseInt(knockoutResult.rows[0].count) > 0;
    }

    if (phase === 'playoffs' || phase === 'groups') {
      // Check third places
      const thirdsResult = await db.query(
        'SELECT COUNT(*) as count FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [req.user.id, setId]
      );
      hasThirds = parseInt(thirdsResult.rows[0].count) > 0;
    }

    if (phase === 'playoffs') {
      // Check groups
      const groupsResult = await db.query(
        'SELECT COUNT(*) as count FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2',
        [req.user.id, setId]
      );
      hasGroups = parseInt(groupsResult.rows[0].count) > 0;
    }

    res.json({ hasGroups, hasThirds, hasKnockout });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset from playoffs: delete groups + thirds + knockout
router.delete('/reset-from-playoffs', auth, async (req, res) => {
  try {
    const setId = req.query.setId;
    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }

    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);
    await db.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);
    await db.query('DELETE FROM group_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    res.json({ message: 'Reset from playoffs successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset from groups: delete thirds + knockout
router.delete('/reset-from-groups', auth, async (req, res) => {
  try {
    const setId = req.query.setId;
    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }

    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);
    await db.query('DELETE FROM third_place_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    res.json({ message: 'Reset from groups successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset from thirds: delete knockout only
router.delete('/reset-from-thirds', auth, async (req, res) => {
  try {
    const setId = req.query.setId;
    if (!setId) {
      return res.status(400).json({ error: 'setId is required' });
    }

    await db.query('DELETE FROM knockout_predictions WHERE user_id = $1 AND prediction_set_id = $2', [req.user.id, setId]);

    res.json({ message: 'Reset from thirds successful' });
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
