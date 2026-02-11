import express from 'express';
import {
    createTeam,
    deleteTeam,
    getTeam,
    getTeams,
    getTeamSquad,
    getTeamStats,
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
router.delete('/:id', protect, isAdmin, deleteTeam);

export default router;
