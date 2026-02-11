import { activeAuctions } from '../controllers/auctionController.js';

let io;

export const initAuctionSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('Client connected to auction:', socket.id);

    // Join auction room
    socket.on('join-auction', () => {
      socket.join('auction-room');
      console.log(`Socket ${socket.id} joined auction room`);
    });

    // Leave auction room
    socket.on('leave-auction', () => {
      socket.leave('auction-room');
      console.log(`Socket ${socket.id} left auction room`);
    });

    // Handle new bid
    socket.on('place-bid', async (data) => {
      try {
        const { auctionId, teamId, teamName, amount } = data;
        
        // Broadcast bid to all clients in auction room
        io.to('auction-room').emit('bid-placed', {
          auctionId,
          teamId,
          teamName,
          amount,
          timestamp: new Date()
        });

        // Reset timer notification if bid in last 5 seconds
        const activeData = activeAuctions.get(auctionId);
        if (activeData && activeData.timeRemaining <= 5) {
          io.to('auction-room').emit('timer-reset', {
            auctionId,
            timeRemaining: 5
          });
        }
      } catch (error) {
        console.error('Socket bid error:', error);
        socket.emit('bid-error', { message: error.message });
      }
    });

    // Handle auction start
    socket.on('auction-started', (data) => {
      io.to('auction-room').emit('auction-started', data);
    });

    // Handle auction end
    socket.on('auction-ended', (data) => {
      io.to('auction-room').emit('auction-ended', data);
    });

    // Handle timer update
    socket.on('timer-update', (data) => {
      socket.to('auction-room').emit('timer-update', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected from auction:', socket.id);
    });
  });
};

// Emit auction events from controllers
export const emitAuctionEvent = (event, data) => {
  if (io) {
    io.to('auction-room').emit(event, data);
  }
};

// Emit timer tick
export const emitTimerTick = (auctionId, timeRemaining) => {
  if (io) {
    io.to('auction-room').emit('timer-tick', {
      auctionId,
      timeRemaining
    });
  }
};

// Emit player sold event
export const emitPlayerSold = (data) => {
  if (io) {
    io.to('auction-room').emit('player-sold', data);
  }
};
