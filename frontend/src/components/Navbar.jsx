import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useInRouterContext } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ArrowRight,
  PackageCheck,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  Zap,
  Truck,
  Phone,
  Clock,
  ShieldCheck,
  Check,
  Loader2,
} from 'lucide-react';
import Container from './Container';
import Badge from './Badge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { productService, categoryService, orderService } from '../services/api';
import { formatImageUrl } from '../utils/imageUrl';

/**
 * SafeLink helper: Uses React Router's <Link> if running within a Router context,
 * otherwise safely falls back to standard <a> tag.
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
 * Premium Ecommerce & Quick Commerce Unified Header
 * Features:
 * - ⚡ Quick-Commerce Instant Delivery Location & Pincode Selector (saves to localStorage)
 * - ⚡ 15-25 Mins Express Courier Delivery Indicator
 * - 🔍 Live Instant Product Search with Instant Autocomplete & Image Preview from MongoDB Atlas
 * - 🚚 Real-time Active Order Tracker Pill (Live query to /api/orders/my-orders)
 * - 🛍️ Dynamic Shopping Bag with Total Amount & Hover Tooltip
 * - ❤️ Live Wishlist Counter
 * - 👑 VIP Customer Concierge Profile Dropdown with Role Portals
 * - 🧭 Live Dynamic Category Navigation Bar from MongoDB
 * - ☀️/🌙 Seamless Dark / Light Mode Switcher
 * - 🎨 Royal Champagne Gold & Silk Pearl luxury palette (Zero black!)
 */
