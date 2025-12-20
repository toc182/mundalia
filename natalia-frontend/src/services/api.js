import axios from 'axios';

// URL base de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token JWT a cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('natalia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    // Desempaquetar formato estandarizado { success, data } del backend
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // Si el servidor responde con 401, el token es invalido
    if (error.response?.status === 401) {
      localStorage.removeItem('natalia_token');
      localStorage.removeItem('natalia_user');
      // Redirigir a login si no estamos ya ahi
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (name, email, password) =>
    api.post('/auth/register', { name, email, password }),

  googleLogin: (credential) =>
    api.post('/auth/google', { credential }),

  getMe: () =>
    api.get('/users/me'),

  updateProfile: (data) =>
    api.put('/users/me', data),

  checkUsername: (username) =>
    api.get(`/users/check-username/${username}`),
};

// ============ TEAMS ============

export const teamsAPI = {
  getAll: () =>
    api.get('/teams'),

  getByGroup: (letter) =>
    api.get(`/teams/group/${letter}`),
};

// ============ PREDICTION SETS ============

export const predictionSetsAPI = {
  // Get all prediction sets for user
  getAll: () =>
    api.get('/prediction-sets'),

  // Get single prediction set with all data
  getById: (id) =>
    api.get(`/prediction-sets/${id}`),

  // Create new prediction set (mode: 'positions' | 'scores')
  create: (name, mode = 'positions') =>
    api.post('/prediction-sets', { name, mode }),

  // Update prediction set name
  update: (id, name) =>
    api.put(`/prediction-sets/${id}`, { name }),

  // Delete prediction set
  delete: (id) =>
    api.delete(`/prediction-sets/${id}`),

  // Duplicate a prediction set
  duplicate: (id, name) =>
    api.post(`/prediction-sets/${id}/duplicate`, { name }),
};

// ============ PREDICTIONS ============

export const predictionsAPI = {
  // Groups
  getMy: (setId) =>
    api.get('/predictions/my', { params: { setId } }),

  getGroups: (setId) =>
    api.get('/predictions/groups', { params: { setId } }),

  saveGroups: (predictions, setId) =>
    api.post('/predictions/groups', { predictions, setId }),

  saveMatch: (matchId, predictedWinnerId) =>
    api.post('/predictions/match', { matchId, predictedWinnerId }),

  // Playoffs (repechajes)
  getPlayoffs: (setId) =>
    api.get('/predictions/playoffs', { params: { setId } }),

  savePlayoffs: (predictions, setId) =>
    api.post('/predictions/playoffs', { predictions, setId }),

  // Third places (terceros)
  getThirdPlaces: (setId) =>
    api.get('/predictions/third-places', { params: { setId } }),

  saveThirdPlaces: (selectedGroups, setId) =>
    api.post('/predictions/third-places', { selectedGroups, setId }),

  // Knockout (eliminatorias)
  getKnockout: (setId) =>
    api.get('/predictions/knockout', { params: { setId } }),

  saveKnockout: (predictions, setId) =>
    api.post('/predictions/knockout', { predictions, setId }),

  // All predictions at once
  getAll: (setId) =>
    api.get('/predictions/all', { params: { setId } }),

  // Scores (marcadores exactos)
  getScores: (setId) =>
    api.get('/predictions/scores', { params: { setId } }),

  saveScores: (scores, setId) =>
    api.post('/predictions/scores', { scores, setId }),

  // Tiebreaker decisions (desempates manuales)
  getTiebreaker: (setId) =>
    api.get('/predictions/tiebreaker', { params: { setId } }),

  saveTiebreaker: (data) =>
    api.post('/predictions/tiebreaker', data),

  // Check if subsequent phases have data (for cascade reset warning)
  hasSubsequentData: (setId, phase) =>
    api.get('/predictions/has-subsequent-data', { params: { setId, phase } }),

  // Reset endpoints (cascade delete)
  resetFromPlayoffs: (setId) =>
    api.delete('/predictions/reset-from-playoffs', { params: { setId } }),

  resetFromGroups: (setId) =>
    api.delete('/predictions/reset-from-groups', { params: { setId } }),

  resetFromThirds: (setId) =>
    api.delete('/predictions/reset-from-thirds', { params: { setId } }),
};

// ============ GROUPS (PRIVADOS) ============

export const groupsAPI = {
  getMy: () =>
    api.get('/groups'),

  create: (name) =>
    api.post('/groups', { name }),

  join: (code) =>
    api.post('/groups/join', { code }),

  getLeaderboard: (groupId) =>
    api.get(`/groups/${groupId}/leaderboard`),
};

// ============ LEADERBOARD ============

export const leaderboardAPI = {
  getGlobal: (mode = 'positions') =>
    api.get('/leaderboard', { params: { mode } }),

  getCounts: () =>
    api.get('/leaderboard/counts'),
};

// ============ ADMIN ============

export const adminAPI = {
  // Stats
  getStats: () =>
    api.get('/admin/stats'),

  // Playoffs
  getPlayoffs: () =>
    api.get('/admin/playoffs'),

  savePlayoff: (playoff_id, winner_team_id) =>
    api.post('/admin/playoffs', { playoff_id, winner_team_id }),

  deletePlayoff: (playoffId) =>
    api.delete(`/admin/playoffs/${playoffId}`),

  // Groups (matches with scores)
  getGroupMatches: () =>
    api.get('/admin/groups'),

  saveGroupMatches: (group_letter, matches) =>
    api.post('/admin/groups', { group_letter, matches }),

  // Group standings (read-only, calculated from matches)
  getGroupStandings: () =>
    api.get('/admin/groups/standings'),

  // Knockout
  getKnockout: () =>
    api.get('/admin/knockout'),

  saveKnockout: (match_key, winner_team_id, score_a, score_b) =>
    api.post('/admin/knockout', { match_key, winner_team_id, score_a, score_b }),

  deleteKnockout: (matchKey) =>
    api.delete(`/admin/knockout/${matchKey}`),
};

export default api;
