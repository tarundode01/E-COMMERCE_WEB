import mongoose from 'mongoose';

/**
 * Category Request Schema
 * Allows verified vendors to propose new product taxonomy categories to platform administrators.
 */
const categoryRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Proposed category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Proposal reason cannot exceed 1000 characters'],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('CategoryRequest', categoryRequestSchema);
