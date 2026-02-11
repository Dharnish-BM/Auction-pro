let io;

export const initScoreboardSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('Client connected to scoreboard:', socket.id);

    // Join match room
    socket.on('join-match', (matchId) => {
      socket.join(`match-${matchId}`);
      console.log(`Socket ${socket.id} joined match ${matchId}`);
    });

    // Leave match room
    socket.on('leave-match', (matchId) => {
      socket.leave(`match-${matchId}`);
      console.log(`Socket ${socket.id} left match ${matchId}`);
    });

    // Handle score update
    socket.on('score-update', (data) => {
      const { matchId, scoreData } = data;
      io.to(`match-${matchId}`).emit('score-updated', scoreData);
    });

    // Handle ball update
    socket.on('ball-update', (data) => {
      const { matchId, ballData } = data;
      io.to(`match-${matchId}`).emit('ball-updated', ballData);
    });

    // Handle wicket
    socket.on('wicket', (data) => {
      const { matchId, wicketData } = data;
      io.to(`match-${matchId}`).emit('wicket-fallen', wicketData);
    });

    // Handle over completion
    socket.on('over-complete', (data) => {
      const { matchId, overData } = data;
      io.to(`match-${matchId}`).emit('over-completed', overData);
    });

    // Handle innings change
    socket.on('innings-change', (data) => {
      const { matchId, inningsData } = data;
      io.to(`match-${matchId}`).emit('innings-changed', inningsData);
    });

    // Handle match end
    socket.on('match-end', (data) => {
      const { matchId, resultData } = data;
      io.to(`match-${matchId}`).emit('match-ended', resultData);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected from scoreboard:', socket.id);
    });
  });
};

// Emit scoreboard events from controllers
export const emitScoreUpdate = (matchId, scoreData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('score-updated', scoreData);
  }
};

export const emitBallUpdate = (matchId, ballData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('ball-updated', ballData);
  }
};

export const emitWicket = (matchId, wicketData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('wicket-fallen', wicketData);
  }
};

export const emitOverComplete = (matchId, overData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('over-completed', overData);
  }
};

export const emitInningsChange = (matchId, inningsData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('innings-changed', inningsData);
  }
};

export const emitMatchEnd = (matchId, resultData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('match-ended', resultData);
  }
};
