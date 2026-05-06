const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token and authenticate user
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Find user by ID from token
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is invalid or expired',
      error: error.message
    });
  }
};

// Middleware to check if user is Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

// Middleware to check if user is Admin or Member
const isMember = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Member')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Member privileges required.'
    });
  }
};

module.exports = { authenticate, isAdmin, isMember };
