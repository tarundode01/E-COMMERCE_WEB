import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @desc    Fetch all reviews for a product (public)
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Product ID
    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const product = await Product.findById(id).select('name rating reviewsCount numReviews');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    // Optional query sorting: 'newest' (default), 'highest', 'lowest', 'oldest'
    const { sort = 'newest' } = req.query;
    let sortOption = { createdAt: -1 };
    if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
    else if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1 };

    // Fetch reviews populated with customer name (never exposes password or private data)
    const reviews = await Review.find({ product: id })
      .populate('customer', 'name')
      .sort(sortOption);

    // Calculate rating distribution breakdown
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating] += 1;
      }
    });

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount) * 10) / 10
        : 0;

    return res.status(200).json({
      success: true,
      productId: product._id,
      productName: product.name,
      averageRating,
      reviewCount,
      ratingDistribution: distribution,
      reviews,
    });
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve product reviews. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Submit a review for a product
 * @route   POST /api/products/:id/reviews
 * @access  Private / Eligible Authenticated Customers
 */
export const createProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // 1. Validate Product ID
    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    // 2. Validate Rating (required, integer between 1 and 5)
    if (rating === undefined || rating === null || rating === '') {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5 stars.',
        errors: { rating: 'Rating is required' },
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
        errors: { rating: 'Rating must be an integer from 1 to 5' },
      });
    }

    // 3. Validate Comment (optional, max 1000 characters)
    let sanitizedComment = '';
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Review comment must be a text string.',
          errors: { comment: 'Comment must be a text string' },
        });
      }
      if (comment.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Review comment cannot exceed 1000 characters.',
          errors: { comment: 'Comment exceeds 1000 characters' },
        });
      }
      sanitizedComment = comment.trim();
    }

    // 4. Authenticated customer identification (never trust body values)
    const customerId = req.user._id;

    // 5. Prevent duplicate reviews by the same customer for the same product
    const existingReview = await Review.findOne({
      product: id,
      customer: customerId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product. You can update your existing review instead.',
        reviewId: existingReview._id,
      });
    }

    // 6. Check eligibility: customer must have purchased and received the product if delivered-order data is available
    const customerOrder = await Order.findOne({
      customer: customerId,
      'products.product': id,
    });

    let isVerifiedPurchase = false;

    if (customerOrder) {
      if (customerOrder.orderStatus !== 'Delivered') {
        return res.status(403).json({
          success: false,
          message: `You can only review this product once it has been delivered (current order status: ${customerOrder.orderStatus}).`,
        });
      }
      isVerifiedPurchase = true;
    } else {
      // Customer has no order for this product
      // If delivered-order data is available in the store database, enforce verified purchase requirement
      const deliveredOrderDataAvailable = await Order.exists({ orderStatus: 'Delivered' });
      if (deliveredOrderDataAvailable) {
        return res.status(403).json({
          success: false,
          message: 'Verified purchase required. You can only review products you have purchased and received.',
        });
      }
    }

    // 7. Create the Review
    const review = await Review.create({
      product: id,
      customer: customerId,
      rating: numRating,
      comment: sanitizedComment,
      isVerifiedPurchase,
    });

    // 8. Authoritative calculation of average rating and review count
    const stats = await Review.calculateAverageRating(id);

    // Populate customer name
    await review.populate('customer', 'name');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    // Handle Mongoose duplicate key error if concurrent requests occur
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this product.',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error('Error submitting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update a review (customers can edit only their own reviews)
 * @route   PUT /api/products/:id/reviews/:reviewId OR PUT /api/reviews/:id
 * @access  Private / Customer Review Owner
 */
export const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;
    const { rating, comment } = req.body;

    if (!isValidObjectId(reviewId)) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${reviewId}`,
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${reviewId}`,
      });
    }

    // Ownership check: customers can only edit their own reviews
    if (review.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own reviews.',
      });
    }

    // If rating is updated, validate integer between 1 and 5
    if (rating !== undefined && rating !== null && rating !== '') {
      const numRating = Number(rating);
      if (isNaN(numRating) || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5.',
          errors: { rating: 'Rating must be an integer from 1 to 5' },
        });
      }
      review.rating = numRating;
    }

    // If comment is updated, validate text string and length
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Review comment must be a text string.',
          errors: { comment: 'Comment must be a text string' },
        });
      }
      if (comment.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Review comment cannot exceed 1000 characters.',
          errors: { comment: 'Comment exceeds 1000 characters' },
        });
      }
      review.comment = comment.trim();
    }

    await review.save();

    // Recalculate average rating & review count
    const stats = await Review.calculateAverageRating(review.product);

    await review.populate('customer', 'name');

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete a review (customers can delete only their own reviews; admins can moderate)
 * @route   DELETE /api/products/:id/reviews/:reviewId OR DELETE /api/reviews/:id
 * @access  Private / Customer Review Owner (or Admin)
 */
export const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId || req.params.id;

    if (!isValidObjectId(reviewId)) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${reviewId}`,
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${reviewId}`,
      });
    }

    // Ownership check: customer can only delete their own review
    const isOwner = review.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own reviews.',
      });
    }

    const productId = review.product;

    await review.deleteOne();

    // Recalculate average rating & review count for the product
    const stats = await Review.calculateAverageRating(productId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      deletedReviewId: reviewId,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update authenticated customer's review for a product by product ID
 * @route   PUT /api/products/:id/reviews
 * @access  Private
 */
export const updateMyProductReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const review = await Review.findOne({ product: id, customer: req.user._id });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'You have not submitted a review for this product yet.',
      });
    }

    req.params.reviewId = review._id.toString();
    return updateReview(req, res);
  } catch (error) {
    console.error('Error updating customer product review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete authenticated customer's review for a product by product ID
 * @route   DELETE /api/products/:id/reviews
 * @access  Private
 */
export const deleteMyProductReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const review = await Review.findOne({ product: id, customer: req.user._id });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'You have not submitted a review for this product yet.',
      });
    }

    req.params.reviewId = review._id.toString();
    return deleteReview(req, res);
  } catch (error) {
    console.error('Error deleting customer product review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get single review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${id}`,
      });
    }

    const review = await Review.findById(id).populate('customer', 'name');
    if (!review) {
      return res.status(404).json({
        success: false,
        message: `Review not found with ID: ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve review.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
