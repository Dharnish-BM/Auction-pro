import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

// @desc    Get all players
// @route   GET /api/players
// @access  Private
export const getPlayers = asyncHandler(async (req, res) => {
  const { role, status, search, sortBy } = req.query;
  
  let query = {};
  
  // Filter by role
  if (role) {
    query.role = role;
  }
  
  // Filter by status
  if (status) {
    if (status === 'sold') query.isSold = true;
    if (status === 'unsold') query.isSold = false;
    if (status === 'pending') query.auctionStatus = 'pending';
  }
  
  // Search by name
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  let sortOption = {};
  if (sortBy === 'price') sortOption = { basePrice: -1 };
  else if (sortBy === 'name') sortOption = { name: 1 };
  else sortOption = { createdAt: -1 };

  const players = await Player.find(query)
    .populate('soldTo', 'name logo color')
    .sort(sortOption);

  res.json({
    success: true,
    count: players.length,
    data: players
  });
});

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Private
export const getPlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id)
    .populate('soldTo', 'name logo color captain');

  if (!player) {
    throw new AppError('Player not found', 404);
  }

  res.json({
    success: true,
    data: player
  });
});

// @desc    Create new player
// @route   POST /api/players
// @access  Private/Admin
export const createPlayer = asyncHandler(async (req, res) => {
  const {
    name,
    role,
    basePrice,
    profilePhoto,
    battingStyle,
    bowlingStyle,
    stats
  } = req.body;

  const player = await Player.create({
    name,
    role,
    basePrice,
    profilePhoto,
    battingStyle,
    bowlingStyle,
    stats
  });

  res.status(201).json({
    success: true,
    message: 'Player created successfully',
    data: player
  });
});

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private/Admin
export const updatePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  // Prevent updating sold players' key fields
  if (player.isSold) {
    const allowedUpdates = ['profilePhoto', 'stats'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
      throw new AppError('Cannot update sold player details except profile photo and stats', 400);
    }
  }

  const updatedPlayer = await Player.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Player updated successfully',
    data: updatedPlayer
  });
});

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private/Admin
export const deletePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  if (player.isSold) {
    throw new AppError('Cannot delete a sold player', 400);
  }

  await player.deleteOne();

  res.json({
    success: true,
    message: 'Player deleted successfully'
  });
});

// @desc    Mark player as sold
// @route   PATCH /api/players/:id/sold
// @access  Private/Admin
export const markPlayerSold = asyncHandler(async (req, res) => {
  const { teamId, soldPrice } = req.body;

  const player = await Player.findById(req.params.id);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  if (player.isSold) {
    throw new AppError('Player is already sold', 400);
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // Check if team has enough budget
  if (team.remainingBudget < soldPrice) {
    throw new AppError('Team does not have enough budget', 400);
  }

  // Update player
  player.isSold = true;
  player.soldTo = teamId;
  player.soldPrice = soldPrice;
  player.auctionStatus = 'sold';
  await player.save();

  // Update team
  team.players.push(player._id);
  team.remainingBudget -= soldPrice;
  await team.save();

  const updatedPlayer = await Player.findById(player._id)
    .populate('soldTo', 'name logo color');

  res.json({
    success: true,
    message: 'Player marked as sold',
    data: updatedPlayer
  });
});

// @desc    Mark player as unsold
// @route   PATCH /api/players/:id/unsold
// @access  Private/Admin
export const markPlayerUnsold = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  player.auctionStatus = 'unsold';
  await player.save();

  res.json({
    success: true,
    message: 'Player marked as unsold',
    data: player
  });
});

// @desc    Reset player auction status
// @route   PATCH /api/players/:id/reset
// @access  Private/Admin
export const resetPlayerStatus = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    throw new AppError('Player not found', 404);
  }

  // If player was sold, refund the team
  if (player.isSold && player.soldTo) {
    const team = await Team.findById(player.soldTo);
    if (team) {
      team.remainingBudget += player.soldPrice;
      team.players = team.players.filter(
        p => p.toString() !== player._id.toString()
      );
      await team.save();
    }
  }

  // Reset player
  player.isSold = false;
  player.soldTo = null;
  player.soldPrice = null;
  player.auctionStatus = 'pending';
  await player.save();

  res.json({
    success: true,
    message: 'Player status reset successfully',
    data: player
  });
});

// @desc    Get player stats summary
// @route   GET /api/players/stats/summary
// @access  Private
export const getPlayerStatsSummary = asyncHandler(async (req, res) => {
  const totalPlayers = await Player.countDocuments();
  const soldPlayers = await Player.countDocuments({ isSold: true });
  const unsoldPlayers = await Player.countDocuments({ isSold: false });
  
  const roleStats = await Player.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        sold: { $sum: { $cond: ['$isSold', 1, 0] } }
      }
    }
  ]);

  const totalMoneySpent = await Player.aggregate([
    { $match: { isSold: true } },
    { $group: { _id: null, total: { $sum: '$soldPrice' } } }
  ]);

  res.json({
    success: true,
    data: {
      totalPlayers,
      soldPlayers,
      unsoldPlayers,
      roleStats,
      totalMoneySpent: totalMoneySpent[0]?.total || 0
    }
  });
});
