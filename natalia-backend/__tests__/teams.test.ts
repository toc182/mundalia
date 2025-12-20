/**
 * Teams routes tests
 * Tests for /api/teams/* endpoints
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
let testTeamId: number;

const uniqueAdminEmail = `teams_admin_${Date.now()}@example.com`;
const uniqueRegularEmail = `teams_user_${Date.now()}@example.com`;

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Teams Routes', () => {
  // Setup: Create admin and regular users
  beforeAll(async () => {
    // Create admin user
    const adminResult = await db.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, 'hashed_password', 'Teams Admin', 'admin')
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
       VALUES ($1, 'hashed_password', 'Teams User', 'user')
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
      if (testTeamId) {
        await db.query('DELETE FROM teams WHERE id = $1', [testTeamId]);
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
  describe('GET /api/teams', () => {
    it('should return all teams', async () => {
      const res = await request(app).get('/api/teams');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/teams/group/:letter', () => {
    it('should return teams for a specific group', async () => {
      const res = await request(app).get('/api/teams/group/A');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should be case insensitive', async () => {
      const res = await request(app).get('/api/teams/group/a');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array for non-existent group', async () => {
      const res = await request(app).get('/api/teams/group/Z');

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
  describe('POST /api/teams (admin)', () => {
    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/teams')
        .send({
          name: 'Test Team',
          code: 'TST',
          group_letter: 'A',
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject with regular user token', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Test Team',
          code: 'TST',
          group_letter: 'A',
        });

      expect(res.statusCode).toBe(403);
    });

    it('should create team with admin token', async () => {
      const uniqueCode = `T${Date.now().toString().slice(-2)}`; // Max 3 chars for varchar(3)
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Team',
          code: uniqueCode,
          group_letter: 'A',
          flag_url: 'https://example.com/flag.png',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('Test Team');
      expect(data.code).toBe(uniqueCode);
      expect(data.group_letter).toBe('A');
      testTeamId = data.id;
    });
  });
});

export {};
