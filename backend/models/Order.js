import mongoose from 'mongoose';

/**
 * Order Item Sub-schema
 * Stores snapshot of purchased product, trusted unit price, quantity, and variant
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
 * Represents a customer acquisition in the luxury store
 */
const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
    },
    products: {
      type: [orderItemSchema],
      required: [true, 'Order products are required'],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one product',
      },
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
      default: 'unpaid',
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
      enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
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
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
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
  }
);

// Format JSON response to include virtual id and remove internal fields
orderSchema.methods.toJSON = function () {
  const orderObject = this.toObject();
  orderObject.id = orderObject._id;
  delete orderObject.__v;
  return orderObject;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
