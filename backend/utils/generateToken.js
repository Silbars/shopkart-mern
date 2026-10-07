const jwt = require('jsonwebtoken');

/**
 * Generates a JWT for the authenticated customer and sets it inside an HttpOnly cookie.
 * @param {import('express').Response} res - Express response object
 * @param {string|import('mongoose').Types.ObjectId} customerId - Customer ID
 * @returns {string} - Generated JWT token
 */
const generateToken = (res, customerId) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  const token = jwt.sign({ id: customerId }, secret, {
    expiresIn
  });

  // Store the JWT inside an HttpOnly cookie
  res.cookie('token', token, {
    httpOnly: true, // Prevents client-side script access (XSS defense)
    secure: process.env.NODE_ENV === 'production', // Send over HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  return token;
};

module.exports = generateToken;
