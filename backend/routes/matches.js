import express from 'express';
import {
    createMatch,
    deleteMatch,
    endMatch,
    getLiveMatches,
    getMatch,
    getMatches,
    getUpcomingMatches,
    startMatch,
    updateBatsmen,
    updateBowler,
    updateMatch,
    updateScore
} from '../controllers/matchController.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected)
router.get('/', protect, getMatches);
router.get('/upcoming/list', protect, getUpcomingMatches);
router.get('/live/list', protect, getLiveMatches);
router.get('/:id', protect, getMatch);

// Admin only routes
router.post('/', protect, isAdmin, createMatch);
router.put('/:id', protect, isAdmin, updateMatch);
router.delete('/:id', protect, isAdmin, deleteMatch);
router.post('/:id/start', protect, isAdmin, startMatch);
router.patch('/:id/score', protect, isAdmin, updateScore);
router.patch('/:id/batsmen', protect, isAdmin, updateBatsmen);
router.patch('/:id/bowler', protect, isAdmin, updateBowler);
router.post('/:id/end', protect, isAdmin, endMatch);

export default router;
