import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { uploadImageBuffer } from '../services/cloudinaryService.js';

/**
 * Generate JSON Web Token
 */
const generateToken = (userId, email, role = 'vendor') => {
  const secret = process.env.JWT_SECRET || 'supersecret_premium_store_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId, email, role }, secret, { expiresIn });
};

/**
 * @desc    Register a new vendor and create store application
 * @route   POST /api/vendor/register
 * @access  Public
 */
export const registerVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      storeName,
      storeDescription,
      businessAddress,
      taxId,
      supportEmail,
      supportPhone,
    } = req.body;

    // Field-level validation checklist
    const errors = {};

    // 1. Vendor Name
    if (!name || !name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    // 2. Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    // 3. Mobile Number
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : '';
    if (!mobile || !String(mobile).trim()) {
      errors.mobile = 'Mobile number is required';
    } else if (cleanMobile.length < 10) {
      errors.mobile = 'Mobile number must have at least 10 digits';
    }

    // 4. Password
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // 5. Store / Business Name
    if (!storeName || !storeName.trim()) {
      errors.storeName = 'Store / Business name is required';
    } else if (storeName.trim().length < 2) {
      errors.storeName = 'Store name must be at least 2 characters';
    }

    // 6. Store Description
    if (!storeDescription || !storeDescription.trim()) {
      errors.storeDescription = 'Store description is required';
    } else if (storeDescription.trim().length < 10) {
      errors.storeDescription = 'Store description must be at least 10 characters';
    }

    // 7. Business Address
    if (!businessAddress || !businessAddress.trim()) {
      errors.businessAddress = 'Business physical address is required';
    }

    // 8. Support Email format check if provided
    if (supportEmail && supportEmail.trim() && !emailRegex.test(supportEmail.trim())) {
      errors.supportEmail = 'Please provide a valid support email address';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please resolve the validation errors to proceed.',
        errors,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing user account with the same email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please sign in or use a different email address.',
        errors: { email: 'Email address already exists' },
      });
    }

    // Generate unique URL-friendly store slug
    const slug = await Store.generateUniqueSlug(storeName.trim());

    // Public registration MUST NEVER create an admin. Role is strictly vendor.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      mobile: cleanMobile,
      password,
      role: 'vendor',
    });

    // Create store profile with 'pending' status by default
    const store = await Store.create({
      vendor: user._id,
      name: storeName.trim(),
      slug,
      description: storeDescription.trim(),
      businessAddress: businessAddress.trim(),
      taxId: taxId ? taxId.trim() : '',
      supportEmail: supportEmail ? supportEmail.trim().toLowerCase() : normalizedEmail,
      supportPhone: supportPhone ? String(supportPhone).trim() : cleanMobile,
      status: 'pending',
    });

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    return res.status(201).json({
      success: true,
      message: 'Vendor application submitted successfully. It is now awaiting administrative approval.',
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
        taxId: store.taxId,
        supportEmail: store.supportEmail,
        supportPhone: store.supportPhone,
        status: store.status,
        createdAt: store.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate record encountered (email or store slug already registered).',
        error: error.message,
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error('Vendor Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during vendor registration. Please try again later.',
    });
  }
};

/**
 * @desc    Get current authenticated vendor's store profile and settings
 * @route   GET /api/vendor/store
 * @access  Private (Vendor only)
 */
export const getVendorStore = async (req, res) => {
  try {
    const store = await Store.findOne({ vendor: req.user._id }).populate(
      'vendor',
      'name email mobile role createdAt status isActive'
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found associated with this vendor account.',
      });
    }

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        _id: store._id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        businessAddress: store.businessAddress,
        pickupAddress: store.pickupAddress || '',
        taxId: store.taxId,
        supportEmail: store.supportEmail,
        supportPhone: store.supportPhone,
        status: store.status,
        rejectionReason: store.rejectionReason,
        reviewedAt: store.reviewedAt,
        logoUrl: store.logoUrl || '',
        bannerUrl: store.bannerUrl || '',
        isOpen: store.isOpen ?? true,
        isPubliclyVisible: store.isPubliclyVisible ?? true,
        deliveryAvailable: store.deliveryAvailable ?? true,
        deliveryNotes: store.deliveryNotes || '',
        openingHours: store.openingHours,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        vendor: store.vendor,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor store:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve store profile.',
    });
  }
};

