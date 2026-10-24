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
  getCategories: async () => {
    const response = await api.get('/api/categories');
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

  // DELETE /api/categories/:id
  deleteCategory: async (id) => {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  },
};

// Order service endpoints connecting to backend if implemented in future
export const orderService = {
  // GET /api/orders/my-orders
  getMyOrders: async () => {
    const response = await api.get('/api/orders/my-orders');
    return response.data;
  },

  // GET /api/orders/:id
  getOrderById: async (id) => {
    const response = await api.get(`/api/orders/${id}`);
    return response.data;
  },

  // POST /api/orders
  createOrder: async (orderData) => {
    const response = await api.post('/api/orders', orderData);
    return response.data;
  },

  // POST /api/orders/calculate-shipping
  calculateShipping: async (payload) => {
    const response = await api.post('/api/orders/calculate-shipping', payload);
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

export default api;
