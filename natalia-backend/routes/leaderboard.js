const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { POINTS, getMatchPoints } = require('../utils/scoring');

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {
  positions: { data: null, timestamp: 0 },
  scores: { data: null, timestamp: 0 }
};

// Optimized: Calculate leaderboard with minimal queries
async function calculateLeaderboard(mode) {
  // Single query to get all complete prediction sets with user info
  const predictionSets = await db.query(`
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

  if (predictionSets.rows.length === 0) {
    return [];
  }

  // Get all prediction set IDs
  const setIds = predictionSets.rows.map(r => r.prediction_set_id);

  // OPTIMIZED: Load ALL data in just 4 queries total (instead of 2N+2)
  const [realGroupStandings, realKnockout, allGroupPreds, allKnockoutPreds] = await Promise.all([
    db.query('SELECT * FROM real_group_standings'),
    db.query('SELECT * FROM real_knockout_results'),
    db.query('SELECT * FROM group_predictions WHERE prediction_set_id = ANY($1)', [setIds]),
    db.query('SELECT * FROM knockout_predictions WHERE prediction_set_id = ANY($1)', [setIds])
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

  // Build prediction maps grouped by prediction_set_id
  const groupPredsBySet = {}; // { setId: [predictions] }
  allGroupPreds.rows.forEach(pred => {
    if (!groupPredsBySet[pred.prediction_set_id]) {
      groupPredsBySet[pred.prediction_set_id] = [];
    }
    groupPredsBySet[pred.prediction_set_id].push(pred);
  });

  const knockoutPredsBySet = {}; // { setId: [predictions] }
  allKnockoutPreds.rows.forEach(pred => {
    if (!knockoutPredsBySet[pred.prediction_set_id]) {
      knockoutPredsBySet[pred.prediction_set_id] = [];
    }
    knockoutPredsBySet[pred.prediction_set_id].push(pred);
  });

  // Calculate points for each prediction set (in memory, no more queries)
  const leaderboard = predictionSets.rows.map(row => {
    let totalPoints = 0;
    const breakdown = { groupExact: 0, groupQualifier: 0, knockout: 0 };

    // Score group predictions
    const groupPreds = groupPredsBySet[row.prediction_set_id] || [];
    groupPreds.forEach(pred => {
      const realPositions = realGroupMap[pred.group_letter];
      if (!realPositions) return;

      const realPosition = realPositions[pred.team_id];
      if (realPosition === undefined) return;

      if (pred.predicted_position === realPosition) {
        totalPoints += POINTS.GROUP_EXACT_POSITION;
        breakdown.groupExact += POINTS.GROUP_EXACT_POSITION;
      } else if (pred.predicted_position <= 2 && realPosition <= 2) {
        totalPoints += POINTS.GROUP_QUALIFIER;
        breakdown.groupQualifier += POINTS.GROUP_QUALIFIER;
      }
    });

    // Score knockout predictions
    const knockoutPreds = knockoutPredsBySet[row.prediction_set_id] || [];
    knockoutPreds.forEach(pred => {
      const realWinner = realKnockoutMap[pred.match_key];
      if (realWinner === undefined) return;

      if (pred.winner_team_id === realWinner) {
        const points = getMatchPoints(pred.match_key);
        totalPoints += points;
        breakdown.knockout += points;
      }
    });

    return {
      ...row,
      total_points: totalPoints,
      points_breakdown: breakdown
    };
  });

  // Sort by points descending, then by name
  leaderboard.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.user_name.localeCompare(b.user_name);
  });

  return leaderboard;
}

// Get global leaderboard with caching
router.get('/', async (req, res) => {
  const { mode = 'positions' } = req.query;

  try {
    // Check cache
    const cached = cache[mode];
    if (cached && cached.data && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json(cached.data);
    }

    // Calculate fresh leaderboard
    const leaderboard = await calculateLeaderboard(mode);

    // Update cache
    cache[mode] = { data: leaderboard, timestamp: Date.now() };

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
