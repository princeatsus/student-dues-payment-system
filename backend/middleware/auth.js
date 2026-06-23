const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const protect = (req, res, next) => {
  try {
    // 1. Get token from headers
    const authHeader = req.headers.authorization;

    // 2. Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // 3. Extract and verify token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user info to request
    req.user = decoded;

    // 5. Move to next route
    next();

  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. You do not have permission.' 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };