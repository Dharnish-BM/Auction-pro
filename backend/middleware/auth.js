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

// Optional auth - attaches req.user if token is present and valid, but never blocks.
export const optionalAuth = async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return next();
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // ignore
  }
  return next();
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = String(req.user.appRole || req.user.role || '').trim().toLowerCase();
    const allowed = roles.map(r => String(r).toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        message: `Role ${userRole} is not authorized to access this resource`
      });
    }
    next();
  };
};

// Alias with normalization for routes.
export const allowRoles = (...roles) => {
  const normalized = roles.map(r => String(r).toLowerCase());
  return authorize(...normalized);
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  const userRole = String(req.user.appRole || req.user.role || '').trim().toLowerCase();
  if (userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Check if user is captain
export const isCaptain = (req, res, next) => {
  const userRole = String(req.user.appRole || req.user.role || '').trim().toLowerCase();
  if (userRole !== 'captain' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Captains only.' });
  }
  next();
};

// Check if user is captain of a specific team
export const isTeamCaptain = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    
    const userRole = String(req.user.appRole || req.user.role || '').trim().toLowerCase();
    if (userRole === 'admin') {
      return next();
    }

    if (userRole !== 'captain' || req.user.teamId?.toString() !== teamId) {
      return res.status(403).json({ message: 'Access denied. Team captain only.' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
