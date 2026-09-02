const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');

/**
 * Authentication middleware to verify JWT from cookies and attach customer to req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Read JWT from cookies (or fallback to Authorization header)
    let token = req.cookies && req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No authentication token provided'
      });
    }

    // 2. Verify token
    const secret = process.env.JWT_SECRET || 'shopkart_super_secret_jwt_key_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token'
      });
    }

    // 3. Find customer in MongoDB
    const customer = await Customer.findById(decoded.id).select('-password');
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Customer no longer exists'
      });
    }

    // 4. Attach customer object to req.user
    req.user = customer;
    req.customer = customer;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
