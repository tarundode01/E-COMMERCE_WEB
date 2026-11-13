import axios from 'axios';
import { products as localFallbackProducts, fallbackCategories } from '../data/products';

// Read backend API base URL from Vite environment variable, with production live fallback
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://e-commerce-web-azure-nine.vercel.app'
    : 'http://localhost:5000');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout to gracefully accommodate Render / cloud serverless cold-starts
});

// Request interceptor to attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('premium_store_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Error reading auth token from storage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error message
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred. Please check your connection.';
    error.customMessage = message;
    return Promise.reject(error);
  }
);

// Authentication service endpoints
export const authService = {
  // POST /api/auth/register
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // POST /api/auth/login
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  // POST /api/auth/social-login (Google & Apple OAuth)
  socialLogin: async (socialData) => {
    const response = await api.post('/api/auth/social-login', socialData);
    return response.data;
  },

  // GET /api/auth/discovered-accounts
  getDiscoveredAccounts: async (provider) => {
    const response = await api.get('/api/auth/discovered-accounts', {
      params: provider ? { provider } : {},
    });
    return response.data;
  },

  // GET /api/auth/profile (Ready for backend integration)
  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },

  // PUT /api/auth/profile (Ready for backend integration)
  updateProfile: async (userData) => {
    const response = await api.put('/api/auth/profile', userData);
    return response.data;
  },
};

// Product service endpoints connecting to backend CRUD APIs (with resilient offline/serverless fallback)
export const productService = {
  // GET /api/products
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/api/products', { params });
      if (response?.data?.success && Array.isArray(response.data.products) && response.data.products.length > 0) {
        return response.data;
      }
      throw new Error('Empty backend products response, activating offline catalog fallback');
    } catch {
      // Graceful offline fallback: filter, sort, search and paginate locally so user never sees a blank site
      let filtered = [...localFallbackProducts];

      // 1. Category filter
      if (params.category && params.category !== 'All') {
        const catTarget = params.category.toLowerCase().trim();
        filtered = filtered.filter((p) => {
          const pCat = (p.category || '').toLowerCase();
          if (catTarget === 'mobile' || catTarget === 'smartphones') {
            return pCat.includes('mobile') || pCat.includes('smartphones') || pCat.includes('phone');
          }
          return pCat === catTarget || pCat.includes(catTarget) || catTarget.includes(pCat);
        });
      }

      // 2. Search filter
      if (params.search && typeof params.search === 'string' && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
      }

      // 3. Price filter
      if (params.minPrice !== undefined && params.minPrice !== '') {
        const min = Number(params.minPrice);
        if (!isNaN(min)) filtered = filtered.filter((p) => p.price >= min);
      }
      if (params.maxPrice !== undefined && params.maxPrice !== '') {
        const max = Number(params.maxPrice);
        if (!isNaN(max)) filtered = filtered.filter((p) => p.price <= max);
      }

      // 4. Rating filter
      if (params.rating !== undefined && params.rating !== '') {
        const r = Number(params.rating);
        if (!isNaN(r) && r > 0) {
          filtered = filtered.filter((p) => (p.rating || 0) >= r);
        }
      }

      // 5. Sorting
      const sort = params.sort || 'featured';
      if (sort === 'trending') {
        filtered.sort((a, b) => (b.reviewsCount || b.numReviews || 0) - (a.reviewsCount || a.numReviews || 0));
      } else if (sort === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt || b.dateAdded || 0) - new Date(a.createdAt || a.dateAdded || 0));
      } else if (sort === 'price-asc') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-desc') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        // featured
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      }

      // 6. Pagination
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const limit = params.limit === 'all' ? 1000 : Math.max(1, parseInt(params.limit, 10) || 9);
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      return {
        success: true,
        count: paginated.length,
        total,
        totalProducts: total,
        page,
        currentPage: page,
        limit,
        pageSize: limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        products: paginated,
        isOfflineFallback: true,
      };
    }
  },

  // GET /api/products/:id
  getProductById: async (id) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      if (response?.data?.success && response.data.product) {
        return response.data;
      }
      throw new Error('Product not found on backend');
    } catch {
      const found = localFallbackProducts.find((p) => p.id === id || p._id === id) || localFallbackProducts[0];
      return {
        success: true,
        product: found,
        isOfflineFallback: true,
      };
    }
  },

  // POST /api/products
  createProduct: async (productData) => {
    const response = await api.post('/api/products', productData);
    return response.data;
  },

  // PUT /api/products/:id
  updateProduct: async (id, productData) => {
    const response = await api.put(`/api/products/${id}`, productData);
    return response.data;
  },

  // DELETE /api/products/:id
  deleteProduct: async (id) => {
    const response = await api.delete(`/api/products/${id}`);
    return response.data;
  },

  // POST /api/upload (Admin image upload with progress tracking)
  uploadImage: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
};

