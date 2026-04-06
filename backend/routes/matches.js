import express from 'express';
import {
    completeMatch,
    createMatch,
    deleteMatch,
    endMatch,
    getLiveMatches,
    getLiveState,
    getMatch,
    getMatchOverview,
    getMatches,
    getPlayerPool,
    getScorecard,
    getUpcomingMatches,
    logDelivery,
    endInnings,
    setPlayerPool,
    setToss,
    setNextBowler,
    startMatch,
    startInnings,
    undoLastDelivery,
    updateBatsmen,
    updateBowler,
    updateMatch,
    updateMatchStatus,
    updateScore
} from '../controllers/matchController.js';
import { createAuction } from '../controllers/auctionController.js';
import { isAdmin, optionalAuth, protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth)
router.get('/:id/live', optionalAuth, getLiveState);
router.get('/:id/scorecard', optionalAuth, getScorecard);

// Protected routes
router.get('/', protect, getMatches);
router.get('/upcoming/list', protect, getUpcomingMatches);
router.get('/live/list', protect, getLiveMatches);
router.get('/:id/overview', protect, getMatchOverview);
router.get('/:id/pool', protect, getPlayerPool);
router.get('/:id', protect, getMatch);

// Admin only routes
router.post('/', protect, isAdmin, createMatch);
router.post('/:matchId/auction', protect, isAdmin, createAuction);
router.put('/:id', protect, isAdmin, updateMatch);
router.delete('/:id', protect, isAdmin, deleteMatch);
router.post('/:id/start', protect, isAdmin, startMatch);
router.post('/:id/pool', protect, isAdmin, setPlayerPool);
router.post('/:id/toss', protect, isAdmin, setToss);
router.patch('/:id/status', protect, isAdmin, updateMatchStatus);
router.patch('/:id/score', protect, isAdmin, updateScore);
router.patch('/:id/batsmen', protect, isAdmin, updateBatsmen);
router.patch('/:id/bowler', protect, isAdmin, updateBowler);
router.post('/:id/bowler', protect, isAdmin, setNextBowler);
router.post('/:id/end', protect, isAdmin, endMatch);

// Live scoring (admin)
router.post('/:id/innings/start', protect, isAdmin, startInnings);
router.post('/:id/innings/end', protect, isAdmin, endInnings);
router.post('/:id/delivery', protect, isAdmin, logDelivery);
router.delete('/:id/delivery/last', protect, isAdmin, undoLastDelivery);
router.post('/:id/complete', protect, isAdmin, completeMatch);

export default router;
