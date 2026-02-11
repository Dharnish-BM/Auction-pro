import api from './api.js';

export const teamService = {
  // Get all teams
  getAll: async () => {
    const response = await api.get('/teams');
    return response.data;
  },

  // Get single team
  getById: async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  // Create team (admin only)
  create: async (data) => {
    const response = await api.post('/teams', data);
    return response.data;
  },

  // Update team (admin only)
  update: async (id, data) => {
    const response = await api.put(`/teams/${id}`, data);
    return response.data;
  },

  // Delete team (admin only)
  delete: async (id) => {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },

  // Get team squad
  getSquad: async (id) => {
    const response = await api.get(`/teams/${id}/squad`);
    return response.data;
  },

  // Get team stats
  getStats: async (id) => {
    const response = await api.get(`/teams/${id}/stats`);
    return response.data;
  }
};
