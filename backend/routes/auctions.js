import express from 'express';
import {
    getAuctionState,
    overrideBid,
    pauseAuction,
    placeBid,
    sellNow,
    skipCurrentPlayer,
    startAuction
} from '../controllers/auctionController.js';
import { isAdmin, isCaptain, protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/:id/state', protect, getAuctionState);

// Captain only - place bid
router.post('/:id/bid', protect, isCaptain, placeBid);

// Admin only routes
router.post('/:id/start', protect, isAdmin, startAuction);
router.post('/:id/pause', protect, isAdmin, pauseAuction);
router.post('/:id/override', protect, isAdmin, overrideBid);
router.post('/:id/skip', protect, isAdmin, skipCurrentPlayer);
router.post('/:id/sell-now', protect, isAdmin, sellNow);

export default router;
