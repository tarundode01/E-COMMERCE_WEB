import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

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

  // Sync to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err);
    }
  }, [cartItems]);

  // Add product to cart (or increment quantity if already present with same size)
  const addToCart = (product, quantityToAdd, size = null) => {
    if (!product) return;

    const prodId = product._id || product.id;
    if (!prodId) return;

    // Support both addToCart(product, quantityToAdd, size) and addToCart({ ...product, quantity, selectedSize })
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
  };

  // Live Totals calculations
  const { cartCount, subtotal, shipping, estimatedTax, grandTotal } = useMemo(() => {
    const count = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const sub = cartItems.reduce((acc, item) => {
      const p = parsePrice(item.price);
      const q = Number(item.quantity) || 0;
      return acc + p * q;
    }, 0);

    const ship = sub === 0 ? 0 : sub >= 200 ? 0 : 25;
    const tax = Math.round(sub * 0.08); // 8% estimated luxury sales/import tax
    const total = sub + ship + tax;

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

