import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'User account is deactivated' });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Check if user is captain
export const isCaptain = (req, res, next) => {
  if (req.user.role !== 'captain' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Captains only.' });
  }
  next();
};

// Check if user is captain of a specific team
export const isTeamCaptain = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    
    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'captain' || req.user.teamId?.toString() !== teamId) {
      return res.status(403).json({ message: 'Access denied. Team captain only.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
