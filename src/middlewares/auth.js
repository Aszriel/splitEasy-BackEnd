const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

const requireAuth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. No token provided.', 401));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireAuth,
};
