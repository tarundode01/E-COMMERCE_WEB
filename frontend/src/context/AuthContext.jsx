import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

const TOKEN_KEY = 'premium_store_token';
const USER_KEY = 'premium_store_user';

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

  // Sync authentication state changes to localStorage
  useEffect(() => {
    try {
      if (token && user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.error('Failed to sync auth state to localStorage:', err);
    }
  }, [token, user]);

  /**
   * Login user via backend API
   * POST /api/auth/login
   */
  const login = async (email, password) => {
    const response = await authService.login({ email, password });

    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      return { success: true, data: response, user: response.user };
    }

    throw new Error(response?.message || 'Login failed. Please check your credentials.');
  };

  /**
   * Register user via backend API
   * POST /api/auth/register
   */
  const register = async (name, email, mobile, password, role = 'user') => {
    const response = await authService.register({ name, email, mobile, password, role });

    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      return { success: true, data: response, user: response.user };
    }

    throw new Error(response?.message || 'Registration failed. Please check your details.');
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
   * Logout user and clear all stored authentication data
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (err) {
      console.error('Failed to clear auth from localStorage:', err);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    updateUser,
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
