import mongoose from 'mongoose';

/**
 * Category Schema
 * Represents a product taxonomy category in the luxury SaaS ecommerce store.
 * Categories are centrally managed by platform administrators.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Database compound indexes for optimized searching and status filtering
categorySchema.index({ status: 1, name: 1 });
categorySchema.index({ name: 'text', description: 'text' });

/**
 * Static method to generate URL-friendly unique slug from category name
 */
categorySchema.statics.generateUniqueSlug = async function (categoryName, existingId = null) {
  let baseSlug = categoryName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = 'category';
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (existingId) {
      query._id = { $ne: existingId };
    }
    const existing = await this.findOne(query);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Pre-validation hook:
 * Automatically generate slug if not provided, and synchronize status with isActive
 */
categorySchema.pre('validate', async function () {
  if (this.name && (!this.slug || this.isModified('name'))) {
    if (!this.slug) {
      this.slug = await this.constructor.generateUniqueSlug(this.name, this._id);
    } else {
      this.slug = this.slug
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  }

  // Synchronize status and isActive boolean
  if (this.status) {
    this.isActive = this.status === 'active';
  } else if (this.isActive !== undefined) {
    this.status = this.isActive ? 'active' : 'inactive';
  }
});

// Method to format JSON output
categorySchema.methods.toJSON = function () {
  const categoryObject = this.toObject();
  categoryObject.id = categoryObject._id;
  delete categoryObject.__v;
  return categoryObject;
};

const Category = mongoose.model('Category', categorySchema);

export default Category;
