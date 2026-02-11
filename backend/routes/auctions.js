import express from 'express';
import {
    endAuction,
    getAuctionHistory,
    getAuctions,
    getCurrentAuction,
    placeBid,
    resetAuctions,
    startAuction
} from '../controllers/auctionController.js';
import { isAdmin, isCaptain, protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getAuctions);
router.get('/current', protect, getCurrentAuction);
router.get('/history', protect, getAuctionHistory);

// Captain only - place bid
router.post('/:id/bid', protect, isCaptain, placeBid);

// Admin only routes
router.post('/start', protect, isAdmin, startAuction);
router.post('/:id/end', protect, isAdmin, endAuction);
router.post('/reset', protect, isAdmin, resetAuctions);

export default router;
