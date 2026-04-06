import express from 'express';
import {
    createMatch,
    deleteMatch,
    endMatch,
    getLiveMatches,
    getMatch,
    getMatchOverview,
    getMatches,
    getPlayerPool,
    getUpcomingMatches,
    setPlayerPool,
    setToss,
    startMatch,
    updateBatsmen,
    updateBowler,
    updateMatch,
    updateMatchStatus,
    updateScore
} from '../controllers/matchController.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected)
router.get('/', protect, getMatches);
router.get('/upcoming/list', protect, getUpcomingMatches);
router.get('/live/list', protect, getLiveMatches);
router.get('/:id/overview', protect, getMatchOverview);
router.get('/:id/pool', protect, getPlayerPool);
router.get('/:id', protect, getMatch);

// Admin only routes
router.post('/', protect, isAdmin, createMatch);
router.put('/:id', protect, isAdmin, updateMatch);
router.delete('/:id', protect, isAdmin, deleteMatch);
router.post('/:id/start', protect, isAdmin, startMatch);
router.post('/:id/pool', protect, isAdmin, setPlayerPool);
router.post('/:id/toss', protect, isAdmin, setToss);
router.patch('/:id/status', protect, isAdmin, updateMatchStatus);
router.patch('/:id/score', protect, isAdmin, updateScore);
router.patch('/:id/batsmen', protect, isAdmin, updateBatsmen);
router.patch('/:id/bowler', protect, isAdmin, updateBowler);
router.post('/:id/end', protect, isAdmin, endMatch);

export default router;
