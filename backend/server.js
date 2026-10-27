import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import adminCustomerRoutes from './routes/adminCustomerRoutes.js';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js';
import adminSettingsRoutes from './routes/adminSettingsRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import adminVendorRoutes from './routes/adminVendorRoutes.js';
import { getPublicStoreBySlug } from './controllers/vendorController.js';
import StoreSettings from './models/StoreSettings.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve secure backend uploads (isolated from frontend source directory)
app.use('/api/uploads', express.static(path.resolve('uploads')));
app.use('/uploads', express.static(path.resolve('uploads')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend server is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Product CRUD Routes
app.use('/api/products', productRoutes);

// Image Upload Routes (Admin only)
app.use('/api/upload', uploadRoutes);

// Reviews Direct Routes
app.use('/api/reviews', reviewRoutes);

// Category CRUD Routes
app.use('/api/categories', categoryRoutes);

// Order Customer & Shared Routes
app.use('/api/orders', orderRoutes);

// Admin Dedicated Order Management Routes
app.use('/api/admin/orders', adminOrderRoutes);

// Admin Dedicated Customer Management Routes
app.use('/api/admin/customers', adminCustomerRoutes);

// Admin Dedicated Analytics & Telemetry Routes
app.use('/api/admin/analytics', adminAnalyticsRoutes);

// Vendor Store & Registration Routes (Phase 2 & 4 SaaS functionality)
app.use('/api/vendor', vendorRoutes);

// Public Storefront Atelier Profile Route
app.get('/api/stores/:slug', getPublicStoreBySlug);

// Admin Dedicated Vendor Application Review Routes (Phase 3 SaaS functionality)
app.use('/api/admin/vendors', adminVendorRoutes);

// Public Store Settings (Read-only for storefront, footers, and concierge channels)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await StoreSettings.getSettings();
    return res.status(200).json({
      success: true,
      settings: {
        storeName: settings.storeName,
        logoUrl: settings.logoUrl,
        description: settings.description || settings.storeDescription,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone || settings.phoneNumber,
        shippingFee: settings.shippingFee,
        freeShippingThreshold: settings.freeShippingThreshold,
        cancellationPolicy: settings.cancellationPolicy,
      },
    });
  } catch (error) {
    console.error('Error fetching public store settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve store settings',
    });
  }
});

// Admin Dedicated Store Settings Routes
app.use('/api/admin/settings', adminSettingsRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
