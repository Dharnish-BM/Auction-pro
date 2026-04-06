let io;

export const initAuctionSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('Client connected to auction:', socket.id);

    // Join a specific auction room
    socket.on('join-auction', ({ auctionId }) => {
      if (!auctionId) return;
      const room = `auction:${auctionId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
    });

    // Leave a specific auction room
    socket.on('leave-auction', ({ auctionId }) => {
      if (!auctionId) return;
      const room = `auction:${auctionId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected from auction:', socket.id);
    });
  });
};

export const emitToAuction = (auctionId, event, data) => {
  if (!io || !auctionId) return;
  io.to(`auction:${auctionId}`).emit(event, data);
};
