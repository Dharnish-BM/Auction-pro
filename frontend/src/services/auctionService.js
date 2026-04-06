import api from './api.js';

export const auctionService = {
  getState: async (id) => {
    const response = await api.get(`/auctions/${id}/state`);
    return response.data;
  },

  start: async (id) => {
    const response = await api.post(`/auctions/${id}/start`);
    return response.data;
  },

  // Place bid (captain only)
  placeBid: async (id, amount) => {
    const response = await api.post(`/auctions/${id}/bid`, { amount });
    return response.data;
  },

  pause: async (id) => {
    const response = await api.post(`/auctions/${id}/pause`);
    return response.data;
  },

  override: async (id, teamId, amount) => {
    const response = await api.post(`/auctions/${id}/override`, { teamId, amount });
    return response.data;
  },

  skip: async (id) => {
    const response = await api.post(`/auctions/${id}/skip`);
    return response.data;
  },

  sellNow: async (id) => {
    const response = await api.post(`/auctions/${id}/sell-now`);
    return response.data;
  }
};
