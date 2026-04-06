import { getIO } from '../utils/socket.js';

export const emitToMatch = (matchId, event, data) => {
  if (!matchId) return;
  try {
    const io = getIO();
    io.to(`match:${matchId}`).emit(event, data);
  } catch {
    // socket not initialized
  }
};
