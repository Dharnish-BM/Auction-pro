import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import Player from '../models/Player.js';
import User from '../models/User.js';

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req, res) => {
  const { name, nickname, email, password, battingStyle, bowlingStyle, role: playerRole } = req.body;

  if (!name || !nickname || !email || !password || !playerRole) {
    throw new AppError('name, nickname, email, password and role are required', 400);
  }
  if (String(password).length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError('A user with this email already exists', 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    appRole: 'viewer',
    role: 'viewer'
  });

  let player;
  try {
    player = await Player.create({
      userId: user._id,
      name,
      nickname,
      battingStyle: battingStyle || '',
      bowlingStyle: bowlingStyle || '',
      role: playerRole,
      basePrice: 5000,
      isActive: true
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }

  user.playerId = player._id;
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User and player created successfully',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        appRole: user.appRole,
        role: user.appRole,
        isActive: user.isActive,
        teamId: user.teamId,
        playerId: user.playerId
      },
      player
    }
  });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .populate('teamId', 'name')
    .populate('playerId', 'name nickname role battingStyle bowlingStyle')
    .select('-password');

  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('teamId', 'name logo')
    .populate('playerId', 'name nickname role battingStyle bowlingStyle')
    .select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, appRole, isActive, teamId } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, appRole, role: appRole, isActive, teamId },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

// @desc    Deactivate user (soft delete)
// @route   PATCH /api/users/:id/deactivate
// @access  Private/Admin
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

// @desc    Activate user
// @route   PATCH /api/users/:id/activate
// @access  Private/Admin
export const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = true;
  await user.save();

  res.json({
    success: true,
    message: 'User activated successfully'
  });
});

// @desc    Permanently delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check if user is a captain of a team
  const role = user.appRole || user.role;
  if (role === 'captain' && user.teamId) {
    throw new AppError('Cannot delete user who is assigned as captain to a team. Remove them from team first.', 400);
  }

  if (user.playerId) {
    await Player.findByIdAndDelete(user.playerId);
  }
  await user.deleteOne();

  res.json({
    success: true,
    message: 'User permanently deleted'
  });
});

// @desc    Get captains (users with captain role not assigned to any team)
// @route   GET /api/users/captains/available
// @access  Private/Admin
export const getAvailableCaptains = asyncHandler(async (req, res) => {
  const captains = await User.find({
    appRole: { $in: ['captain', 'admin'] },
    isActive: true
  }).select('-password');

  res.json({
    success: true,
    count: captains.length,
    data: captains
  });
});

// @desc    Set app role (Viewer/Captain)
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
export const setAppRole = asyncHandler(async (req, res) => {
  const { appRole } = req.body;
  if (!['captain', 'viewer', 'Captain', 'Viewer'].includes(appRole)) {
    throw new AppError("appRole must be 'Captain' or 'Viewer'", 400);
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new AppError('User not found', 404);

  const currentRole = user.appRole || user.role;
  if (currentRole === 'admin') {
    throw new AppError("Cannot change the Admin account's role", 403);
  }

  const normalized = String(appRole).toLowerCase();
  user.appRole = normalized;
  user.role = normalized;
  await user.save();

  res.json({
    success: true,
    message: 'App role updated',
    data: user
  });
});

// @desc    Reset user password
// @route   PATCH /api/users/:id/password
// @access  Private/Admin
export const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError('newPassword must be at least 6 characters', 400);
  }

  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new AppError('User not found', 404);

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated'
  });
});
