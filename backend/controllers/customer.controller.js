const Customer = require('../models/customer.model');
const generateToken = require('../utils/generateToken');

/**
 * Task 1: Register a new customer
 * POST /customers/register
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // 1. Validation: Check all mandatory fields
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are mandatory (fullName, email, password, phone)'
      });
    }

    // 2. Validation: Password length
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 6 characters'
      });
    }

    // 3. Validation: Check unique email
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // 4. Create new customer (password hashed automatically by pre-save hook)
    const customer = new Customer({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim()
    });

    await customer.save();

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during customer registration',
      error: error.message
    });
  }
};

/**
 * Task 2: Login customer
 * POST /customers/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // 2. Find customer by email
    const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (!customer) {
      // Do not reveal whether email or password was incorrect
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 3. Verify password with bcrypt
    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      // Do not reveal whether email or password was incorrect
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 4. Generate JWT & set HttpOnly cookie
    generateToken(res, customer._id);

    // 5. Return success response with customer info (excluding password)
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Task 3: Get Authenticated Customer Profile
 * GET /customers/me
 */
const getProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    return res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving customer profile',
      error: error.message
    });
  }
};

/**
 * Task 4: Logout customer
 * POST /customers/logout
 */
const logout = async (req, res) => {
  try {
    // Clear the authentication cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

/**
 * Bonus Challenge (+10 Marks): Change Password
 * PATCH /customers/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both oldPassword and newPassword are required'
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least 6 characters'
      });
    }

    // Retrieve customer including password
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify old password
    const isMatch = await customer.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid old password'
      });
    }

    // Set new password (pre-save hook will hash it)
    customer.password = newPassword;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during password change',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  changePassword
};
