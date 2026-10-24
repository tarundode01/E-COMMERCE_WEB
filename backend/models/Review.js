import mongoose from 'mongoose';

/**
 * Review Schema
 * Represents customer ratings and feedback for luxury catalog products
 */
const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: function (val) {
          return Number.isInteger(val) && val >= 1 && val <= 5;
        },
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
      default: '',
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Prevent duplicate reviews by the same customer for the same product
reviewSchema.index({ product: 1, customer: 1 }, { unique: true });

// Format JSON response to include virtual id and clean up internal fields
reviewSchema.methods.toJSON = function () {
  const reviewObject = this.toObject();
  reviewObject.id = reviewObject._id;
  delete reviewObject.__v;
  return reviewObject;
};

/**
 * Static method to calculate and persist authoritative average rating
 * and review count on the Product model
 * @param {mongoose.Types.ObjectId|string} productId
 * @returns {Promise<{averageRating: number, reviewCount: number}>}
 */
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const objectId =
    typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  const stats = await this.aggregate([
    {
      $match: { product: objectId },
    },
    {
      $group: {
        _id: '$product',
        reviewCount: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  let reviewCount = 0;
  let averageRating = 0;

  if (stats.length > 0) {
    reviewCount = stats[0].reviewCount;
    // Round to 1 decimal place (e.g. 4.8)
    averageRating = Math.round(stats[0].averageRating * 10) / 10;
  }

  // Update associated Product record in DB
  await mongoose.model('Product').findByIdAndUpdate(objectId, {
    rating: averageRating,
    reviewsCount: reviewCount,
    numReviews: reviewCount,
  });

  return { averageRating, reviewCount };
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;
