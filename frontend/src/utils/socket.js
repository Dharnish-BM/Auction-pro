import { io } from 'socket.io-client';

const SOCKET_BASE =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  'http://localhost:5000';

const socket = io(SOCKET_BASE, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket']
});

export default socket;