/**
 * @desc    Update current vendor's permitted store profile and settings fields
 * @route   PUT /api/vendor/store
 * @access  Private (Vendor only)
 */
export const updateVendorStore = async (req, res) => {
  try {
    // Check if authenticated user account is suspended or inactive
    if (req.user.status === 'suspended' || req.user.status === 'inactive' || req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or deactivated. Store settings cannot be modified.',
      });
    }

    const store = await Store.findOne({ vendor: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store profile not found.',
      });
    }

    // Check if store itself is suspended or inactive
    if (store.status === 'suspended' || store.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: `Store is currently ${store.status}. Profile and settings cannot be modified. Please contact administration.`,
        storeStatus: store.status,
      });
    }

    const {
      name,
      slug,
      description,
      businessAddress,
      taxId,
      supportEmail,
      supportPhone,
      logoUrl,
      bannerUrl,
      isOpen,
      isPubliclyVisible,
      pickupAddress,
      deliveryAvailable,
      deliveryNotes,
      openingHours,
      resubmit,
    } = req.body;

    const errors = {};

    // 1. Store Name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        errors.name = 'Store name cannot be empty';
      } else if (name.trim().length < 2) {
        errors.name = 'Store name must be at least 2 characters';
      } else if (name.trim().length > 100) {
        errors.name = 'Store name cannot exceed 100 characters';
      } else if (name.trim() !== store.name) {
        store.name = name.trim();
        // If slug is not explicitly supplied in this request, update slug automatically
        if (slug === undefined) {
          store.slug = await Store.generateUniqueSlug(store.name, store._id);
        }
      }
    }

    // 2. Custom URL Slug
    if (slug !== undefined) {
      const cleanSlug = slug.trim().toLowerCase();
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!cleanSlug) {
        errors.slug = 'Store slug cannot be empty';
      } else if (cleanSlug.length < 2) {
        errors.slug = 'Slug must be at least 2 characters';
      } else if (cleanSlug.length > 100) {
        errors.slug = 'Slug cannot exceed 100 characters';
      } else if (!slugRegex.test(cleanSlug)) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, and single hyphens';
      } else if (cleanSlug !== store.slug) {
        const existingStore = await Store.findOne({
          slug: cleanSlug,
          _id: { $ne: store._id },
        });
        if (existingStore) {
          errors.slug = 'This custom URL slug is already claimed by another store';
        } else {
          store.slug = cleanSlug;
        }
      }
    }

    // 3. Description
    if (description !== undefined) {
      if (!description || !description.trim()) {
        errors.description = 'Description cannot be empty';
      } else if (description.trim().length < 10) {
        errors.description = 'Description must be at least 10 characters';
      } else if (description.trim().length > 2000) {
        errors.description = 'Description cannot exceed 2000 characters';
      } else {
        store.description = description.trim();
      }
    }

    // 4. Business Address
    if (businessAddress !== undefined) {
      if (!businessAddress || !businessAddress.trim()) {
        errors.businessAddress = 'Business address cannot be empty';
      } else if (businessAddress.trim().length > 500) {
        errors.businessAddress = 'Business address cannot exceed 500 characters';
      } else {
        store.businessAddress = businessAddress.trim();
      }
    }

    // 5. Tax ID
    if (taxId !== undefined) {
      store.taxId = taxId ? taxId.trim() : '';
    }

    // 6. Support Email
    if (supportEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (supportEmail.trim() && !emailRegex.test(supportEmail.trim())) {
        errors.supportEmail = 'Please provide a valid support email address';
      } else {
        store.supportEmail = supportEmail ? supportEmail.trim().toLowerCase() : '';
      }
    }

    // 7. Support Phone
    if (supportPhone !== undefined) {
      store.supportPhone = supportPhone ? String(supportPhone).trim() : '';
    }

    // 8. Logo & Banner URLs
    if (logoUrl !== undefined) {
      store.logoUrl = logoUrl ? String(logoUrl).trim() : '';
    }
    if (bannerUrl !== undefined) {
      store.bannerUrl = bannerUrl ? String(bannerUrl).trim() : '';
    }

    // 9. Store Open/Closed Toggle
    if (isOpen !== undefined) {
      store.isOpen = Boolean(isOpen);
    }

    // 10. Store Visibility Toggle
    if (isPubliclyVisible !== undefined) {
      store.isPubliclyVisible = Boolean(isPubliclyVisible);
    }

    // 11. Pickup Address
    if (pickupAddress !== undefined) {
      store.pickupAddress = pickupAddress ? String(pickupAddress).trim() : '';
    }

    // 12. Delivery Availability & Notes
    if (deliveryAvailable !== undefined) {
      store.deliveryAvailable = Boolean(deliveryAvailable);
    }
    if (deliveryNotes !== undefined) {
      store.deliveryNotes = deliveryNotes ? String(deliveryNotes).trim() : '';
    }

    // 13. Opening Hours
    if (openingHours !== undefined && typeof openingHours === 'object' && openingHours !== null) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      const currentHours = store.openingHours ? (store.openingHours.toObject ? store.openingHours.toObject() : store.openingHours) : {};
      const updatedHours = { ...currentHours };

      for (const day of days) {
        if (openingHours[day]) {
          const dayData = openingHours[day];
          const existingDay = currentHours[day] || { open: '09:00', close: '18:00', isClosed: false };

          let openTime = existingDay.open;
          let closeTime = existingDay.close;
          let isClosed = existingDay.isClosed;

          if (dayData.open !== undefined) {
            if (timeRegex.test(dayData.open)) {
              openTime = dayData.open;
            } else {
              errors[`openingHours.${day}.open`] = `Invalid open time for ${day}. Format must be HH:MM`;
            }
          }

          if (dayData.close !== undefined) {
            if (timeRegex.test(dayData.close)) {
              closeTime = dayData.close;
            } else {
              errors[`openingHours.${day}.close`] = `Invalid close time for ${day}. Format must be HH:MM`;
            }
          }

          if (dayData.isClosed !== undefined) {
            isClosed = Boolean(dayData.isClosed);
          }

          updatedHours[day] = { open: openTime, close: closeTime, isClosed };
        }
      }

      if (Object.keys(errors).length === 0) {
        store.openingHours = updatedHours;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for updated fields',
        errors,
      });
    }

    // If store was rejected and vendor explicitly resubmits or updates information
    if (resubmit || store.status === 'rejected') {
      store.status = 'pending';
      store.rejectionReason = '';
      store.reviewedAt = null;
      store.reviewedBy = null;
    }

    await store.save();

    const populatedStore = await Store.findById(store._id).populate(
      'vendor',
      'name email mobile role'
    );

    return res.status(200).json({
      success: true,
      message:
        store.status === 'pending'
          ? 'Store details updated and re-submitted for administrator review.'
          : 'Store profile and settings updated successfully.',
      store: {
        id: populatedStore._id,
        _id: populatedStore._id,
        name: populatedStore.name,
        slug: populatedStore.slug,
        description: populatedStore.description,
        businessAddress: populatedStore.businessAddress,
        pickupAddress: populatedStore.pickupAddress,
        taxId: populatedStore.taxId,
        supportEmail: populatedStore.supportEmail,
        supportPhone: populatedStore.supportPhone,
        logoUrl: populatedStore.logoUrl,
        bannerUrl: populatedStore.bannerUrl,
        isOpen: populatedStore.isOpen,
        isPubliclyVisible: populatedStore.isPubliclyVisible,
        deliveryAvailable: populatedStore.deliveryAvailable,
        deliveryNotes: populatedStore.deliveryNotes,
        openingHours: populatedStore.openingHours,
        status: populatedStore.status,
        rejectionReason: populatedStore.rejectionReason,
        reviewedAt: populatedStore.reviewedAt,
        createdAt: populatedStore.createdAt,
        updatedAt: populatedStore.updatedAt,
        vendor: populatedStore.vendor,
      },
    });
  } catch (error) {
    console.error('Error updating vendor store:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update store profile.',
    });
  }
};

