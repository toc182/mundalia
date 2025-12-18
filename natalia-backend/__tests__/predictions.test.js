/**
 * Predictions routes tests
 * Tests for /api/predictions/* endpoints
 */

const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// Test user and token
let authToken;
let testSetId;
const uniqueEmail = `pred_test_${Date.now()}@example.com`;
const testUser = {
  name: 'Predictions Test User',
  email: uniqueEmail,
  password: 'TestPassword123',
};

describe('Predictions Routes', () => {
  // Setup: Create test user and get token
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (res.statusCode === 201) {
      authToken = res.body.token;
    } else {
      // User might exist, try login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      authToken = loginRes.body.token;
    }

    // Create a prediction set
    const setRes = await request(app)
      .post('/api/prediction-sets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Predictions', mode: 'positions' });

    testSetId = setRes.body.id;
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['pred_test_%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // Group Predictions Tests
  // ============================================
  describe('POST /api/predictions/groups', () => {
    it('should save valid group predictions', async () => {
      const predictions = [
        { group_letter: 'A', team_id: 1, predicted_position: 1 },
        { group_letter: 'A', team_id: 2, predicted_position: 2 },
        { group_letter: 'A', team_id: 3, predicted_position: 3 },
        { group_letter: 'A', team_id: 4, predicted_position: 4 },
      ];

      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('setId');
    });

    it('should reject invalid group_letter', async () => {
      const predictions = [
        { group_letter: 'Z', team_id: 1, predicted_position: 1 }, // Invalid
      ];

      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid group_letter');
    });

    it('should reject invalid predicted_position', async () => {
      const predictions = [
        { group_letter: 'A', team_id: 1, predicted_position: 5 }, // Invalid (must be 1-4)
      ];

      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid predicted_position');
    });

    it('should reject non-array predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions: 'not an array', setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be an array');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/predictions/groups')
        .send({ predictions: [], setId: testSetId });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/predictions/groups', () => {
    it('should return group predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/groups?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/predictions/groups?setId=${testSetId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // Knockout Predictions Tests
  // ============================================
  describe('POST /api/predictions/knockout', () => {
    it('should save valid knockout predictions', async () => {
      const predictions = {
        'M73': 1,
        'M74': 2,
      };

      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject invalid matchKey', async () => {
      const predictions = {
        'INVALID': 1, // Invalid match key
      };

      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid matchKey');
    });

    it('should reject non-object predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions: 'not an object', setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be an object');
    });
  });

  describe('GET /api/predictions/knockout', () => {
    it('should return knockout predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/knockout?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(typeof res.body).toBe('object');
    });
  });

  // ============================================
  // Playoff Predictions Tests
  // ============================================
  describe('POST /api/predictions/playoffs', () => {
    it('should save playoff predictions', async () => {
      const predictions = {
        'uefa_a': { semi1: 1, semi2: 2, final: 1 },
      };

      const res = await request(app)
        .post('/api/predictions/playoffs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/predictions/playoffs', () => {
    it('should return playoff predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/playoffs?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(typeof res.body).toBe('object');
    });
  });

  // ============================================
  // Third Places Predictions Tests
  // ============================================
  describe('POST /api/predictions/third-places', () => {
    it('should save third places predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: 'ABCDEFGH', setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/predictions/third-places', () => {
    it('should return third places predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/third-places?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('selectedGroups');
    });
  });

  // ============================================
  // Reset Endpoints Tests
  // ============================================
  describe('GET /api/predictions/has-subsequent-data', () => {
    it('should check for subsequent data', async () => {
      const res = await request(app)
        .get(`/api/predictions/has-subsequent-data?setId=${testSetId}&phase=playoffs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hasGroups');
      expect(res.body).toHaveProperty('hasThirds');
      expect(res.body).toHaveProperty('hasKnockout');
    });

    it('should require setId parameter', async () => {
      const res = await request(app)
        .get('/api/predictions/has-subsequent-data?phase=playoffs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });
});
