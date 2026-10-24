import express from 'express';
import {
  getAnalyticsSummary,
  getSalesTelemetry,
  getTopSellingProducts,
  getOrderStatusBreakdown,
  getFullAnalytics,
} from '../controllers/adminAnalyticsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: all admin analytics endpoints require authenticated administrator
router.use(protect, admin);

// @route   GET /api/admin/analytics
// @desc    Get comprehensive analytics payload (summary and orders)
// @access  Private (Admin only)
router.get('/', getFullAnalytics);

// @route   GET /api/admin/analytics/summary
// @desc    Get executive analytics summary KPIs (Revenue, Orders, AOV, Delivered)
// @access  Private (Admin only)
router.get('/summary', getAnalyticsSummary);

// @route   GET /api/admin/analytics/sales
// @desc    Get daily or monthly sales revenue telemetry
// @access  Private (Admin only)
router.get('/sales', getSalesTelemetry);

// @route   GET /api/admin/analytics/top-products
// @desc    Get top-selling products ranked by acquisition revenue
// @access  Private (Admin only)
router.get('/top-products', getTopSellingProducts);

// @route   GET /api/admin/analytics/order-status
// @desc    Get order counts and amounts grouped by lifecycle status
// @access  Private (Admin only)
router.get('/order-status', getOrderStatusBreakdown);

export default router;
