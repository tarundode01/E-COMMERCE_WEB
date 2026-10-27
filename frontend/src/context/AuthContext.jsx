import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, vendorService } from '../services/api';

const AuthContext = createContext();

const TOKEN_KEY = 'premium_store_token';
const USER_KEY = 'premium_store_user';
const STORE_KEY = 'premium_store_info';

export function AuthProvider({ children }) {
  // Initialize user from localStorage safely
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      console.error('Failed to parse user from localStorage:', err);
      return null;
    }
  });

  // Initialize JWT token from localStorage safely
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch (err) {
      console.error('Failed to read token from localStorage:', err);
      return null;
    }
  });

  // Initialize vendor store details if present
  const [store, setStore] = useState(() => {
    try {
      const savedStore = localStorage.getItem(STORE_KEY);
      return savedStore ? JSON.parse(savedStore) : null;
    } catch (err) {
      console.error('Failed to parse store from localStorage:', err);
      return null;
    }
  });

  // Loading state during initial session verification
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  // Logout user and clear all stored authentication data
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setStore(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(STORE_KEY);
    } catch (err) {
      console.error('Failed to clear auth from localStorage:', err);
    }
  }, []);

  // Sync authentication state changes to localStorage
  useEffect(() => {
    try {
      if (token && user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (store) {
          localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } else {
          localStorage.removeItem(STORE_KEY);
        }
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(STORE_KEY);
      }
    } catch (err) {
      console.error('Failed to sync auth state to localStorage:', err);
    }
  }, [token, user, store]);

  // On page load/refresh, verify session token validity with backend
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await authService.getProfile();
        if (isMounted && response && response.user) {
          setUser(response.user);
          if (response.token) {
            setToken(response.token);
            try {
              localStorage.setItem(TOKEN_KEY, response.token);
            } catch (e) {}
          }
          if (response.store) {
            setStore(response.store);
          }
        }
      } catch (err) {
        console.warn('Session verification failed on refresh. Clearing stale session:', err.message);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, [logout]);

  /**
   * Login user via backend API
   * POST /api/auth/login
   */
  const login = async (email, password) => {
    const response = await authService.login({ email, password });

    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      if (response.store) {
        setStore(response.store);
      }
      return {
        success: true,
        data: response,
        user: response.user,
        store: response.store || null,
      };
    }

    throw new Error(response?.message || 'Login failed. Please check your credentials.');
  };

  /**
   * Register user (Customer, Vendor, or Platform Admin) via backend API
   * POST /api/auth/register
   */
  const register = async (name, email, mobile, password, role = 'user', adminSecret = '') => {
    const response = await authService.register({ name, email, mobile, password, role, adminSecret });

    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      if (response.store) {
        setStore(response.store);
      } else {
        setStore(null);
      }
      return { success: true, data: response, user: response.user, store: response.store || null };
    }

    throw new Error(response?.message || 'Registration failed. Please check your details.');
  };

  /**
   * Register vendor via backend API
   * POST /api/vendor/register
   */
  const registerVendor = async (vendorData) => {
    const response = await vendorService.register(vendorData);

    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      if (response.store) {
        setStore(response.store);
      }
      return {
        success: true,
        data: response,
        user: response.user,
        store: response.store,
      };
    }

    throw new Error(response?.message || 'Vendor registration failed. Please check your details.');
  };

  /**
   * Update user details in state and localStorage
   */
  const updateUser = (updatedFields) => {
    setUser((prevUser) => {
      const merged = { ...prevUser, ...updatedFields };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to update user in localStorage:', err);
      }
      return merged;
    });
  };

  /**
   * Update store details in state and localStorage
   */
  const updateStoreInfo = (newStoreData) => {
    setStore((prevStore) => {
      const merged = { ...prevStore, ...newStoreData };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to update store in localStorage:', err);
      }
      return merged;
    });
  };

  const value = {
    user,
    token,
    store,
    isLoading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    registerVendor,
    updateUser,
    updateStoreInfo,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
