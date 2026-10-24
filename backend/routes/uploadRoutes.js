import express from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload product image (Admin only)
// @access  Private/Admin
router.post('/', protect, admin, uploadProductImage, uploadImage);

export default router;
