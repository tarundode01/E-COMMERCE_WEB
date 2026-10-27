import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor user ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Store / Business name is required'],
      trim: true,
      minlength: [2, 'Store name must be at least 2 characters'],
      maxlength: [100, 'Store name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Store slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Store description is required'],
      trim: true,
      minlength: [10, 'Store description must be at least 10 characters'],
      maxlength: [2000, 'Store description cannot exceed 2000 characters'],
    },
    businessAddress: {
      type: String,
      required: [true, 'Business address is required'],
      trim: true,
      maxlength: [500, 'Business address cannot exceed 500 characters'],
    },
    taxId: {
      type: String,
      trim: true,
      default: '',
    },
    supportEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    supportPhone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended', 'inactive'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    isOpen: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPubliclyVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    pickupAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Pickup address cannot exceed 500 characters'],
    },
    deliveryAvailable: {
      type: Boolean,
      default: true,
    },
    deliveryNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Delivery notes cannot exceed 1000 characters'],
    },
    openingHours: {
      monday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      tuesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      wednesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      thursday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      friday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      saturday: {
        open: { type: String, default: '10:00' },
        close: { type: String, default: '17:00' },
        isClosed: { type: Boolean, default: false },
      },
      sunday: {
        open: { type: String, default: '10:00' },
        close: { type: String, default: '15:00' },
        isClosed: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Generate a URL-friendly unique slug from store name
 * Handles duplicates safely by appending numeric suffix
 */
storeSchema.statics.generateUniqueSlug = async function (storeName, existingId = null) {
  let baseSlug = storeName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .replace(/[\s_-]+/g, '-') // collapse spaces and dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes

  if (!baseSlug) {
    baseSlug = 'store';
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

const Store = mongoose.model('Store', storeSchema);

export default Store;
