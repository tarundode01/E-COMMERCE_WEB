import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  submitCategoryRequest,
  getCategoryRequests,
  deleteCategoryRequest,
} from '../controllers/categoryController.js';
import { protect, admin, vendor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Vendor Category Proposal Routes (Must be before /:id)
router.post('/request', protect, vendor, submitCategoryRequest);
router.delete('/request/:id', protect, vendor, deleteCategoryRequest);
router.get('/requests', protect, getCategoryRequests);

// Public route to view categories & Protected admin route to create
router
  .route('/')
  .get(getCategories)
  .post(protect, admin, createCategory);

// Status toggle route for admin deactivation/reactivation
router
  .route('/:id/status')
  .patch(protect, admin, updateCategoryStatus);

// Public route to view single category & Protected admin routes to update/delete
router
  .route('/:id')
  .get(getCategoryById)
  .put(protect, admin, updateCategory)
  .delete(protect, admin, deleteCategory);

export default router;
