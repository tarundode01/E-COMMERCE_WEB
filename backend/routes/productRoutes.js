import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import {
  getProductReviews,
  createProductReview,
  updateReview,
  deleteReview,
  updateMyProductReview,
  deleteMyProductReview,
} from '../controllers/reviewController.js';
import {
  uploadImage,
  uploadProductImageById,
} from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadProductImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes for fetching products & Protected admin route for creating
router
  .route('/')
  .get(getProducts)
  .post(protect, admin, createProduct);

// Authenticated Admin-only product image upload
router.post('/upload', protect, admin, uploadProductImage, uploadImage);

// Public route for single product & Protected admin routes for update/delete
router
  .route('/:id')
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

// Authenticated Admin-only direct product image attachment
router.post('/:id/image', protect, admin, uploadProductImage, uploadProductImageById);

// Product Review endpoints (Public GET, Protected customer POST, PUT, DELETE)
router
  .route('/:id/reviews')
  .get(getProductReviews)
  .post(protect, createProductReview)
  .put(protect, updateMyProductReview)
  .delete(protect, deleteMyProductReview);

router
  .route('/:id/reviews/:reviewId')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

export default router;
