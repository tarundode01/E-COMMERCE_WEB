import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Generate JSON Web Token
 * Reads JWT_SECRET from environment variables
 */
const generateToken = (userId, email, role = 'user') => {
  const secret = process.env.JWT_SECRET || 'supersecret_premium_store_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId, email, role }, secret, { expiresIn });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name || !name.trim()) missingFields.push('name');
    if (!email || !email.trim()) missingFields.push('email');
    if (!mobile || !mobile.trim()) missingFields.push('mobile');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please provide all required fields: ${missingFields.join(', ')}`,
        errors: missingFields.reduce((acc, field) => {
          acc[field] = `${field} is required`;
          return acc;
        }, {}),
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        errors: { email: 'Invalid email format' },
      });
    }

    // Validate mobile number format (minimum 10 digits)
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid mobile number (at least 10 digits)',
        errors: { mobile: 'Mobile number must have at least 10 digits' },
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        errors: { password: 'Password must be at least 6 characters' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email safely
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please sign in or use a different email address.',
        errors: { email: 'Email address already exists' },
      });
    }

    // Determine role: Allow admin creation via role parameter or admin email pattern
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
    const role = (req.body.role === 'admin' || normalizedEmail === adminEmail || normalizedEmail.includes('admin'))
      ? 'admin'
      : 'user';

    // Create user (password is automatically hashed via Mongoose pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: mobile.trim(),
      password,
      role,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Return response without password or password hash
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Handle Mongoose duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please sign in or use a different email address.',
        errors: { email: 'Email address already exists' },
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred during user registration. Please try again later.',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
        errors: {
          ...(!email || !email.trim() ? { email: 'Email is required' } : {}),
          ...(!password ? { password: 'Password is required' } : {}),
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Safely check if user exists and password matches without revealing specific error
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    // Ensure admin email automatically has admin role if not set
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
    if (user.email === adminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role || 'user');

    // Return response without password or password hash
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role || 'user',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred during login. Please try again later.',
    });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update current authenticated user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, email, mobile } = req.body;

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (mobile && mobile.trim()) {
      user.mobile = mobile.trim();
    }
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email address is already registered to another account.',
          });
        }
        user.email = normalizedEmail;
      }
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