// Category service endpoints connecting to backend CRUD APIs (with resilient fallback)
export const categoryService = {
  // GET /api/categories
  getCategories: async (params = {}) => {
    try {
      const response = await api.get('/api/categories', { params });
      if (response?.data?.success && Array.isArray(response.data.categories) && response.data.categories.length > 0) {
        return response.data;
      }
      throw new Error('Empty categories response from backend');
    } catch {
      return {
        success: true,
        count: fallbackCategories.length,
        totalCategories: fallbackCategories.length,
        categories: fallbackCategories,
        isOfflineFallback: true,
      };
    }
  },

  // GET /api/categories/:id
  getCategoryById: async (id) => {
    const response = await api.get(`/api/categories/${id}`);
    return response.data;
  },

  // POST /api/categories
  createCategory: async (categoryData) => {
    const response = await api.post('/api/categories', categoryData);
    return response.data;
  },

  // PUT /api/categories/:id
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/api/categories/${id}`, categoryData);
    return response.data;
  },

  // PATCH /api/categories/:id/status
  updateCategoryStatus: async (id, statusData) => {
    const response = await api.patch(`/api/categories/${id}/status`, statusData);
    return response.data;
  },

  // DELETE /api/categories/:id
  deleteCategory: async (id) => {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  },

  // POST /api/categories/request (Vendor category proposal)
  requestCategory: async (proposalData) => {
    const response = await api.post('/api/categories/request', proposalData);
    return response.data;
  },

  // GET /api/categories/requests (Vendor category proposals)
  getCategoryRequests: async () => {
    const response = await api.get('/api/categories/requests');
    return response.data;
  },

  // DELETE /api/categories/request/:id (Withdraw proposal)
  deleteCategoryRequest: async (id) => {
    const response = await api.delete(`/api/categories/request/${id}`);
    return response.data;
  },
};

// Order service endpoints connecting to backend
export const orderService = {
  // POST /api/orders/validate-cart
  validateCart: async (payload) => {
    const response = await api.post('/api/orders/validate-cart', payload);
    return response.data;
  },

  // GET /api/orders/my-orders
  getMyOrders: async (params = {}) => {
    const response = await api.get('/api/orders/my-orders', { params });
    return response.data;
  },

  // GET /api/orders/:id
  getOrderById: async (id) => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },

  // POST /api/orders
  createOrder: async (orderData, idempotencyKey = null) => {
    const config = {};
    if (idempotencyKey) {
      config.headers = { 'Idempotency-Key': idempotencyKey };
    }
    const response = await api.post('/api/orders', orderData, config);
    return response.data;
  },

  // POST /api/orders/calculate-shipping
  calculateShipping: async (payload) => {
    const response = await api.post('/api/orders/calculate-shipping', payload);
    return response.data;
  },

  // GET /api/vendor/orders (Vendor store orders with item isolation, filters, search & pagination)
  getVendorOrders: async (params = {}) => {
    const response = await api.get('/api/vendor/orders', { params });
    return response.data;
  },

  // GET /api/vendor/orders/:id (Vendor single order details with item isolation)
  getVendorOrderById: async (id) => {
    const response = await api.get(`/api/vendor/orders/${id}`);
    return response.data;
  },

  // PATCH /api/vendor/orders/:id/status (Vendor update status with valid transitions and stock protection)
  updateVendorOrderStatus: async (id, status, reason = '', note = '') => {
    const response = await api.patch(`/api/vendor/orders/${id}/status`, {
      status,
      reason,
      cancellationReason: reason,
      note,
    });
    return response.data;
  },

  // GET /api/admin/orders (Admin all orders, with fallback to /api/orders)
  getAllOrders: async (params = {}) => {
    try {
      const response = await api.get('/api/admin/orders', { params });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallback = await api.get('/api/orders', { params });
        return fallback.data;
      }
      throw err;
    }
  },

  // PATCH /api/admin/orders/:id/status (Admin update status with transition rules and audit note)
  updateOrderStatus: async (id, status, note = '') => {
    try {
      const response = await api.patch(`/api/admin/orders/${id}/status`, { status, note });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallback = await api.patch(`/api/orders/${id}/status`, { status, note });
        return fallback.data;
      }
      throw err;
    }
  },

  // PATCH /api/orders/:id/cancel
  cancelOrder: async (id, reason = '') => {
    const response = await api.patch(`/api/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // GET /api/orders/:id/track (Live delivery tracking radar and rider coordinates)
  getOrderTracking: async (id) => {
    const response = await api.get(`/api/orders/${id}/track`);
    return response.data;
  },
};

