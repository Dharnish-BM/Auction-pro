import express from 'express';
import {
    createTeam,
    deleteTeam,
    editSquad,
    getTeam,
    getTeams,
    getTeamSquad,
    getTeamStats,
    removePlayerFromTeam,
    updateTeam
} from '../controllers/teamController.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (protected)
router.get('/', protect, getTeams);
router.get('/:id', protect, getTeam);
router.get('/:id/squad', protect, getTeamSquad);
router.get('/:id/stats', protect, getTeamStats);

// Admin only routes
router.post('/', protect, isAdmin, createTeam);
router.put('/:id', protect, isAdmin, updateTeam);
router.patch('/:id/squad', protect, isAdmin, editSquad);
router.delete('/:id/players/:playerId', protect, isAdmin, removePlayerFromTeam);
router.delete('/:id', protect, isAdmin, deleteTeam);

export default router;
