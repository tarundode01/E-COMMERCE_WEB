import express from 'express';
import {
  getAllOrdersAdmin,
  getOrderById,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: all admin order routes require authenticated admin
router.use(protect, admin);

// @route   GET /api/admin/orders
// @desc    Fetch all customer orders across the platform
// @access  Private (Admin only)
router.get('/', getAllOrdersAdmin);

// @route   GET /api/admin/orders/:id
// @desc    Fetch single order details for admin
// @access  Private (Admin only)
router.get('/:id', getOrderById);

// @route   PATCH /api/admin/orders/:id/status
// @desc    Update order status with transition validation and stock management
// @access  Private (Admin only)
router.patch('/:id/status', updateOrderStatus);
router.put('/:id/status', updateOrderStatus); // Backward-compatible alias

export default router;
