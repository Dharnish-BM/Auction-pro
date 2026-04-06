import { getIO } from '../utils/socket.js';

export const emitToAuction = (auctionId, event, data) => {
  if (!auctionId) return;
  try {
    const io = getIO();
    io.to(`auction:${auctionId}`).emit(event, data);
  } catch {
    // socket not initialized
  }
};
