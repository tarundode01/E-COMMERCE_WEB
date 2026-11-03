import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

const BASE_STORAGE_KEY = 'premium_store_wishlist';

// Helper to normalize product data ensuring required fields exist
const normalizeProduct = (product) => {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    category: product.category || 'Luxury Collection',
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    discount: product.discount ?? null,
    rating: product.rating ?? 5.0,
    reviewsCount: product.reviewsCount ?? 0,
    image: product.image,
    images: product.images || (product.image ? [product.image] : []),
    inStock: product.inStock !== false,
    sizes: product.sizes || [],
    isNew: Boolean(product.isNew),
    description: product.description || '',
    features: product.features || [],
    dateAdded: product.dateAdded || new Date().toISOString().split('T')[0],
  };
};

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || user?._id || 'guest';
  const storageKey = `${BASE_STORAGE_KEY}_${userId}`;

  // Initialize wishlist from localStorage
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean);
        }
      }
    } catch (err) {
      console.error('Failed to parse wishlist from localStorage:', err);
    }
    return [];
  });

  // Switch wishlist when authenticated user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setWishlistItems(parsed.filter(Boolean));
          return;
        }
      }
      setWishlistItems([]);
    } catch (err) {
      console.error('Failed to reload wishlist for user:', err);
      setWishlistItems([]);
    }
  }, [storageKey]);

  // Sync with localStorage whenever wishlistItems change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(wishlistItems));
    } catch (err) {
      console.error('Failed to save wishlist to localStorage:', err);
    }
  }, [wishlistItems, storageKey]);

  // Check if a specific product is in wishlist
  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      return wishlistItems.some((item) => String(item.id) === String(productId));
    },
    [wishlistItems]
  );

  // Add product to wishlist
  const addToWishlist = useCallback((product) => {
    if (!product || !product.id) return;
    setWishlistItems((prev) => {
      if (prev.some((item) => String(item.id) === String(product.id))) {
        return prev;
      }
      const normalized = normalizeProduct(product);
      return normalized ? [normalized, ...prev] : prev;
    });
  }, []);

  // Remove product from wishlist
  const removeFromWishlist = useCallback((productId) => {
    if (!productId) return;
    setWishlistItems((prev) => prev.filter((item) => String(item.id) !== String(productId)));
  }, []);

  // Toggle product in wishlist
  const toggleWishlist = useCallback((product) => {
    if (!product || !product.id) return;
    setWishlistItems((prev) => {
      const exists = prev.some((item) => String(item.id) === String(product.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(product.id));
      }
      const normalized = normalizeProduct(product);
      return normalized ? [normalized, ...prev] : prev;
    });
  }, []);

  // Clear entire wishlist
  const clearWishlist = useCallback(() => {
    setWishlistItems([]);
  }, []);

  // Move all in-stock wishlist items to cart
  const moveAllToCart = useCallback(
    (addToCartFn) => {
      if (!addToCartFn || wishlistItems.length === 0) return 0;
      let count = 0;
      wishlistItems.forEach((item) => {
        if (item.inStock !== false) {
          addToCartFn(item);
          count += 1;
        }
      });
      return count;
    },
    [wishlistItems]
  );

  const value = useMemo(
    () => ({
      wishlistItems,
      wishlistCount: wishlistItems.length,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      moveAllToCart,
    }),
    [
      wishlistItems,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      moveAllToCart,
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
