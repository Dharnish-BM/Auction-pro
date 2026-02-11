import api from './api.js';

export const userService = {
  // Get all users (admin only)
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Get single user
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Update user (admin only)
  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  // Activate user (admin only)
  activate: async (id) => {
    const response = await api.patch(`/users/${id}/activate`);
    return response.data;
  },

  // Deactivate user (admin only)
  deactivate: async (id) => {
    const response = await api.patch(`/users/${id}/deactivate`);
    return response.data;
  },

  // Permanently delete user (admin only)
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Get available captains (admin only)
  getAvailableCaptains: async () => {
    const response = await api.get('/users/captains/available');
    return response.data;
  }
};
