const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// All routes require admin authentication
router.use(adminAuth);

// ============================================
// PLAYOFF RESULTS
// ============================================

// Get all real playoff results
router.get('/playoffs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM real_playoff_results ORDER BY playoff_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting playoff results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save real playoff result
router.post('/playoffs', async (req, res) => {
  const { playoff_id, winner_team_id } = req.body;

  if (!playoff_id || !winner_team_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.query(`
      INSERT INTO real_playoff_results (playoff_id, winner_team_id)
      VALUES ($1, $2)
      ON CONFLICT (playoff_id) DO UPDATE SET
        winner_team_id = $2,
        updated_at = CURRENT_TIMESTAMP
    `, [playoff_id, winner_team_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving playoff result:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// GROUP MATCHES (Real scores)
// ============================================

// Get all real group match scores
router.get('/groups', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM real_group_matches
      ORDER BY group_letter, match_index
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting group matches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save real group match scores (bulk for one group - 6 matches)
router.post('/groups', async (req, res) => {
  const { group_letter, matches } = req.body;
  // matches = [{ match_index: 0, team_a_id, team_b_id, score_a, score_b }, ...]

  if (!group_letter || !matches || matches.length !== 6) {
    return res.status(400).json({ error: 'Invalid data. Need group_letter and 6 matches.' });
  }

  try {
    // Delete existing matches for this group
    await db.query('DELETE FROM real_group_matches WHERE group_letter = $1', [group_letter]);

    // Insert new matches
    for (const match of matches) {
      await db.query(`
        INSERT INTO real_group_matches (group_letter, match_index, team_a_id, team_b_id, score_a, score_b)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [group_letter, match.match_index, match.team_a_id, match.team_b_id, match.score_a, match.score_b]);
    }

    // Also update/calculate standings in real_group_standings
    // (calculated from match results)
    await updateGroupStandings(group_letter, matches);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving group matches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to calculate and update group standings from match results
async function updateGroupStandings(groupLetter, matches) {
  // Calculate points, GD, GF for each team
  const teamStats = {};

  for (const match of matches) {
    if (match.score_a === null || match.score_b === null) continue;

    const scoreA = parseInt(match.score_a);
    const scoreB = parseInt(match.score_b);

    // Initialize teams if needed
    if (!teamStats[match.team_a_id]) {
      teamStats[match.team_a_id] = { points: 0, gd: 0, gf: 0 };
    }
    if (!teamStats[match.team_b_id]) {
      teamStats[match.team_b_id] = { points: 0, gd: 0, gf: 0 };
    }

    // Update stats
    teamStats[match.team_a_id].gf += scoreA;
    teamStats[match.team_a_id].gd += (scoreA - scoreB);
    teamStats[match.team_b_id].gf += scoreB;
    teamStats[match.team_b_id].gd += (scoreB - scoreA);

    if (scoreA > scoreB) {
      teamStats[match.team_a_id].points += 3;
    } else if (scoreB > scoreA) {
      teamStats[match.team_b_id].points += 3;
    } else {
      teamStats[match.team_a_id].points += 1;
      teamStats[match.team_b_id].points += 1;
    }
  }

  // Sort teams by points, then GD, then GF
  const sorted = Object.entries(teamStats)
    .sort((a, b) => {
      if (b[1].points !== a[1].points) return b[1].points - a[1].points;
      if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
      return b[1].gf - a[1].gf;
    });

  // Update standings table
  await db.query('DELETE FROM real_group_standings WHERE group_letter = $1', [groupLetter]);

  for (let i = 0; i < sorted.length; i++) {
    await db.query(`
      INSERT INTO real_group_standings (group_letter, team_id, final_position)
      VALUES ($1, $2, $3)
    `, [groupLetter, parseInt(sorted[i][0]), i + 1]);
  }
}

// Get calculated standings (from match results)
router.get('/groups/standings', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT rgs.*, t.name as team_name, t.code as team_code
      FROM real_group_standings rgs
      LEFT JOIN teams t ON rgs.team_id = t.id
      ORDER BY rgs.group_letter, rgs.final_position
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting group standings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// KNOCKOUT RESULTS
// ============================================

// Get all real knockout results
router.get('/knockout', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT rkr.*, t.name as team_name, t.code as team_code
      FROM real_knockout_results rkr
      LEFT JOIN teams t ON rkr.winner_team_id = t.id
      ORDER BY rkr.match_key
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting knockout results:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save real knockout result
router.post('/knockout', async (req, res) => {
  const { match_key, winner_team_id, score_a, score_b } = req.body;

  if (!match_key || !winner_team_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await db.query(`
      INSERT INTO real_knockout_results (match_key, winner_team_id, score_a, score_b)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (match_key) DO UPDATE SET
        winner_team_id = $2,
        score_a = $3,
        score_b = $4,
        updated_at = CURRENT_TIMESTAMP
    `, [match_key, winner_team_id, score_a ?? null, score_b ?? null]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving knockout result:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// BULK SAVE (for convenience)
// ============================================

// Delete a knockout result
router.delete('/knockout/:matchKey', async (req, res) => {
  try {
    await db.query('DELETE FROM real_knockout_results WHERE match_key = $1', [req.params.matchKey]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting knockout result:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a playoff result
router.delete('/playoffs/:playoffId', async (req, res) => {
  try {
    await db.query('DELETE FROM real_playoff_results WHERE playoff_id = $1', [req.params.playoffId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting playoff result:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// STATISTICS
// ============================================

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [users, predictions, playoffResults, groupResults, knockoutResults] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM prediction_sets'),
      db.query('SELECT COUNT(*) FROM real_playoff_results'),
      db.query('SELECT COUNT(DISTINCT group_letter) FROM real_group_standings'),
      db.query('SELECT COUNT(*) FROM real_knockout_results')
    ]);

    res.json({
      total_users: parseInt(users.rows[0].count),
      total_predictions: parseInt(predictions.rows[0].count),
      playoffs_entered: parseInt(playoffResults.rows[0].count),
      groups_entered: parseInt(groupResults.rows[0].count),
      knockout_entered: parseInt(knockoutResults.rows[0].count)
    });
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
