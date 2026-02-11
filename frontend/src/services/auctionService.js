import api from './api.js';

export const auctionService = {
  // Get all auctions
  getAll: async () => {
    const response = await api.get('/auctions');
    return response.data;
  },

  // Get current active auction
  getCurrent: async () => {
    const response = await api.get('/auctions/current');
    return response.data;
  },

  // Start auction (admin only)
  start: async (data) => {
    const response = await api.post('/auctions/start', data);
    return response.data;
  },

  // Place bid (captain only)
  placeBid: async (id, amount) => {
    const response = await api.post(`/auctions/${id}/bid`, { amount });
    return response.data;
  },

  // End auction (admin only)
  end: async (id) => {
    const response = await api.post(`/auctions/${id}/end`);
    return response.data;
  },

  // Get auction history
  getHistory: async () => {
    const response = await api.get('/auctions/history');
    return response.data;
  },

  // Reset all auctions (admin only)
  reset: async () => {
    const response = await api.post('/auctions/reset');
    return response.data;
  }
};
