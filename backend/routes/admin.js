import express from 'express';
import { recalculateAllStats } from '../utils/statsAggregator.js';
import { isAdmin, protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/recalc-stats', protect, isAdmin, recalculateAllStats);

export default router;