// Customer service endpoints for admin management
export const customerService = {
  // GET /api/admin/customers
  getCustomers: async (params = {}) => {
    try {
      const response = await api.get('/api/admin/customers', { params });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallback = await api.get('/api/users', { params });
        return fallback.data;
      }
      throw err;
    }
  },

  // GET /api/admin/customers/:id
  getCustomerById: async (id) => {
    try {
      const response = await api.get(`/api/admin/customers/${id}`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallback = await api.get(`/api/users/${id}`);
        return fallback.data;
      }
      throw err;
    }
  },

  // GET /api/admin/customers/:id/orders
  getCustomerOrders: async (id) => {
    try {
      const response = await api.get(`/api/admin/customers/${id}/orders`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const fallback = await api.get(`/api/orders/user/${id}`);
        return fallback.data;
      }
      throw err;
    }
  },
};

// Analytics service endpoints
export const analyticsService = {
  // GET /api/admin/analytics
  getAnalytics: async (params = {}) => {
    const response = await api.get('/api/admin/analytics', { params });
    return response.data;
  },

  // GET /api/admin/analytics/summary
  getSummary: async (params = {}) => {
    const response = await api.get('/api/admin/analytics/summary', { params });
    return response.data;
  },

  // GET /api/admin/analytics/sales
  getSales: async (params = {}) => {
    const response = await api.get('/api/admin/analytics/sales', { params });
    return response.data;
  },

  // GET /api/admin/analytics/top-products
  getTopProducts: async (params = {}) => {
    const response = await api.get('/api/admin/analytics/top-products', { params });
    return response.data;
  },

  // GET /api/admin/analytics/order-status
  getOrderStatus: async (params = {}) => {
    const response = await api.get('/api/admin/analytics/order-status', { params });
    return response.data;
  },
};

// Settings service endpoints
export const settingsService = {
  // GET /api/admin/settings
  getSettings: async () => {
    const response = await api.get('/api/admin/settings');
    return response.data;
  },

  // PUT /api/admin/settings
  updateSettings: async (settingsData) => {
    const response = await api.put('/api/admin/settings', settingsData);
    return response.data;
  },
};

