import express from 'express';
import {
    createPlayer,
    deletePlayer,
    getPlayer,
    getPlayers,
    getPlayerStatsSummary,
    markPlayerSold,
    markPlayerUnsold,
    resetPlayerStatus,
    updatePlayer
} from '../controllers/playerController.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected)
router.get('/', protect, getPlayers);
router.get('/stats/summary', protect, getPlayerStatsSummary);
router.get('/:id', protect, getPlayer);

// Admin only routes
router.post('/', protect, isAdmin, createPlayer);
router.put('/:id', protect, isAdmin, updatePlayer);
router.delete('/:id', protect, isAdmin, deletePlayer);
router.patch('/:id/sold', protect, isAdmin, markPlayerSold);
router.patch('/:id/unsold', protect, isAdmin, markPlayerUnsold);
router.patch('/:id/reset', protect, isAdmin, resetPlayerStatus);

export default router;
