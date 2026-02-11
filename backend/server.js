import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load env vars
dotenv.config();

// Import database connection
import connectDB from './config/db.js';

// Import routes
import auctionRoutes from './routes/auctions.js';
import authRoutes from './routes/auth.js';
import matchRoutes from './routes/matches.js';
import playerRoutes from './routes/players.js';
import teamRoutes from './routes/teams.js';
import userRoutes from './routes/users.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Import socket handlers
import { initAuctionSocket, emitAuctionEvent, emitPlayerSold, emitTimerTick } from './sockets/auctionSocket.js';
import { initScoreboardSocket } from './sockets/scoreboardSocket.js';

// Import auction controller to inject emitters
import { setAuctionEmitters } from './controllers/auctionController.js';

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
<<<<<<< HEAD
    origin: process.env.CLIENT_URL?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
=======
    origin: 'https://auction-pro-zmps.vercel.app' || 'http://localhost:5173',
>>>>>>> 6586d752c434d642b55de11f164e7f7df0ea72cb
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize socket handlers
initAuctionSocket(io);
initScoreboardSocket(io);

// Inject socket emitters into auction controller to avoid circular dependency
setAuctionEmitters({
  emitAuctionEvent,
  emitPlayerSold,
  emitTimerTick
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/matches', matchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TurfAuction Pro API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TurfAuction Pro API',
    version: '1.0.0',
    description: 'Cricket Player Auction Platform',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teams: '/api/teams',
      players: '/api/players',
      auctions: '/api/auctions',
      matches: '/api/matches'
    }
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏏 TurfAuction Pro Server                              ║
║                                                          ║
║   Server running on port ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                          ║
║   API Base URL: http://localhost:${PORT}/api                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

export { io };
