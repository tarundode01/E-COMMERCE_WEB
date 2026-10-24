import mongoose from 'mongoose';

/**
 * Product Schema
 * Represents an ecommerce product item in the luxury catalog
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0.01, 'Price must be a positive number greater than 0'],
    },
    originalPrice: {
      type: Number,
      default: null,
      min: [0, 'Original price cannot be negative'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      default: 0,
      min: [0, 'Stock quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be an integer',
      },
    },
    image: {
      type: String,
      required: [true, 'Product image URL or path is required'],
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, 'Number of reviews cannot be negative'],
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Database indexes for fast querying, filtering, and sorting
productSchema.index({ category: 1, price: 1, rating: -1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' });

// Format JSON response to include virtual id and remove internal fields
productSchema.methods.toJSON = function () {
  const productObject = this.toObject();
  productObject.id = productObject._id;
  delete productObject.__v;
  return productObject;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