export default function Navbar({ cartCount: propCartCount }) {
  const navigate = useNavigate();
  const { cartCount: contextCartCount, cartItems, grandTotal, subtotal } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const cartCount = propCartCount !== undefined ? propCartCount : contextCartCount;
  const displayCartAmount = grandTotal > 0 ? grandTotal : subtotal || 0;

  // Search States
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Dropdown & Modal States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCartPreviewOpen, setIsCartPreviewOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Quick Commerce Location State
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    return localStorage.getItem('premium_store_location') || 'Indiranagar, Bengaluru';
  });
  const [deliveryPincode, setDeliveryPincode] = useState(() => {
    return localStorage.getItem('premium_store_pincode') || '560038';
  });
  const [tempPincodeInput, setTempPincodeInput] = useState('');
  const [tempLocationInput, setTempLocationInput] = useState('');

  // Live Categories from MongoDB
  const [categoriesList, setCategoriesList] = useState([]);

  // Live Active Customer Order Tracker from MongoDB
  const [activeCustomerOrder, setActiveCustomerOrder] = useState(null);

  // 1. Fetch live categories from MongoDB backend API
  useEffect(() => {
    let isMounted = true;
    categoryService.getCategories({ limit: 12 })
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data?.categories) ? data.categories : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setCategoriesList(list);
        }
      })
      .catch((err) => {
        console.error('Navbar failed to load categories:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch live customer active orders from MongoDB backend API
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user) {
      orderService.getMyOrders({ limit: 5 })
        .then((res) => {
          if (!isMounted) return;
          const orders = res?.orders || (Array.isArray(res) ? res : []);
          // Find first order that is actively in progress
          const activeOrder = orders.find((o) => {
            const st = (o.status || '').toLowerCase();
            return ['pending', 'confirmed', 'processing', 'packed', 'ready for pickup', 'shipped'].includes(st);
          });
          setActiveCustomerOrder(activeOrder || null);
        })
        .catch(() => {
          // Graceful fallback
        });
    } else {
      setActiveCustomerOrder(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  // 3. Debounced Live Instant Product Search directly querying MongoDB Atlas
  useEffect(() => {
    const query = navSearchQuery.trim();
    if (!query || query.length < 2) {
      setLiveSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      productService.getProducts({ search: query, limit: 5 })
        .then((res) => {
          const products = res?.products || [];
          setLiveSearchResults(products);
          setIsSearchDropdownOpen(true);
        })
        .catch((err) => {
          console.error('Live search error:', err);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [navSearchQuery]);

  // Close live search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavSearchSubmit = (e) => {
    e.preventDefault();
    const query = navSearchQuery.trim();
    setIsSearchDropdownOpen(false);
    setIsMobileMenuOpen(false);
    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/shop');
    }
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    const loc = tempLocationInput.trim() || 'Sector 62, Central Hub';
    const pin = tempPincodeInput.trim() || '452001';
    setDeliveryLocation(loc);
    setDeliveryPincode(pin);
    localStorage.setItem('premium_store_location', loc);
    localStorage.setItem('premium_store_pincode', pin);
    setIsLocationModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#FAF4E8] via-[#F5E8D2] to-[#ECE0C8] border-b border-[#D4AF37]/60 shadow-[0_6px_30px_rgba(180,140,70,0.15)] transition-all">
      {/* 1. Quick-Commerce Top Utility & Express Dispatch Bar */}
      <div className="bg-[#EFE3CA]/80 border-b border-[#D8C49E]/50 px-4 py-1.5 text-xs">
        <Container size="default">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Quick-Commerce Location Selector & 15-min Dispatch */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setTempLocationInput(deliveryLocation);
                  setTempPincodeInput(deliveryPincode);
                  setIsLocationModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 hover:bg-white border border-[#D4AF37]/50 text-[#382B1D] font-semibold text-[11px] transition-all cursor-pointer shadow-2xs group"
                title="Change Quick Delivery Location"
              >
                <MapPin size={12} className="text-[#A8791E] group-hover:scale-110 transition-transform" />
                <span>Deliver to:</span>
                <span className="font-bold text-[#241A10] underline decoration-[#D4AF37] decoration-1 underline-offset-2">
                  {deliveryLocation} ({deliveryPincode})
                </span>
                <ChevronDown size={11} className="text-[#A8791E]" />
              </button>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-600/30 text-[11px] font-bold text-[#5C4010]">
                <Zap size={12} className="text-amber-600 animate-pulse fill-amber-500" />
                <span>15-25 Mins Express Courier</span>
              </div>
            </div>

            {/* Right: Live Customer Active Order Pulse & VIP Concierge */}
            <div className="flex items-center gap-3 ml-auto">
              {activeCustomerOrder ? (
                <SafeLink
                  to={`/orders/${activeCustomerOrder._id}/track`}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-600/40 text-[11px] font-bold text-emerald-900 transition-all shadow-2xs animate-pulse"
                  title="Track your active order in real time"
                >
                  <Truck size={12} className="text-emerald-700" />
                  <span>Order #{String(activeCustomerOrder._id).slice(-5)}:</span>
                  <span className="uppercase text-[10px] tracking-wider text-emerald-950 font-black">
                    {activeCustomerOrder.status}
                  </span>
                  <span className="text-[10px] underline font-bold">&rarr; Track</span>
                </SafeLink>
              ) : (
                <div className="hidden md:flex items-center gap-1 text-[11px] text-[#7C6348] font-medium">
                  <ShieldCheck size={12} className="text-[#A8791E]" />
                  <span>100% Authentic Luxury Guarantee</span>
                </div>
              )}

              <a
                href="tel:18002660000"
                className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-[#5C4010] hover:text-[#A8791E] transition-colors"
                title="Call 24/7 VIP Concierge Support"
              >
                <Phone size={11} className="text-[#A8791E]" />
                <span>Concierge: 1800-LUXURY</span>
              </a>

              {/* Dark/Light mode toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1 text-[#382B1D] hover:text-[#A8791E] rounded-md transition-all cursor-pointer"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} />}
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* 2. Main Navigation Bar with Live Instant Search */}
      <Container size="default">
        <div className="flex items-center justify-between gap-4 h-20">
          {/* Mobile Hamburger Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-[#2D2115] hover:text-[#B4842E] transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <SafeLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E2B755] via-[#C9972C] to-[#9E6E16] p-[2px] shadow-sm shadow-[#C9972C]/30 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#FAF5EC] rounded-[10px] flex items-center justify-center">
                  <span className="font-serif font-black text-[#A8791E] text-xl">
                    P
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#241A10] group-hover:text-[#A8791E] transition-colors leading-none">
                  Premium Store
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#8E6A2B] font-bold mt-1">
                  Royal Luxury Atelier
                </span>
              </div>
            </SafeLink>
          </div>

          {/* Center: Live Instant Quick-Commerce Product Search Bar */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl mx-4 relative">
            <form onSubmit={handleNavSearchSubmit} className="w-full relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (liveSearchResults.length > 0) setIsSearchDropdownOpen(true);
                  }}
                  placeholder="Search 35+ luxury watches, apparel, perfumes & pantry..."
                  className="w-full bg-white/90 focus:bg-white border-2 border-[#D4AF37]/50 focus:border-[#C9972C] rounded-2xl pl-11 pr-24 py-2.5 text-xs text-[#241A10] font-medium placeholder-[#8E7658] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9972C]/20 transition-all"
                />
                <Search size={16} className="absolute left-4 text-[#8E6A2B] pointer-events-none" />

                {isSearching ? (
                  <Loader2 size={15} className="absolute right-20 text-[#A8791E] animate-spin" />
                ) : navSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNavSearchQuery('');
                      setLiveSearchResults([]);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-20 text-[#8E7658] hover:text-[#241A10] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                ) : null}

                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] hover:from-[#B47C1E] hover:to-[#C9972C] text-[#241A10] font-bold text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>Search</span>
                </button>
              </div>
            </form>

            {/* Instant Live Dropdown Results Preview */}
            {isSearchDropdownOpen && navSearchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#FAF5EB] border-2 border-[#D4AF37]/60 rounded-2xl shadow-2xl py-3 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-4 pb-2 border-b border-[#D8C49E]/50 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E6A2B]">
                    Instant Matches ({liveSearchResults.length})
                  </span>
                  <span className="text-[10px] text-[#7C6348] font-medium">Live from MongoDB</span>
                </div>

                {liveSearchResults.length > 0 ? (
                  <div className="divide-y divide-[#D8C49E]/30">
                    {liveSearchResults.map((prod) => (
                      <SafeLink
                        key={prod._id || prod.id}
                        to={`/product/${prod._id || prod.id}`}
                        onClick={() => {
                          setIsSearchDropdownOpen(false);
                          setNavSearchQuery('');
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#EEDBB8]/60 transition-colors group"
                      >
                        <img
                          src={formatImageUrl(prod.image) || '/placeholder.png'}
                          alt={prod.name}
                          className="w-11 h-11 rounded-lg object-cover bg-white border border-[#D4AF37]/40 shrink-0"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#241A10] group-hover:text-[#A8791E] transition-colors truncate">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-[#7C6348] font-medium truncate">
                            {prod.category} • <span className="font-bold text-[#A8791E]">${prod.price}</span>
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-600/30">
                          {prod.stock > 0 ? 'In Stock' : 'Pre-Order'}
                        </span>
                      </SafeLink>
                    ))}

                    <div className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={handleNavSearchSubmit}
                        className="text-xs font-bold text-[#A8791E] hover:underline flex items-center justify-center gap-1 w-full py-1 cursor-pointer"
                      >
                        <span>View all matching products in Catalog</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#7C6348]">
                    No exact luxury pieces found for "{navSearchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons: Wishlist, Cart with Total, VIP Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Wishlist Icon */}
            <SafeLink
              to="/wishlist"
              className="p-2.5 text-[#382B1D] hover:text-rose-600 hover:bg-[#E7D4B0]/60 rounded-xl transition-all relative inline-flex items-center focus:outline-none"
              aria-label="Wishlist"
              title="Saved Wishlist Pieces"
            >
              <Heart size={19} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-xs px-1">
                  {wishlistCount}
                </span>
              )}
            </SafeLink>

            {/* Shopping Bag / Cart Icon with Live Value */}
            <div
              className="relative"
              onMouseEnter={() => setIsCartPreviewOpen(true)}
              onMouseLeave={() => setIsCartPreviewOpen(false)}
            >
              <SafeLink
                to="/cart"
                className="flex items-center gap-2 px-3 py-2 text-[#382B1D] hover:text-[#8E6A2B] bg-white/70 hover:bg-white border border-[#D4AF37]/50 rounded-xl transition-all shadow-2xs focus:outline-none"
                aria-label="Shopping Cart"
                title="Open Shopping Bag"
              >
                <div className="relative">
                  <ShoppingBag size={19} className="text-[#A8791E]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] flex items-center justify-center text-[9px] font-black bg-gradient-to-r from-[#B47C1E] to-[#E2A638] text-white rounded-full shadow-xs px-1">
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-[10px] text-[#7C6348] font-semibold">Cart</span>
                  <span className="text-xs font-black text-[#241A10]">
                    ${typeof displayCartAmount === 'number' ? displayCartAmount.toLocaleString() : displayCartAmount}
                  </span>
                </div>
              </SafeLink>

              {/* Quick Hover Tooltip preview */}
              {isCartPreviewOpen && cartCount > 0 && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF5EB] border-2 border-[#D4AF37]/60 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D8C49E]/50">
                    <span className="text-xs font-bold text-[#241A10]">Bag ({cartCount} items)</span>
                    <span className="text-xs font-bold text-[#A8791E]">${displayCartAmount.toLocaleString()}</span>
                  </div>
                  <div className="py-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {cartItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-[#382B1D]">
                        <span className="truncate max-w-[150px] font-medium">{item.name}</span>
                        <span className="text-[#7C6348]">x{item.quantity} • ${item.price}</span>
                      </div>
                    ))}
                    {cartItems.length > 3 && (
                      <p className="text-[10px] text-[#8E6A2B] font-semibold">+{cartItems.length - 3} more items...</p>
                    )}
                  </div>
                  <SafeLink
                    to="/checkout"
                    className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-xs flex items-center justify-center gap-1 shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <span>Instant Checkout</span>
                    <ArrowRight size={13} />
                  </SafeLink>
                </div>
              )}
            </div>

            {/* VIP Customer Profile & Dropdown */}
            {isAuthenticated && user ? (
              <div
                className="relative"
                onMouseEnter={() => setIsAccountDropdownOpen(true)}
                onMouseLeave={() => setIsAccountDropdownOpen(false)}
              >
                <SafeLink
                  to="/account"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-[#D4AF37]/60 text-xs font-bold text-[#241A10] transition-all shadow-xs"
                  title={`Logged in as ${user.name}`}
                >
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E2B755] to-[#9E6E16] text-white text-[11px] flex items-center justify-center font-bold shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span className="text-[10px] text-[#8E6A2B] font-bold">VIP Client</span>
                    <span className="max-w-[75px] truncate font-black">{user.name.split(' ')[0]}</span>
                  </div>
                  <ChevronDown size={12} className="text-[#A8791E]" />
                </SafeLink>

                {/* VIP Dropdown Menu */}
                {isAccountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#FAF5EB] border-2 border-[#D4AF37]/60 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="pb-2.5 mb-2 border-b border-[#D8C49E]/50">
                      <p className="text-xs font-bold text-[#241A10]">{user.name}</p>
                      <p className="text-[10px] text-[#7C6348] truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#E2B755]/25 text-[#5C4010] border border-[#C9972C]/40">
                        {user.role === 'admin' ? 'Store Administrator' : user.role === 'vendor' ? 'Verified Merchant' : user.role === 'delivery_boy' ? 'Express Courier Rider' : 'Privileged VIP Member'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <SafeLink
                        to="/orders"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-colors"
                      >
                        <PackageCheck size={14} className="text-[#A8791E]" />
                        <span>My Orders & Live Tracking</span>
                      </SafeLink>

                      <SafeLink
                        to="/wishlist"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-colors"
                      >
                        <Heart size={14} className="text-rose-500" />
                        <span>Saved Wishlist ({wishlistCount})</span>
                      </SafeLink>

                      <SafeLink
                        to="/account"
                        onClick={() => setIsAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-colors"
                      >
                        <User size={14} className="text-[#A8791E]" />
                        <span>Profile & Security</span>
                      </SafeLink>

                      {/* Privileged Role Portals */}
                      {user.role === 'admin' && (
                        <SafeLink
                          to="/admin/orders"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#5C4010] bg-[#E2B755]/20 hover:bg-[#E2B755]/30 transition-colors"
                        >
                          <Sparkles size={14} className="text-[#A8791E]" />
                          <span>Admin Control Center</span>
                        </SafeLink>
                      )}

                      {user.role === 'vendor' && (
                        <SafeLink
                          to="/vendor/dashboard"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                        >
                          <Sparkles size={14} className="text-emerald-700" />
                          <span>Vendor Merchant Hub</span>
                        </SafeLink>
                      )}

                      {user.role === 'delivery_boy' && (
                        <SafeLink
                          to="/delivery/dashboard"
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#5C4010] bg-[#E2B755]/20 hover:bg-[#E2B755]/30 transition-colors"
                        >
                          <Truck size={14} className="text-[#A8791E]" />
                          <span>Rider Dispatch Portal</span>
                        </SafeLink>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-[#D8C49E]/50">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsAccountDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
                      >
                        <LogOut size={14} />
                        <span>Sign Out of Atelier</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SafeLink
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] via-[#DDB04E] to-[#B47C1E] hover:from-[#B47C1E] hover:to-[#9E6E16] text-[#241A10] font-bold text-xs shadow-md shadow-[#C9972C]/30 transition-all border border-[#F3DE9D]"
                aria-label="Account / Sign In"
                title="Account / Sign In"
              >
                <User size={15} className="text-[#241A10]" />
                <span>Sign In</span>
              </SafeLink>
            )}
          </div>
        </div>
      </Container>

      {/* 3. Quick-Commerce Category Ticker & Flash Navigation */}
      <div className="bg-[#FAF5EC]/90 border-t border-[#D8C49E]/40 px-4 py-2 overflow-x-auto scrollbar-none">
        <Container size="default">
          <div className="flex items-center gap-2 sm:gap-4 text-xs whitespace-nowrap">
            {/* All Collections Dropdown */}
            <div
              className="relative shrink-0"
              onMouseEnter={() => setIsCatDropdownOpen(true)}
              onMouseLeave={() => setIsCatDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#E2B755]/25 border border-[#C9972C]/40 text-[#5C4010] font-black text-xs hover:bg-[#E2B755]/40 transition-all cursor-pointer"
              >
                <Menu size={13} />
                <span>All Collections</span>
                <ChevronDown size={11} />
              </button>

              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-[#FAF5EB] border-2 border-[#D4AF37]/50 rounded-2xl shadow-xl py-2 px-2 z-50">
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {categoriesList.map((cat) => (
                      <SafeLink
                        key={cat._id || cat.slug || cat.name}
                        to={`/shop?category=${encodeURIComponent(cat.name)}`}
                        onClick={() => setIsCatDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-colors"
                      >
                        <span className="truncate">{cat.name}</span>
                        {cat.productCount > 0 && (
                          <span className="text-[10px] text-[#A8791E] font-bold">{cat.productCount}</span>
                        )}
                      </SafeLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <SafeLink
              to="/shop"
              className="text-xs font-bold text-[#382B1D] hover:text-[#A8791E] px-2 py-1 rounded-lg hover:bg-white/60 transition-colors"
            >
              Shop All Catalog
            </SafeLink>

            {/* Dynamic Category Quick Pills */}
            {categoriesList.slice(0, 6).map((cat) => (
              <SafeLink
                key={cat._id || cat.slug || cat.name}
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="text-xs font-semibold text-[#5C452C] hover:text-[#241A10] px-2 py-1 rounded-lg hover:bg-white/60 transition-colors"
              >
                {cat.name}
              </SafeLink>
            ))}

            <div className="ml-auto hidden xl:flex items-center gap-2 text-[11px] font-bold text-[#8E6A2B]">
              <Sparkles size={12} className="text-[#A8791E]" />
              <span>Free Delivery on orders above $200</span>
            </div>
          </div>
        </Container>
      </div>

      {/* 4. Quick-Commerce Delivery Location Selector Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF5EB] border-2 border-[#D4AF37]/70 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-[#7C6348] hover:text-[#241A10] cursor-pointer rounded-full hover:bg-[#EEDBB8]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-[#A8791E]">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#241A10]">
                  Select Delivery Location
                </h3>
                <p className="text-xs text-[#7C6348]">
                  Check live courier dispatch & 15-min delivery availability
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#382B1D] mb-1">
                  Delivery Area / Apartment
                </label>
                <input
                  type="text"
                  value={tempLocationInput}
                  onChange={(e) => setTempLocationInput(e.target.value)}
                  placeholder="e.g. Indiranagar, Bengaluru / Sector 62, Noida"
                  className="w-full bg-white border border-[#D4AF37]/60 rounded-xl px-3 py-2 text-xs font-medium text-[#241A10] focus:outline-none focus:ring-2 focus:ring-[#C9972C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#382B1D] mb-1">
                  Postal Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={tempPincodeInput}
                  onChange={(e) => setTempPincodeInput(e.target.value)}
                  placeholder="e.g. 560038 / 110001"
                  className="w-full bg-white border border-[#D4AF37]/60 rounded-xl px-3 py-2 text-xs font-medium text-[#241A10] focus:outline-none focus:ring-2 focus:ring-[#C9972C]"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8E6A2B] tracking-wider mb-2">
                  Popular Hubs
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { loc: 'Indiranagar, Bengaluru', pin: '560038' },
                    { loc: 'Bandra West, Mumbai', pin: '400050' },
                    { loc: 'Connaught Place, Delhi', pin: '110001' },
                    { loc: 'Vijay Nagar, Indore', pin: '452010' },
                  ].map((hub) => (
                    <button
                      key={hub.pin}
                      type="button"
                      onClick={() => {
                        setTempLocationInput(hub.loc);
                        setTempPincodeInput(hub.pin);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#D8C49E] text-[11px] font-semibold text-[#382B1D] hover:bg-[#E2B755]/20 hover:border-[#C9972C] transition-colors cursor-pointer"
                    >
                      {hub.loc.split(',')[0]} ({hub.pin})
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#D8C49E]/50">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7C6348] hover:text-[#241A10] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-xs shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Confirm Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[#D8C49E]/60 bg-[#FAF5EB] py-5 px-6 animate-in slide-in-from-top duration-300 shadow-2xl">
          {/* Mobile Search Form */}
          <form onSubmit={handleNavSearchSubmit} className="flex items-center gap-2 pb-4 mb-3 border-b border-[#D8C49E]/40">
            <input
              type="text"
              value={navSearchQuery}
              onChange={(e) => setNavSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="flex-1 bg-white border border-[#D4AF37]/60 rounded-xl px-3 py-2 text-xs font-medium text-[#241A10] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-xs shrink-0"
            >
              Search
            </button>
          </form>

          {/* Mobile Delivery Location Pill */}
          <div className="mb-4 p-2.5 rounded-xl bg-white/70 border border-[#D4AF37]/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <MapPin size={14} className="text-[#A8791E]" />
              <span className="font-bold text-[#241A10]">{deliveryLocation}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLocationModalOpen(true);
              }}
              className="text-[10px] font-bold text-[#A8791E] underline cursor-pointer"
            >
              Change
            </button>
          </div>

          <nav className="flex flex-col space-y-2.5">
            <SafeLink
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5"
            >
              Home
            </SafeLink>
            <SafeLink
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5"
            >
              Shop All Products
            </SafeLink>
            <SafeLink
              to="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5"
            >
              Explore Collections
            </SafeLink>

            {isAuthenticated ? (
              <div className="pt-3 border-t border-[#D8C49E]/50 space-y-2">
                <SafeLink
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-bold text-[#241A10] py-1"
                >
                  <PackageCheck size={16} className="text-[#A8791E]" />
                  <span>My Orders & Tracking</span>
                </SafeLink>
                <SafeLink
                  to="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-bold text-[#241A10] py-1"
                >
                  <User size={16} className="text-[#A8791E]" />
                  <span>Account Profile</span>
                </SafeLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-rose-700 py-1 text-left cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <SafeLink
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-2 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-center text-xs"
              >
                Sign In to Account
              </SafeLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
