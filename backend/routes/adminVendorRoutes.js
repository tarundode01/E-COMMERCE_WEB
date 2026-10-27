import express from 'express';
import {
  getVendorApplications,
  getVendorApplicationById,
  updateVendorApplicationStatus,
} from '../controllers/adminVendorController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/admin/vendors
// @desc    List all vendor store applications with pagination, filter, search
// @access  Private (Admin)
router.get('/', protect, admin, getVendorApplications);

// @route   GET /api/admin/vendors/:id
// @desc    Get detailed dossier of a vendor application
// @access  Private (Admin)
router.get('/:id', protect, admin, getVendorApplicationById);

// @route   PATCH /api/admin/vendors/:id/status
// @desc    Approve or reject a vendor store application
// @access  Private (Admin)
router.patch('/:id/status', protect, admin, updateVendorApplicationStatus);

export default router;
