import mongoose from 'mongoose';

/**
 * Order Item Sub-schema
 * Stores snapshot of purchased product, trusted unit price, quantity, store, and variant
 */
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer',
    },
  },
  image: {
    type: String,
    trim: true,
  },
  selectedSize: {
    type: String,
    default: 'Standard',
    trim: true,
  },
  // Multi-vendor association & historical snapshots
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
    default: null,
  },
  storeName: {
    type: String,
    trim: true,
    default: '',
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  sku: {
    type: String,
    uppercase: true,
    trim: true,
    default: '',
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
  },
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative'],
    default: 0,
  },
  isRestocked: {
    type: Boolean,
    default: false,
  },
  restockedAt: {
    type: Date,
    default: null,
  },
});

/**
 * Delivery Address Sub-schema
 */
const deliveryAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  pinCode: {
    type: String,
    required: [true, 'PIN code is required'],
    trim: true,
  },
});

/**
 * Order Schema
 * Represents a customer acquisition in the luxury store with multi-vendor support
 */
const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    products: {
      type: [orderItemSchema],
      required: [true, 'Order products are required'],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one product',
      },
    },
    // Distinct store IDs involved in this order for fast multi-vendor queries
    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        index: true,
      },
    ],
    // Idempotency key to safely prevent duplicate order creation on network retries
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: [true, 'Delivery address is required'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'pending', 'refunded'],
      default: 'pending',
      index: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Items price cannot be negative'],
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Shipping price cannot be negative'],
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Tax price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    isStockRestocked: {
      type: Boolean,
      default: false,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    // Vendor Delivery Boy Assignment & Telemetry Tracking
    deliveryBoy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryBoy',
      index: true,
      default: null,
    },
    deliveryBoySnapshot: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      vehicleType: { type: String, trim: true, default: '' },
      vehicleNumber: { type: String, trim: true, default: '' },
    },
    deliveryStatus: {
      type: String,
      enum: ['unassigned', 'assigned', 'picked_up', 'out_for_delivery', 'delivered'],
      default: 'unassigned',
      index: true,
    },
    deliveryAssignedAt: {
      type: Date,
      default: null,
    },
    deliveryNotes: {
      type: String,
      trim: true,
      default: '',
    },
    deliveryOtp: {
      type: String,
      trim: true,
      default: '',
    },
    cashCollected: {
      type: Number,
      default: 0,
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
        },
        previousStatus: {
          type: String,
          trim: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias: orderItems maps to products
orderSchema.virtual('orderItems').get(function () {
  return this.products;
});

// Database indexes for fast querying and isolation
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ stores: 1, createdAt: -1 });
orderSchema.index({ 'products.store': 1, createdAt: -1 });
orderSchema.index({ 'products.vendor': 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

// Format JSON response to include virtual id and remove internal fields
orderSchema.methods.toJSON = function () {
  const orderObject = this.toObject();
  orderObject.id = orderObject._id;
  delete orderObject.__v;
  return orderObject;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
