const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Points system
const POINTS = {
  GROUP_EXACT_POSITION: 3,    // Exact position in group
  GROUP_QUALIFIER: 1,         // Team that qualifies (top 2)
  ROUND_OF_32: 1,             // R32 (M73-M88)
  ROUND_OF_16: 2,             // R16 (M89-M96)
  QUARTERFINAL: 4,            // QF (M97-M100)
  SEMIFINAL: 6,               // SF (M101-M102)
  FINALIST: 8,                // Third place + Final (M103, M104)
  CHAMPION: 15,               // Champion (M104)
};

// Helper to get match round from match key
function getMatchPoints(matchKey) {
  const matchNum = parseInt(matchKey.replace('M', ''));
  if (matchNum >= 73 && matchNum <= 88) return POINTS.ROUND_OF_32;
  if (matchNum >= 89 && matchNum <= 96) return POINTS.ROUND_OF_16;
  if (matchNum >= 97 && matchNum <= 100) return POINTS.QUARTERFINAL;
  if (matchNum >= 101 && matchNum <= 102) return POINTS.SEMIFINAL;
  if (matchNum === 103) return POINTS.FINALIST; // Third place match
  if (matchNum === 104) return POINTS.CHAMPION; // Final
  return 0;
}

// Calculate points for a prediction set
async function calculatePoints(predictionSetId) {
  let totalPoints = 0;
  let breakdown = {
    groupExact: 0,
    groupQualifier: 0,
    knockout: 0
  };

  // Get real results
  const [realGroupStandings, realKnockout] = await Promise.all([
    db.query('SELECT * FROM real_group_standings'),
    db.query('SELECT * FROM real_knockout_results')
  ]);

  // Build lookup maps for real results
  const realGroupMap = {}; // { 'A': { teamId: position, ... }, ... }
  realGroupStandings.rows.forEach(row => {
    if (!realGroupMap[row.group_letter]) realGroupMap[row.group_letter] = {};
    realGroupMap[row.group_letter][row.team_id] = row.final_position;
  });

  const realKnockoutMap = {}; // { matchKey: winnerId }
  realKnockout.rows.forEach(row => {
    realKnockoutMap[row.match_key] = row.winner_team_id;
  });

  // Get user's group predictions
  const groupPreds = await db.query(
    'SELECT * FROM group_predictions WHERE prediction_set_id = $1',
    [predictionSetId]
  );

  // Score group predictions
  groupPreds.rows.forEach(pred => {
    const realPositions = realGroupMap[pred.group_letter];
    if (!realPositions) return; // No real results yet for this group

    const realPosition = realPositions[pred.team_id];
    if (realPosition === undefined) return; // Team not in real results

    // Exact position match
    if (pred.predicted_position === realPosition) {
      totalPoints += POINTS.GROUP_EXACT_POSITION;
      breakdown.groupExact += POINTS.GROUP_EXACT_POSITION;
    }
    // Qualifier match (both predicted and actual are top 2)
    else if (pred.predicted_position <= 2 && realPosition <= 2) {
      totalPoints += POINTS.GROUP_QUALIFIER;
      breakdown.groupQualifier += POINTS.GROUP_QUALIFIER;
    }
  });

  // Get user's knockout predictions
  const knockoutPreds = await db.query(
    'SELECT * FROM knockout_predictions WHERE prediction_set_id = $1',
    [predictionSetId]
  );

  // Score knockout predictions
  knockoutPreds.rows.forEach(pred => {
    const realWinner = realKnockoutMap[pred.match_key];
    if (realWinner === undefined) return; // No real result yet

    if (pred.winner_team_id === realWinner) {
      const points = getMatchPoints(pred.match_key);
      totalPoints += points;
      breakdown.knockout += points;
    }
  });

  return { totalPoints, breakdown };
}

// Get global leaderboard
// Shows each COMPLETE prediction set as an individual entry
// mode: 'positions' or 'scores' (query param)
router.get('/', async (req, res) => {
  const { mode = 'positions' } = req.query;

  try {
    // A prediction set is complete if it has the final match (M104) predicted
    const result = await db.query(`
      SELECT
        ps.id as prediction_set_id,
        ps.name as prediction_name,
        ps.mode,
        ps.created_at,
        u.id as user_id,
        u.name as user_name,
        u.username,
        u.country
      FROM prediction_sets ps
      INNER JOIN users u ON ps.user_id = u.id
      WHERE ps.mode = $1
        AND EXISTS (
          SELECT 1 FROM knockout_predictions kp
          WHERE kp.prediction_set_id = ps.id
            AND kp.match_key = 'M104'
            AND kp.winner_team_id IS NOT NULL
        )
      LIMIT 500
    `, [mode]);

    // Calculate points for each prediction set
    const leaderboard = await Promise.all(
      result.rows.map(async (row) => {
        const { totalPoints, breakdown } = await calculatePoints(row.prediction_set_id);
        return {
          ...row,
          total_points: totalPoints,
          points_breakdown: breakdown
        };
      })
    );

    // Sort by points descending, then by name
    leaderboard.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return a.user_name.localeCompare(b.user_name);
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get count of complete predictions by mode
router.get('/counts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ps.mode,
        COUNT(*) as count
      FROM prediction_sets ps
      WHERE EXISTS (
        SELECT 1 FROM knockout_predictions kp
        WHERE kp.prediction_set_id = ps.id
          AND kp.match_key = 'M104'
          AND kp.winner_team_id IS NOT NULL
      )
      GROUP BY ps.mode
    `);

    const counts = { positions: 0, scores: 0 };
    result.rows.forEach(row => {
      counts[row.mode] = parseInt(row.count);
    });

    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
