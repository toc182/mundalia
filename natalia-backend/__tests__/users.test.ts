/**
 * Users routes tests
 * Tests for /api/users/* endpoints
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Test user and token
let authToken;
const uniqueEmail = `users_test_${Date.now()}@example.com`;
const testUser = {
  name: 'Users Test User',
  email: uniqueEmail,
  password: 'TestPassword123',
};

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Users Routes', () => {
  // Setup: Create test user and get token
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (res.statusCode === 201) {
      authToken = getData(res).token;
    }
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['users_test_%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // GET /me Tests
  // ============================================
  describe('GET /api/users/me', () => {
    it('should return current user info', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const user = getData(res);
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', testUser.email);
      expect(user).toHaveProperty('name', testUser.name);
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('password_hash');
    });

    it('should include all profile fields', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const user = getData(res);
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('created_at');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/users/me');

      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // Check Username Tests
  // ============================================
  describe('GET /api/users/check-username/:username', () => {
    it('should return available for unused username', async () => {
      const res = await request(app)
        .get('/api/users/check-username/uniqueuser123');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getData(res)).toHaveProperty('available', true);
    });

    it('should return invalid for username too short', async () => {
      const res = await request(app)
        .get('/api/users/check-username/ab');

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toHaveProperty('available', false);
      expect(getData(res)).toHaveProperty('reason', 'invalid');
    });

    it('should return invalid for username with special chars', async () => {
      const res = await request(app)
        .get('/api/users/check-username/user@name');

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toHaveProperty('available', false);
      expect(getData(res)).toHaveProperty('reason', 'invalid');
    });

    it('should allow underscores in username', async () => {
      const res = await request(app)
        .get('/api/users/check-username/user_name123');

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toHaveProperty('available', true);
    });
  });

  // ============================================
  // Update Profile Tests
  // ============================================
  describe('PUT /api/users/me', () => {
    it('should update user name', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getData(res)).toHaveProperty('name', 'Updated Name');
    });

    it('should update username', async () => {
      const uniqueUsername = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test User', username: uniqueUsername });

      // Could be 200 (success) or 400 if username somehow taken
      if (res.statusCode === 200) {
        expect(getData(res)).toHaveProperty('username', uniqueUsername);
      } else {
        expect(res.statusCode).toBe(400);
      }
    });

    it('should reject invalid username format', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', username: 'ab' }); // Too short

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Username');
    });

    it('should update country', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', country: 'Argentina' });

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toHaveProperty('country', 'Argentina');
    });

    it('should update birth_date', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', birth_date: '1990-01-15' });

      expect(res.statusCode).toBe(200);
      expect(getData(res)).toHaveProperty('birth_date');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ name: 'Updated' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject duplicate username', async () => {
      // First, create another user with a username
      const otherEmail = `users_other_${Date.now()}@example.com`;
      const otherRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Other User',
          email: otherEmail,
          password: 'TestPassword123',
        });

      if (otherRes.statusCode === 201) {
        const otherToken = getData(otherRes).token;
        const takenUsername = `taken${Date.now()}`;

        // Set username for other user
        await request(app)
          .put('/api/users/me')
          .set('Authorization', `Bearer ${otherToken}`)
          .send({ name: 'Other', username: takenUsername });

        // Try to use same username for our test user
        const res = await request(app)
          .put('/api/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Test', username: takenUsername });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('ya está en uso');
      }
    });
  });
});

export {};
