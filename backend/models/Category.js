import mongoose from 'mongoose';

/**
 * Category Schema
 * Represents a product taxonomy category in the ecommerce store
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Method to format JSON output
categorySchema.methods.toJSON = function () {
  const categoryObject = this.toObject();
  categoryObject.id = categoryObject._id;
  delete categoryObject.__v;
  return categoryObject;
};

const Category = mongoose.model('Category', categorySchema);

export default Category;
