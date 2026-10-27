import express from 'express';
import {
  registerVendor,
  getVendorStore,
  updateVendorStore,
  getVendorApplicationStatus,
  getVendorFeatures,
  getVendorStoreById,
  uploadVendorAsset,
  getPublicStoreBySlug,
  getVendorAnalytics,
} from '../controllers/vendorController.js';
import {
  getVendorOrders,
  getVendorOrderById,
  updateVendorOrderStatus,
} from '../controllers/orderController.js';
import { protect, vendor, requireApprovedVendor } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../middleware/uploadMiddleware.js';
import vendorProductRoutes from './vendorProductRoutes.js';
import vendorDeliveryRoutes from './vendorDeliveryRoutes.js';

const router = express.Router();

// @route   /api/vendor/delivery-boys
// @desc    Vendor delivery boy management & live GPS tracking telemetry
router.use('/delivery-boys', vendorDeliveryRoutes);

// @route   GET /api/vendor/analytics & /api/vendor/overview
// @desc    Vendor sales analytics and telemetry overview
// @access  Private (Approved Vendor)
router.get('/analytics', protect, vendor, requireApprovedVendor, getVendorAnalytics);
router.get('/overview', protect, vendor, requireApprovedVendor, getVendorAnalytics);

// @route   /api/vendor/products
// @desc    Vendor product management module (CRUD, stock, publication)
router.use('/products', vendorProductRoutes);

// @route   GET /api/vendor/orders
// @desc    Get orders for current approved vendor's store with item isolation, filters, search & pagination
// @access  Private (Approved Vendor)
router.get('/orders', protect, vendor, requireApprovedVendor, getVendorOrders);

// @route   GET /api/vendor/orders/:id
// @desc    Get single order details for current approved vendor with item isolation
// @access  Private (Approved Vendor)
router.get('/orders/:id', protect, vendor, requireApprovedVendor, getVendorOrderById);

// @route   PATCH /api/vendor/orders/:id/status
// @desc    Update order fulfillment status (Confirmed, Processing, Packed, Ready for Pickup, Cancelled)
// @access  Private (Approved Vendor)
router.patch('/orders/:id/status', protect, vendor, requireApprovedVendor, updateVendorOrderStatus);
router.put('/orders/:id/status', protect, vendor, requireApprovedVendor, updateVendorOrderStatus);

// @route   POST /api/vendor/register
// @desc    Register new vendor account and create pending store
// @access  Public
router.post('/register', registerVendor);

// @route   GET /api/vendor/public/:slug
// @desc    Public read-only store profile by slug
// @access  Public
router.get('/public/:slug', getPublicStoreBySlug);

// @route   GET /api/vendor/store
// @desc    Get current authenticated vendor's store details
// @access  Private (Vendor)
router.get('/store', protect, vendor, getVendorStore);

// @route   PUT /api/vendor/store
// @desc    Update current authenticated vendor's store profile and settings
// @access  Private (Vendor)
router.put('/store', protect, vendor, updateVendorStore);

// @route   POST /api/vendor/upload
// @desc    Upload vendor store asset (Logo or Banner image)
// @access  Private (Vendor)
router.post('/upload', protect, vendor, uploadProductImage, uploadVendorAsset);

// @route   GET /api/vendor/status
// @desc    Get current application review status
// @access  Private (Vendor)
router.get('/status', protect, vendor, getVendorApplicationStatus);

// @route   GET /api/vendor/features
// @desc    Access approved-vendor-only commercial features
// @access  Private (Approved Vendor only)
router.get('/features', protect, vendor, requireApprovedVendor, getVendorFeatures);

// @route   GET /api/vendor/store/:id
// @desc    Get store by ID with strict cross-vendor isolation
// @access  Private (Store Owner / Admin)
router.get('/store/:id', protect, vendor, getVendorStoreById);

export default router;
