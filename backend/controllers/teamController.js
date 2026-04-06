import mongoose from 'mongoose';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

const assertCaptainAppRole = (user) => {
  // A user can captain multiple teams across different matches — this is by design.
  const role = (user?.appRole || user?.role || '').toLowerCase();
  if (!['captain', 'admin'].includes(role)) {
    throw new AppError(
      "This user does not have the Captain role. Please promote them first in Users settings.",
      400
    );
  }
};

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
  assertCaptainAppRole(captainUser);

  // Create team
  const team = await Team.create({
    name,
    logo,
    captain,
    totalBudget: totalBudget || 100000,
    remainingBudget: totalBudget || 100000,
    color
  });

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
    assertCaptainAppRole(newCaptain);

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

// @desc    Admin edits squad (post-auction)
// @route   PATCH /api/teams/:id/squad
// @access  Private/Admin
export const editSquad = asyncHandler(async (req, res) => {
  const { addPlayerIds = [], removePlayerIds = [] } = req.body;
  if (!Array.isArray(addPlayerIds) && !Array.isArray(removePlayerIds)) {
    throw new AppError('addPlayerIds/removePlayerIds must be arrays', 400);
  }

  const team = await Team.findById(req.params.id);
  if (!team) throw new AppError('Team not found', 404);

  // Find match that references this team (needed to validate playerPool membership)
  const match = await Match.findOne({ $or: [{ teamA: team._id }, { teamB: team._id }] }).select('playerPool');
  if (!match) {
    throw new AppError('Match not found for this team (cannot validate playerPool)', 404);
  }
  const poolSet = new Set((match.playerPool || []).map(String));

  // Remove players silently if not present
  if (Array.isArray(removePlayerIds) && removePlayerIds.length) {
    const removeSet = new Set(removePlayerIds.map(String));
    team.players = (team.players || []).filter((pid) => !removeSet.has(String(pid)));
  }

  // Add players with validation
  if (Array.isArray(addPlayerIds) && addPlayerIds.length) {
    for (const pid of addPlayerIds) {
      const id = String(pid);
      const exists = await Player.findById(id).select('_id');
      if (!exists) {
        throw new AppError(`Player not found: ${id}`, 400);
      }
      if (!poolSet.has(id)) {
        throw new AppError(`Player not in match pool: ${id}`, 400);
      }
      if (!(team.players || []).map(String).includes(id)) {
        team.players.push(id);
      }
    }
  }

  await team.save();
  const updatedTeam = await Team.findById(team._id)
    .populate('captain', 'name email')
    .populate('players', 'name nickname role soldPrice');

  res.json({
    success: true,
    warning: 'Budget not adjusted — update manually if needed',
    data: updatedTeam
  });
});

// @desc    Remove player from team (admin)
// @route   DELETE /api/teams/:id/players/:playerId
// @access  Private/Admin
export const removePlayerFromTeam = asyncHandler(async (req, res) => {
  const { id, playerId } = req.params;
  const team = await Team.findById(id);
  if (!team) throw new AppError('Team not found', 404);

  team.players = (team.players || []).filter((p) => String(p) !== String(playerId));
  await team.save();

  const updatedTeam = await Team.findById(team._id)
    .populate('captain', 'name email')
    .populate('players', 'name nickname role soldPrice');

  res.json({ success: true, data: updatedTeam });
});
