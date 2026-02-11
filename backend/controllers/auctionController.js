import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Auction from '../models/Auction.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import { emitAuctionEvent } from '../sockets/auctionSocket.js';

// Active auction store (in-memory for timer management)
let activeAuctions = new Map();

// @desc    Get all auctions
// @route   GET /api/auctions
// @access  Private
export const getAuctions = asyncHandler(async (req, res) => {
  const auctions = await Auction.find()
    .populate('playerId', 'name role profilePhoto')
    .populate('highestBidder', 'name logo color')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: auctions.length,
    data: auctions
  });
});

// @desc    Get current active auction
// @route   GET /api/auctions/current
// @access  Private
export const getCurrentAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ status: 'active' })
    .populate('playerId', 'name role basePrice profilePhoto stats battingStyle bowlingStyle')
    .populate('highestBidder', 'name logo color');

  if (!auction) {
    return res.json({
      success: true,
      data: null,
      message: 'No active auction'
    });
  }

  // Add real-time remaining time if active
  let timeRemaining = auction.timeRemaining;
  if (activeAuctions.has(auction._id.toString())) {
    const activeData = activeAuctions.get(auction._id.toString());
    timeRemaining = activeData.timeRemaining;
  }

  res.json({
    success: true,
    data: {
      ...auction.toObject(),
      timeRemaining
    }
  });
});

// @desc    Start auction for a player
// @route   POST /api/auctions/start
// @access  Private/Admin
export const startAuction = asyncHandler(async (req, res) => {
  const { playerId, duration = 30 } = req.body;

  // Check if there's already an active auction
  const existingActive = await Auction.findOne({ status: 'active' });
  if (existingActive) {
    throw new AppError('There is already an active auction. End it first.', 400);
  }

  const player = await Player.findById(playerId);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  if (player.isSold) {
    throw new AppError('Player is already sold', 400);
  }

  // Create new auction
  const auction = await Auction.create({
    playerId,
    playerName: player.name,
    basePrice: player.basePrice,
    highestBid: player.basePrice,
    status: 'active',
    startTime: new Date(),
    duration,
    timeRemaining: duration
  });

  // Update player status
  player.auctionStatus = 'active';
  await player.save();

  // Start timer
  startAuctionTimer(auction._id.toString(), duration);

  const populatedAuction = await Auction.findById(auction._id)
    .populate('playerId', 'name role basePrice profilePhoto stats battingStyle bowlingStyle');

  // Emit auction started event
  emitAuctionEvent('auction-started', {
    auctionId: auction._id,
    player: populatedAuction.playerId,
    basePrice: auction.basePrice,
    timeRemaining: duration
  });

  res.status(201).json({
    success: true,
    message: 'Auction started successfully',
    data: populatedAuction
  });
});

// @desc    Place a bid
// @route   POST /api/auctions/:id/bid
// @access  Private/Captain
export const placeBid = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const auctionId = req.params.id;

  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.status !== 'active') {
    throw new AppError('Auction is not active', 400);
  }

  // Get team for the captain
  const team = await Team.findOne({ captain: req.user._id });
  if (!team) {
    throw new AppError('You are not assigned to any team', 400);
  }

  // Validate bid amount
  const minBidIncrement = 1000; // Minimum increment
  const minBid = auction.highestBid + minBidIncrement;
  
  if (amount < minBid) {
    throw new AppError(`Bid must be at least ${minBid}`, 400);
  }

  // Check team budget
  if (amount > team.remainingBudget) {
    throw new AppError('Insufficient budget', 400);
  }

  // Check if same team is bidding consecutively
  if (auction.highestBidder && auction.highestBidder.toString() === team._id.toString()) {
    throw new AppError('You are already the highest bidder', 400);
  }

  // Update auction
  auction.highestBid = amount;
  auction.highestBidder = team._id;
  auction.highestBidderName = team.name;
  
  auction.bidHistory.push({
    bidder: team._id,
    bidderName: team.name,
    amount,
    timestamp: new Date()
  });

  // Reset timer if bid placed in last 5 seconds
  const activeData = activeAuctions.get(auctionId);
  if (activeData && activeData.timeRemaining <= 5) {
    activeData.timeRemaining = 5;
  }

  await auction.save();

  const updatedAuction = await Auction.findById(auctionId)
    .populate('playerId', 'name role basePrice profilePhoto')
    .populate('highestBidder', 'name logo color');

  // Emit bid placed event to all clients
  emitAuctionEvent('bid-placed', {
    auctionId: auction._id.toString(),
    teamId: team._id.toString(),
    teamName: team.name,
    amount: amount,
    highestBid: auction.highestBid,
    highestBidder: auction.highestBidder,
    highestBidderName: auction.highestBidderName,
    bidHistory: auction.bidHistory,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Bid placed successfully',
    data: updatedAuction
  });
});