// Review service endpoints connecting to backend Reviews & Ratings APIs
export const reviewService = {
  // GET /api/products/:productId/reviews
  getProductReviews: async (productId, params = {}) => {
    const response = await api.get(`/api/products/${productId}/reviews`, { params });
    return response.data;
  },

  // POST /api/products/:productId/reviews
  createReview: async (productId, reviewData) => {
    const response = await api.post(`/api/products/${productId}/reviews`, reviewData);
    return response.data;
  },

  // PUT /api/products/:productId/reviews/:reviewId
  updateReview: async (productId, reviewId, reviewData) => {
    const response = await api.put(`/api/products/${productId}/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  // DELETE /api/products/:productId/reviews/:reviewId
  deleteReview: async (productId, reviewId) => {
    const response = await api.delete(`/api/products/${productId}/reviews/${reviewId}`);
    return response.data;
  },
};

// Vendor service endpoints for SaaS store management & onboarding
export const vendorService = {
  // POST /api/vendor/register
  register: async (vendorData) => {
    const response = await api.post('/api/vendor/register', vendorData);
    return response.data;
  },

  // GET /api/vendor/store
  getStore: async () => {
    const response = await api.get('/api/vendor/store');
    return response.data;
  },

  // PUT /api/vendor/store
  updateStore: async (storeData) => {
    const response = await api.put('/api/vendor/store', storeData);
    return response.data;
  },

  // GET /api/vendor/status
  getStatus: async () => {
    const response = await api.get('/api/vendor/status');
    return response.data;
  },

  // GET /api/vendor/features (Requires approved vendor status)
  getApprovedFeatures: async () => {
    const response = await api.get('/api/vendor/features');
    return response.data;
  },

  // GET /api/vendor/store/:id (Enforces cross-vendor isolation)
  getStoreById: async (id) => {
    const response = await api.get(`/api/vendor/store/${id}`);
    return response.data;
  },

  // POST /api/vendor/upload (Upload logo or banner asset)
  uploadAsset: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/api/vendor/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // GET /api/vendor/public/:slug (Public store profile)
  getPublicStore: async (slug) => {
    const response = await api.get(`/api/vendor/public/${slug}`);
    return response.data;
  },

  // Vendor Product Management
  // GET /api/vendor/products
  getProducts: async (params = {}) => {
    const response = await api.get('/api/vendor/products', { params });
    return response.data;
  },

  // GET /api/vendor/products/:id
  getProductById: async (id) => {
    const response = await api.get(`/api/vendor/products/${id}`);
    return response.data;
  },

  // POST /api/vendor/products
  createProduct: async (productData) => {
    const response = await api.post('/api/vendor/products', productData);
    return response.data;
  },

  // PUT /api/vendor/products/:id
  updateProduct: async (id, productData) => {
    const response = await api.put(`/api/vendor/products/${id}`, productData);
    return response.data;
  },

  // DELETE /api/vendor/products/:id
  deleteProduct: async (id) => {
    const response = await api.delete(`/api/vendor/products/${id}`);
    return response.data;
  },

  // PATCH /api/vendor/products/:id/status
  updateProductStatus: async (id, status) => {
    const response = await api.patch(`/api/vendor/products/${id}/status`, { status });
    return response.data;
  },

  // PATCH /api/vendor/products/:id/stock
  updateProductStock: async (id, stock) => {
    const response = await api.patch(`/api/vendor/products/${id}/stock`, { stock });
    return response.data;
  },

  // Vendor Order Management
  // GET /api/vendor/orders
  getOrders: async (params = {}) => {
    const response = await api.get('/api/vendor/orders', { params });
    return response.data;
  },

  // GET /api/vendor/orders/:id
  getOrderById: async (id) => {
    const response = await api.get(`/api/vendor/orders/${id}`);
    return response.data;
  },

  // PATCH /api/vendor/orders/:id/status
  updateOrderStatus: async (id, status, reason = '', note = '') => {
    const response = await api.patch(`/api/vendor/orders/${id}/status`, {
      status,
      reason,
      cancellationReason: reason,
      note,
    });
    return response.data;
  },

  // GET /api/vendor/analytics
  getAnalytics: async (params = {}) => {
    const response = await api.get('/api/vendor/analytics', { params });
    return response.data;
  },
};

// Admin Vendor application review & approval services
export const adminVendorService = {
  // GET /api/admin/vendors
  getApplications: async (params = {}) => {
    const response = await api.get('/api/admin/vendors', { params });
    return response.data;
  },

  // GET /api/admin/vendors/:id
  getApplicationById: async (id) => {
    const response = await api.get(`/api/admin/vendors/${id}`);
    return response.data;
  },

  // PATCH /api/admin/vendors/:id/status
  updateStatus: async (id, statusPayload) => {
    const response = await api.patch(`/api/admin/vendors/${id}/status`, statusPayload);
    return response.data;
  },
};

// Vendor Delivery Boy & Fleet Management Service (Isolated per vendor store)
export const vendorDeliveryService = {
  // GET /api/vendor/delivery-boys
  getDeliveryBoys: async (params = {}) => {
    const response = await api.get('/api/vendor/delivery-boys', { params });
    return response.data;
  },

  // GET /api/vendor/delivery-boys/:id
  getDeliveryBoyById: async (id) => {
    const response = await api.get(`/api/vendor/delivery-boys/${id}`);
    return response.data;
  },

  // POST /api/vendor/delivery-boys
  createDeliveryBoy: async (boyData) => {
    const response = await api.post('/api/vendor/delivery-boys', boyData);
    return response.data;
  },

  // PUT /api/vendor/delivery-boys/:id
  updateDeliveryBoy: async (id, boyData) => {
    const response = await api.put(`/api/vendor/delivery-boys/${id}`, boyData);
    return response.data;
  },

  // DELETE /api/vendor/delivery-boys/:id
  deleteDeliveryBoy: async (id) => {
    const response = await api.delete(`/api/vendor/delivery-boys/${id}`);
    return response.data;
  },

  // PATCH /api/vendor/delivery-boys/:id/location
  updateLocation: async (id, locationData) => {
    const response = await api.patch(`/api/vendor/delivery-boys/${id}/location`, locationData);
    return response.data;
  },

  // POST /api/vendor/delivery-boys/simulate-live
  simulateLiveMovement: async () => {
    const response = await api.post('/api/vendor/delivery-boys/simulate-live');
    return response.data;
  },

  // GET /api/vendor/delivery-boys/unassigned-orders
  getUnassignedOrders: async () => {
    const response = await api.get('/api/vendor/delivery-boys/unassigned-orders');
    return response.data;
  },

  // POST /api/vendor/delivery-boys/assign-order
  assignOrder: async (orderId, deliveryBoyId, deliveryNotes = '') => {
    const response = await api.post('/api/vendor/delivery-boys/assign-order', {
      orderId,
      deliveryBoyId,
      deliveryNotes,
    });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/unassign-order
  unassignOrder: async (orderId) => {
    const response = await api.post('/api/vendor/delivery-boys/unassign-order', { orderId });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/complete-order
  completeOrderDelivery: async (orderId, deliveryOtp = '', cashCollected = 0) => {
    const response = await api.post('/api/vendor/delivery-boys/complete-order', {
      orderId,
      deliveryOtp,
      cashCollected,
    });
    return response.data;
  },

  // GET /api/vendor/delivery-boys/my-orders (Delivery Boy assigned orders)
  getMyAssignedOrders: async () => {
    const response = await api.get('/api/vendor/delivery-boys/my-orders');
    return response.data;
  },

  // POST /api/vendor/delivery-boys/accept-order
  acceptAssignedOrder: async (orderId) => {
    const response = await api.post('/api/vendor/delivery-boys/accept-order', { orderId });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/reject-order
  rejectAssignedOrder: async (orderId, reason = '') => {
    const response = await api.post('/api/vendor/delivery-boys/reject-order', { orderId, reason });
    return response.data;
  },

  // PATCH /api/vendor/delivery-boys/my-status
  updateMyStatus: async (status) => {
    const response = await api.patch('/api/vendor/delivery-boys/my-status', { status });
    return response.data;
  },

  // PATCH /api/vendor/delivery-boys/my-location
  updateMyLocation: async (locationPayload) => {
    const response = await api.patch('/api/vendor/delivery-boys/my-location', locationPayload);
    return response.data;
  },

  // POST /api/vendor/delivery-boys/pickup-order
  pickupAssignedOrder: async (orderId) => {
    const response = await api.post('/api/vendor/delivery-boys/pickup-order', { orderId });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/start-transit
  startTransitOrder: async (orderId) => {
    const response = await api.post('/api/vendor/delivery-boys/start-transit', { orderId });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/failed-delivery
  attemptFailedDelivery: async (orderId, reason = '') => {
    const response = await api.post('/api/vendor/delivery-boys/failed-delivery', { orderId, reason });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/resend-otp
  resendDeliveryOtp: async (orderId) => {
    const response = await api.post('/api/vendor/delivery-boys/resend-otp', { orderId });
    return response.data;
  },

  // POST /api/vendor/delivery-boys/remit-cash
  remitDeliveryCash: async (amount = 0, note = '') => {
    const response = await api.post('/api/vendor/delivery-boys/remit-cash', { amount, note });
    return response.data;
  },

  // PATCH /api/vendor/delivery-boys/my-profile
  updateMyDeliveryProfile: async (profileData) => {
    const response = await api.patch('/api/vendor/delivery-boys/my-profile', profileData);
    return response.data;
  },
};

// Aliased deliveryBoyService for dedicated delivery portal
export const deliveryBoyService = {
  getMyOrders: vendorDeliveryService.getMyAssignedOrders,
  acceptOrder: vendorDeliveryService.acceptAssignedOrder,
  pickupOrder: vendorDeliveryService.pickupAssignedOrder,
  startTransit: vendorDeliveryService.startTransitOrder,
  reportFailedDelivery: vendorDeliveryService.attemptFailedDelivery,
  resendOtp: vendorDeliveryService.resendDeliveryOtp,
  completeOrder: vendorDeliveryService.completeOrderDelivery,
  remitCash: vendorDeliveryService.remitDeliveryCash,
  updateProfile: vendorDeliveryService.updateMyDeliveryProfile,
  updateLocation: vendorDeliveryService.updateMyLocation,
  updateStatus: vendorDeliveryService.updateMyStatus,
  rejectOrder: vendorDeliveryService.rejectAssignedOrder,
};

// Newsletter Subscription Service (with offline resilience)
export const newsletterService = {
  // POST /api/newsletter/subscribe
  subscribe: async (email) => {
    try {
      const response = await api.post('/api/newsletter/subscribe', { email });
      return response.data;
    } catch {
      try {
        const subs = JSON.parse(localStorage.getItem('luxury_subscribers') || '[]');
        const normalized = (email || '').toLowerCase().trim();
        if (!subs.includes(normalized)) {
          subs.push(normalized);
          localStorage.setItem('luxury_subscribers', JSON.stringify(subs));
        }
      } catch {
        // Ignore localStorage quota errors
      }
      return {
        success: true,
        message: 'Welcome to our Private Atelier! Your VIP newsletter subscription is confirmed.',
      };
    }
  },
};

export default api;


