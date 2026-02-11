import mongoose from 'mongoose';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate('captain', 'name email')
    .populate('players', 'name role soldPrice');

  res.json({
    success: true,
    count: teams.length,
    data: teams
  });
});

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('captain', 'name email')
    .populate('players', 'name role basePrice soldPrice profilePhoto stats isSold');

  if (!team) {
    throw new AppError('Team not found', 404);
  }

  res.json({
    success: true,
    data: team
  });
});

// @desc    Create new team
// @route   POST /api/teams
// @access  Private/Admin
export const createTeam = asyncHandler(async (req, res) => {
  const { name, logo, captain, totalBudget, color } = req.body;

  // Check if team name exists
  const teamExists = await Team.findOne({ name });
  if (teamExists) {
    throw new AppError('Team with this name already exists', 400);
  }

  // Verify captain exists and is a captain
  const captainUser = await User.findById(captain);
  if (!captainUser) {
    throw new AppError('Captain not found', 404);
  }
  if (captainUser.role !== 'captain') {
    throw new AppError('Selected user is not a captain', 400);
  }
  if (captainUser.teamId) {
    throw new AppError('Captain is already assigned to a team', 400);
  }

  // Create team
  const team = await Team.create({
    name,
    logo,
    captain,
    totalBudget: totalBudget || 100000,
    remainingBudget: totalBudget || 100000,
    color
  });

  // Update captain's teamId
  captainUser.teamId = team._id;
  await captainUser.save();

  const populatedTeam = await Team.findById(team._id)
    .populate('captain', 'name email');

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    data: populatedTeam
  });
});

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
export const updateTeam = asyncHandler(async (req, res) => {
  const { name, logo, captain, totalBudget, color } = req.body;

  const team = await Team.findById(req.params.id);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // If changing captain
  if (captain && captain.toString() !== team.captain.toString()) {
    const newCaptain = await User.findById(captain);
    if (!newCaptain) {
      throw new AppError('New captain not found', 404);
    }
    if (newCaptain.role !== 'captain') {
      throw new AppError('Selected user is not a captain', 400);
    }
    if (newCaptain.teamId && newCaptain.teamId.toString() !== team._id.toString()) {
      throw new AppError('Captain is already assigned to another team', 400);
    }

    // Remove team from old captain
    const oldCaptain = await User.findById(team.captain);
    if (oldCaptain) {
      oldCaptain.teamId = null;
      await oldCaptain.save();
    }

    // Assign team to new captain
    newCaptain.teamId = team._id;
    await newCaptain.save();

    team.captain = captain;
  }

  // Update other fields
  if (name) team.name = name;
  if (logo) team.logo = logo;
  if (color) team.color = color;
  
  // Update budget
  if (totalBudget && totalBudget !== team.totalBudget) {
    const spent = team.totalBudget - team.remainingBudget;
    team.totalBudget = totalBudget;
    team.remainingBudget = totalBudget - spent;
  }

  await team.save();

  const updatedTeam = await Team.findById(team._id)
    .populate('captain', 'name email')
    .populate('players', 'name role soldPrice');

  res.json({
    success: true,
    message: 'Team updated successfully',
    data: updatedTeam
  });
});

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // Remove team reference from captain
  const captain = await User.findById(team.captain);
  if (captain) {
    captain.teamId = null;
    await captain.save();
  }

  // Remove team reference from all players
  await mongoose.model('Player').updateMany(
    { soldTo: team._id },
    { $set: { soldTo: null, isSold: false, soldPrice: null, auctionStatus: 'pending' } }
  );

  await team.deleteOne();

  res.json({
    success: true,
    message: 'Team deleted successfully'
  });
});

// @desc    Get team squad
// @route   GET /api/teams/:id/squad
// @access  Private
export const getTeamSquad = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate('players', 'name role basePrice soldPrice profilePhoto stats battingStyle bowlingStyle');

  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // Group players by role
  const squadByRole = {
    Batsman: [],
    Bowler: [],
    'All-Rounder': [],
    'Wicket-Keeper': []
  };

  team.players.forEach(player => {
    if (squadByRole[player.role]) {
      squadByRole[player.role].push(player);
    }
  });

  res.json({
    success: true,
    data: {
      team: {
        name: team.name,
        logo: team.logo,
        color: team.color,
        totalBudget: team.totalBudget,
        remainingBudget: team.remainingBudget
      },
      squad: squadByRole,
      totalPlayers: team.players.length
    }
  });
});

// @desc    Get team stats
// @route   GET /api/teams/:id/stats
// @access  Private
export const getTeamStats = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  res.json({
    success: true,
    data: {
      matchesPlayed: team.matchesPlayed,
      matchesWon: team.matchesWon,
      matchesLost: team.matchesLost,
      winPercentage: team.matchesPlayed > 0 
        ? ((team.matchesWon / team.matchesPlayed) * 100).toFixed(2)
        : 0,
      netRunRate: team.netRunRate
    }
  });
});
