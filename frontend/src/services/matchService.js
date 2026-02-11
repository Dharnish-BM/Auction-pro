import api from './api.js';

export const matchService = {
  // Get all matches
  getAll: async (params = {}) => {
    const response = await api.get('/matches', { params });
    return response.data;
  },

  // Get single match
  getById: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  // Create match (admin only)
  create: async (data) => {
    const response = await api.post('/matches', data);
    return response.data;
  },

  // Update match (admin only)
  update: async (id, data) => {
    const response = await api.put(`/matches/${id}`, data);
    return response.data;
  },

  // Delete match (admin only)
  delete: async (id) => {
    const response = await api.delete(`/matches/${id}`);
    return response.data;
  },

  // Start match (admin only)
  start: async (id, data) => {
    const response = await api.post(`/matches/${id}/start`, data);
    return response.data;
  },

  // Update score (admin only)
  updateScore: async (id, data) => {
    const response = await api.patch(`/matches/${id}/score`, data);
    return response.data;
  },

  // Update batsmen (admin only)
  updateBatsmen: async (id, data) => {
    const response = await api.patch(`/matches/${id}/batsmen`, data);
    return response.data;
  },

  // Update bowler (admin only)
  updateBowler: async (id, data) => {
    const response = await api.patch(`/matches/${id}/bowler`, data);
    return response.data;
  },

  // End match (admin only)
  end: async (id, data) => {
    const response = await api.post(`/matches/${id}/end`, data);
    return response.data;
  },

  // Get upcoming matches
  getUpcoming: async () => {
    const response = await api.get('/matches/upcoming/list');
    return response.data;
  },

  // Get live matches
  getLive: async () => {
    const response = await api.get('/matches/live/list');
    return response.data;
  }
};
