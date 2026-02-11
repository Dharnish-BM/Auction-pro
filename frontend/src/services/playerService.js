import api from './api.js';

export const playerService = {
  // Get all players
  getAll: async (params = {}) => {
    const response = await api.get('/players', { params });
    return response.data;
  },

  // Get single player
  getById: async (id) => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  // Create player (admin only)
  create: async (data) => {
    const response = await api.post('/players', data);
    return response.data;
  },

  // Update player (admin only)
  update: async (id, data) => {
    const response = await api.put(`/players/${id}`, data);
    return response.data;
  },

  // Delete player (admin only)
  delete: async (id) => {
    const response = await api.delete(`/players/${id}`);
    return response.data;
  },

  // Mark player as sold (admin only)
  markSold: async (id, data) => {
    const response = await api.patch(`/players/${id}/sold`, data);
    return response.data;
  },

  // Mark player as unsold (admin only)
  markUnsold: async (id) => {
    const response = await api.patch(`/players/${id}/unsold`);
    return response.data;
  },

  // Reset player status (admin only)
  resetStatus: async (id) => {
    const response = await api.patch(`/players/${id}/reset`);
    return response.data;
  },

  // Get player stats summary
  getStatsSummary: async () => {
    const response = await api.get('/players/stats/summary');
    return response.data;
  }
};
