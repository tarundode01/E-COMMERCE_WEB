import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Truck,
  RotateCcw,
  X
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { useCart } from '../context/CartContext';

/**
 * Responsive Shopping Cart Page Component
 * Requirements fulfilled:
 * - Display added products with image, name, price, and quantity
 * - Plus and minus buttons to update quantity
 * - Remove button for each product
 * - Automatic calculation of subtotal, shipping, tax, promo, and grand total
 * - "Continue Shopping" button linked to the Shop page (both in empty state and cart view)
 * - "Proceed to Checkout" button linked directly to /checkout
 * - State shared across Shop, Product Details, and Cart via CartContext
 * - LocalStorage persistence on refresh
 * - Clean empty-cart state when no products are present
 * - Uses existing reusable components and luxury theme
 */
export default function Cart() {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    shipping,
    estimatedTax,
    grandTotal,
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Handle Promo Code (10% discount with PREMIUM10)
  const handleApplyPromo = (e) => {
    e.preventDefault();
    setPromoError('');
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === 'PREMIUM10') {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid code. Try "PREMIUM10" for 10% privilege discount.');
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setPromoCode('');
    setPromoError('');
  };

  const promoDiscount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const finalTotal = Math.max(0, grandTotal - promoDiscount);

  // Complimentary shipping threshold ($200)
  const freeShippingThreshold = 200;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="min-h-screen bg-brand-offwhite py-10 sm:py-16 transition-colors">
      <Container size="default">
        {/* Page Header */}
        <div className="border-b border-brand-border/60 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-accent mb-2">
              Your Selection
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-black">
              Shopping Bag
            </h1>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-brand-muted hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto font-medium"
            >
              Clear Entire Bag
            </button>
          )}
        </div>

        {/* Free Shipping Progress Indicator (Visible when cart has items) */}
        {cartItems.length > 0 && (
          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 sm:p-5 mb-8 shadow-xs">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
              <span className="flex items-center gap-2 text-brand-charcoal">
                <Truck size={17} className="text-brand-accent shrink-0" />
                {amountNeededForFreeShipping > 0 ? (
                  <span>
                    Add <strong className="text-brand-black font-bold">${amountNeededForFreeShipping.toLocaleString()}</strong> more to unlock <span className="text-emerald-700 font-semibold">Complimentary Express Worldwide Shipping</span>
                  </span>
                ) : (
                  <span className="text-emerald-800 font-semibold">
                    ✓ You have qualified for Complimentary Worldwide Express Shipping
                  </span>
                )}
              </span>
              <span className="text-xs text-brand-muted hidden sm:inline">
                {Math.round(freeShippingProgress)}%
              </span>
            </div>
            <div className="w-full bg-brand-offwhite rounded-full h-1.5 overflow-hidden border border-brand-border/50">
              <div
                className="bg-brand-accent h-1.5 transition-all duration-500 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          /* Clean Empty Cart State */
          <div className="bg-brand-surface border border-brand-border/60 rounded-2xl p-10 sm:p-16 text-center max-w-2xl mx-auto shadow-xs my-8 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShoppingBag size={34} strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black mb-3">
              Your Shopping Bag is Empty
            </h2>
            <p className="text-sm sm:text-base text-brand-muted max-w-md mx-auto mb-8 leading-relaxed font-light">
              Your luxury cart currently contains no items. Explore our signature selection of handcrafted horology, fine leather goods, and iconic fashion pieces.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/shop">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowLeft}
                  iconPosition="left"
                  className="shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  Continue Shopping
                </Button>
              </Link>
            </div>

            {/* Quick Explore Categories */}
            <div className="mt-12 pt-8 border-t border-brand-border/60">
              <p className="text-[11px] uppercase tracking-widest text-brand-muted font-semibold mb-4">
                Popular Collections to Explore
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {['Luxury Horology', 'Handcrafted Goods', 'Fine Fragrance', 'Designer Eyewear'].map((cat) => (
                  <Link
                    key={cat}
                    to="/shop"
                    className="text-xs px-3.5 py-1.5 rounded-full bg-brand-offwhite border border-brand-border text-brand-charcoal hover:bg-brand-black hover:text-white transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Populated Responsive Cart Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Cart Items (Cols 1-8) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-brand-surface border border-brand-border/70 rounded-xl overflow-hidden shadow-xs divide-y divide-brand-border/60">
                {cartItems.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <div
                      key={`${item.id}-${item.selectedSize}`}
                      className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-brand-offwhite/30"
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Link
                          to={`/product/${item.id}`}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-brand-offwhite border border-brand-border/70 shrink-0 group block"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80';
                            }}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                        </Link>

                        <div className="flex-1 text-left">
                          <p className="text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase text-brand-accent">
                            {item.category || 'Luxury Goods'}
                          </p>
                          <Link
                            to={`/product/${item.id}`}
                            className="font-serif text-base sm:text-lg font-bold text-brand-black hover:text-brand-accent transition-colors block line-clamp-1"
                          >
                            {item.name}
                          </Link>

                          {/* Selected Variant / Size */}
                          {item.selectedSize && (
                            <div className="mt-1">
                              <Badge variant="outline" size="sm" className="text-[10px]">
                                Variant: {item.selectedSize}
                              </Badge>
                            </div>
                          )}

                          {/* Mobile Unit Price */}
                          <p className="text-sm font-semibold text-brand-charcoal mt-1.5 sm:hidden">
                            ${item.price.toLocaleString()} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls & Line Price */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40">
                        {/* Unit Price (Desktop) */}
                        <div className="hidden sm:block text-right min-w-[70px]">
                          <p className="text-[11px] text-brand-muted uppercase tracking-wider">Unit</p>
                          <p className="text-sm font-semibold text-brand-black">
                            ${item.price.toLocaleString()}
                          </p>
                        </div>

                        {/* Quantity Stepper (Minus & Plus buttons) */}
                        <div className="flex items-center border border-brand-border rounded-lg bg-brand-surface shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.selectedSize, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="p-2 sm:p-2.5 text-brand-charcoal hover:text-brand-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none transition-colors"
                            aria-label="Decrease quantity"
                            title="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="px-2.5 text-xs sm:text-sm font-bold text-brand-black min-w-[28px] text-center select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.selectedSize, item.quantity + 1)
                            }
                            disabled={item.quantity >= 10}
                            className="p-2 sm:p-2.5 text-brand-charcoal hover:text-brand-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none transition-colors"
                            aria-label="Increase quantity"
                            title="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Total Line Price */}
                        <div className="text-right min-w-[80px]">
                          <p className="text-[11px] text-brand-muted uppercase tracking-wider hidden sm:block">Total</p>
                          <p className="font-serif text-base sm:text-lg font-bold text-brand-black">
                            ${lineTotal.toLocaleString()}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                          className="p-2 text-brand-muted hover:text-rose-600 hover:bg-rose-50/80 rounded-md transition-colors cursor-pointer focus:outline-none"
                          aria-label={`Remove ${item.name} from bag`}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom "Continue Shopping" button linked to Shop page */}
              <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-accent transition-colors group"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>Continue Shopping</span>
                </Link>
                <span className="text-xs text-brand-muted">
                  Complimentary worldwide delivery on orders over $200
                </span>
              </div>
            </div>

            {/* Right Column: Order Summary (Cols 9-12) */}
            <div className="lg:col-span-4 bg-brand-surface border border-brand-border/70 p-6 sm:p-7 rounded-xl shadow-xs space-y-6 text-left sticky top-28">
              <h2 className="font-serif text-xl font-bold text-brand-black border-b border-brand-border/60 pb-4">
                Order Summary
              </h2>

              {/* Price Breakdown */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-brand-charcoal">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-black">
                    ${subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-brand-charcoal">
                  <span className="flex items-center gap-1.5">
                    <span>Shipping</span>
                    <Truck size={14} className="text-brand-accent" />
                  </span>
                  {shipping === 0 ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Complimentary
                    </span>
                  ) : (
                    <span className="font-semibold text-brand-black">
                      ${shipping.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-brand-charcoal">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-semibold text-brand-black">
                    ${estimatedTax.toLocaleString()}
                  </span>
                </div>

                {promoApplied && (
                  <div className="flex items-center justify-between text-emerald-700 font-medium bg-emerald-50/60 p-2 rounded border border-emerald-200/80">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span>Privilege 10% Discount</span>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-brand-muted hover:text-rose-600 ml-1 cursor-pointer"
                        title="Remove promo code"
                      >
                        <X size={12} />
                      </button>
                    </span>
                    <span className="text-xs font-bold">-${promoDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="pt-2 border-t border-brand-border/60">
                <label
                  htmlFor="promo-input"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-2"
                >
                  Privilege Promo Code
                </label>
                <div className="flex gap-2">
                  <Input
                    id="promo-input"
                    type="text"
                    placeholder="Try PREMIUM10"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value);
                      if (promoError) setPromoError('');
                    }}
                    className="!py-1.5 text-xs uppercase"
                    disabled={promoApplied}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={promoApplied || !promoCode.trim()}
                  >
                    {promoApplied ? 'Applied ✓' : 'Apply'}
                  </Button>
                </div>
                {promoError && (
                  <p className="mt-1.5 text-[11px] text-rose-500 font-medium">
                    {promoError}
                  </p>
                )}
              </form>

              {/* Grand Total */}
              <div className="pt-4 border-t border-brand-border/60">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-base font-bold text-brand-black">Grand Total</span>
                  <span className="font-serif text-2xl font-bold text-brand-black tracking-tight">
                    ${finalTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-brand-muted">
                  Includes import duties, taxes & luxury courier insurance
                </p>
              </div>

              {/* Checkout & Continue Shopping Action Buttons */}
              <div className="pt-2 space-y-3">
                <Link to="/checkout" className="block">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-md hover:shadow-lg rounded-lg"
                    icon={Lock}
                  >
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link to="/shop" className="block text-center">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                  >
                    Continue Shopping
                  </Button>
                </Link>
              </div>

              {/* Client Assurances */}
              <div className="pt-4 border-t border-brand-border/60 space-y-2">
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <ShieldCheck size={16} className="text-brand-accent shrink-0" />
                  <span>256-Bit SSL Bank-Grade Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <RotateCcw size={16} className="text-brand-accent shrink-0" />
                  <span>30-Day Complimentary Return Policy</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
