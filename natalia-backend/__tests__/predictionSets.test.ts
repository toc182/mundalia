/**
 * PredictionSets routes tests
 * Tests for /api/prediction-sets/* endpoints
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Test user and token
let authToken;
let testSetId;
const uniqueEmail = `sets_test_${Date.now()}@example.com`;
const testUser = {
  name: 'Sets Test User',
  email: uniqueEmail,
  password: 'TestPassword123',
};

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('PredictionSets Routes', () => {
  // Setup: Create test user and get token
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (res.statusCode === 201) {
      authToken = getData(res).token;
    } else {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      authToken = getData(loginRes).token;
    }
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.query('DELETE FROM users WHERE email LIKE $1', ['sets_test_%@example.com']);
      await db.pool.end();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================
  // CREATE Tests
  // ============================================
  describe('POST /api/prediction-sets', () => {
    it('should create a new prediction set', async () => {
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Mi Primera Predicción', mode: 'positions' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', 'Mi Primera Predicción');
      expect(data).toHaveProperty('mode', 'positions');
      testSetId = data.id;
    });

    it('should create a set with scores mode', async () => {
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Predicción Marcadores', mode: 'scores' });

      expect(res.statusCode).toBe(201);
      expect(getData(res)).toHaveProperty('mode', 'scores');
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '', mode: 'positions' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject invalid mode', async () => {
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', mode: 'invalid' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid mode');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/prediction-sets')
        .send({ name: 'Test', mode: 'positions' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // READ Tests
  // ============================================
  describe('GET /api/prediction-sets', () => {
    it('should return all prediction sets for user', async () => {
      const res = await request(app)
        .get('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
      expect(getData(res).length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/prediction-sets');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/prediction-sets/:id', () => {
    it('should return a single prediction set with all data', async () => {
      const res = await request(app)
        .get(`/api/prediction-sets/${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id', testSetId);
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('groupPredictions');
      expect(data).toHaveProperty('playoffPredictions');
      expect(data).toHaveProperty('knockoutPredictions');
    });

    it('should return 404 for non-existent set', async () => {
      const res = await request(app)
        .get('/api/prediction-sets/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/prediction-sets/${testSetId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // UPDATE Tests
  // ============================================
  describe('PUT /api/prediction-sets/:id', () => {
    it('should update prediction set name', async () => {
      const res = await request(app)
        .put(`/api/prediction-sets/${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Nombre Actualizado' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getData(res)).toHaveProperty('name', 'Nombre Actualizado');
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .put(`/api/prediction-sets/${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent set', async () => {
      const res = await request(app)
        .put('/api/prediction-sets/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================
  // DUPLICATE Tests
  // ============================================
  describe('POST /api/prediction-sets/:id/duplicate', () => {
    it('should duplicate a prediction set', async () => {
      const res = await request(app)
        .post(`/api/prediction-sets/${testSetId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Copia de Predicción' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const data = getData(res);
      expect(data).toHaveProperty('id');
      expect(data.id).not.toBe(testSetId);
      expect(data).toHaveProperty('name', 'Copia de Predicción');
    });

    it('should duplicate with default name if not provided', async () => {
      const res = await request(app)
        .post(`/api/prediction-sets/${testSetId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(201);
      expect(getData(res).name).toContain('copia');
    });

    it('should return 404 for non-existent source set', async () => {
      const res = await request(app)
        .post('/api/prediction-sets/999999/duplicate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ============================================
  // DELETE Tests
  // ============================================
  describe('DELETE /api/prediction-sets/:id', () => {
    let setToDelete;

    beforeAll(async () => {
      // Create a set to delete
      const res = await request(app)
        .post('/api/prediction-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Para Borrar', mode: 'positions' });
      setToDelete = getData(res).id;
    });

    it('should delete a prediction set', async () => {
      const res = await request(app)
        .delete(`/api/prediction-sets/${setToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/prediction-sets/${setToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent set', async () => {
      const res = await request(app)
        .delete('/api/prediction-sets/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});

export {};
