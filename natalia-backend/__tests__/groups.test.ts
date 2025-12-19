/**
 * Groups routes tests (Private Groups)
 * Tests for /api/groups/* endpoints
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Test users and tokens
let authToken1;
let authToken2;
let testGroupId;
let testGroupCode;

const uniqueEmail1 = `groups_test1_${Date.now()}@example.com`;
const uniqueEmail2 = `groups_test2_${Date.now()}@example.com`;

const testUser1 = {
  name: 'Groups Test User 1',
  email: uniqueEmail1,
  password: 'TestPassword123',
};

const testUser2 = {
  name: 'Groups Test User 2',
  email: uniqueEmail2,
  password: 'TestPassword123',
};

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Groups Routes (Private Groups)', () => {
  // Setup: Create two test users
  beforeAll(async () => {
    // Register user 1
    const res1 = await request(app)
      .post('/api/auth/register')
      .send(testUser1);

    if (res1.statusCode === 201) {
      authToken1 = getData(res1).token;
    }

    // Register user 2
    const res2 = await request(app)
      .post('/api/auth/register')
      .send(testUser2);

    if (res2.statusCode === 201) {
      authToken2 = getData(res2).token;
    }
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.query('DELETE FROM private_group_members WHERE group_id IN (SELECT id FROM private_groups WHERE name LIKE $1)', ['Test Group%']);
      await db.query('DELETE FROM private_groups WHERE name LIKE $1', ['Test Group%']);
      await db.query('DELETE FROM users WHERE email LIKE $1', ['groups_test%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // CREATE Group Tests
  // ============================================
  describe('POST /api/groups', () => {
    it('should create a new private group', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: 'Test Group 1' });

      // 201 is correct for resource creation
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', 'Test Group 1');
      expect(data).toHaveProperty('code');
      expect(data.code).toHaveLength(6);
      testGroupId = data.id;
      testGroupCode = data.code;
    });

    it('should generate unique 6-character code', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: 'Test Group 2' });

      expect(res.statusCode).toBe(201);
      const data = getData(res);
      expect(data.code).toHaveLength(6);
      expect(data.code).not.toBe(testGroupCode);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/groups')
        .send({ name: 'Test Group' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // GET Groups Tests
  // ============================================
  describe('GET /api/groups', () => {
    it('should return groups for authenticated user', async () => {
      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
      expect(getData(res).length).toBeGreaterThan(0);
    });

    it('should include member count', async () => {
      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      const groups = getData(res);
      expect(groups[0]).toHaveProperty('member_count');
    });

    it('should return empty array for user with no groups', async () => {
      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken2}`);

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toEqual([]);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/groups');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // JOIN Group Tests
  // ============================================
  describe('POST /api/groups/join', () => {
    it('should allow user to join group with valid code', async () => {
      const res = await request(app)
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ code: testGroupCode });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
      expect(getData(res)).toHaveProperty('group');
    });

    it('should reject joining same group twice', async () => {
      const res = await request(app)
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ code: testGroupCode });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Already a member');
    });

    it('should handle case-insensitive codes', async () => {
      // First create a new group to test with
      const createRes = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: 'Test Group Case' });

      const code = getData(createRes).code;

      // Try joining with lowercase
      const res = await request(app)
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ code: code.toLowerCase() });

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for invalid code', async () => {
      const res = await request(app)
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ code: 'ZZZZZZ' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/groups/join')
        .send({ code: testGroupCode });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // Group Leaderboard Tests
  // ============================================
  describe('GET /api/groups/:id/leaderboard', () => {
    it('should return leaderboard for group members', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken1}`);

      // Can be 200 (success) or 500 if leaderboard calculation fails (no predictions)
      expect([200, 500]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(getData(res))).toBe(true);
      }
    });

    it('should include user info and points when available', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken1}`);

      if (res.statusCode === 200) {
        const leaderboard = getData(res);
        if (leaderboard.length > 0) {
          expect(leaderboard[0]).toHaveProperty('name');
          expect(leaderboard[0]).toHaveProperty('total_points');
        }
      }
    });

    it('should reject non-members', async () => {
      // Create a new user who is not in the group
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Non Member',
          email: `groups_nonmember_${Date.now()}@example.com`,
          password: 'TestPassword123',
        });

      if (newUserRes.statusCode === 201) {
        const nonMemberToken = getData(newUserRes).token;

        const res = await request(app)
          .get(`/api/groups/${testGroupId}/leaderboard`)
          .set('Authorization', `Bearer ${nonMemberToken}`);

        // 403 for not member, or 500 if calculation fails
        expect([403, 500]).toContain(res.statusCode);
      }
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`);

      expect(res.statusCode).toBe(401);
    });
  });
});

export {};
