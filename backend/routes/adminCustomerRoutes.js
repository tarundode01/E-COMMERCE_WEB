import express from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
} from '../controllers/adminCustomerController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: all admin customer endpoints require authenticated administrator
router.use(protect, admin);

// @route   GET /api/admin/customers
// @desc    Fetch registered customers with search and pagination
// @access  Private (Admin only)
router.get('/', getCustomers);

// @route   GET /api/admin/customers/:id
// @desc    Fetch single customer profile and order history
// @access  Private (Admin only)
router.get('/:id', getCustomerById);

// @route   GET /api/admin/customers/:id/orders
// @desc    Fetch customer's specific order history
// @access  Private (Admin only)
router.get('/:id/orders', getCustomerOrders);

export default router;
