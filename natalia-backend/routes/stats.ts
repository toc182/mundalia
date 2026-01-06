import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { success, serverError } from '../utils/response';

const router: Router = express.Router();

interface ChampionRow {
  team_id: number;
  team_name: string;
  team_code: string;
  flag_url: string;
  pick_count: string;
}

interface GroupPositionRow {
  group_letter: string;
  team_id: number;
  team_name: string;
  team_code: string;
  flag_url: string;
  position_1_count: string;
  position_2_count: string;
  position_3_count: string;
  position_4_count: string;
}

// GET /api/stats/community - Public community statistics
router.get('/community', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get total complete predictions count
    const totalPredictionsResult = await db.query(`
      SELECT COUNT(DISTINCT ps.id) as count
      FROM prediction_sets ps
      WHERE EXISTS (
        SELECT 1 FROM knockout_predictions kp
        WHERE kp.prediction_set_id = ps.id AND kp.match_key = 'M96'
      )
    `);
    const totalPredictions = parseInt((totalPredictionsResult.rows[0] as { count: string }).count, 10);

    // Get most picked champions (M96 = Final match)
    const championsResult = await db.query(`
      SELECT
        t.id as team_id,
        t.name as team_name,
        t.code as team_code,
        t.flag_url,
        COUNT(*) as pick_count
      FROM knockout_predictions kp
      JOIN teams t ON kp.winner_team_id = t.id
      WHERE kp.match_key = 'M96'
      GROUP BY t.id, t.name, t.code, t.flag_url
      ORDER BY pick_count DESC
      LIMIT 5
    `);

    const topChampions = (championsResult.rows as ChampionRow[]).map(row => ({
      teamId: row.team_id,
      teamName: row.team_name,
      teamCode: row.team_code,
      flagUrl: row.flag_url,
      pickCount: parseInt(row.pick_count, 10),
      percentage: totalPredictions > 0
        ? Math.round((parseInt(row.pick_count, 10) / totalPredictions) * 100)
        : 0
    }));

    // Get most picked finalists (M95 = Third place, M96 = Final)
    const finalistsResult = await db.query(`
      SELECT
        t.id as team_id,
        t.name as team_name,
        t.code as team_code,
        t.flag_url,
        COUNT(*) as pick_count
      FROM knockout_predictions kp
      JOIN teams t ON kp.winner_team_id = t.id
      WHERE kp.match_key IN ('M93', 'M94')
      GROUP BY t.id, t.name, t.code, t.flag_url
      ORDER BY pick_count DESC
      LIMIT 5
    `);

    // Count total semifinal predictions
    const semifinalTotalResult = await db.query(`
      SELECT COUNT(*) as count FROM knockout_predictions WHERE match_key IN ('M93', 'M94')
    `);
    const semifinalTotal = parseInt((semifinalTotalResult.rows[0] as { count: string }).count, 10);

    const topFinalists = (finalistsResult.rows as ChampionRow[]).map(row => ({
      teamId: row.team_id,
      teamName: row.team_name,
      teamCode: row.team_code,
      flagUrl: row.flag_url,
      pickCount: parseInt(row.pick_count, 10),
      percentage: semifinalTotal > 0
        ? Math.round((parseInt(row.pick_count, 10) / semifinalTotal) * 100)
        : 0
    }));

    // Get group predictions variance (which groups have most disagreement)
    // A "controversial" group is one where position 1 picks are spread across multiple teams
    const groupVarianceResult = await db.query(`
      WITH position_counts AS (
        SELECT
          gp.group_letter,
          gp.team_id,
          t.name as team_name,
          t.code as team_code,
          t.flag_url,
          SUM(CASE WHEN predicted_position = 1 THEN 1 ELSE 0 END) as position_1_count,
          SUM(CASE WHEN predicted_position = 2 THEN 1 ELSE 0 END) as position_2_count,
          SUM(CASE WHEN predicted_position = 3 THEN 1 ELSE 0 END) as position_3_count,
          SUM(CASE WHEN predicted_position = 4 THEN 1 ELSE 0 END) as position_4_count
        FROM group_predictions gp
        JOIN teams t ON gp.team_id = t.id
        GROUP BY gp.group_letter, gp.team_id, t.name, t.code, t.flag_url
      )
      SELECT * FROM position_counts
      ORDER BY group_letter, position_1_count DESC
    `);

    // Process group data to find most controversial groups
    const groupData: Record<string, {
      teams: Array<{
        teamId: number;
        teamName: string;
        teamCode: string;
        flagUrl: string;
        pos1: number;
        pos2: number;
        pos3: number;
        pos4: number;
      }>;
      variance: number;
    }> = {};

    (groupVarianceResult.rows as GroupPositionRow[]).forEach(row => {
      if (!groupData[row.group_letter]) {
        groupData[row.group_letter] = { teams: [], variance: 0 };
      }
      groupData[row.group_letter].teams.push({
        teamId: row.team_id,
        teamName: row.team_name,
        teamCode: row.team_code,
        flagUrl: row.flag_url,
        pos1: parseInt(row.position_1_count, 10),
        pos2: parseInt(row.position_2_count, 10),
        pos3: parseInt(row.position_3_count, 10),
        pos4: parseInt(row.position_4_count, 10)
      });
    });

    // Calculate variance for each group (higher = more controversial)
    // Variance is based on how spread out the position 1 picks are
    Object.keys(groupData).forEach(group => {
      const teams = groupData[group].teams;
      const totalPos1 = teams.reduce((sum, t) => sum + t.pos1, 0);
      if (totalPos1 > 0) {
        // Calculate entropy-like measure: if one team dominates pos1, low variance
        // if picks are spread, high variance
        const proportions = teams.map(t => t.pos1 / totalPos1);
        const entropy = proportions.reduce((sum, p) => {
          if (p > 0) return sum - p * Math.log2(p);
          return sum;
        }, 0);
        groupData[group].variance = entropy;
      }
    });

    // Sort groups by variance (most controversial first)
    const controversialGroups = Object.entries(groupData)
      .sort((a, b) => b[1].variance - a[1].variance)
      .slice(0, 3)
      .map(([letter, data]) => ({
        group: letter,
        teams: data.teams.sort((a, b) => b.pos1 - a.pos1)
      }));

    success(res, {
      totalPredictions,
      topChampions,
      topFinalists,
      controversialGroups
    });
  } catch (err) {
    console.error('[STATS] Error:', err);
    serverError(res, err as Error);
  }
});

export default router;
