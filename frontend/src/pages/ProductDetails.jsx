import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquare,
  X,
  ArrowRight
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { reviewService, productService } from '../services/api';

/**
 * Inner component keyed by product.id to automatically reset state on navigation
 */
function ProductDetailsContent({ product, onAddToCart, onToggleWishlist }) {
  const { user, isAuthenticated } = useAuth();
  const { addToCart: contextAddToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const productId = product._id || product.id;

  const galleryImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return [product.image];
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const isWishlisted = isInWishlist(product.id || product._id);

  // --- Reviews State ---
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 0,
    reviewCount: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'highest' | 'lowest'

  // --- Review Form State ---
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null); // { type: 'success' | 'error' | 'ineligible' | 'duplicate', message: '' }
  const [isEditing, setIsEditing] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [isDeletingReviewId, setIsDeletingReviewId] = useState(null);

  // Scroll to top on product change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch reviews from backend API
  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setIsLoadingReviews(true);
    setReviewsError(null);

    try {
      const res = await reviewService.getProductReviews(productId, { sort: sortBy });
      if (res && res.success) {
        setReviews(res.reviews || []);
        setReviewStats({
          averageRating: Number(res.averageRating) || 0,
          reviewCount: Number(res.reviewCount) || 0,
          ratingDistribution: res.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        });
      } else {
        setReviewsError(res?.message || 'Failed to load reviews.');
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setReviewsError(
        err.response?.data?.message || err.message || 'Unable to retrieve client reviews.'
      );
    } finally {
      setIsLoadingReviews(false);
    }
  }, [productId, sortBy]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        fetchReviews();
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchReviews]);

  // Check if current authenticated user has already reviewed this product
  const myReview = useMemo(() => {
    if (!user || !reviews.length) return null;
    const currentUserId = (user._id || user.id || '').toString();
    return reviews.find((r) => {
      const reviewerId = (r.customer?._id || r.customer?.id || r.customer || '').toString();
      return reviewerId && currentUserId && reviewerId === currentUserId;
    });
  }, [user, reviews]);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  const handleAddToCart = () => {
    setIsAdded(true);
    const itemToAdd = {
      ...product,
      selectedSize,
      quantity,
    };
    if (onAddToCart) {
      onAddToCart(itemToAdd);
    } else if (contextAddToCart) {
      contextAddToCart(itemToAdd);
    }
    setTimeout(() => setIsAdded(false), 2200);
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product);
    if (onToggleWishlist) {
      onToggleWishlist(product.id, !isWishlisted);
    }
  };

  // Start editing a review
  const handleStartEdit = (review) => {
    setIsEditing(true);
    setEditingReviewId(review._id || review.id);
    setRatingInput(Number(review.rating) || 5);
    setCommentInput(review.comment || '');
    setFormFeedback(null);

    const formEl = document.getElementById('review-form-anchor');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingReviewId(null);
    setRatingInput(5);
    setCommentInput('');
    setFormFeedback(null);
  };

  // Submit new review or save edit
  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setFormFeedback({
        type: 'error',
        message: 'Please sign in to submit your client appraisal.',
      });
      return;
    }

    if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
      setFormFeedback({
        type: 'error',
        message: 'Please select a star rating between 1 and 5.',
      });
      return;
    }

    setIsSubmittingReview(true);
    setFormFeedback(null);

    try {
      if (isEditing && editingReviewId) {
        // Edit existing review
        const res = await reviewService.updateReview(productId, editingReviewId, {
          rating: ratingInput,
          comment: commentInput.trim(),
        });
        setFormFeedback({
          type: 'success',
          message: res?.message || 'Your review has been updated successfully.',
        });
        setIsEditing(false);
        setEditingReviewId(null);
        setCommentInput('');
        await fetchReviews();
      } else {
        // Create new review
        const res = await reviewService.createReview(productId, {
          rating: ratingInput,
          comment: commentInput.trim(),
        });
        setFormFeedback({
          type: 'success',
          message: res?.message || 'Your verified appraisal has been published.',
        });
        setCommentInput('');
        setRatingInput(5);
        await fetchReviews();
      }
    } catch (err) {
      console.error('Review submission error:', err);
      const status = err.response?.status;
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit review.';

      if (
        status === 403 ||
        errMsg.toLowerCase().includes('purchased') ||
        errMsg.toLowerCase().includes('delivered')
      ) {
        setFormFeedback({
          type: 'ineligible',
          message: errMsg,
        });
      } else if (
        status === 400 &&
        errMsg.toLowerCase().includes('already reviewed')
      ) {
        setFormFeedback({
          type: 'duplicate',
          message: errMsg,
        });
      } else {
        setFormFeedback({
          type: 'error',
          message: errMsg,
        });
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete review (owner only)
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you wish to delete your client review?')) {
      return;
    }

    setIsDeletingReviewId(reviewId);
    try {
      await reviewService.deleteReview(productId, reviewId);
      setFormFeedback({
        type: 'success',
        message: 'Your review has been deleted successfully.',
      });
      if (isEditing && editingReviewId === reviewId) {
        handleCancelEdit();
      }
      await fetchReviews();
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete review.');
    } finally {
      setIsDeletingReviewId(null);
    }
  };

  // Related products from other items
  const relatedProducts = useMemo(() => {
    return products.filter((p) => p.id !== product.id).slice(0, 4);
  }, [product.id]);

  const formattedPrice =
    typeof product.price === 'number'
      ? `$${product.price.toLocaleString()}`
      : product.price;

  const formattedOriginalPrice =
    product.originalPrice
      ? typeof product.originalPrice === 'number'
        ? `$${product.originalPrice.toLocaleString()}`
        : product.originalPrice
      : null;

  return (
    <div className="min-h-screen bg-brand-offwhite py-8 sm:py-12 transition-colors">
      <Container size="default">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs font-medium text-brand-muted mb-8 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-brand-black transition-colors">
            Home
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <Link to="/shop" className="hover:text-brand-black transition-colors">
            Shop
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-brand-accent">{product.category}</span>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-brand-black font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Product Details Main Grid (Gallery + Information) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column: Visual Gallery (Cols 1-7) */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:w-24 shrink-0 pb-2 sm:pb-0">
                {galleryImages.map((imgSrc, index) => {
                  const isActive = activeImageIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative aspect-square w-18 sm:w-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-brand-surface ${
                        isActive
                          ? 'border-brand-black ring-2 ring-brand-accent/50 scale-95 shadow-sm'
                          : 'border-brand-border/80 hover:border-brand-charcoal opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Large Main Image Display */}
            <div className="flex-1 relative aspect-square bg-brand-surface rounded-2xl overflow-hidden border border-brand-border/70 shadow-lg group">
              <img
                src={galleryImages[activeImageIndex] || product.image}
                alt={product.name}
                className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Badges on main image */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {product.discount && (
                  <Badge variant="sale" size="md" className="rounded-full !px-3 shadow-sm">
                    {product.discount}
                  </Badge>
                )}
                {product.isNew && !product.discount && (
                  <Badge variant="accent" size="md" className="rounded-full !px-3 shadow-sm">
                    New Arrival
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Product Information & Purchasing (Cols 8-12) */}
          <div className="lg:col-span-5 flex flex-col text-left">
            {/* Category & Availability */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-accent">
                {product.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>{product.inStock !== false ? 'In Stock • Ready to Ship' : 'Limited Inventory'}</span>
              </div>
            </div>

            {/* Product Title */}
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-brand-black leading-tight mb-3">
              {product.name}
            </h1>

            {/* Star Rating & Review Count - Real API Data Only (Never Hardcoded) */}
            <div className="flex items-center gap-2 mb-5">
              {isLoadingReviews ? (
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <Loader2 size={13} className="animate-spin text-brand-accent" />
                  <span>Loading client appraisals...</span>
                </div>
              ) : reviewStats.reviewCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                  aria-label="View verified customer reviews"
                >
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={
                          i < Math.floor(reviewStats.averageRating)
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-neutral-300'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-brand-black">
                    {reviewStats.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-brand-muted group-hover:text-brand-accent group-hover:underline transition-colors">
                    ({reviewStats.reviewCount} {reviewStats.reviewCount === 1 ? 'verified review' : 'verified client reviews'})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 text-xs text-brand-muted hover:text-brand-accent transition-colors group cursor-pointer focus:outline-none"
                  aria-label="Write the first review"
                >
                  <div className="flex items-center text-neutral-300">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="text-neutral-300" />
                    ))}
                  </div>
                  <span className="font-medium text-brand-charcoal">No reviews yet</span>
                  <span>•</span>
                  <span className="text-brand-accent group-hover:underline">Be the first to review</span>
                </button>
              )}
            </div>

            {/* Pricing Section */}
            <div className="flex items-baseline gap-3 pb-6 border-b border-brand-border/60 mb-6">
              <span className="font-serif text-3xl font-bold text-brand-black tracking-tight">
                {formattedPrice}
              </span>
              {formattedOriginalPrice && (
                <span className="text-base text-brand-muted line-through font-normal">
                  {formattedOriginalPrice}
                </span>
              )}
              {product.discount && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Save {product.discount}
                </span>
              )}
            </div>

            {/* Product Description */}
            <p className="text-sm sm:text-base text-brand-charcoal leading-relaxed font-light mb-6">
              {product.description ||
                'Meticulously crafted with unwavering dedication to artistry and material excellence. An iconic centerpiece designed for lifetime durability and effortless elegance.'}
            </p>

            {/* Available Sizes / Variants */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
                    Select Variant / Size:
                  </span>
                  <span className="text-xs text-brand-accent font-medium cursor-pointer hover:underline">
                    Size Guide
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all rounded-md cursor-pointer border ${
                          isSelected
                            ? 'bg-brand-black text-white border-brand-black shadow-xs'
                            : 'bg-brand-surface text-brand-charcoal border-brand-border hover:border-brand-black'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & Add To Cart Actions */}
            <div className="space-y-3 pt-2 mb-8">
              <div className="flex items-center gap-3">
                {/* Quantity Box */}
                <div className="flex items-center border border-brand-border rounded-lg bg-brand-surface">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 text-brand-charcoal hover:text-brand-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="px-3 text-sm font-bold text-brand-black min-w-[32px] text-center select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 10}
                    className="p-3 text-brand-charcoal hover:text-brand-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Primary Add to Cart Button */}
                <Button
                  variant={isAdded ? 'accent' : 'primary'}
                  size="lg"
                  onClick={handleAddToCart}
                  className="flex-1 shadow-md hover:shadow-lg transition-all rounded-lg"
                  icon={isAdded ? Check : ShoppingBag}
                >
                  {isAdded ? 'Added to Bag ✓' : `Add to Bag • $${(product.price * quantity).toLocaleString()}`}
                </Button>
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className={`w-full py-2.5 px-4 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none ${
                  isWishlisted
                    ? 'border-rose-300 bg-rose-50/60 text-rose-600'
                    : 'border-brand-border bg-brand-surface text-brand-charcoal hover:border-brand-charcoal'
                }`}
              >
                <Heart size={16} className={isWishlisted ? 'fill-rose-600 text-rose-600' : ''} />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {/* Artisanal Features List */}
            {product.features && (
              <div className="p-4 rounded-xl bg-brand-cream/60 border border-brand-border/60 mb-6">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold text-brand-charcoal mb-3">
                  <Sparkles size={14} className="text-brand-accent" />
                  <span>Artisan Highlights</span>
                </div>
                <ul className="space-y-1.5">
                  {product.features.map((feat, i) => (
                    <li key={i} className="text-xs text-brand-muted flex items-start gap-2">
                      <span className="text-brand-accent font-bold mt-0.5">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trust Badges */}
            <div className="pt-4 border-t border-brand-border/60 grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center">
                <Truck size={18} className="text-brand-accent mb-1" />
                <span className="text-[11px] font-bold text-brand-black">Express Delivery</span>
                <span className="text-[10px] text-brand-muted">Complimentary $200+</span>
              </div>
              <div className="flex flex-col items-center">
                <RotateCcw size={18} className="text-brand-accent mb-1" />
                <span className="text-[11px] font-bold text-brand-black">30-Day Returns</span>
                <span className="text-[10px] text-brand-muted">Hassle-free guarantee</span>
              </div>
              <div className="flex flex-col items-center">
                <ShieldCheck size={18} className="text-brand-accent mb-1" />
                <span className="text-[11px] font-bold text-brand-black">Authentic Luxury</span>
                <span className="text-[10px] text-brand-muted">Certified provenance</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* REVIEWS & RATINGS SECTION (Integrated with Backend API)         */}
        {/* ============================================================== */}
        <section id="reviews-section" className="mt-20 pt-16 border-t border-brand-border/80 scroll-mt-10">
          <SectionHeading
            badge="Client Appraisals"
            title="Verified Reviews & Ratings"
            subtitle="Authentic reflections from verified patrons who have acquired and experienced this piece."
            align="center"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Summary Card & Submission Form (Cols 1-5) */}
            <div className="lg:col-span-5 space-y-8">
              {/* Rating Summary Card */}
              <div className="bg-brand-surface border border-brand-border/80 p-6 sm:p-7 rounded-2xl shadow-xs">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-brand-muted mb-4">
                  Appraisal Overview
                </h3>

                <div className="flex items-center gap-6 pb-6 border-b border-brand-border/60">
                  <div className="flex flex-col">
                    <span className="font-serif text-5xl font-bold text-brand-black leading-none">
                      {reviewStats.reviewCount > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-xs text-brand-muted mt-1 font-medium">out of 5.0</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((starIndex) => (
                        <Star
                          key={starIndex}
                          size={18}
                          className={
                            starIndex <= Math.round(reviewStats.averageRating)
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-neutral-200'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-brand-charcoal">
                      {reviewStats.reviewCount > 0
                        ? `Based on ${reviewStats.reviewCount} verified ${
                            reviewStats.reviewCount === 1 ? 'review' : 'reviews'
                          }`
                        : 'No reviews submitted yet'}
                    </span>
                  </div>
                </div>

                {/* Rating Distribution Breakdown */}
                <div className="space-y-2.5 pt-5">
                  {[5, 4, 3, 2, 1].map((ratingNum) => {
                    const count = reviewStats.ratingDistribution?.[ratingNum] || 0;
                    const percentage =
                      reviewStats.reviewCount > 0
                        ? Math.round((count / reviewStats.reviewCount) * 100)
                        : 0;

                    return (
                      <div key={ratingNum} className="flex items-center gap-3 text-xs">
                        <span className="font-semibold text-brand-charcoal w-6 text-right">
                          {ratingNum}★
                        </span>
                        <div className="flex-1 h-2 bg-brand-offwhite rounded-full overflow-hidden border border-brand-border/40">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-brand-muted w-10 text-right font-medium">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Form Anchor */}
              <div id="review-form-anchor" className="scroll-mt-12">
                {!isAuthenticated ? (
                  /* Unauthenticated Notice Card */
                  <div className="bg-brand-surface border border-brand-border/80 p-6 sm:p-7 rounded-2xl shadow-xs text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-brand-cream/80 border border-brand-border flex items-center justify-center text-brand-accent">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-black mb-1">
                        Sign In to Submit an Appraisal
                      </h4>
                      <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                        To preserve the authenticity of our catalog, client appraisals are reserved exclusively for registered patrons who have received this verified piece.
                      </p>
                    </div>
                    <Link
                      to={`/login?redirect=/product/${productId}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-black text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-charcoal transition-colors shadow-xs"
                    >
                      <span>Sign In to Your Account</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : myReview && !isEditing ? (
                  /* Current User's Existing Review Summary Card */
                  <div className="bg-brand-surface border border-brand-accent/40 p-6 sm:p-7 rounded-2xl shadow-xs space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand-accent" />
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-brand-cream text-brand-accent border border-brand-accent/30">
                        <CheckCircle2 size={13} />
                        Your Submitted Appraisal
                      </span>
                      <span className="text-xs text-brand-muted">
                        {myReview.createdAt
                          ? new Date(myReview.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < myReview.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'}
                        />
                      ))}
                      <span className="ml-2 text-xs font-bold text-brand-black">
                        {myReview.rating}.0 / 5.0
                      </span>
                    </div>

                    {myReview.comment ? (
                      <p className="text-xs sm:text-sm text-brand-charcoal italic leading-relaxed bg-brand-offwhite/80 p-3.5 rounded-lg border border-brand-border/60">
                        "{myReview.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-brand-muted italic">No written comment provided.</p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-brand-border/60">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStartEdit(myReview)}
                        icon={Pencil}
                        className="text-xs"
                      >
                        Edit Appraisal
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(myReview._id || myReview.id)}
                        disabled={isDeletingReviewId === (myReview._id || myReview.id)}
                        icon={isDeletingReviewId === (myReview._id || myReview.id) ? Loader2 : Trash2}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                      >
                        {isDeletingReviewId === (myReview._id || myReview.id) ? 'Deleting...' : 'Withdraw'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Active Submission / Edit Form */
                  <form
                    onSubmit={handleSubmitReview}
                    className="bg-brand-surface border border-brand-border/80 p-6 sm:p-7 rounded-2xl shadow-xs space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                      <div>
                        <h4 className="font-serif text-lg font-bold text-brand-black">
                          {isEditing ? 'Edit Your Appraisal' : 'Submit Client Appraisal'}
                        </h4>
                        <p className="text-xs text-brand-muted mt-0.5">
                          {isEditing
                            ? 'Update your verified score and commentary.'
                            : 'Share your genuine impressions of craftsmanship and elegance.'}
                        </p>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-xs font-semibold text-brand-muted hover:text-brand-black flex items-center gap-1 cursor-pointer"
                        >
                          <X size={14} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>

                    {/* Form Feedback Alerts */}
                    {formFeedback && (
                      <div
                        className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                          formFeedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : formFeedback.type === 'ineligible'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : formFeedback.type === 'duplicate'
                            ? 'bg-sky-50 text-sky-900 border-sky-300'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {formFeedback.type === 'success' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle
                            size={16}
                            className={`shrink-0 mt-0.5 ${
                              formFeedback.type === 'ineligible'
                                ? 'text-amber-600'
                                : formFeedback.type === 'duplicate'
                                ? 'text-sky-600'
                                : 'text-rose-600'
                            }`}
                          />
                        )}
                        <div className="flex-1 leading-relaxed">
                          <p className="font-semibold mb-0.5">
                            {formFeedback.type === 'success'
                              ? 'Appraisal Recorded'
                              : formFeedback.type === 'ineligible'
                              ? 'Verified Delivery Required'
                              : formFeedback.type === 'duplicate'
                              ? 'Duplicate Appraisal'
                              : 'Unable to Submit'}
                          </p>
                          <p>{formFeedback.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormFeedback(null)}
                          className="text-current opacity-70 hover:opacity-100 p-0.5"
                          aria-label="Dismiss message"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Interactive 1–5 Star Selector */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-2">
                        Your Rating <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((starValue) => {
                          const isFilled = (hoverRating || ratingInput) >= starValue;
                          return (
                            <button
                              key={starValue}
                              type="button"
                              onClick={() => setRatingInput(starValue)}
                              onMouseEnter={() => setHoverRating(starValue)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 text-amber-500 transition-transform hover:scale-120 focus:outline-none cursor-pointer"
                              aria-label={`Select ${starValue} stars`}
                            >
                              <Star
                                size={28}
                                className={
                                  isFilled ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="block mt-1 text-[11px] font-semibold text-brand-accent tracking-wide">
                        {(hoverRating || ratingInput) === 5 && '5 ★ — Flawless & Exceptional'}
                        {(hoverRating || ratingInput) === 4 && '4 ★ — Refined & Highly Recommended'}
                        {(hoverRating || ratingInput) === 3 && '3 ★ — Met Expectations'}
                        {(hoverRating || ratingInput) === 2 && '2 ★ — Fair, Needs Attention'}
                        {(hoverRating || ratingInput) === 1 && '1 ★ — Below Standard'}
                      </span>
                    </div>

                    {/* Optional Comment Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="review-comment"
                          className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal"
                        >
                          Impressions & Commentary (Optional)
                        </label>
                        <span className="text-[11px] text-brand-muted">
                          {commentInput.length}/1000
                        </span>
                      </div>
                      <textarea
                        id="review-comment"
                        rows={4}
                        maxLength={1000}
                        placeholder="Detail the tactile quality, ergonomics, finishing, and packaging..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-xs sm:text-sm p-3.5 border border-brand-border rounded-xl focus:outline-none focus:border-brand-black focus:ring-1 focus:ring-brand-black transition-colors"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={isSubmittingReview}
                        icon={isSubmittingReview ? Loader2 : Check}
                        className="flex-1"
                      >
                        {isSubmittingReview
                          ? 'Publishing Appraisal...'
                          : isEditing
                          ? 'Save Appraisal Changes'
                          : 'Publish Verified Appraisal'}
                      </Button>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Public Review Listing (Cols 6-12) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Controls bar: Count & Sort */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-brand-accent" />
                  <span className="text-xs sm:text-sm font-bold text-brand-black">
                    Client Testimonials ({reviews.length})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-muted hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-brand-surface border border-brand-border text-brand-black rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-black cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="highest">Highest Rating</option>
                    <option value="lowest">Lowest Rating</option>
                    <option value="oldest">Earliest First</option>
                  </select>
                </div>
              </div>

              {/* Reviews Feed */}
              {isLoadingReviews ? (
                <div className="bg-brand-surface border border-brand-border/70 p-12 rounded-2xl text-center space-y-3 shadow-xs">
                  <Loader2 size={24} className="animate-spin text-brand-accent mx-auto" />
                  <p className="text-xs sm:text-sm text-brand-muted">
                    Retrieving verified client appraisals...
                  </p>
                </div>
              ) : reviewsError ? (
                <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
                  <AlertTriangle size={24} className="text-rose-600 mx-auto" />
                  <p className="text-xs sm:text-sm text-rose-800 font-medium">{reviewsError}</p>
                  <Button variant="secondary" size="sm" onClick={fetchReviews} className="mx-auto text-xs">
                    Retry Loading
                  </Button>
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-brand-surface border border-dashed border-brand-border/90 p-12 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-cream/60 flex items-center justify-center mx-auto text-brand-accent">
                    <Star size={20} className="text-brand-accent" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-brand-black">
                    No Client Appraisals Yet
                  </h4>
                  <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
                    Be the first verified patron to share your impressions on the materials, precision, and craftsmanship of this piece.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => {
                    const reviewId = r._id || r.id;
                    const customerName = r.customer?.name || 'Verified Patron';
                    const isMyOwn =
                      user &&
                      (r.customer?._id === user._id ||
                        r.customer?._id === user.id ||
                        r.customer?.id === user._id ||
                        r.customer?.id === user.id);

                    const initials = customerName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    const reviewDate = r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recent';

                    return (
                      <div
                        key={reviewId}
                        className={`bg-brand-surface border p-5 sm:p-6 rounded-2xl shadow-xs space-y-3 transition-all ${
                          isMyOwn ? 'border-brand-accent/50 ring-1 ring-brand-accent/20' : 'border-brand-border/80'
                        }`}
                      >
                        {/* Header: Avatar, Name, Verified Badge, Date */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-charcoal text-white font-serif font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-brand-black">
                                  {customerName}
                                </span>
                                {isMyOwn && (
                                  <span className="text-[10px] uppercase tracking-wider font-semibold bg-brand-accent/15 text-brand-accent px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check size={11} className="text-emerald-600" />
                                  <span>Verified Purchase</span>
                                </span>
                              </div>
                              <span className="text-[11px] text-brand-muted block mt-0.5">
                                {reviewDate}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons for Review Owner */}
                          {isMyOwn && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(r)}
                                className="p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-offwhite rounded-md transition-colors cursor-pointer"
                                title="Edit your review"
                                aria-label="Edit review"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(reviewId)}
                                disabled={isDeletingReviewId === reviewId}
                                className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                title="Delete your review"
                                aria-label="Delete review"
                              >
                                {isDeletingReviewId === reviewId ? (
                                  <Loader2 size={14} className="animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stars */}
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < r.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'}
                            />
                          ))}
                          <span className="ml-2 text-xs font-semibold text-brand-black">
                            {r.rating}.0
                          </span>
                        </div>

                        {/* Comment Body */}
                        {r.comment && (
                          <p className="text-xs sm:text-sm text-brand-charcoal leading-relaxed font-light">
                            {r.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recommended Related Products Section */}
        <div className="mt-20 pt-14 border-t border-brand-border/60">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-semibold tracking-widest text-brand-accent mb-1 block">
              Curated Recommendations
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black">
              You May Also Admire
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}

/**
 * Top-level ProductDetails component that extracts ID and renders ProductDetailsContent with key
 */
export default function ProductDetails({ onAddToCart, onToggleWishlist }) {
  const { id } = useParams();

  const staticProduct = useMemo(() => {
    return products.find((p) => p.id === id || p._id === id) || null;
  }, [id]);

  const [fetchedProduct, setFetchedProduct] = useState(null);

  useEffect(() => {
    if (staticProduct || !id) return;

    let active = true;
    productService
      .getProductById(id)
      .then((res) => {
        if (active && res && (res.product || res)) {
          setFetchedProduct(res.product || res);
        }
      })
      .catch((err) => {
        console.warn('Unable to fetch remote product details, using default:', err);
      });

    return () => {
      active = false;
    };
  }, [id, staticProduct]);

  const product = staticProduct || fetchedProduct || products[0];

  return (
    <ProductDetailsContent
      key={product._id || product.id}
      product={product}
      onAddToCart={onAddToCart}
      onToggleWishlist={onToggleWishlist}
    />
  );
}
