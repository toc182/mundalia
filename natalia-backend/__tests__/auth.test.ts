/**
 * Auth routes tests
 * Tests for /api/auth/register and /api/auth/login
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Generate unique email for each test run
const uniqueEmail = `test_${Date.now()}@example.com`;
const testUser = {
  name: 'Test User',
  email: uniqueEmail,
  password: 'TestPassword123',
};

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Auth Routes', () => {
  // Clean up test user after all tests
  afterAll(async () => {
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['test_%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Registration Tests
  // ============================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('name', testUser.name);
      expect(data.user).toHaveProperty('email', testUser.email);
      expect(data.user).not.toHaveProperty('password');
      expect(data.user).not.toHaveProperty('password_hash');
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Could be 400 (duplicate) or 429 (rate limit)
      expect([400, 429]).toContain(res.statusCode);
      if (res.statusCode === 400) {
        expect(res.body).toHaveProperty('error');
      }
    });

    it('should reject registration with weak password (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: `weak1_${Date.now()}@example.com`,
          password: 'weakpassword123',
        });

      // Could be 400 (validation) or 429 (rate limit)
      expect([400, 429]).toContain(res.statusCode);
    });

    it('should reject registration with weak password (no number)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'No Number User',
          email: `weak2_${Date.now()}@example.com`,
          password: 'WeakPassword',
        });

      // Could be 400 (validation) or 429 (rate limit)
      expect([400, 429]).toContain(res.statusCode);
    });
  });

  // ============================================
  // Login Tests
  // ============================================
  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(testUser.email);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123',
        });

      // API returns 400 for invalid credentials
      expect([400, 429]).toContain(res.statusCode);
      if (res.statusCode === 400) {
        expect(res.body).toHaveProperty('error', 'Invalid credentials');
      }
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_999@example.com',
          password: 'AnyPassword123',
        });

      // API returns 400 for invalid credentials
      expect([400, 429]).toContain(res.statusCode);
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect([400, 429]).toContain(res.statusCode);
    });
  });

  // ============================================
  // Health Check
  // ============================================
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});

export {};
