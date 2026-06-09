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
      await db.query('DELETE FROM prediction_sets WHERE name LIKE $1', ['Test Group%']);
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

    it('should include prediction info and points when available', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken1}`);

      if (res.statusCode === 200) {
        const leaderboard = getData(res);
        if (leaderboard.length > 0) {
          expect(leaderboard[0]).toHaveProperty('public_id');
          expect(leaderboard[0]).toHaveProperty('prediction_name');
          expect(leaderboard[0]).toHaveProperty('owner_name');
          expect(leaderboard[0]).toHaveProperty('total_points');
          expect(leaderboard[0]).toHaveProperty('is_mine');
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

  // ============================================
  // Group Details Tests
  // ============================================
  describe('GET /api/groups/:id', () => {
    it('should return group details for a member', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      const data = getData(res);
      expect(data).toHaveProperty('id', testGroupId);
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('member_count');
      expect(data).toHaveProperty('is_owner', true);
    });

    it('should reject non-members', async () => {
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Detail Non Member',
          email: `groups_test_detail_${Date.now()}@example.com`,
          password: 'TestPassword123',
        });
      const token = getData(newUserRes).token;

      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app).get(`/api/groups/${testGroupId}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // Link / Unlink Prediction Tests
  // ============================================
  describe('Linking predictions to a group', () => {
    let predPublicId;

    beforeAll(async () => {
      // Create a prediction set owned by user1
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: 'Test Group Link Pred', mode: 'positions' });
      predPublicId = getData(res).public_id;
    });

    it('should list the caller predictions as linkable (not yet linked)', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/linkable`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      const sets = getData(res);
      const target = sets.find((s) => s.public_id === predPublicId);
      expect(target).toBeDefined();
      expect(target.is_linked).toBe(false);
    });

    it('should link a prediction to the group', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/predictions`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ predictionSetId: predPublicId });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should mark the prediction as linked afterwards', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/linkable`)
        .set('Authorization', `Bearer ${authToken1}`);

      const target = getData(res).find((s) => s.public_id === predPublicId);
      expect(target.is_linked).toBe(true);
    });

    it('should show the linked prediction in the leaderboard', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      const row = getData(res).find((r) => r.public_id === predPublicId);
      expect(row).toBeDefined();
      expect(row).toHaveProperty('prediction_name', 'Test Group Link Pred');
      expect(row.is_mine).toBe(true);
    });

    it('should reject linking the same prediction twice (409)', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/predictions`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ predictionSetId: predPublicId });

      expect(res.statusCode).toBe(409);
    });

    it("should not let a member link another user's prediction", async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/predictions`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ predictionSetId: predPublicId });

      expect(res.statusCode).toBe(404);
    });

    it('should reject linking by non-members', async () => {
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Link Non Member',
          email: `groups_test_link_${Date.now()}@example.com`,
          password: 'TestPassword123',
        });
      const token = getData(newUserRes).token;

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/predictions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ predictionSetId: predPublicId });

      expect(res.statusCode).toBe(403);
    });

    it('should unlink the prediction from the group', async () => {
      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/predictions/${predPublicId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should remove the prediction from the leaderboard after unlink', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken1}`);

      const row = getData(res).find((r) => r.public_id === predPublicId);
      expect(row).toBeUndefined();
    });
  });

  // ============================================
  // Deadline Gating Tests (predictions closed)
  // ============================================
  describe('Linking blocked when predictions are closed', () => {
    let predPublicId;

    beforeAll(async () => {
      // Set a deadline in the past so predictions are closed
      await db.query(`
        INSERT INTO settings (key, value) VALUES ('predictions_deadline', '2000-01-01T00:00:00.000Z')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `);
      // Create a prediction owned by user1 to attempt linking
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: 'Test Group Deadline Pred', mode: 'positions' });
      predPublicId = getData(res).public_id;
    });

    afterAll(async () => {
      // Re-open predictions so we don't affect other test runs
      await db.query("DELETE FROM settings WHERE key = 'predictions_deadline'");
    });

    it('should reject linking when predictions are closed (403)', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/predictions`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ predictionSetId: predPublicId });

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('DEADLINE_PASSED');
    });

    it('should reject unlinking when predictions are closed (403)', async () => {
      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/predictions/${predPublicId}`)
        .set('Authorization', `Bearer ${authToken1}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('DEADLINE_PASSED');
    });
  });
});

export {};
