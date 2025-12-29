/**
 * Admin routes tests
 * Tests for /api/admin/* endpoints
 * Requires admin role authentication
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server';
import db from '../config/db';

// Test admin user
let adminToken;
let adminUserId;
let regularToken;
let regularUserId;

const uniqueAdminEmail = `admin_test_${Date.now()}@example.com`;
const uniqueRegularEmail = `regular_test_${Date.now()}@example.com`;

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Admin Routes', () => {
  // Setup: Create admin and regular users
  beforeAll(async () => {
    // Create admin user directly in DB
    const adminResult = await db.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, 'hashed_password', 'Admin Test User', 'admin')
       RETURNING id, email, role`,
      [uniqueAdminEmail]
    );
    adminUserId = adminResult.rows[0].id;

    // Generate admin token
    adminToken = jwt.sign(
      { id: adminUserId, email: uniqueAdminEmail, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create regular user
    const regularResult = await db.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, 'hashed_password', 'Regular Test User', 'user')
       RETURNING id, email, role`,
      [uniqueRegularEmail]
    );
    regularUserId = regularResult.rows[0].id;

    // Generate regular user token
    regularToken = jwt.sign(
      { id: regularUserId, email: uniqueRegularEmail, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // Cleanup
  afterAll(async () => {
    try {
      // Clean up test data
      await db.query('DELETE FROM real_playoff_results WHERE playoff_id LIKE $1', ['TEST_%']);
      await db.query('DELETE FROM real_knockout_results WHERE match_key LIKE $1', ['TEST_%']);
      await db.query('DELETE FROM real_group_matches WHERE group_letter = $1', ['Z']);
      await db.query('DELETE FROM real_group_standings WHERE group_letter = $1', ['Z']);
      await db.query('DELETE FROM users WHERE email IN ($1, $2)', [uniqueAdminEmail, uniqueRegularEmail]);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Authentication Tests
  // ============================================
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.statusCode).toBe(401);
    });

    it('should reject requests from non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Admin only');
    });

    it('should allow requests from admin users', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // Stats Endpoint Tests
  // ============================================
  describe('GET /api/admin/stats', () => {
    it('should return dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = getData(res);
      expect(data).toHaveProperty('total_users');
      expect(data).toHaveProperty('total_predictions');
      expect(data).toHaveProperty('playoffs_entered');
      expect(data).toHaveProperty('groups_entered');
      expect(data).toHaveProperty('knockout_entered');
    });

    it('should return numeric values for all stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      const data = getData(res);
      expect(typeof data.total_users).toBe('number');
      expect(typeof data.total_predictions).toBe('number');
      expect(typeof data.playoffs_entered).toBe('number');
      expect(typeof data.groups_entered).toBe('number');
      expect(typeof data.knockout_entered).toBe('number');
    });
  });

  // ============================================
  // Playoff Results Tests
  // ============================================
  describe('Playoff Results', () => {
    describe('GET /api/admin/playoffs', () => {
      it('should return playoff results', async () => {
        const res = await request(app)
          .get('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(getData(res))).toBe(true);
      });
    });

    describe('POST /api/admin/playoffs', () => {
      it('should save a playoff result', async () => {
        const res = await request(app)
          .post('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            playoff_id: 'TEST_UEFA_A',
            winner_team_id: 1
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('saved');
      });

      it('should update existing playoff result', async () => {
        // First save
        await request(app)
          .post('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            playoff_id: 'TEST_UEFA_B',
            winner_team_id: 1
          });

        // Update with different winner
        const res = await request(app)
          .post('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            playoff_id: 'TEST_UEFA_B',
            winner_team_id: 2
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('saved');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            playoff_id: 'TEST_MISSING'
            // missing winner_team_id
          });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('DELETE /api/admin/playoffs/:playoffId', () => {
      it('should delete a playoff result', async () => {
        // First create one
        await request(app)
          .post('/api/admin/playoffs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            playoff_id: 'TEST_DELETE',
            winner_team_id: 1
          });

        // Then delete it
        const res = await request(app)
          .delete('/api/admin/playoffs/TEST_DELETE')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('deleted');
      });
    });
  });

  // ============================================
  // Knockout Results Tests
  // ============================================
  describe('Knockout Results', () => {
    describe('GET /api/admin/knockout', () => {
      it('should return knockout results', async () => {
        const res = await request(app)
          .get('/api/admin/knockout')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(getData(res))).toBe(true);
      });
    });

    describe('POST /api/admin/knockout', () => {
      it('should save a knockout result', async () => {
        const res = await request(app)
          .post('/api/admin/knockout')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            match_key: 'TEST_M73',
            winner_team_id: 1,
            score_a: 2,
            score_b: 1
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('saved');
      });

      it('should save knockout result without scores', async () => {
        const res = await request(app)
          .post('/api/admin/knockout')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            match_key: 'TEST_M74',
            winner_team_id: 2
          });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('saved');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/admin/knockout')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            match_key: 'TEST_M75'
            // missing winner_team_id
          });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('DELETE /api/admin/knockout/:matchKey', () => {
      it('should delete a knockout result', async () => {
        // First create one
        await request(app)
          .post('/api/admin/knockout')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            match_key: 'TEST_M99',
            winner_team_id: 1
          });

        // Then delete it
        const res = await request(app)
          .delete('/api/admin/knockout/TEST_M99')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('deleted');
      });
    });
  });

  // ============================================
  // Group Results Tests
  // ============================================
  describe('Group Results', () => {
    describe('GET /api/admin/groups', () => {
      it('should return group match results', async () => {
        const res = await request(app)
          .get('/api/admin/groups')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(getData(res))).toBe(true);
      });
    });

    describe('GET /api/admin/groups/standings', () => {
      it('should return group standings', async () => {
        const res = await request(app)
          .get('/api/admin/groups/standings')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(getData(res))).toBe(true);
      });
    });

    describe('POST /api/admin/groups', () => {
      it('should reject invalid data (wrong number of matches)', async () => {
        const res = await request(app)
          .post('/api/admin/groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            group_letter: 'Z',
            matches: [
              { match_index: 1, team_a_id: 1, team_b_id: 2, score_a: 1, score_b: 0 }
              // Only 1 match instead of 6
            ]
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('6 matches');
      });

      it('should reject missing group_letter', async () => {
        const res = await request(app)
          .post('/api/admin/groups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            matches: []
          });

        expect(res.statusCode).toBe(400);
      });

      it('should save group matches with transaction', async () => {
        // Get real team IDs from the database
        const teamsResult = await db.query('SELECT id FROM teams LIMIT 4');
        const teamIds = teamsResult.rows.map(r => r.id);

        if (teamIds.length >= 4) {
          const res = await request(app)
            .post('/api/admin/groups')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              group_letter: 'Z',
              matches: [
                { match_index: 1, team_a_id: teamIds[0], team_b_id: teamIds[1], score_a: 2, score_b: 1 },
                { match_index: 2, team_a_id: teamIds[2], team_b_id: teamIds[3], score_a: 0, score_b: 0 },
                { match_index: 3, team_a_id: teamIds[0], team_b_id: teamIds[2], score_a: 1, score_b: 1 },
                { match_index: 4, team_a_id: teamIds[1], team_b_id: teamIds[3], score_a: 3, score_b: 0 },
                { match_index: 5, team_a_id: teamIds[0], team_b_id: teamIds[3], score_a: 2, score_b: 0 },
                { match_index: 6, team_a_id: teamIds[1], team_b_id: teamIds[2], score_a: 1, score_b: 2 }
              ]
            });

          expect(res.statusCode).toBe(200);
          expect(res.body.message).toContain('saved');
        }
      });
    });
  });

  // ============================================
  // Role Verification Tests
  // ============================================
  describe('Role Verification', () => {
    it('should verify role from JWT (not database) for performance', async () => {
      // Note: Role is verified from JWT only, not from database on each request.
      // This is an intentional optimization - if an admin is demoted, they keep
      // access until their JWT expires. JWTs should be short-lived.

      // Downgrade the admin user to regular user in DB
      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['user', adminUserId]);

      // Admin token still works because role is in JWT
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // JWT still has admin role, so access is granted
      expect(res.statusCode).toBe(200);

      // Restore admin role for other tests
      await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUserId]);
    });
  });
});

export {};