// @desc    End auction
// @route   POST /api/auctions/:id/end
// @access  Private/Admin
export const endAuction = asyncHandler(async (req, res) => {
  const auctionId = req.params.id;

  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new AppError('Auction not found', 404);
  }

  if (auction.status !== 'active') {
    throw new AppError('Auction is not active', 400);
  }

  // Clear timer
  if (activeAuctions.has(auctionId)) {
    clearInterval(activeAuctions.get(auctionId).interval);
    activeAuctions.delete(auctionId);
  }

  const player = await Player.findById(auction.playerId);

  if (auction.highestBidder) {
    // Player sold
    auction.status = 'completed';
    auction.endTime = new Date();
    auction.soldPrice = auction.highestBid;
    auction.soldTo = auction.highestBidder;
    auction.soldToName = auction.highestBidderName;

    // Update player
    player.isSold = true;
    player.soldTo = auction.highestBidder;
    player.soldPrice = auction.highestBid;
    player.auctionStatus = 'sold';

    // Update team
    const team = await Team.findById(auction.highestBidder);
    if (team) {
      team.players.push(player._id);
      team.remainingBudget -= auction.highestBid;
      await team.save();
    }
  } else {
    // Player unsold
    auction.status = 'unsold';
    auction.endTime = new Date();
    player.auctionStatus = 'unsold';
  }

  await auction.save();
  await player.save();

  const finalAuction = await Auction.findById(auctionId)
    .populate('playerId', 'name role profilePhoto')
    .populate('highestBidder', 'name logo color')
    .populate('soldTo', 'name logo color');

  // Emit player sold event
  if (auction.highestBidder) {
    emitPlayerSold({
      auctionId: auction._id.toString(),
      playerId: player._id.toString(),
      playerName: player.name,
      soldPrice: auction.highestBid,
      soldTo: auction.highestBidder.toString(),
      soldToName: auction.highestBidderName
    });
  }

  // Emit auction ended event
  emitAuctionEvent('auction-ended', {
    auctionId: auction._id.toString(),
    status: auction.status,
    soldPrice: auction.soldPrice,
    soldTo: auction.soldTo,
    soldToName: auction.soldToName
  });

  res.json({
    success: true,
    message: auction.highestBidder ? 'Auction completed - Player sold' : 'Auction ended - Player unsold',
    data: finalAuction
  });
});

// @desc    Get auction history
// @route   GET /api/auctions/history
// @access  Private
export const getAuctionHistory = asyncHandler(async (req, res) => {
  const auctions = await Auction.find({ status: { $in: ['completed', 'unsold'] } })
    .populate('playerId', 'name role profilePhoto')
    .populate('highestBidder', 'name logo color')
    .populate('soldTo', 'name logo color')
    .sort({ endTime: -1 });

  res.json({
    success: true,
    count: auctions.length,
    data: auctions
  });
});

// @desc    Reset all auctions
// @route   POST /api/auctions/reset
// @access  Private/Admin
export const resetAuctions = asyncHandler(async (req, res) => {
  // Clear all active timers
  activeAuctions.forEach((data) => {
    clearInterval(data.interval);
  });
  activeAuctions.clear();

  // Reset all players
  await Player.updateMany(
    {},
    {
      $set: {
        isSold: false,
        soldTo: null,
        soldPrice: null,
        auctionStatus: 'pending'
      }
    }
  );

  // Reset all teams
  const teams = await Team.find();
  for (const team of teams) {
    team.remainingBudget = team.totalBudget;
    team.players = [];
    await team.save();
  }

  // Delete all auctions
  await Auction.deleteMany({});

  res.json({
    success: true,
    message: 'All auctions reset successfully'
  });
});

// Helper function to start auction timer
function startAuctionTimer(auctionId, duration) {
  let timeRemaining = duration;
  
  const interval = setInterval(async () => {
    timeRemaining--;
    
    // Update in-memory store
    activeAuctions.set(auctionId, { timeRemaining, interval });

    // Emit timer tick to all clients
    emitTimerTick(auctionId, timeRemaining);

    // Update database every 5 seconds to reduce writes
    if (timeRemaining % 5 === 0) {
      await Auction.findByIdAndUpdate(auctionId, { timeRemaining });
    }

    if (timeRemaining <= 0) {
      clearInterval(interval);
      activeAuctions.delete(auctionId);
      
      // Auto-end auction
      await autoEndAuction(auctionId);
    }
  }, 1000);

  activeAuctions.set(auctionId, { timeRemaining, interval });
}

// Helper function to auto-end auction
async function autoEndAuction(auctionId) {
  try {
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== 'active') return;

    const player = await Player.findById(auction.playerId);

    if (auction.highestBidder) {
      auction.status = 'completed';
      auction.endTime = new Date();
      auction.soldPrice = auction.highestBid;
      auction.soldTo = auction.highestBidder;
      auction.soldToName = auction.highestBidderName;

      player.isSold = true;
      player.soldTo = auction.highestBidder;
      player.soldPrice = auction.highestBid;
      player.auctionStatus = 'sold';

      const team = await Team.findById(auction.highestBidder);
      if (team) {
        team.players.push(player._id);
        team.remainingBudget -= auction.highestBid;
        await team.save();
      }
    } else {
      auction.status = 'unsold';
      auction.endTime = new Date();
      player.auctionStatus = 'unsold';
    }

    await auction.save();
    await player.save();
  } catch (error) {
    console.error('Auto-end auction error:', error);
  }
}

// Export for socket use
export { activeAuctions };
