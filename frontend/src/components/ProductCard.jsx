import React, { useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Check, Store } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import defaultWatchImg from '../assets/luxury_watch.jpg';
import bagImg from '../assets/luxury_bag.jpg';
import perfumeImg from '../assets/luxury_perfume.jpg';
import sunglassesImg from '../assets/luxury_sunglasses.jpg';
import lifestyleImg from '../assets/hero_lifestyle.jpg';
import smartphoneImg from '../assets/luxury_smartphone_titanium.jpg';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatImageUrl } from '../utils/imageUrl';

/**
 * Resolves fallback luxury image based on category and title keywords
 */
const resolveCardImage = (img, category = '', name = '') => {
  if (img && typeof img === 'string' && img.trim() !== '' && !img.includes('undefined')) {
    return formatImageUrl(img);
  }
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes('mobile') || text.includes('phone') || text.includes('smartphone')) {
    return smartphoneImg;
  }
  if (text.includes('perfume') || text.includes('fragrance') || text.includes('nectar') || text.includes('parfum')) {
    return perfumeImg;
  }
  if (text.includes('bag') || text.includes('leather') || text.includes('satchel') || text.includes('handbag')) {
    return bagImg;
  }
  if (text.includes('sunglass') || text.includes('eyewear') || text.includes('aviator') || text.includes('optics')) {
    return sunglassesImg;
  }
  if (text.includes('couture') || text.includes('apparel') || text.includes('overcoat') || text.includes('trench') || text.includes('cashmere')) {
    return lifestyleImg;
  }
  return defaultWatchImg;
};

/**
 * SafeLink helper: Uses React Router's <Link> if running within a Router context,
 * otherwise falls back to standard <a> tag.
 */
function SafeLink({ to, children, className, onClick, ...props }) {
  const hasRouter = useInRouterContext();

  if (hasRouter) {
    return (
      <Link to={to} className={className} onClick={onClick} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={to} className={className} onClick={onClick} {...props}>
      {children}
    </a>
  );
}

/**
 * Premium Reusable ProductCard Component
 * Displays product image, title, category, price, optional original price, discount badge, ratings, and availability.
 * Clicking image or title navigates to the Product Details page (/product/:id).
 * Features interactive Wishlist toggle and Add-to-Cart button with instant feedback.
 */
export default function ProductCard({
  product = {},
  onAddToCart,
  onToggleWishlist,
  className = '',
}) {
  const { addToCart: contextAddToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Safe default product fallback data
  const {
    id = '65d1a1b2c3d4e5f6a7b80001',
    _id = '65d1a1b2c3d4e5f6a7b80001',
    name = 'Heritage Chronograph Gold Watch',
    category = 'Luxury Horology',
    price = 850,
    originalPrice = 1100,
    discount = '23% OFF',
    rating = 4.9,
    reviewsCount = 42,
    image,
    isNew = true,
    inStock = true,
  } = product;

  const resolvedImage = resolveCardImage(image, category, name);

  const isWishlisted = isInWishlist(id);
  const [isAdded, setIsAdded] = useState(false);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    if (onToggleWishlist) onToggleWishlist(id, !isWishlisted);
  };

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdded(true);
    if (onAddToCart) {
      onAddToCart(product);
    } else if (contextAddToCart) {
      contextAddToCart(product);
    }
    setTimeout(() => setIsAdded(false), 2000);
  };

  const formattedPrice =
    typeof price === 'number'
      ? `$${price.toLocaleString()}`
      : price;

  const formattedOriginalPrice =
    originalPrice
      ? typeof originalPrice === 'number'
        ? `$${originalPrice.toLocaleString()}`
        : originalPrice
      : null;

  return (
    <div
      className={`group relative bg-brand-surface border border-brand-border/70 rounded-xl overflow-hidden shadow-xs hover:shadow-xl hover:border-brand-accent/40 transition-all duration-300 flex flex-col ${className}`}
    >
      {/* Product Image & Badges (Clicking image navigates to details) */}
      <div className="relative aspect-square w-full overflow-hidden bg-brand-offwhite">
        <SafeLink to={`/product/${id}`} className="block w-full h-full">
          <img
            src={resolvedImage}
            alt={name}
            className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </SafeLink>

        {/* Top-Left Status / Discount Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {discount && (
            <Badge variant="sale" size="sm" className="rounded-full !px-2.5 !py-0.5 shadow-xs">
              {discount}
            </Badge>
          )}
          {isNew && !discount && (
            <Badge variant="accent" size="sm" className="rounded-full !px-2.5 !py-0.5 shadow-xs">
              New Arrival
            </Badge>
          )}
        </div>

        {/* Top-Right Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className={`absolute top-3 right-3 z-10 p-2.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer focus:outline-none ${
            isWishlisted
              ? 'bg-white text-rose-600 shadow-md scale-110'
              : 'bg-white/80 hover:bg-white text-brand-charcoal hover:text-rose-600 shadow-xs'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            className={`transition-colors ${isWishlisted ? 'fill-rose-600' : ''}`}
          />
        </button>

        {/* Quick Add Overlay Button (Desktop Slide-in on Hover) */}
        <div className="absolute inset-x-3 bottom-3 hidden md:block opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10">
          <Button
            variant={isAdded ? 'accent' : 'primary'}
            size="sm"
            onClick={handleAddToCartClick}
            className="w-full shadow-lg !py-2.5 rounded-lg text-xs"
            icon={isAdded ? Check : ShoppingBag}
          >
            {isAdded ? 'Added to Cart' : 'Quick Add'}
          </Button>
        </div>
      </div>

      {/* Product Information Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between text-left">
        <div>
          {/* Category & Stock Availability */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-brand-accent truncate">
              {category}
            </p>
            {inStock !== false ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Limited
              </span>
            )}
          </div>

          {/* Product Title (Linked to details) */}
          <SafeLink to={`/product/${id}`} className="block">
            <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black leading-snug line-clamp-2 group-hover:text-brand-accent transition-colors">
              {name}
            </h3>
          </SafeLink>

          {/* Seller / Atelier Store Indicator */}
          {product.store && (
            <p className="text-[11px] text-brand-muted mt-1 flex items-center gap-1 truncate">
              <Store size={12} className="text-brand-accent shrink-0" />
              <span>
                By <span className="font-semibold text-brand-charcoal">{typeof product.store === 'object' ? product.store.name : product.store}</span>
              </span>
            </p>
          )}

          {/* Rating Stars & Reviews */}
          {rating && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center text-amber-500">
                <Star size={13} className="fill-amber-500" />
              </div>
              <span className="text-xs font-semibold text-brand-black">{rating}</span>
              {reviewsCount && (
                <span className="text-xs text-brand-muted">
                  ({reviewsCount})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Mobile Add to Cart */}
        <div className="pt-4 mt-3 border-t border-brand-border/40 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-brand-black tracking-tight">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs text-brand-muted line-through font-normal">
                {formattedOriginalPrice}
              </span>
            )}
          </div>

          {/* Mobile Add to Cart Button */}
          <div className="md:hidden">
            <Button
              variant={isAdded ? 'accent' : 'primary'}
              size="sm"
              onClick={handleAddToCartClick}
              className="!p-2 rounded-lg"
              aria-label="Add to cart"
            >
              {isAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
