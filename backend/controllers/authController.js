import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Store from '../models/Store.js';
import DeliveryBoy from '../models/DeliveryBoy.js';

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
 * @desc    Register a new user (Customer, Vendor, or Platform Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      role: requestedRole = 'user',
      adminSecret,
      storeName,
      storeDescription,
      businessAddress,
      taxId,
      supportEmail,
      supportPhone,
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name || !name.trim()) missingFields.push('name');
    if (!email || !email.trim()) missingFields.push('email');
    if (!mobile || !String(mobile).trim()) missingFields.push('mobile');
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
    const cleanMobile = String(mobile).replace(/\D/g, '');
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

    // Determine role & authorization
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
    const validAdminSecret = (process.env.ADMIN_SECRET_KEY || 'luxury_admin_2026').trim();

    let role = 'user';
    if (requestedRole === 'admin') {
      // Require either matching ADMIN_EMAIL or valid ADMIN_SECRET_KEY
      if (normalizedEmail === adminEmail || (adminSecret && adminSecret.trim() === validAdminSecret)) {
        role = 'admin';
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid Admin Security Key. Platform administration privileges require a valid Master Security Key.',
          errors: { adminSecret: 'Invalid or missing Platform Admin Security Key' },
        });
      }
    } else if (requestedRole === 'vendor') {
      role = 'vendor';
    } else {
      // If user provided adminEmail even with user role requested, grant admin
      role = (normalizedEmail === adminEmail) ? 'admin' : 'user';
    }

    // Handle Vendor Account Creation (with Store)
    if (role === 'vendor') {
      const actualStoreName = storeName && storeName.trim() ? storeName.trim() : `${name.trim()}'s Atelier`;
      const actualStoreDescription = storeDescription && storeDescription.trim() ? storeDescription.trim() : 'Artisanal haute luxury boutique and bespoke timepiece atelier.';
      const actualBusinessAddress = businessAddress && businessAddress.trim() ? businessAddress.trim() : 'Main Luxury Commercial Boulevard';

      const slug = await Store.generateUniqueSlug(actualStoreName);

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        mobile: cleanMobile,
        password,
        role: 'vendor',
      });

      const store = await Store.create({
        vendor: user._id,
        name: actualStoreName,
        slug,
        description: actualStoreDescription,
        businessAddress: actualBusinessAddress,
        taxId: taxId ? taxId.trim() : '',
        supportEmail: supportEmail ? supportEmail.trim().toLowerCase() : normalizedEmail,
        supportPhone: supportPhone ? String(supportPhone).trim() : cleanMobile,
        status: 'pending',
      });

      const token = generateToken(user._id, user.email, user.role);

      return res.status(201).json({
        success: true,
        message: 'Vendor account and atelier registered successfully. Awaiting administrative review.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          createdAt: user.createdAt,
        },
        store: {
          id: store._id,
          name: store.name,
          slug: store.slug,
          description: store.description,
          businessAddress: store.businessAddress,
          status: store.status,
          createdAt: store.createdAt,
        },
      });
    }

    // Create user (user or admin)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: cleanMobile,
      password,
      role,
    });

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Return response without password or password hash
    return res.status(201).json({
      success: true,
      message: role === 'admin' ? 'Platform Administrator account initialized successfully.' : 'User registered successfully',
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

    // If not a standard user, check if this is a vendor-created Delivery Agent account
    if (!user) {
      const deliveryBoy = await DeliveryBoy.findOne({ email: normalizedEmail });
      if (deliveryBoy) {
        const isMatch = await deliveryBoy.matchPassword(password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password credentials',
          });
        }

        if (deliveryBoy.status === 'inactive') {
          return res.status(403).json({
            success: false,
            message: 'Your delivery agent account has been deactivated by your store vendor.',
            accountStatus: 'inactive',
          });
        }

        const store = await Store.findById(deliveryBoy.store);
        const token = generateToken(deliveryBoy._id, deliveryBoy.email, 'delivery_boy');

        return res.status(200).json({
          success: true,
          message: 'Delivery Agent login successful',
          token,
          user: {
            id: deliveryBoy._id,
            _id: deliveryBoy._id,
            name: deliveryBoy.name,
            email: deliveryBoy.email,
            mobile: deliveryBoy.phone,
            role: 'delivery_boy',
            status: deliveryBoy.status,
            vehicleType: deliveryBoy.vehicleType,
            vehicleNumber: deliveryBoy.vehicleNumber,
            storeName: store?.name || 'Artisanal Boutique',
          },
          deliveryAgent: {
            id: deliveryBoy._id,
            vendorId: deliveryBoy.vendor,
            storeId: deliveryBoy.store,
            storeName: store?.name || 'Artisanal Boutique',
            status: deliveryBoy.status,
            vehicleType: deliveryBoy.vehicleType,
            vehicleNumber: deliveryBoy.vehicleNumber,
            currentLocation: deliveryBoy.currentLocation,
          },
        });
      }

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

    // Check if user account is suspended or inactive
    if (user.status === 'suspended' || user.status === 'inactive' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended or deactivated. Please contact administration support.',
        accountStatus: user.status || 'inactive',
      });
    }

    // Ensure admin email automatically has admin role if not set
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
    if (user.email === adminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Fetch vendor store information if user is a vendor
    let storeData = null;
    if (user.role === 'vendor') {
      const { default: Store } = await import('../models/Store.js');
      const store = await Store.findOne({ vendor: user._id });
      if (store) {
        storeData = {
          id: store._id,
          name: store.name,
          slug: store.slug,
          status: store.status,
          logoUrl: store.logoUrl || null,
          bannerUrl: store.bannerUrl || null,
          rejectionReason: store.rejectionReason || null,
        };
      }
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
        status: user.status || 'active',
        createdAt: user.createdAt,
      },
      store: storeData,
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

    // Fetch vendor store information if applicable
    let storeData = null;
    if (user.role === 'vendor') {
      const { default: Store } = await import('../models/Store.js');
      const store = await Store.findOne({ vendor: user._id });
      if (store) {
        storeData = {
          id: store._id,
          name: store.name,
          slug: store.slug,
          status: store.status,
          rejectionReason: store.rejectionReason || null,
        };
      }
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id, user.email, user.role),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        status: user.status || 'active',
        createdAt: user.createdAt,
      },
      store: storeData,
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
