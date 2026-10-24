import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  ArrowLeft,
  Trash2,
  Check,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  Share2
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ProductCard from '../components/ProductCard';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { products as catalogProducts } from '../data/products';

/**
 * Premium Responsive Wishlist Page Component
 * Features:
 * - Shared Wishlist state via React Context (WishlistContext)
 * - LocalStorage persistence
 * - Displays customer's saved products using existing ProductCard component
 * - Product image, name, price, rating, and stock availability clearly visible
 * - Heart icon removes product from wishlist with instant feedback
 * - "Add to Cart" action for each individual product + "Move All to Bag" bulk action
 * - Clean, luxury empty-wishlist state with "Continue Shopping" button and curated picks
 * - Responsive layout across all screen sizes
 * - Fully consistent with luxury champagne gold / alabaster aesthetic
 */
export default function Wishlist() {
  const { wishlistItems, wishlistCount, clearWishlist, moveAllToCart } = useWishlist();
  const { addToCart } = useCart();
  const [allAddedFeedback, setAllAddedFeedback] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter in-stock items
  const inStockCount = wishlistItems.filter((item) => item.inStock !== false).length;

  // Handle moving all items to shopping bag
  const handleMoveAllToCart = () => {
    if (wishlistItems.length === 0) return;
    const count = moveAllToCart(addToCart);
    if (count > 0) {
      setAllAddedFeedback(true);
      setTimeout(() => setAllAddedFeedback(false), 3000);
    }
  };

  // Share wishlist link feedback
  const handleShareWishlist = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Trending recommendations to showcase when wishlist is empty or at the bottom
  const recommendations = catalogProducts.slice(0, 4);

  return (
    <div className="min-h-screen bg-brand-offwhite py-10 sm:py-14 transition-colors">
      <Container size="default">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-xs font-medium text-brand-muted mb-6 overflow-x-auto whitespace-nowrap"
        >
          <Link to="/" className="hover:text-brand-black transition-colors">
            Home
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <Link to="/shop" className="hover:text-brand-black transition-colors">
            Shop
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-brand-black font-semibold">Wishlist</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-brand-border/60 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-accent">
                Curated Desires
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              <span className="text-xs text-brand-muted font-medium">Personal Collection</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-black">
                My Wishlist
              </h1>
              {wishlistCount > 0 && (
                <Badge variant="accent" size="md" className="rounded-full shadow-2xs font-bold">
                  {wishlistCount} {wishlistCount === 1 ? 'Item' : 'Items'}
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm sm:text-base text-brand-muted max-w-2xl leading-relaxed font-light">
              Your bespoke sanctuary of saved horology, handcrafted leather goods, and fine luxury
              staples. Items remain saved to your device for your next acquisition.
            </p>
          </div>

          {/* Quick Header Actions (Only when items exist) */}
          {wishlistCount > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleShareWishlist}
                className="px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-brand-charcoal hover:text-brand-black bg-brand-surface border border-brand-border hover:border-brand-charcoal rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy link to this wishlist"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                <span>{copiedLink ? 'Link Copied ✓' : 'Share'}</span>
              </button>

              <button
                type="button"
                onClick={clearWishlist}
                className="px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-brand-muted hover:text-rose-600 bg-brand-surface border border-brand-border hover:border-rose-300 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Remove all items from wishlist"
              >
                <Trash2 size={14} />
                <span>Clear Wishlist</span>
              </button>
            </div>
          )}
        </div>

        {/* Wishlist Status / Bulk Action Bar */}
        {wishlistCount > 0 && (
          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 sm:p-5 mb-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center shrink-0">
                <Heart size={20} className="fill-rose-500 text-rose-500" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-brand-black">
                  {wishlistCount} luxury {wishlistCount === 1 ? 'piece' : 'pieces'} saved
                </p>
                <p className="text-xs text-brand-muted flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{inStockCount} available for immediate express dispatch</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <Button
                variant={allAddedFeedback ? 'accent' : 'primary'}
                size="sm"
                onClick={handleMoveAllToCart}
                icon={allAddedFeedback ? Check : ShoppingBag}
                className="w-full sm:w-auto shadow-sm"
              >
                {allAddedFeedback ? 'All Added to Bag ✓' : 'Add All to Bag'}
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {wishlistCount === 0 ? (
          /* Clean Empty Wishlist State */
          <div className="bg-brand-surface border border-brand-border/60 rounded-2xl p-10 sm:p-16 text-center max-w-2xl mx-auto shadow-xs my-8 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Heart size={34} strokeWidth={1.5} className="text-brand-accent" />
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black mb-3">
              Your Wishlist is Empty
            </h2>

            <p className="text-sm sm:text-base text-brand-muted max-w-md mx-auto mb-8 leading-relaxed font-light">
              You haven&apos;t saved any luxury pieces yet. Click the heart icon on any product in our
              catalog or product details page to curate your personal collection.
            </p>

            {/* Primary Continue Shopping CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/shop" className="w-full sm:w-auto">
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

            {/* Quick Explore Collection Categories */}
            <div className="mt-12 pt-8 border-t border-brand-border/60">
              <p className="text-[11px] uppercase tracking-widest text-brand-muted font-semibold mb-4">
                Explore Signature Collections
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  'Luxury Horology',
                  'Handcrafted Goods',
                  'Fine Fragrance',
                  'Designer Eyewear',
                  'Haute Couture',
                ].map((category) => (
                  <Link
                    key={category}
                    to={`/shop?category=${encodeURIComponent(category)}`}
                    className="text-xs px-3.5 py-1.5 rounded-full bg-brand-offwhite border border-brand-border text-brand-charcoal hover:bg-brand-black hover:text-white transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Populated Wishlist Grid */
          <div>
            {/* Products Grid rendering existing ProductCard component */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
              {wishlistItems.map((product) => (
                <div key={product.id} className="relative flex flex-col">
                  {/* Existing ProductCard Component */}
                  <ProductCard
                    product={product}
                    onAddToCart={addToCart}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Actions & Continue Shopping Link */}
            <div className="mt-12 pt-8 border-t border-brand-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-accent transition-colors group"
              >
                <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Continue Shopping Catalog</span>
              </Link>

              <div className="flex items-center gap-3">
                <Link to="/cart">
                  <Button variant="outline" size="sm" icon={ShoppingBag}>
                    View Shopping Bag
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Pieces to Admire */}
        {wishlistCount > 0 && recommendations.length > 0 && (
          <div className="mt-20 pt-14 border-t border-brand-border/60">
            <div className="text-center mb-10">
              <span className="text-xs uppercase font-semibold tracking-widest text-brand-accent mb-1 block">
                Expand Your Collection
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black">
                You May Also Admire
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
              {recommendations.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        )}

        {/* Trust Badges Assurance */}
        <div className="mt-16 pt-10 border-t border-brand-border/60 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center p-4 rounded-xl bg-brand-surface/60 border border-brand-border/50">
            <Truck size={22} className="text-brand-accent mb-2" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black">
              Complimentary Courier
            </h3>
            <p className="text-xs text-brand-muted mt-1">
              White-glove delivery on orders exceeding $200
            </p>
          </div>

          <div className="flex flex-col items-center p-4 rounded-xl bg-brand-surface/60 border border-brand-border/50">
            <ShieldCheck size={22} className="text-brand-accent mb-2" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black">
              Certified Authenticity
            </h3>
            <p className="text-xs text-brand-muted mt-1">
              Archival certificate of provenance included
            </p>
          </div>

          <div className="flex flex-col items-center p-4 rounded-xl bg-brand-surface/60 border border-brand-border/50">
            <RotateCcw size={22} className="text-brand-accent mb-2" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black">
              30-Day Privilege Return
            </h3>
            <p className="text-xs text-brand-muted mt-1">
              Hassle-free complimentary returns & exchanges
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
