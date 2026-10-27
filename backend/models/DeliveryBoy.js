import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const deliveryBoySchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required'],
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Delivery boy name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    vehicleType: {
      type: String,
      enum: ['Motorcycle', 'Scooter', 'Electric Bike', 'Delivery Van', 'Bicycle'],
      default: 'Motorcycle',
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['available', 'on_delivery', 'offline', 'inactive'],
      default: 'available',
      index: true,
    },
    currentLocation: {
      latitude: {
        type: Number,
        default: 22.7196,
      },
      longitude: {
        type: Number,
        default: 75.8577,
      },
      address: {
        type: String,
        default: 'Central Dispatch Hub',
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      speed: {
        type: Number,
        default: 0,
      },
      batteryLevel: {
        type: Number,
        default: 95,
      },
      heading: {
        type: Number,
        default: 45,
      },
    },
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    activeOrderNumber: {
      type: String,
      default: '',
    },
    deliveriesCompleted: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    emergencyContact: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of email per vendor (or globally)
deliveryBoySchema.index({ vendor: 1, email: 1 }, { unique: true });

// Password hashing pre-save hook
deliveryBoySchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
deliveryBoySchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Ensure password and internal fields are never returned in JSON serialization
deliveryBoySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);

export default DeliveryBoy;
