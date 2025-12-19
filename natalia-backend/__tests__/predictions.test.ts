/**
 * Predictions routes tests
 * Tests for /api/predictions/* endpoints
 */

import request from 'supertest';
import app from '../server';
import db from '../config/db';

// Test user and token
let authToken;
let testSetId;
let scoresSetId;
const uniqueEmail = `pred_test_${Date.now()}@example.com`;
const testUser = {
  name: 'Predictions Test User',
  email: uniqueEmail,
  password: 'TestPassword123',
};

// Helper to extract data from standardized response
const getData = (res) => res.body.data ?? res.body;

describe('Predictions Routes', () => {
  // Setup: Create test user and get token
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (res.statusCode === 201) {
      authToken = getData(res).token;
    } else {
      // User might exist, try login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      authToken = getData(loginRes).token;
    }

    // Create a prediction set for positions mode
    const setRes = await request(app)
      .post('/api/prediction-sets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Predictions', mode: 'positions' });

    testSetId = getData(setRes).id;

    // Create a prediction set for scores mode
    const scoresSetRes = await request(app)
      .post('/api/prediction-sets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Scores Predictions', mode: 'scores' });

    scoresSetId = getData(scoresSetRes).id;
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
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
      expect(getData(res)).toHaveProperty('setId');
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

    it('should reject position 0', async () => {
      const predictions = [
        { group_letter: 'A', team_id: 1, predicted_position: 0 }, // Invalid
      ];

      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid predicted_position');
    });

    it('should reject invalid team_id', async () => {
      const predictions = [
        { group_letter: 'A', team_id: -1, predicted_position: 1 }, // Invalid
      ];

      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid team_id');
    });

    it('should reject non-array predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions: 'not an array', setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be an array');
    });

    it('should reject null predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions: null, setId: testSetId });

      expect(res.statusCode).toBe(400);
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
      expect(res.body.success).toBe(true);
      expect(Array.isArray(getData(res))).toBe(true);
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
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });

    it('should save knockout predictions with scores', async () => {
      const predictions = {
        'M73': { winner: 1, scoreA: 2, scoreB: 1 },
        'M74': { winner: 2, scoreA: 0, scoreB: 3 },
      };

      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
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

    it('should accept group stage match keys for knockout predictions', async () => {
      // M72 is a group stage match but the validator accepts M1-M104
      // The app allows saving any valid match key in knockout predictions
      const predictions = {
        'M72': 1,
      };

      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      // Valid match key M72 is accepted (M1-M104 range)
      expect(res.statusCode).toBe(200);
    });

    it('should reject match key above range', async () => {
      const predictions = {
        'M105': 1, // Above valid range
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

    it('should accept M104 (final match)', async () => {
      const predictions = {
        'M104': 1, // Final match
      };

      const res = await request(app)
        .post('/api/predictions/knockout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/predictions/knockout', () => {
    it('should return knockout predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/knockout?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof getData(res)).toBe('object');
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
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });

    it('should save multiple playoff predictions', async () => {
      const predictions = {
        'uefa_a': { semi1: 1, semi2: 2, final: 1 },
        'uefa_b': { semi1: 3, semi2: 4, final: 3 },
        'fifa_1': { semi1: 5, semi2: 6, final: 5 },
      };

      const res = await request(app)
        .post('/api/predictions/playoffs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid playoff_id', async () => {
      const predictions = {
        'invalid_playoff': { semi1: 1, semi2: 2, final: 1 },
      };

      const res = await request(app)
        .post('/api/predictions/playoffs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions, setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid playoff_id');
    });

    it('should reject non-object predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/playoffs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ predictions: 'not an object', setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be an object');
    });
  });

  describe('GET /api/predictions/playoffs', () => {
    it('should return playoff predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/playoffs?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof getData(res)).toBe('object');
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
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });

    it('should accept any valid 8 group combination', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: 'BCDEFGHI', setId: testSetId });

      expect(res.statusCode).toBe(200);
    });

    it('should reject invalid selectedGroups length', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: 'ABC', setId: testSetId }); // Only 3, needs 8

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('exactly 8 groups');
    });

    it('should reject too many groups', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: 'ABCDEFGHIJ', setId: testSetId }); // 10 groups

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('exactly 8 groups');
    });

    it('should reject invalid group letters', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: 'ABCDEXYZ', setId: testSetId }); // X, Y, Z are invalid

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid group letter');
    });

    it('should reject non-string selectedGroups', async () => {
      const res = await request(app)
        .post('/api/predictions/third-places')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ selectedGroups: ['A', 'B'], setId: testSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be a string');
    });
  });

  describe('GET /api/predictions/third-places', () => {
    it('should return third places predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/third-places?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getData(res)).toHaveProperty('selectedGroups');
    });
  });

  // ============================================
  // Score Predictions Tests (Scores Mode)
  // ============================================
  describe('POST /api/predictions/scores', () => {
    it('should save score predictions', async () => {
      const scores = {
        'A': {
          1: { a: 2, b: 1 },
          2: { a: 0, b: 0 },
        }
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: scoresSetId });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject scores for positions mode set', async () => {
      const scores = {
        'A': { 1: { a: 2, b: 1 } }
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: testSetId }); // positions mode set

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_MODE');
    });

    it('should reject invalid group letter in scores', async () => {
      const scores = {
        'Z': { 1: { a: 2, b: 1 } } // Invalid group
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: scoresSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid group letter');
    });

    it('should reject invalid match number', async () => {
      const scores = {
        'A': { 7: { a: 2, b: 1 } } // Match 7 doesn't exist (1-6 only)
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: scoresSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid match number');
    });

    it('should reject negative scores', async () => {
      const scores = {
        'A': { 1: { a: -1, b: 1 } }
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: scoresSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid score');
    });

    it('should reject unreasonably high scores', async () => {
      const scores = {
        'A': { 1: { a: 25, b: 1 } } // Max is 20
      };

      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores, setId: scoresSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid score');
    });

    it('should reject non-object scores', async () => {
      const res = await request(app)
        .post('/api/predictions/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores: 'not an object', setId: scoresSetId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('must be an object');
    });
  });

  describe('GET /api/predictions/scores', () => {
    it('should return score predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/scores?setId=${scoresSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof getData(res)).toBe('object');
    });
  });

  // ============================================
  // Tiebreaker Predictions Tests
  // ============================================
  describe('POST /api/predictions/tiebreaker', () => {
    it('should save tiebreaker decision', async () => {
      const res = await request(app)
        .post('/api/predictions/tiebreaker')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          setId: testSetId,
          group: 'A',
          tiedTeamIds: [1, 2],
          resolvedOrder: [2, 1]
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid group letter', async () => {
      const res = await request(app)
        .post('/api/predictions/tiebreaker')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          setId: testSetId,
          group: 'Z',
          tiedTeamIds: [1, 2],
          resolvedOrder: [2, 1]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid group letter');
    });

    it('should reject single team in tiedTeamIds', async () => {
      const res = await request(app)
        .post('/api/predictions/tiebreaker')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          setId: testSetId,
          group: 'A',
          tiedTeamIds: [1], // Need at least 2
          resolvedOrder: [1]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('at least 2 teams');
    });

    it('should reject mismatched resolvedOrder length', async () => {
      const res = await request(app)
        .post('/api/predictions/tiebreaker')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          setId: testSetId,
          group: 'A',
          tiedTeamIds: [1, 2, 3],
          resolvedOrder: [2, 1] // Missing one
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('match tiedTeamIds length');
    });
  });

  describe('GET /api/predictions/tiebreaker', () => {
    it('should return tiebreaker decisions', async () => {
      const res = await request(app)
        .get(`/api/predictions/tiebreaker?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof getData(res)).toBe('object');
    });
  });

  // ============================================
  // Reset Endpoints Tests
  // ============================================
  describe('GET /api/predictions/has-subsequent-data', () => {
    it('should check for subsequent data from playoffs', async () => {
      const res = await request(app)
        .get(`/api/predictions/has-subsequent-data?setId=${testSetId}&phase=playoffs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getData(res)).toHaveProperty('hasGroups');
      expect(getData(res)).toHaveProperty('hasThirds');
      expect(getData(res)).toHaveProperty('hasKnockout');
    });

    it('should check for subsequent data from groups', async () => {
      const res = await request(app)
        .get(`/api/predictions/has-subsequent-data?setId=${testSetId}&phase=groups`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      const data = getData(res);
      expect(data.hasGroups).toBe(false); // Groups phase doesn't check groups
      expect(data).toHaveProperty('hasThirds');
      expect(data).toHaveProperty('hasKnockout');
    });

    it('should require setId parameter', async () => {
      const res = await request(app)
        .get('/api/predictions/has-subsequent-data?phase=playoffs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/predictions/reset-from-thirds', () => {
    it('should reset knockout predictions', async () => {
      const res = await request(app)
        .delete(`/api/predictions/reset-from-thirds?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Reset');
    });

    it('should require setId parameter', async () => {
      const res = await request(app)
        .delete('/api/predictions/reset-from-thirds')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/predictions/reset-from-groups', () => {
    it('should reset thirds and knockout predictions', async () => {
      const res = await request(app)
        .delete(`/api/predictions/reset-from-groups?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Reset');
    });
  });

  describe('DELETE /api/predictions/reset-from-playoffs', () => {
    it('should reset groups, thirds, and knockout predictions', async () => {
      const res = await request(app)
        .delete(`/api/predictions/reset-from-playoffs?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Reset');
    });
  });

  // ============================================
  // All Predictions Endpoint Tests
  // ============================================
  describe('GET /api/predictions/all', () => {
    it('should return all predictions for a set', async () => {
      const res = await request(app)
        .get(`/api/predictions/all?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = getData(res);
      expect(data).toHaveProperty('setId');
      expect(data).toHaveProperty('groupPredictions');
      expect(data).toHaveProperty('playoffPredictions');
      expect(data).toHaveProperty('thirdPlaces');
      expect(data).toHaveProperty('knockoutPredictions');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/predictions/all?setId=${testSetId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // My Predictions Endpoint Tests
  // ============================================
  describe('GET /api/predictions/my', () => {
    it('should return user predictions', async () => {
      const res = await request(app)
        .get(`/api/predictions/my?setId=${testSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const data = getData(res);
      expect(data).toHaveProperty('matchPredictions');
      expect(data).toHaveProperty('groupPredictions');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/predictions/my');

      expect(res.statusCode).toBe(401);
    });
  });
});

export {};
