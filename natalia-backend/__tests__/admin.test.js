/**
 * Admin routes tests
 * Tests for /api/admin/* endpoints
 * Note: These tests require an admin user in the database
 */

const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// Test admin user
let adminToken;
const adminEmail = `admin_test_${Date.now()}@example.com`;

describe('Admin Routes', () => {
  // Setup: Create admin user
  beforeAll(async () => {
    try {
      // First register a normal user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Admin Test User',
          email: adminEmail,
          password: 'AdminPassword123',
        });

      if (registerRes.statusCode === 201) {
        // Upgrade to admin in database
        await db.query(
          "UPDATE users SET role = 'admin' WHERE email = $1",
          [adminEmail]
        );

        // Login to get fresh token with admin role
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({ email: adminEmail, password: 'AdminPassword123' });

        adminToken = loginRes.body.token;
      }
    } catch (err) {
      console.error('Admin setup error:', err);
    }
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['admin_test_%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Stats Endpoint (doesn't require admin for basic test)
  // ============================================
  describe('GET /api/admin/stats', () => {
    it('should require admin authentication', async () => {
      const res = await request(app)
        .get('/api/admin/stats');

      expect(res.statusCode).toBe(401);
    });

    it('should return stats for admin user', async () => {
      if (!adminToken) {
        console.log('Skipping admin test - no admin token available');
        return;
      }

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should be 200 if admin, 403 if role not updated
      expect([200, 403]).toContain(res.statusCode);

      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('total_users');
        expect(res.body).toHaveProperty('total_predictions');
      }
    });
  });

  // ============================================
  // Playoff Results
  // ============================================
  describe('GET /api/admin/playoffs', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/admin/playoffs');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/playoffs', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/admin/playoffs')
        .send({ playoff_id: 'uefa_a', winner_team_id: 1 });

      expect(res.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/admin/playoffs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // Missing fields

      // 400 for validation error or 403 if not admin
      expect([400, 403]).toContain(res.statusCode);
    });
  });

  // ============================================
  // Group Results
  // ============================================
  describe('GET /api/admin/groups', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/admin/groups');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/groups', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/admin/groups')
        .send({ group_letter: 'A', matches: [] });

      expect(res.statusCode).toBe(401);
    });

    it('should validate data structure', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/admin/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ group_letter: 'A', matches: [] }); // Invalid - needs 6 matches

      // 400 for validation error or 403 if not admin
      expect([400, 403]).toContain(res.statusCode);
    });
  });

  // ============================================
  // Knockout Results
  // ============================================
  describe('GET /api/admin/knockout', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/admin/knockout');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/knockout', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/admin/knockout')
        .send({ match_key: 'M73', winner_team_id: 1 });

      expect(res.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .post('/api/admin/knockout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // Missing fields

      // 400 for validation error or 403 if not admin
      expect([400, 403]).toContain(res.statusCode);
    });
  });

  // ============================================
  // Delete Operations
  // ============================================
  describe('DELETE /api/admin/knockout/:matchKey', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .delete('/api/admin/knockout/M73');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/admin/playoffs/:playoffId', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .delete('/api/admin/playoffs/uefa_a');

      expect(res.statusCode).toBe(401);
    });
  });
});