/**
 * @desc    Get vendor application status
 * @route   GET /api/vendor/status
 * @access  Private (Vendor only)
 */
export const getVendorApplicationStatus = async (req, res) => {
  try {
    const store = await Store.findOne({ vendor: req.user._id }).select(
      'name slug status rejectionReason reviewedAt createdAt'
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store application found for this vendor account.',
      });
    }

    return res.status(200).json({
      success: true,
      status: store.status,
      rejectionReason: store.rejectionReason || '',
      storeName: store.name,
      slug: store.slug,
      reviewedAt: store.reviewedAt,
      submittedAt: store.createdAt,
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve application status.',
    });
  }
};

/**
 * @desc    Access approved-vendor-only features (requires approved status)
 * @route   GET /api/vendor/features
 * @access  Private (Approved Vendor only)
 */
export const getVendorFeatures = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      authorized: true,
      canSell: true,
      message: 'Access granted to approved vendor commercial features.',
      storeStatus: req.store.status,
      permissions: [
        'manage_products',
        'create_listings',
        'inventory_control',
        'process_orders',
        'access_merchant_telemetry',
      ],
      store: {
        id: req.store._id,
        name: req.store.name,
        slug: req.store.slug,
        status: req.store.status,
      },
    });
  } catch (error) {
    console.error('Error accessing vendor features:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving vendor features.',
    });
  }
};

