import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { orderService } from '../services/api';

const CartContext = createContext();

const STORAGE_KEY = 'premium_store_cart';

// Helper to reliably parse price numbers
const parsePrice = (price) => {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
};

export function CartProvider({ children }) {
  // Initialize from localStorage (persisted between page refreshes)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse cart from localStorage:', err);
    }
    return [];
  });

  // Server-side authoritative validation state
  const [validationState, setValidationState] = useState({
    isValid: true,
    isRevalidating: false,
    lastValidatedAt: null,
    items: [],
    issues: [],
    serverTotals: null,
    error: null,
  });

  // Sync to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err);
    }
  }, [cartItems]);

  // Revalidate cart items with real MongoDB product data from backend
  const validateCartWithBackend = useCallback(async () => {
    if (!cartItems || cartItems.length === 0) {
      setValidationState({
        isValid: true,
        isRevalidating: false,
        lastValidatedAt: new Date(),
        items: [],
        issues: [],
        serverTotals: null,
        error: null,
      });
      return { isValid: true, items: [] };
    }

    setValidationState((prev) => ({ ...prev, isRevalidating: true, error: null }));

    try {
      const payload = {
        items: cartItems.map((item) => ({
          productId: item._id || item.id,
          quantity: Number(item.quantity) || 1,
          selectedSize: item.selectedSize || 'Standard',
        })),
      };

      const res = await orderService.validateCart(payload);

      if (res && res.success) {
        const issues = (res.items || []).filter((it) => it.available === false || it.issue);

        setValidationState({
          isValid: Boolean(res.isValid),
          isRevalidating: false,
          lastValidatedAt: new Date(),
          items: res.items || [],
          issues,
          serverTotals: {
            subtotal: res.subtotal,
            shippingFee: res.shippingFee,
            freeShippingThreshold: res.freeShippingThreshold,
            isFreeShipping: res.isFreeShipping,
            taxPrice: res.taxPrice,
            totalAmount: res.totalAmount,
          },
          error: null,
        });

        return res;
      } else {
        throw new Error(res?.message || 'Cart validation failed');
      }
    } catch (err) {
      console.warn('Backend cart revalidation check failed:', err.message);
      setValidationState((prev) => ({
        ...prev,
        isRevalidating: false,
        error: err.message || 'Cart validation check unavailable',
      }));
      return null;
    }
  }, [cartItems]);

  // Debounced auto-revalidation whenever cart items change
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active && cartItems.length > 0) {
        validateCartWithBackend();
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cartItems, validateCartWithBackend]);

  // Automatically update local cart with verified server prices and prune unavailable items if requested
  const syncCartWithServerValidation = useCallback((validatedResult) => {
    const verifiedItems = validatedResult?.items || validationState.items;
    if (!Array.isArray(verifiedItems) || verifiedItems.length === 0) return;

    setCartItems((prevItems) => {
      const nextItems = [];

      for (const item of prevItems) {
        const prodId = item._id || item.id;
        const verified = verifiedItems.find(
          (v) => (v.productId === prodId || v.id === prodId) && v.selectedSize === item.selectedSize
        );

        // If product is deleted, unpublished, or store inactive: omit
        if (verified && (verified.issue === 'deleted' || verified.issue === 'unpublished' || verified.issue === 'store_inactive')) {
          continue;
        }

        // If out of stock: omit or retain with 0? omit from active cart
        if (verified && verified.issue === 'out_of_stock') {
          continue;
        }

        // If available or insufficient stock: update price and adjust quantity if needed
        if (verified) {
          const trustedPrice = typeof verified.price === 'number' ? verified.price : item.price;
          const adjustedQty =
            verified.availableQuantity > 0
              ? Math.min(item.quantity, verified.availableQuantity)
              : item.quantity;

          nextItems.push({
            ...item,
            price: trustedPrice,
            quantity: adjustedQty,
            store: verified.store || item.store,
          });
        } else {
          nextItems.push(item);
        }
      }

      return nextItems;
    });
  }, [validationState.items]);

  // Add product to cart (or increment quantity if already present with same size)
  const addToCart = (product, quantityToAdd, size = null) => {
    if (!product) return;

    const prodId = product._id || product.id;
    if (!prodId) return;

    const qty =
      typeof quantityToAdd === 'number'
        ? quantityToAdd
        : typeof product.quantity === 'number'
        ? product.quantity
        : 1;

    const chosenSize =
      size ||
      product.selectedSize ||
      (Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : null) ||
      'Standard';

    const numericPrice = parsePrice(product.price);

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => (item.id === prodId || item._id === prodId) && (item.selectedSize === chosenSize || (!item.selectedSize && !chosenSize))
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          id: prodId,
          _id: prodId,
          quantity: Math.min(10, updated[existingIndex].quantity + qty),
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          id: prodId,
          _id: prodId,
          name: product.name,
          category: product.category || 'Luxury Goods',
          price: numericPrice,
          originalPrice: product.originalPrice ? parsePrice(product.originalPrice) : null,
          image: product.image,
          selectedSize: chosenSize,
          store: product.store || null,
          quantity: Math.min(10, Math.max(1, qty)),
        },
      ];
    });
  };

  // Update specific item quantity
  const updateQuantity = (id, selectedSize, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id, selectedSize);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const isSizeMatch =
          item.selectedSize === selectedSize ||
          (!item.selectedSize && !selectedSize);

        if ((item.id === id || item._id === id) && isSizeMatch) {
          return { ...item, quantity: Math.min(10, Math.max(1, newQuantity)) };
        }
        return item;
      })
    );
  };

  // Remove specific item from cart
  const removeFromCart = (id, selectedSize) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => {
        const isSizeMatch =
          item.selectedSize === selectedSize ||
          (!item.selectedSize && !selectedSize);
        return !((item.id === id || item._id === id) && isSizeMatch);
      })
    );
  };

  // Clear all items
  const clearCart = () => {
    setCartItems([]);
    setValidationState({
      isValid: true,
      isRevalidating: false,
      lastValidatedAt: new Date(),
      items: [],
      issues: [],
      serverTotals: null,
      error: null,
    });
  };

  // Live Totals calculations (Client estimate; backend totals remain authoritative at checkout)
  const { cartCount, subtotal, shipping, estimatedTax, grandTotal } = useMemo(() => {
    const count = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const sub = cartItems.reduce((acc, item) => {
      const p = parsePrice(item.price);
      const q = Number(item.quantity) || 0;
      return acc + p * q;
    }, 0);

    const ship = sub === 0 ? 0 : sub >= 500 ? 0 : 25;
    const tax = Math.round(sub * 0.08 * 100) / 100;
    const total = Math.round((sub + ship + tax) * 100) / 100;

    return {
      cartCount: count,
      subtotal: sub,
      shipping: ship,
      estimatedTax: tax,
      grandTotal: total,
    };
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    subtotal,
    shipping,
    estimatedTax,
    grandTotal,
    // Authoritative backend validation
    validationState,
    validateCartWithBackend,
    syncCartWithServerValidation,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

