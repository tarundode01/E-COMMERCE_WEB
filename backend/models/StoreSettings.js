import mongoose from 'mongoose';

/**
 * StoreSettings Schema
 * Represents global boutique configuration, concierge contacts, logistics rates, and order policies.
 * Designed using a strict singleton pattern to maintain a single source of truth for the entire platform.
 */
const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      minlength: [2, 'Store name must be at least 2 characters long'],
      default: 'Luxe Horizon Maison',
    },
    logoUrl: {
      type: String,
      trim: true,
      default:
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=240&auto=format&fit=crop&q=80',
    },
    description: {
      type: String,
      trim: true,
      default:
        'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',
    },
    storeDescription: {
      type: String,
      trim: true,
      default:
        'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',
    },
    supportEmail: {
      type: String,
      required: [true, 'Support email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid support email address',
      ],
      default: 'concierge@luxury.com',
    },
    supportPhone: {
      type: String,
      trim: true,
      default: '+1 (800) 845-9876',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '+1 (800) 845-9876',
    },
    shippingFee: {
      type: Number,
      required: [true, 'Shipping fee is required'],
      min: [0, 'Shipping fee cannot be negative'],
      default: 25,
    },
    freeShippingThreshold: {
      type: Number,
      required: [true, 'Free shipping threshold is required'],
      min: [0, 'Free shipping threshold cannot be negative'],
      default: 500,
    },
    cancellationPolicy: {
      type: String,
      trim: true,
      default:
        "Clients may cancel acquisitions self-service only while in 'Pending' status prior to warehouse allocation and courier dispatch. Once an order is updated to 'Confirmed' or 'Shipped', cancellation is locked to safeguard logistics and stock reservations. For special handling, contact concierge.",
    },
    isSingleton: {
      type: Boolean,
      default: true,
      unique: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: ensure aliases stay in sync
storeSettingsSchema.pre('save', function () {
  if (this.isModified('description') && !this.isModified('storeDescription')) {
    this.storeDescription = this.description;
  } else if (
    this.isModified('storeDescription') &&
    !this.isModified('description')
  ) {
    this.description = this.storeDescription;
  }

  if (this.isModified('supportPhone') && !this.isModified('phoneNumber')) {
    this.phoneNumber = this.supportPhone;
  } else if (
    this.isModified('phoneNumber') &&
    !this.isModified('supportPhone')
  ) {
    this.supportPhone = this.phoneNumber;
  }

  this.isSingleton = true;
});

// JSON serialization formatting
storeSettingsSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  obj.description = obj.description || obj.storeDescription;
  obj.storeDescription = obj.storeDescription || obj.description;
  obj.supportPhone = obj.supportPhone || obj.phoneNumber;
  obj.phoneNumber = obj.phoneNumber || obj.supportPhone;
  delete obj.__v;
  delete obj.isSingleton;
  return obj;
};

// Static helper: retrieve single settings record or create initial default
storeSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ isSingleton: true });
  if (!settings) {
    settings = await this.create({
      storeName: 'Luxe Horizon Maison',
      logoUrl:
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=240&auto=format&fit=crop&q=80',
      description:
        'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',
      storeDescription:
        'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',
      supportEmail: 'concierge@luxury.com',
      supportPhone: '+1 (800) 845-9876',
      phoneNumber: '+1 (800) 845-9876',
      shippingFee: 25,
      freeShippingThreshold: 500,
      cancellationPolicy:
        "Clients may cancel acquisitions self-service only while in 'Pending' status prior to warehouse allocation and courier dispatch. Once an order is updated to 'Confirmed' or 'Shipped', cancellation is locked to safeguard logistics and stock reservations. For special handling, contact concierge.",
      isSingleton: true,
    });
  }
  return settings;
};

// Static helper: update single settings record
storeSettingsSchema.statics.updateSettings = async function (updateData) {
  let settings = await this.findOne({ isSingleton: true });
  if (!settings) {
    settings = new this({ ...updateData, isSingleton: true });
  } else {
    // Apply updates safely
    const allowedFields = [
      'storeName',
      'logoUrl',
      'description',
      'storeDescription',
      'supportEmail',
      'supportPhone',
      'phoneNumber',
      'shippingFee',
      'freeShippingThreshold',
      'cancellationPolicy',
    ];

    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        settings[key] = updateData[key];
      }
    }
  }

  await settings.save();
  return settings;
};

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);

export default StoreSettings;