/**
 * @desc    Get vendor store by specific ID (enforces strict cross-vendor isolation)
 * @route   GET /api/vendor/store/:id
 * @access  Private (Vendor owner only)
 */
export const getVendorStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID format.',
      });
    }

    const store = await Store.findById(id).populate(
      'vendor',
      'name email mobile role createdAt'
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found.',
      });
    }

    // Strict cross-vendor data isolation: Only owner or admin can view
    if (store.vendor._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access another vendor\'s store dossier.',
      });
    }

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        businessAddress: store.businessAddress,
        pickupAddress: store.pickupAddress || '',
        taxId: store.taxId,
        supportEmail: store.supportEmail,
        supportPhone: store.supportPhone,
        logoUrl: store.logoUrl || '',
        bannerUrl: store.bannerUrl || '',
        isOpen: store.isOpen ?? true,
        isPubliclyVisible: store.isPubliclyVisible ?? true,
        deliveryAvailable: store.deliveryAvailable ?? true,
        deliveryNotes: store.deliveryNotes || '',
        openingHours: store.openingHours,
        status: store.status,
        rejectionReason: store.rejectionReason,
        reviewedAt: store.reviewedAt,
        vendor: store.vendor,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching store by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve store dossier.',
    });
  }
};

/**
 * @desc    Upload vendor store asset (Logo or Banner image)
 * @route   POST /api/vendor/upload
 * @access  Private (Vendor only)
 */
export const uploadVendorAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was uploaded. Please attach an image under field "image" or "file".',
      });
    }

    const uploadResult = await uploadImageBuffer({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    return res.status(200).json({
      success: true,
      message: 'Store image asset uploaded successfully.',
      imageUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      storage: uploadResult.storage,
    });
  } catch (error) {
    console.error('Vendor asset upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image asset upload processing failed.',
    });
  }
};

/**
 * @desc    Get public read-only store profile by slug
 * @route   GET /api/vendor/public/:slug
 * @access  Public
 */
