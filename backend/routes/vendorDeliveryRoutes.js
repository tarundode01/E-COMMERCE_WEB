import express from 'express';
import {
  getDeliveryBoys,
  createDeliveryBoy,
  getDeliveryBoyById,
  updateDeliveryBoy,
  deleteDeliveryBoy,
  updateDeliveryBoyLocation,
  simulateLiveTelemetry,
  assignDeliveryBoyToOrder,
  unassignDeliveryBoyFromOrder,
  completeOrderDelivery,
  getUnassignedStoreOrders,
  getDeliveryBoyAssignedOrders,
  acceptAssignedOrder,
  rejectAssignedOrder,
  updateMyDeliveryStatus,
  updateMyDeliveryLocation,
} from '../controllers/vendorDeliveryController.js';
import { protect, vendor, requireApprovedVendor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to check if user is vendor or delivery boy
const vendorOrDeliveryBoy = (req, res, next) => {
  if (req.user && (req.user.role === 'vendor' || req.user.role === 'admin' || req.user.role === 'delivery_boy')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Vendor or Delivery Agent access required.',
  });
};

// ============================================================================
// DELIVERY BOY PORTAL ENDPOINTS (Rider or Vendor access)
// ============================================================================
// @route   GET /api/vendor/delivery-boys/my-orders
router.get('/my-orders', protect, vendorOrDeliveryBoy, getDeliveryBoyAssignedOrders);

// @route   POST /api/vendor/delivery-boys/accept-order
router.post('/accept-order', protect, vendorOrDeliveryBoy, acceptAssignedOrder);

// @route   POST /api/vendor/delivery-boys/reject-order
router.post('/reject-order', protect, vendorOrDeliveryBoy, rejectAssignedOrder);

// @route   PATCH /api/vendor/delivery-boys/my-status
router.patch('/my-status', protect, vendorOrDeliveryBoy, updateMyDeliveryStatus);

// @route   PATCH /api/vendor/delivery-boys/my-location
router.patch('/my-location', protect, vendorOrDeliveryBoy, updateMyDeliveryLocation);

// @route   PATCH /api/vendor/delivery-boys/:id/location (accessible by vendor and delivery boy)
router.patch('/:id/location', protect, vendorOrDeliveryBoy, updateDeliveryBoyLocation);

// @route   POST /api/vendor/delivery-boys/complete-order (accessible by vendor and delivery boy)
router.post('/complete-order', protect, vendorOrDeliveryBoy, completeOrderDelivery);

// ============================================================================
// VENDOR FLEET MANAGEMENT (Strictly Approved Vendor only)
// ============================================================================
router.use(protect, vendor, requireApprovedVendor);

// @route   GET /api/vendor/delivery-boys & POST /api/vendor/delivery-boys
router.route('/')
  .get(getDeliveryBoys)
  .post(createDeliveryBoy);

// @route   GET /api/vendor/delivery-boys/unassigned-orders
router.get('/unassigned-orders', getUnassignedStoreOrders);

// @route   POST /api/vendor/delivery-boys/assign-order
router.post('/assign-order', assignDeliveryBoyToOrder);

// @route   POST /api/vendor/delivery-boys/unassign-order
router.post('/unassign-order', unassignDeliveryBoyFromOrder);

// @route   POST /api/vendor/delivery-boys/simulate-live
router.post('/simulate-live', simulateLiveTelemetry);

// @route   GET, PUT, DELETE /api/vendor/delivery-boys/:id
router.route('/:id')
  .get(getDeliveryBoyById)
  .put(updateDeliveryBoy)
  .delete(deleteDeliveryBoy);

export default router;
