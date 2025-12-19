/**
 * Leaderboard routes tests
 * Tests for /api/leaderboard/* endpoints
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Leaderboard Routes', () => {
  // Cleanup
  afterAll(async () => {
    try {
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Global Leaderboard Tests
  // ============================================
  describe('GET /api/leaderboard', () => {
    it('should return leaderboard for positions mode (default)', async () => {
      const res = await request(app)
        .get('/api/leaderboard');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
    });

    it('should return leaderboard for positions mode explicitly', async () => {
      const res = await request(app)
        .get('/api/leaderboard?mode=positions');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
    });

    it('should return leaderboard for scores mode', async () => {
      const res = await request(app)
        .get('/api/leaderboard?mode=scores');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
    });

    it('should include user info and points in results', async () => {
      const res = await request(app)
        .get('/api/leaderboard?mode=positions');

      expect(res.statusCode).toBe(200);
      const leaderboard = getData(res);
      if (leaderboard.length > 0) {
        expect(leaderboard[0]).toHaveProperty('user_name');
        expect(leaderboard[0]).toHaveProperty('prediction_name');
        expect(leaderboard[0]).toHaveProperty('total_points');
        expect(leaderboard[0]).toHaveProperty('points_breakdown');
      }
    });

    it('should include points breakdown', async () => {
      const res = await request(app)
        .get('/api/leaderboard?mode=positions');

      expect(res.statusCode).toBe(200);
      const leaderboard = getData(res);
      if (leaderboard.length > 0) {
        const breakdown = leaderboard[0].points_breakdown;
        expect(breakdown).toHaveProperty('groupExact');
        expect(breakdown).toHaveProperty('groupQualifier');
        expect(breakdown).toHaveProperty('knockout');
      }
    });

    it('should be sorted by total_points descending', async () => {
      const res = await request(app)
        .get('/api/leaderboard?mode=positions');

      expect(res.statusCode).toBe(200);
      const leaderboard = getData(res);
      if (leaderboard.length > 1) {
        for (let i = 0; i < leaderboard.length - 1; i++) {
          expect(leaderboard[i].total_points).toBeGreaterThanOrEqual(leaderboard[i + 1].total_points);
        }
      }
    });

    it('should use cache for repeated requests', async () => {
      // First request
      const res1 = await request(app)
        .get('/api/leaderboard?mode=positions');
      expect(res1.statusCode).toBe(200);

      // Second request (should be cached)
      const res2 = await request(app)
        .get('/api/leaderboard?mode=positions');
      expect(res2.statusCode).toBe(200);

      // Results should be the same
      expect(getData(res1)).toEqual(getData(res2));
    });
  });

  // ============================================
  // Counts Endpoint Tests
  // ============================================
  describe('GET /api/leaderboard/counts', () => {
    it('should return counts for both modes', async () => {
      const res = await request(app)
        .get('/api/leaderboard/counts');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const counts = getData(res);
      expect(counts).toHaveProperty('positions');
      expect(counts).toHaveProperty('scores');
      expect(typeof counts.positions).toBe('number');
      expect(typeof counts.scores).toBe('number');
    });

    it('should return non-negative counts', async () => {
      const res = await request(app)
        .get('/api/leaderboard/counts');

      expect(res.statusCode).toBe(200);
      const counts = getData(res);
      expect(counts.positions).toBeGreaterThanOrEqual(0);
      expect(counts.scores).toBeGreaterThanOrEqual(0);
    });
  });
});

export {};
