import api from './api.js';
import axios from 'axios';

const PUBLIC_API_URL = import.meta.env.VITE_API_URL || '/api';
const publicApi = axios.create({
  baseURL: PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

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

  getOverview: async (id) => {
    const response = await api.get(`/matches/${id}/overview`);
    return response.data;
  },

  getPool: async (id) => {
    const response = await api.get(`/matches/${id}/pool`);
    return response.data;
  },

  setPool: async (id, playerIds) => {
    const response = await api.post(`/matches/${id}/pool`, { playerIds });
    return response.data;
  },

  createAuction: async (matchId, config) => {
    const response = await api.post(`/matches/${matchId}/auction`, config);
    return response.data;
  },

  // Public live endpoints (no auth)
  getLivePublic: async (id) => {
    const response = await publicApi.get(`/matches/${id}/live`);
    return response.data;
  },

  getScorecardPublic: async (id) => {
    const response = await publicApi.get(`/matches/${id}/scorecard`);
    return response.data;
  },

  // Live scoring (admin)
  startInnings: async (id, data) => {
    const response = await api.post(`/matches/${id}/innings/start`, data);
    return response.data;
  },

  logDelivery: async (id, data) => {
    const response = await api.post(`/matches/${id}/delivery`, data);
    return response.data;
  },

  undoLastDelivery: async (id) => {
    const response = await api.delete(`/matches/${id}/delivery/last`);
    return response.data;
  },

  setNextBowler: async (id, bowlerId) => {
    const response = await api.post(`/matches/${id}/bowler`, { bowlerId });
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
