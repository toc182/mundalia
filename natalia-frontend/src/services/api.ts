import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  PredictionSet,
  GroupPrediction,
  KnockoutPrediction,
  PrivateGroup,
  LeaderboardEntry,
  AdminStats
} from '@/types';

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
  (config: InternalAxiosRequestConfig) => {
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
  (response: AxiosResponse) => {
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

interface LoginResponse {
  token: string;
  user: User;
}

export const authAPI = {
  login: (email: string, password: string): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/register', { name, email, password }),

  googleLogin: (accessToken: string): Promise<AxiosResponse<LoginResponse>> =>
    api.post('/auth/google', { access_token: accessToken }),

  getMe: (): Promise<AxiosResponse<User>> =>
    api.get('/users/me'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/users/me', data),

  checkUsername: (username: string): Promise<AxiosResponse<{ available: boolean }>> =>
    api.get(`/users/check-username/${username}`),
};

// ============ TEAMS ============

import type { Team } from '@/types';

export const teamsAPI = {
  getAll: (): Promise<AxiosResponse<Team[]>> =>
    api.get('/teams'),

  getByGroup: (letter: string): Promise<AxiosResponse<Team[]>> =>
    api.get(`/teams/group/${letter}`),
};

// ============ PREDICTION SETS ============

export const predictionSetsAPI = {
  getAll: (): Promise<AxiosResponse<PredictionSet[]>> =>
    api.get('/prediction-sets'),

  getById: (publicId: string): Promise<AxiosResponse<PredictionSet>> =>
    api.get(`/prediction-sets/${publicId}`),

  create: (name: string, mode: 'positions' | 'scores' = 'positions'): Promise<AxiosResponse<PredictionSet>> =>
    api.post('/prediction-sets', { name, mode }),

  update: (publicId: string, name: string): Promise<AxiosResponse<PredictionSet>> =>
    api.put(`/prediction-sets/${publicId}`, { name }),

  delete: (publicId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/prediction-sets/${publicId}`),

  duplicate: (publicId: string, name: string): Promise<AxiosResponse<PredictionSet>> =>
    api.post(`/prediction-sets/${publicId}/duplicate`, { name }),
};

// ============ PREDICTIONS ============

interface PlayoffPredictionData {
  [playoffId: string]: {
    semi1?: number | null;
    semi2?: number | null;
    final?: number | null;
  };
}

interface KnockoutPredictionData {
  [matchKey: string]: number | { winner: number; scoreA?: number; scoreB?: number };
}

export const predictionsAPI = {
  getMy: (setId: number): Promise<AxiosResponse<GroupPrediction[]>> =>
    api.get('/predictions/my', { params: { setId } }),

  getGroups: (setId: number): Promise<AxiosResponse<GroupPrediction[]>> =>
    api.get('/predictions/groups', { params: { setId } }),

  saveGroups: (predictions: GroupPrediction[], setId: number): Promise<AxiosResponse<void>> =>
    api.post('/predictions/groups', { predictions, setId }),

  saveMatch: (matchId: string, predictedWinnerId: number): Promise<AxiosResponse<void>> =>
    api.post('/predictions/match', { matchId, predictedWinnerId }),

  getPlayoffs: (setId: number): Promise<AxiosResponse<PlayoffPredictionData>> =>
    api.get('/predictions/playoffs', { params: { setId } }),

  savePlayoffs: (predictions: PlayoffPredictionData, setId: number): Promise<AxiosResponse<void>> =>
    api.post('/predictions/playoffs', { predictions, setId }),

  getThirdPlaces: (setId: number): Promise<AxiosResponse<{ selectedGroups: string | null }>> =>
    api.get('/predictions/third-places', { params: { setId } }),

  saveThirdPlaces: (selectedGroups: string, setId: number): Promise<AxiosResponse<void>> =>
    api.post('/predictions/third-places', { selectedGroups, setId }),

  getKnockout: (setId: number): Promise<AxiosResponse<KnockoutPredictionData>> =>
    api.get('/predictions/knockout', { params: { setId } }),

  saveKnockout: (predictions: KnockoutPredictionData, setId: number): Promise<AxiosResponse<void>> =>
    api.post('/predictions/knockout', { predictions, setId }),

  getAll: (setId: number): Promise<AxiosResponse<{
    setId: number;
    groupPredictions: GroupPrediction[];
    playoffPredictions: PlayoffPredictionData;
    thirdPlaces: string | null;
    knockoutPredictions: Record<string, number>;
  }>> =>
    api.get('/predictions/all', { params: { setId } }),

  getScores: (setId: number | string): Promise<AxiosResponse<Record<string, Record<number, { a: number; b: number }>>>> =>
    api.get('/predictions/scores', { params: { setId } }),

  saveScores: (scores: Record<string, Record<string | number, { a?: number; b?: number }>>, setId: number | string): Promise<AxiosResponse<void>> =>
    api.post('/predictions/scores', { scores, setId }),

  getTiebreaker: (setId: number | string): Promise<AxiosResponse<Record<string, { tiedTeamIds: number[]; resolvedOrder: number[] }>>> =>
    api.get('/predictions/tiebreaker', { params: { setId } }),

  saveTiebreaker: (data: { setId: number | string; group: string; tiedTeamIds: number[]; resolvedOrder: number[] }): Promise<AxiosResponse<void>> =>
    api.post('/predictions/tiebreaker', data),

  hasSubsequentData: (setId: number, phase: string): Promise<AxiosResponse<{ hasGroups: boolean; hasThirds: boolean; hasKnockout: boolean }>> =>
    api.get('/predictions/has-subsequent-data', { params: { setId, phase } }),

  resetFromPlayoffs: (setId: number): Promise<AxiosResponse<void>> =>
    api.delete('/predictions/reset-from-playoffs', { params: { setId } }),

  resetFromGroups: (setId: number): Promise<AxiosResponse<void>> =>
    api.delete('/predictions/reset-from-groups', { params: { setId } }),

  resetFromThirds: (setId: number): Promise<AxiosResponse<void>> =>
    api.delete('/predictions/reset-from-thirds', { params: { setId } }),
};

// ============ GROUPS (PRIVADOS) ============

export const groupsAPI = {
  getMy: (): Promise<AxiosResponse<PrivateGroup[]>> =>
    api.get('/groups'),

  create: (name: string): Promise<AxiosResponse<PrivateGroup>> =>
    api.post('/groups', { name }),

  join: (code: string): Promise<AxiosResponse<PrivateGroup>> =>
    api.post('/groups/join', { code }),

  getLeaderboard: (groupId: number): Promise<AxiosResponse<LeaderboardEntry[]>> =>
    api.get(`/groups/${groupId}/leaderboard`),
};

// ============ LEADERBOARD ============

interface PaginatedLeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  totalPages: number;
  userPosition: number | null;
  userPage: number | null;
}

export const leaderboardAPI = {
  getGlobal: (mode: 'positions' | 'scores' = 'positions', page = 1, limit = 100): Promise<AxiosResponse<PaginatedLeaderboardResponse>> =>
    api.get('/leaderboard', { params: { mode, page, limit } }),

  getCounts: (): Promise<AxiosResponse<{ positions: number; scores: number }>> =>
    api.get('/leaderboard/counts'),
};

// ============ ADMIN ============

interface AdminGroupMatch {
  match_index: number;
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
}

export const adminAPI = {
  getStats: (): Promise<AxiosResponse<AdminStats>> =>
    api.get('/admin/stats'),

  getPlayoffs: (): Promise<AxiosResponse<Record<string, number>>> =>
    api.get('/admin/playoffs'),

  savePlayoff: (playoff_id: string, winner_team_id: number): Promise<AxiosResponse<void>> =>
    api.post('/admin/playoffs', { playoff_id, winner_team_id }),

  deletePlayoff: (playoffId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/admin/playoffs/${playoffId}`),

  getGroupMatches: (): Promise<AxiosResponse<Record<string, AdminGroupMatch[]>>> =>
    api.get('/admin/groups'),

  saveGroupMatches: (group_letter: string, matches: AdminGroupMatch[]): Promise<AxiosResponse<void>> =>
    api.post('/admin/groups', { group_letter, matches }),

  getGroupStandings: (): Promise<AxiosResponse<Record<string, { team_id: number; position: number }[]>>> =>
    api.get('/admin/groups/standings'),

  getKnockout: (): Promise<AxiosResponse<Record<string, { winner_team_id: number; score_a?: number; score_b?: number }>>> =>
    api.get('/admin/knockout'),

  saveKnockout: (match_key: string, winner_team_id: number, score_a?: number, score_b?: number): Promise<AxiosResponse<void>> =>
    api.post('/admin/knockout', { match_key, winner_team_id, score_a, score_b }),

  deleteKnockout: (matchKey: string): Promise<AxiosResponse<void>> =>
    api.delete(`/admin/knockout/${matchKey}`),
};

// ============ SETTINGS ============

export interface PredictionStatus {
  isOpen: boolean;
  deadline: string | null;
  message: string;
}

export type PredictionModes = 'positions' | 'scores' | 'both';

export interface PredictionModesResponse {
  success: boolean;
  data: {
    modes: PredictionModes;
  };
}

export const settingsAPI = {
  // Public endpoints - no auth required
  getPredictionStatus: (): Promise<AxiosResponse<PredictionStatus>> =>
    api.get('/settings/predictions-status'),

  getPredictionModes: (): Promise<AxiosResponse<PredictionModesResponse>> =>
    api.get('/settings/prediction-modes'),

  // Admin endpoints
  getAll: (): Promise<AxiosResponse<Record<string, string>>> =>
    api.get('/admin/settings'),

  setDeadline: (deadline: string | null): Promise<AxiosResponse<void>> =>
    api.put('/admin/settings/deadline', { deadline }),

  setPredictionModes: (modes: PredictionModes, confirmDelete: boolean = false): Promise<AxiosResponse<{ data: { deletedCount: number } }>> =>
    api.put('/admin/settings/prediction-modes', { modes, confirmDelete }),

  getPredictionCountsByMode: (): Promise<AxiosResponse<{ data: { positions: number; scores: number } }>> =>
    api.get('/admin/prediction-counts-by-mode'),
};

// ============ STATS (PUBLIC) ============

interface TeamStat {
  teamId: number;
  teamName: string;
  teamCode: string;
  flagUrl: string;
  pickCount: number;
  percentage: number;
}

interface GroupTeamStat {
  teamId: number;
  teamName: string;
  teamCode: string;
  flagUrl: string;
  pos1: number;
  pos2: number;
  pos3: number;
  pos4: number;
}

interface ControversialGroup {
  group: string;
  teams: GroupTeamStat[];
}

export interface CommunityStats {
  totalPredictions: number;
  topChampions: TeamStat[];
  topFinalists: TeamStat[];
  controversialGroups: ControversialGroup[];
}

export const statsAPI = {
  getCommunityStats: (): Promise<AxiosResponse<CommunityStats>> =>
    api.get('/stats/community'),
};

export default api;
