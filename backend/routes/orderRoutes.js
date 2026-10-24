import express from 'express';
import {
  createOrder,
  calculateOrderShipping,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrdersAdmin,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/orders/calculate-shipping
// @desc    Calculate verified shipping fee, subtotal, and total from trusted catalog prices
// @access  Public / Customer
router.post('/calculate-shipping', calculateOrderShipping);
router.post('/shipping', calculateOrderShipping);

// Protected order routes: require authenticated customer
router.use(protect);

// @route   POST /api/orders
// @desc    Place a new customer order
// @access  Private
router.post('/', createOrder);

// @route   GET /api/orders
// @desc    Fetch all orders (admin only)
// @access  Private (Admin only)
router.get('/', admin, getAllOrdersAdmin);

// @route   GET /api/orders/my-orders
// @desc    Fetch authenticated customer's order history
// @access  Private
router.get('/my-orders', getMyOrders);

// @route   GET /api/orders/:id
// @desc    Fetch single order details (owner or admin only)
// @access  Private
router.get('/:id', getOrderById);

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel an order (owner or admin only)
// @access  Private
router.patch('/:id/cancel', cancelOrder);
router.put('/:id/cancel', cancelOrder); // Backward-compatible alias

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (admin only)
// @access  Private (Admin only)
router.patch('/:id/status', admin, updateOrderStatus);
router.put('/:id/status', admin, updateOrderStatus); // Backward-compatible alias

export default router;