export const getPublicStoreBySlug = async (req, res) => {
  try {
    const rawSlug = req.params.slug;
    if (!rawSlug || !rawSlug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Store slug parameter is required.',
      });
    }

    const slug = rawSlug.trim().toLowerCase();

    const store = await Store.findOne({ slug }).populate(
      'vendor',
      'name status isActive createdAt'
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store profile not found.',
      });
    }

    // Security & Visibility check:
    // Only approved stores with isPubliclyVisible !== false and non-suspended vendors can be viewed publicly
    const isOwnerActive = store.vendor && store.vendor.status !== 'suspended' && store.vendor.isActive !== false;
    const isApproved = store.status === 'approved';
    const isVisible = store.isPubliclyVisible !== false;

    if (!isApproved || !isVisible || !isOwnerActive) {
      return res.status(404).json({
        success: false,
        message: 'This atelier / store is currently not active or undergoing curator verification.',
        isPublished: false,
        status: store.status,
      });
    }

    // Fetch published boutique products for public discovery
    const products = await Product.find({
      store: store._id,
      status: 'published',
    })
      .select('name price originalPrice image images category stock rating reviewsCount slug')
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();

    // Return safe public fields only (strictly omitting taxId, rejectionReason, reviewedBy, internal notes)
    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        _id: store._id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logoUrl: store.logoUrl || '',
        bannerUrl: store.bannerUrl || '',
        businessAddress: store.businessAddress,
        pickupAddress: store.pickupAddress || '',
        supportEmail: store.supportEmail || '',
        supportPhone: store.supportPhone || '',
        isOpen: store.isOpen ?? true,
        deliveryAvailable: store.deliveryAvailable ?? true,
        deliveryNotes: store.deliveryNotes || '',
        openingHours: store.openingHours,
        status: store.status,
        products: products || [],
        productsCount: products.length,
        createdAt: store.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching public store by slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve public store profile.',
    });
  }
};

/**
 * @desc    Get real-time vendor performance analytics and dashboard overview telemetry
 * @route   GET /api/vendor/analytics & GET /api/vendor/overview
 * @access  Private (Approved Vendor only)
 */
