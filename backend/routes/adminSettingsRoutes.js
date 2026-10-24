import express from 'express';
import {
  getStoreSettings,
  updateStoreSettings,
} from '../controllers/adminSettingsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: all store settings endpoints require authenticated administrator
router.use(protect, admin);

// @route   GET /api/admin/settings
// @desc    Retrieve the single store configuration record
// @access  Private (Admin only)
router.get('/', getStoreSettings);

// @route   PUT /api/admin/settings
// @desc    Update or initialize the store configuration record
// @access  Private (Admin only)
router.put('/', updateStoreSettings);

// @route   POST /api/admin/settings
// @desc    Backward-compatible alias for updating store settings
// @access  Private (Admin only)
router.post('/', updateStoreSettings);

export default router;
