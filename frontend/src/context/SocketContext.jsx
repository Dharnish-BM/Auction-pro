import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated]);

  // Join auction room
  const joinAuction = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('join-auction');
    }
  }, []);

  // Leave auction room
  const leaveAuction = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-auction');
    }
  }, []);

  // Place bid via socket
  const placeBidSocket = useCallback((data) => {
    if (socketRef.current) {
      socketRef.current.emit('place-bid', data);
    }
  }, []);

  // Join match room
  const joinMatch = useCallback((matchId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-match', matchId);
    }
  }, []);

  // Leave match room
  const leaveMatch = useCallback((matchId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-match', matchId);
    }
  }, []);

  // Listen to events
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  // Remove event listener
  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  // Emit event
  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const value = {
    socket: socketRef.current,
    joinAuction,
    leaveAuction,
    placeBidSocket,
    joinMatch,
    leaveMatch,
    on,
    off,
    emit,
    isConnected: socketRef.current?.connected || false
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