export const getVendorAnalytics = async (req, res) => {
  try {
    const store = req.store || (await Store.findOne({ vendor: req.user._id }));
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store registered for this vendor account.',
      });
    }

    const { timeframe = 'all' } = req.query;
    const storeIdStr = store._id.toString();

    // Calculate start date if timeframe filter provided
    let dateFilter = null;
    const now = new Date();

    if (timeframe === '7d') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30d') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '90d') {
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '1y') {
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // 1. Fetch products for this store / vendor account
    const products = await Product.find({
      $or: [{ store: store._id }, { vendor: req.user._id }],
    })
      .select('name slug sku price stock status image category')
      .lean();

    const activeProducts = products.filter((p) => p.status === 'published').length;
    const draftProducts = products.filter((p) => p.status === 'draft').length;
    const lowStockProducts = products
      .filter((p) => Number(p.stock) <= 5)
      .map((p) => ({
        _id: p._id,
        id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku || '',
        stock: p.stock,
        price: p.price,
        status: p.status,
        image: p.image,
      }));

    // 2. Fetch orders containing items for this store
    const orderQuery = {
      $or: [
        { stores: store._id },
        { 'products.store': store._id },
        { 'products.vendor': req.user._id },
      ],
    };

    if (dateFilter) {
      orderQuery.createdAt = { $gte: dateFilter };
    }

    const orders = await Order.find(orderQuery)
      .populate('customer', 'name email mobileNumber')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Compute telemetry metrics
    let totalRevenue = 0;
    let totalUnitsSold = 0;
    let pendingOrders = 0;
    let confirmedOrders = 0;
    let processingOrders = 0;
    let packedOrders = 0;
    let readyForPickupOrders = 0;
    let shippedOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    const productSalesMap = new Map();
    const timelineMap = new Map();

    for (const ord of orders) {
      const s = ord.orderStatus;
      if (s === 'Pending') pendingOrders += 1;
      else if (s === 'Confirmed') confirmedOrders += 1;
      else if (s === 'Processing') processingOrders += 1;
      else if (s === 'Packed') packedOrders += 1;
      else if (s === 'Ready for Pickup') readyForPickupOrders += 1;
      else if (s === 'Shipped') shippedOrders += 1;
      else if (s === 'Delivered') completedOrders += 1;
      else if (s === 'Cancelled') cancelledOrders += 1;

      // Extract only vendor's store items
      const vendorLines = (ord.products || []).filter(
        (it) =>
          (it.store && it.store.toString() === storeIdStr) ||
          (it.vendor && it.vendor.toString() === req.user._id.toString())
      );

      let orderVendorTotal = 0;
      let orderVendorUnits = 0;

      for (const line of vendorLines) {
        const lineTotal = (line.price || 0) * (line.quantity || 1);
        const lineQty = line.quantity || 1;
        orderVendorTotal += lineTotal;
        orderVendorUnits += lineQty;

        // Aggregate top products if order is active / not cancelled
        if (s !== 'Cancelled') {
          const prodKey = String(line.product || line.name);
          if (productSalesMap.has(prodKey)) {
            const existing = productSalesMap.get(prodKey);
            existing.unitsSold += lineQty;
            existing.revenue += lineTotal;
          } else {
            productSalesMap.set(prodKey, {
              productId: line.product,
              name: line.name,
              sku: line.sku || '',
              image: line.image,
              unitsSold: lineQty,
              revenue: lineTotal,
            });
          }
        }
      }

      if (s !== 'Cancelled') {
        totalRevenue += orderVendorTotal;
        totalUnitsSold += orderVendorUnits;

        // Group into daily timeline
        const dateKey = new Date(ord.createdAt).toISOString().split('T')[0];
        if (timelineMap.has(dateKey)) {
          const dayData = timelineMap.get(dateKey);
          dayData.sales += orderVendorTotal;
          dayData.orders += 1;
        } else {
          timelineMap.set(dateKey, {
            date: dateKey,
            sales: orderVendorTotal,
            orders: 1,
          });
        }
      }
    }

    const nonCancelledOrdersCount = orders.length - cancelledOrders;
    const averageOrderValue =
      nonCancelledOrdersCount > 0
        ? Math.round((totalRevenue / nonCancelledOrdersCount) * 100) / 100
        : 0;

    // Top selling products sorted descending by volume
    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, 5);

    // Build continuous sales timeline if timeframe is 7d or 30d
    let salesTimeline = [];
    if (timeframe === '7d' || timeframe === '30d') {
      const daysCount = timeframe === '7d' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dKey = d.toISOString().split('T')[0];
        const existing = timelineMap.get(dKey);
        salesTimeline.push({
          date: dKey,
          sales: existing ? existing.sales : 0,
          orders: existing ? existing.orders : 0,
        });
      }
    } else {
      salesTimeline = Array.from(timelineMap.values()).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
    }

    // Format latest 5 recent orders scoped to this vendor (filter out orders with no items for this vendor)
    const recentOrders = orders
      .map((ord) => {
        const vendorItems = (ord.products || []).filter(
          (it) =>
            (it.store && it.store.toString() === storeIdStr) ||
            (it.vendor && it.vendor.toString() === req.user._id.toString())
        );
        if (!vendorItems || vendorItems.length === 0) return null;

        const subtotal = vendorItems.reduce(
          (acc, it) => acc + (it.price || 0) * (it.quantity || 1),
          0
        );

        return {
          _id: ord._id,
          id: ord._id,
          createdAt: ord.createdAt,
          orderStatus: ord.orderStatus,
          paymentStatus: ord.paymentStatus,
          paymentMethod: ord.paymentMethod,
          customerName: ord.deliveryAddress?.fullName || ord.customer?.name || 'Customer',
          customerEmail: ord.deliveryAddress?.email || ord.customer?.email || '',
          itemsCount: vendorItems.reduce((acc, it) => acc + (it.quantity || 1), 0),
          items: vendorItems,
          vendorSubtotal: subtotal,
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        slug: store.slug,
        status: store.status,
      },
      timeframe,
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        packedOrders,
        inFulfillmentOrders: confirmedOrders + processingOrders + packedOrders,
        readyForPickupOrders,
        shippedOrders,
        cancelledOrders,
        activeProducts,
        draftProducts,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        totalUnitsSold,
        averageOrderValue,
      },
      recentOrders,
      lowStockProducts,
      topSellingProducts,
      salesTimeline,
      ordersByStatus: [
        { status: 'Pending', count: pendingOrders },
        { status: 'Confirmed', count: confirmedOrders },
        { status: 'Processing', count: processingOrders },
        { status: 'Packed', count: packedOrders },
        { status: 'Ready for Pickup', count: readyForPickupOrders },
        { status: 'Shipped', count: shippedOrders },
        { status: 'Delivered', count: completedOrders },
        { status: 'Cancelled', count: cancelledOrders },
      ],
    });
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor performance analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
