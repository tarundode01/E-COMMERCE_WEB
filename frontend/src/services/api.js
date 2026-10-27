import axios from 'axios';

// Read backend API base URL from Vite environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
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

// Product service endpoints connecting to backend CRUD APIs
export const productService = {
  // GET /api/products
  getProducts: async (params = {}) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  // GET /api/products/:id
  getProductById: async (id) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
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

// Category service endpoints connecting to backend CRUD APIs
export const categoryService = {
  // GET /api/categories
  getCategories: async (params = {}) => {
    const response = await api.get('/api/categories', { params });
    return response.data;
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
};

// Aliased deliveryBoyService for dedicated delivery portal
export const deliveryBoyService = {
  getMyOrders: vendorDeliveryService.getMyAssignedOrders,
  acceptOrder: vendorDeliveryService.acceptAssignedOrder,
  rejectOrder: vendorDeliveryService.rejectAssignedOrder,
  completeOrder: vendorDeliveryService.completeOrderDelivery,
  updateLocation: vendorDeliveryService.updateMyLocation,
  updateStatus: vendorDeliveryService.updateMyStatus,
};

export default api;


