let _io = null;

export const initSocket = (io) => {
  _io = io;
};

export const getIO = () => {
  if (!_io) {
    throw new Error('Socket.io not initialized');
  }
  return _io;
};

