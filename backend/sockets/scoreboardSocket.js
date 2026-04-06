let io;

export const initScoreboardSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('Client connected to scoreboard:', socket.id);

    // Join match room
    socket.on('join-match', (matchId) => {
      if (!matchId) return;
      socket.join(`match:${matchId}`);
      console.log(`Socket ${socket.id} joined match:${matchId}`);
    });

    // Leave match room
    socket.on('leave-match', (matchId) => {
      if (!matchId) return;
      socket.leave(`match:${matchId}`);
      console.log(`Socket ${socket.id} left match:${matchId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected from scoreboard:', socket.id);
    });
  });
};

export const emitToMatch = (matchId, event, data) => {
  if (!io || !matchId) return;
  io.to(`match:${matchId}`).emit(event, data);
};
