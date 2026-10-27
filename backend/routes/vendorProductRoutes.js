import express from 'express';
import {
  getVendorProducts,
  getVendorProductById,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  updateVendorProductStatus,
  updateVendorProductStock,
} from '../controllers/vendorProductController.js';
import { protect, vendor, requireApprovedVendor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict security: All vendor product operations require authenticated, approved vendor
router.use(protect, vendor, requireApprovedVendor);

router.route('/')
  .get(getVendorProducts)
  .post(createVendorProduct);

router.route('/:id')
  .get(getVendorProductById)
  .put(updateVendorProduct)
  .delete(deleteVendorProduct);

router.patch('/:id/status', updateVendorProductStatus);
router.patch('/:id/stock', updateVendorProductStock);

export default router;
