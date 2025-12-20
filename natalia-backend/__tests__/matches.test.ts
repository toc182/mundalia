/**
 * Matches routes tests
 * Tests for /api/matches/* endpoints
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server';
import db from '../config/db';

// Test users
let adminToken: string;
let adminUserId: number;
let regularToken: string;
let regularUserId: number;
let testMatchId: number;

const uniqueAdminEmail = `matches_admin_${Date.now()}@example.com`;
const uniqueRegularEmail = `matches_user_${Date.now()}@example.com`;

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Matches Routes', () => {
  // Setup: Create admin and regular users
  beforeAll(async () => {
    // Create admin user
    const adminResult = await db.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, 'hashed_password', 'Matches Admin', 'admin')
       RETURNING id, email, role`,
      [uniqueAdminEmail]
    );
    adminUserId = adminResult.rows[0].id;

    adminToken = jwt.sign(
      { id: adminUserId, email: uniqueAdminEmail, role: 'admin' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Create regular user
    const regularResult = await db.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, 'hashed_password', 'Matches User', 'user')
       RETURNING id, email, role`,
      [uniqueRegularEmail]
    );
    regularUserId = regularResult.rows[0].id;

    regularToken = jwt.sign(
      { id: regularUserId, email: uniqueRegularEmail, role: 'user' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
  });

  // Cleanup
  afterAll(async () => {
    try {
      if (testMatchId) {
        await db.query('DELETE FROM matches WHERE id = $1', [testMatchId]);
      }
      await db.query('DELETE FROM users WHERE id = $1', [adminUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [regularUserId]);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Public Endpoints
  // ============================================
  describe('GET /api/matches', () => {
    it('should return all matches', async () => {
      const res = await request(app).get('/api/matches');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/matches/phase/:phase', () => {
    it('should return matches for a specific phase', async () => {
      const res = await request(app).get('/api/matches/phase/group');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array for non-existent phase', async () => {
      const res = await request(app).get('/api/matches/phase/nonexistent');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  // ============================================
  // Admin Endpoints
  // ============================================
  describe('POST /api/matches (admin)', () => {
    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/matches')
        .send({
          phase: 'group',
          group_letter: 'A',
          match_date: '2026-06-11T18:00:00Z',
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject with regular user token', async () => {
      const res = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          phase: 'group',
          group_letter: 'A',
          match_date: '2026-06-11T18:00:00Z',
        });

      expect(res.statusCode).toBe(403);
    });

    it('should create match with admin token', async () => {
      const res = await request(app)
        .post('/api/matches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          phase: 'group',
          group_letter: 'A',
          match_date: '2026-06-11T18:00:00Z',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id');
      expect(data.phase).toBe('group');
      expect(data.group_letter).toBe('A');
      testMatchId = data.id;
    });
  });

  describe('PUT /api/matches/:id/result (admin)', () => {
    it('should reject without authentication', async () => {
      const res = await request(app)
        .put(`/api/matches/${testMatchId}/result`)
        .send({
          result_a: 2,
          result_b: 1,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject with regular user token', async () => {
      const res = await request(app)
        .put(`/api/matches/${testMatchId}/result`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          result_a: 2,
          result_b: 1,
        });

      expect(res.statusCode).toBe(403);
    });

    it('should update result with admin token', async () => {
      const res = await request(app)
        .put(`/api/matches/${testMatchId}/result`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          result_a: 2,
          result_b: 1,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data.result_a).toBe(2);
      expect(data.result_b).toBe(1);
    });

    it('should return 404 for non-existent match', async () => {
      const res = await request(app)
        .put('/api/matches/99999/result')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          result_a: 2,
          result_b: 1,
        });

      expect(res.statusCode).toBe(404);
    });
  });
});

export {};
