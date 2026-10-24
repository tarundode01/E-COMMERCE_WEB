import express from 'express';
import {
  getReviewById,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Direct Review endpoints: GET, PUT (edit), DELETE
router
  .route('/:id')
  .get(getReviewById)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

export default router;
