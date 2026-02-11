import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().populate('teamId', 'name').select('-password');

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
  const { name, email, role, isActive, teamId } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, role, isActive, teamId },
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
  if (user.role === 'captain' && user.teamId) {
    throw new AppError('Cannot delete user who is assigned as captain to a team. Remove them from team first.', 400);
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
    role: 'captain',
    teamId: null,
    isActive: true
  }).select('-password');

  res.json({
    success: true,
    count: captains.length,
    data: captains
  });
});
