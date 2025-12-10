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

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
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

  getMe: () =>
    api.get('/users/me'),
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

  // Create new prediction set
  create: (name) =>
    api.post('/prediction-sets', { name }),

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
  getGlobal: () =>
    api.get('/leaderboard'),
};

export default api;
