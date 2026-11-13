import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useInRouterContext } from 'react-router-dom';
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
  Zap,
  Store,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Container from './Container';
import Badge from './Badge';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { categoryService } from '../services/api';

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
 * Ultra-Premium Animated Royal Luxury Ecommerce Navbar
 * Features:
 * - Royal Champagne Gold & Silk Pearl Luxury Palette (#FAF4E8 to #F5E8D2 with 24K Gold Accents #D4AF37)
 * - Zero Black on Customer Dashboard Header
 * - Subtle animations: Gold underline slider, badge pulse/bounce, sparkle spin, category hover lift
 * - Core Shopper Navigation: Home, Shop, New Arrivals, Categories (Mega Dropdown), Trending
 * - Vendor Onboarding: Cleanly housed in Profile Dropdown & Mobile Menu to keep primary shopping header pristine
 * - Live MongoDB Category Filtering Sub-Header with piece counts
 * - Smooth search overlay with quick suggestion tags
 */
export default function Navbar({ cartCount: propCartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentCategoryParam = new URLSearchParams(location.search).get('category') || '';
  const currentSortParam = new URLSearchParams(location.search).get('sort') || '';
  const { cartCount: contextCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const cartCount = propCartCount !== undefined ? propCartCount : contextCartCount;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const userDropdownRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch live categories from backend API / MongoDB
  useEffect(() => {
    let isMounted = true;
    categoryService
      .getCategories({ limit: 12 })
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

  const handleNavSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = navSearchQuery.trim();
    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/shop');
    }
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleQuickTagSearch = (tag) => {
    setNavSearchQuery(tag);
    navigate(`/shop?search=${encodeURIComponent(tag)}`);
    setIsSearchOpen(false);
  };

  return (
    <header className="royal-customer-header sticky top-0 z-50 w-full bg-gradient-to-r from-[#FAF4E8] via-[#F5E8D2] to-[#ECE0C8] border-b border-[#D4AF37]/60 shadow-[0_6px_30px_rgba(180,140,70,0.15)] transition-all">
      <Container size="default" className="!px-3 sm:!px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Left: Mobile Hamburger & Brand Logo (Grouped together so "Premium Store" is never overridden or squished) */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-1 text-[#2D2115] hover:text-[#B4842E] transition-colors focus:outline-none cursor-pointer rounded-xl hover:bg-[#E7D4B0]/50 md:hidden shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Brand Logo with 3D Hover & Gold Shadow (Attractive & Crisp) */}
            <SafeLink to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#E2B755] via-[#C9972C] to-[#9E6E16] p-[2px] shadow-sm shadow-[#C9972C]/40 group-hover:scale-105 group-hover:shadow-[0_0_18px_rgba(201,151,44,0.5)] transition-all duration-300 shrink-0">
                <div className="w-full h-full bg-[#FAF5EC] rounded-[10px] flex items-center justify-center">
                  <span className="font-serif font-black text-[#A8791E] text-base sm:text-xl group-hover:scale-110 transition-transform">
                    P
                  </span>
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base sm:text-xl md:text-2xl font-black tracking-tight text-[#1F160E] group-hover:text-[#A8791E] transition-colors leading-none whitespace-nowrap drop-shadow-2xs">
                    Premium Store
                  </span>
                  <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#C9972C] animate-pulse shrink-0" />
                </div>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[#8E6A2B] font-bold mt-0.5 whitespace-nowrap hidden xs:inline-block">
                  Royal Luxury Atelier
                </span>
              </div>
            </SafeLink>
          </div>

          {/* Primary Shopper Navigation Links (Home, Shop, New Arrivals, Categories, Trending) */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {/* 1. Home */}
            <SafeLink
              to="/"
              className={`text-xs uppercase tracking-widest font-bold py-2 relative group transition-colors ${
                location.pathname === '/' ? 'text-[#8C6214] font-black' : 'text-[#382B1D] hover:text-[#A8791E]'
              }`}
            >
              <span>Home</span>
              <span
                className={`absolute bottom-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9972C] via-[#E2B755] to-[#C9972C] transition-all duration-300 shadow-[0_0_8px_rgba(201,151,44,0.6)] ${
                  location.pathname === '/' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </SafeLink>

            {/* 2. Shop (All Collections) */}
            <SafeLink
              to="/shop"
              className={`text-xs uppercase tracking-widest font-bold py-2 relative group transition-colors ${
                location.pathname === '/shop' && !currentSortParam && !currentCategoryParam
                  ? 'text-[#8C6214] font-black'
                  : 'text-[#382B1D] hover:text-[#A8791E]'
              }`}
            >
              <span>Shop</span>
              <span
                className={`absolute bottom-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9972C] via-[#E2B755] to-[#C9972C] transition-all duration-300 shadow-[0_0_8px_rgba(201,151,44,0.6)] ${
                  location.pathname === '/shop' && !currentSortParam && !currentCategoryParam
                    ? 'w-full'
                    : 'w-0 group-hover:w-full'
                }`}
              />
            </SafeLink>

            {/* 3. New Arrivals (Crucial E-Commerce Feature with Animated Badge) */}
            <SafeLink
              to="/shop?sort=newest"
              className={`flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold py-2 relative group transition-colors ${
                currentSortParam === 'newest' ? 'text-[#8C6214] font-black' : 'text-[#382B1D] hover:text-[#A8791E]'
              }`}
            >
              <span>New In</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[8.5px] font-black tracking-normal bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] shadow-2xs group-hover:scale-105 transition-transform animate-pulse">
                NEW
              </span>
              <span
                className={`absolute bottom-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9972C] via-[#E2B755] to-[#C9972C] transition-all duration-300 shadow-[0_0_8px_rgba(201,151,44,0.6)] ${
                  currentSortParam === 'newest' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </SafeLink>

            {/* 4. Categories Link with Animated Mega Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsCatDropdownOpen(true)}
              onMouseLeave={() => setIsCatDropdownOpen(false)}
            >
              <SafeLink
                to="/categories"
                className={`flex items-center gap-1 text-xs uppercase tracking-widest font-bold py-2 relative group transition-colors ${
                  location.pathname === '/categories' || (currentCategoryParam && location.pathname === '/shop')
                    ? 'text-[#8C6214] font-black'
                    : 'text-[#382B1D] hover:text-[#A8791E]'
                }`}
              >
                <span>Categories</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isCatDropdownOpen ? 'rotate-180 text-[#A8791E]' : ''
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9972C] via-[#E2B755] to-[#C9972C] transition-all duration-300 shadow-[0_0_8px_rgba(201,151,44,0.6)] ${
                    location.pathname === '/categories' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </SafeLink>

              {/* Animated Mega Dropdown Panel */}
              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 w-72 bg-[#FAF5EB] border-2 border-[#D4AF37]/60 rounded-2xl shadow-2xl py-3 px-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-3 py-1.5 border-b border-[#D8C49E]/50 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E6A2B]">
                      Curated Collections
                    </span>
                    <SafeLink
                      to="/categories"
                      onClick={() => setIsCatDropdownOpen(false)}
                      className="text-[10px] font-bold text-[#A8791E] hover:underline flex items-center gap-0.5"
                    >
                      <span>View All</span>
                      <ArrowRight size={10} />
                    </SafeLink>
                  </div>

                  <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
                    {categoriesList.length > 0 ? (
                      categoriesList.map((cat) => (
                        <SafeLink
                          key={cat._id || cat.slug || cat.name}
                          to={`/shop?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setIsCatDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:text-[#1F160E] hover:bg-[#EEDBB8]/60 hover:translate-x-1 transition-all duration-150"
                        >
                          <span className="truncate">{cat.name}</span>
                          {cat.productCount !== undefined && cat.productCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5CF9F] text-[#5C4215] font-mono font-bold">
                              {cat.productCount}
                            </span>
                          )}
                        </SafeLink>
                      ))
                    ) : (
                      ['Luxury Horology', 'Handcrafted Goods', 'Fine Fragrance', 'Designer Eyewear', 'Haute Couture'].map((c) => (
                        <SafeLink
                          key={c}
                          to={`/shop?category=${encodeURIComponent(c)}`}
                          onClick={() => setIsCatDropdownOpen(false)}
                          className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:text-[#1F160E] hover:bg-[#EEDBB8]/60 hover:translate-x-1 transition-all duration-150"
                        >
                          {c}
                        </SafeLink>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Trending / Best Sellers */}
            <SafeLink
              to="/shop?sort=trending"
              className={`flex items-center gap-1 text-xs uppercase tracking-widest font-bold py-2 relative group transition-colors ${
                currentSortParam === 'trending' ? 'text-[#8C6214] font-black' : 'text-[#382B1D] hover:text-[#A8791E]'
              }`}
            >
              <TrendingUp size={13} className="text-[#C9972C] group-hover:scale-110 transition-transform" />
              <span>Trending</span>
              <span
                className={`absolute bottom-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-[#C9972C] via-[#E2B755] to-[#C9972C] transition-all duration-300 shadow-[0_0_8px_rgba(201,151,44,0.6)] ${
                  currentSortParam === 'trending' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </SafeLink>

            {/* 6. Vendor Portal (Only visible if logged-in user is a vendor) */}
            {isAuthenticated && user?.role === 'vendor' && (
              <SafeLink
                to="/vendor/dashboard"
                className="text-xs uppercase tracking-widest font-bold text-emerald-800 hover:text-emerald-950 transition-colors py-2 relative group"
              >
                <span>Vendor Portal</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-full"></span>
              </SafeLink>
            )}
          </nav>

          {/* Action Icons (Search, Theme Toggle, Wishlist, Cart, Orders, User Menu) */}
          <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
            {/* Search Icon / Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 sm:p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all hover:scale-105 focus:outline-none cursor-pointer"
              aria-label="Search"
              title="Search luxury collections"
            >
              <Search size={18} className="sm:w-[19px] sm:h-[19px]" />
            </button>

            {/* Dark/Light Mode Toggle with Smooth Rotate Animation (Desktop; also in mobile drawer) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all duration-300 focus:outline-none cursor-pointer relative group hidden sm:inline-flex"
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={19} className="text-[#C9972C] group-hover:rotate-90 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(201,151,44,0.6)]" />
              ) : (
                <Moon size={19} className="text-[#382B1D] group-hover:-rotate-45 transition-transform duration-500" />
              )}
            </button>

            {/* Wishlist Icon with Heart Animation */}
            <SafeLink
              to="/wishlist"
              className="p-2.5 text-[#382B1D] hover:text-rose-600 hover:bg-[#E7D4B0]/60 rounded-xl transition-all hidden sm:inline-flex relative items-center focus:outline-none group hover:scale-105"
              aria-label="Wishlist"
              title="Saved Wishlist Pieces"
            >
              <Heart size={19} className="group-hover:scale-110 transition-transform" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-xs px-1 animate-badge-pulse">
                  {wishlistCount}
                </span>
              )}
            </SafeLink>

            {/* Shopping Cart Icon with Pulse Badge */}
            <SafeLink
              to="/cart"
              className="p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all relative inline-flex items-center focus:outline-none group hover:scale-105"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-[#B47C1E] to-[#E2A638] text-white rounded-full shadow-xs px-1 animate-badge-pulse">
                  {cartCount}
                </span>
              )}
            </SafeLink>

            {/* Track Orders Quick Pill (Desktop) */}
            <SafeLink
              to="/orders"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white hover:-translate-y-0.5 border border-[#D4AF37]/50 text-xs font-bold text-[#382B1D] transition-all shadow-2xs hover:shadow-sm"
              title="View and track your orders"
            >
              <PackageCheck size={14} className="text-[#A8791E]" />
              <span>Track Orders</span>
            </SafeLink>

            {/* User Account / Profile Floating Menu */}
            {isAuthenticated && user ? (
              <div className="relative pl-1" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/85 hover:bg-white border border-[#D4AF37]/60 text-xs font-bold text-[#241A10] transition-all shadow-xs hover:shadow-md cursor-pointer group"
                  aria-label="User Account Menu"
                >
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E2B755] to-[#9E6E16] text-white text-[11px] flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="max-w-[85px] truncate font-semibold hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-[#8E6A2B] transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Animated Luxury Account Dropdown */}
                {isUserDropdownOpen && (
                  <div
                    onMouseLeave={() => setIsUserDropdownOpen(false)}
                    className="absolute right-0 top-full mt-1.5 w-64 bg-[#FAF5EB] border-2 border-[#D4AF37]/60 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <div className="px-3 py-2 border-b border-[#D8C49E]/50 mb-1">
                      <p className="text-xs font-black text-[#241A10] truncate">{user.name}</p>
                      <p className="text-[10px] text-[#7C6348] truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#EEDBB8] text-[#5C4215]">
                        {user.role === 'admin'
                          ? 'Administrator'
                          : user.role === 'vendor'
                          ? 'Official Merchant'
                          : user.role === 'delivery_boy'
                          ? 'Delivery Dispatcher'
                          : 'Valued Patron'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <SafeLink
                        to="/account"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 hover:text-[#1F160E] transition-colors"
                      >
                        <User size={14} className="text-[#A8791E]" />
                        <span>My Profile & Details</span>
                      </SafeLink>

                      <SafeLink
                        to="/orders"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 hover:text-[#1F160E] transition-colors"
                      >
                        <PackageCheck size={14} className="text-[#A8791E]" />
                        <span>Track My Orders</span>
                      </SafeLink>

                      <SafeLink
                        to="/wishlist"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:bg-[#EEDBB8]/60 hover:text-[#1F160E] transition-colors"
                      >
                        <Heart size={14} className="text-rose-500" />
                        <span>Saved Wishlist ({wishlistCount})</span>
                      </SafeLink>

                      {/* Sell With Us / Become a Vendor (cleanly housed here) */}
                      {user.role !== 'vendor' && user.role !== 'admin' && (
                        <SafeLink
                          to="/vendor/register"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#6D4C13] bg-[#EEDBB8]/40 hover:bg-[#EEDBB8] transition-colors border border-[#D4AF37]/30 my-1"
                        >
                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-[#A8791E]" />
                            <span>Sell With Us</span>
                          </div>
                          <span className="text-[9px] uppercase tracking-wider text-[#A8791E] font-black">
                            Vendor &rarr;
                          </span>
                        </SafeLink>
                      )}

                      {/* Role Portals */}
                      {user.role === 'admin' && (
                        <SafeLink
                          to="/admin/orders"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#5C4010] bg-[#E2B755]/20 hover:bg-[#E2B755]/30 transition-colors"
                        >
                          <ShieldCheck size={14} />
                          <span>Admin Orders Ledger</span>
                        </SafeLink>
                      )}

                      {user.role === 'vendor' && (
                        <SafeLink
                          to="/vendor/dashboard"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                        >
                          <Store size={14} />
                          <span>Merchant Portal</span>
                        </SafeLink>
                      )}
                    </div>

                    <div className="pt-1.5 mt-1 border-t border-[#D8C49E]/50">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Sign In Button */}
                <SafeLink
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] via-[#DDB04E] to-[#B47C1E] hover:from-[#B47C1E] hover:to-[#9E6E16] text-[#241A10] font-bold text-xs shadow-md shadow-[#C9972C]/30 hover:scale-[1.02] transition-all border border-[#F3DE9D] shrink-0"
                  aria-label="Account / Sign In"
                  title="Account / Sign In"
                >
                  <User size={15} className="text-[#241A10]" />
                  <span>Sign In</span>
                </SafeLink>
                {/* Mobile Compact User Icon Button */}
                <SafeLink
                  to="/login"
                  className="sm:hidden p-2 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all flex items-center justify-center border border-[#D4AF37]/50"
                  aria-label="Account / Sign In"
                  title="Account / Sign In"
                >
                  <User size={17} className="text-[#8E6A2B]" />
                </SafeLink>
              </>
            )}
          </div>
        </div>
      </Container>

      {/* Royal Champagne Category Filtering Sub-Header (Live MongoDB API Integration with Smooth Touch Glide) */}
      <div className="bg-[#FAF4E8]/95 backdrop-blur-md border-t border-[#D8C49E]/50 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-none shadow-2xs touch-pan-x overscroll-x-contain">
        <Container size="default">
          <div className="flex items-center gap-2 sm:gap-3 text-xs whitespace-nowrap">
            {/* Quick label with Spinning Gold Sparkle */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-[#8E6A2B] pr-2.5 border-r border-[#D8C49E]/60 shrink-0">
              <Sparkles size={13} className="text-[#C9972C] animate-sparkle-spin" />
              <span className="uppercase tracking-wider">Collections:</span>
            </div>

            {/* "All Pieces / Reset" Pill */}
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 hover:-translate-y-0.5 ${
                !currentCategoryParam || currentCategoryParam.toLowerCase() === 'all'
                  ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black shadow-md border border-[#D4AF37] ring-2 ring-[#C9972C]/40 animate-gold-glow'
                  : 'bg-white/80 hover:bg-white text-[#382B1D] hover:text-[#A8791E] border border-[#D8C49E]/70 hover:shadow-xs'
              }`}
            >
              <span>All Collections</span>
            </button>

            {/* Dynamic Category Filtering Pills directly from MongoDB */}
            {categoriesList.map((cat) => {
              const catName = cat.name || cat;
              const isSelected =
                currentCategoryParam.toLowerCase() === catName.toLowerCase() ||
                currentCategoryParam.toLowerCase() === catName.toLowerCase().replace(/\s+/g, '-');

              return (
                <button
                  key={cat._id || cat.slug || catName}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      navigate('/shop');
                    } else {
                      navigate(`/shop?category=${encodeURIComponent(catName)}`);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 hover:-translate-y-0.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black shadow-md border border-[#D4AF37] ring-2 ring-[#C9972C]/40 animate-gold-glow'
                      : 'bg-white/80 hover:bg-white text-[#382B1D] hover:text-[#A8791E] border border-[#D8C49E]/70 hover:shadow-xs'
                  }`}
                  title={`Filter products by ${catName} (${cat.productCount || 0} live pieces in database)`}
                >
                  <span>{catName}</span>
                  {cat.productCount !== undefined && cat.productCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-[#241A10] text-[#E2B755]'
                          : 'bg-[#E5CF9F]/70 text-[#5C4215]'
                      }`}
                    >
                      {cat.productCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Right Side Quick-Commerce / White-Glove Dispatch Tag */}
            <div className="ml-auto hidden xl:flex items-center gap-2 text-[11px] font-bold text-[#8E6A2B] shrink-0 pl-3">
              <Zap size={12} className="text-[#A8791E] fill-amber-500 animate-pulse" />
              <span>Express White-Glove Delivery (24-48 Hours)</span>
            </div>
          </div>
        </Container>
      </div>

      {/* Expandable Live Search Overlay with Suggestions */}
      {isSearchOpen && (
        <div className="border-t border-[#D8C49E]/60 bg-[#FAF5EB] py-4 px-4 sm:px-6 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Container size="sm">
            <form onSubmit={handleNavSearch} className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="search"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search 35+ luxury watches, apparel, fine perfumes & more..."
                  autoFocus
                  className="w-full bg-white border border-[#D4AF37]/60 rounded-xl pl-10 pr-8 py-2 text-xs font-medium text-[#241A10] focus:outline-none focus:ring-2 focus:ring-[#C9972C]"
                />
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E6A2B]" />
                {navSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setNavSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E7658] hover:text-[#241A10] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-xs shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-3 py-2 text-xs font-bold text-[#7C6348] hover:text-[#241A10] shrink-0 cursor-pointer"
              >
                Close
              </button>
            </form>

            {/* Quick Search Tag Suggestions */}
            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#D8C49E]/40 text-[11px]">
              <span className="text-[#8E6A2B] font-bold">Trending Searches:</span>
              {['Rolex', 'Horology', 'Oud', 'Cashmere', 'Handbag'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagSearch(tag)}
                  className="px-2 py-0.5 rounded-lg bg-white/70 hover:bg-white border border-[#D8C49E]/50 text-[#382B1D] font-medium text-[10px] hover:text-[#A8791E] transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </Container>
        </div>
      )}

      {/* Mobile Luxury Off-Canvas Slide Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-[#1A140E]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Luxury Slide-In Drawer */}
          <div className="relative w-[85%] max-w-sm bg-gradient-to-b from-[#FAF5EC] via-[#F6EDE0] to-[#EFE2CE] text-[#241A10] shadow-2xl flex flex-col h-full z-10 overflow-hidden border-r-2 border-[#D4AF37]/60 animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-[#D8C49E]/60 flex items-center justify-between bg-[#FAF4E8]/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2B755] to-[#9E6E16] p-0.5 shadow-sm">
                  <div className="w-full h-full bg-[#FAF5EC] rounded-[6px] flex items-center justify-center">
                    <span className="font-serif font-black text-[#A8791E] text-sm">P</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold tracking-tight text-[#241A10] leading-none">
                    Premium Store
                  </h3>
                  <span className="text-[8px] uppercase tracking-widest text-[#8E6A2B] font-bold">
                    Royal Luxury Atelier
                  </span>
                </div>
              </div>

              {/* Close Button with Gold Circle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[#EEDBB8]/80 hover:bg-[#E2B755] text-[#382B1D] hover:text-[#1F160E] flex items-center justify-center transition-all cursor-pointer shadow-xs"
                aria-label="Close Navigation Menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Member Status Card */}
              {isAuthenticated && user ? (
                <div className="p-3.5 bg-gradient-to-r from-[#FAF4E8] to-[#F3E5CB] rounded-2xl border border-[#D4AF37]/50 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E2B755] to-[#9E6E16] text-white text-xs flex items-center justify-center font-bold shadow-xs shrink-0">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#241A10] truncate">{user.name}</p>
                      <p className="text-[10px] text-[#8E6A2B] font-medium truncate">{user.email}</p>
                      <span className="inline-block mt-0.5 text-[8.5px] font-black uppercase tracking-wider text-[#A8791E]">
                        ★ Verified Patron
                      </span>
                    </div>
                  </div>
                  <SafeLink
                    to="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[10px] font-bold text-[#8E6A2B] hover:text-[#241A10] px-2 py-1 bg-white/70 rounded-lg border border-[#D8C49E]/50 shrink-0"
                  >
                    Profile &rarr;
                  </SafeLink>
                </div>
              ) : (
                <div className="p-3.5 bg-gradient-to-r from-[#FAF4E8] to-[#F3E5CB] rounded-2xl border border-[#D4AF37]/50 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#241A10]">Welcome to Premium Store</p>
                    <p className="text-[10px] text-[#8E6A2B]">Sign in for exclusive member privileges</p>
                  </div>
                  <SafeLink
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] text-xs font-black shadow-xs shrink-0"
                  >
                    Sign In
                  </SafeLink>
                </div>
              )}

              {/* Mobile Drawer Search Bar */}
              <form onSubmit={handleNavSearch} className="relative">
                <input
                  type="search"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search 35+ luxury items..."
                  className="w-full bg-white/90 border border-[#D4AF37]/60 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-[#241A10] focus:outline-none focus:ring-1 focus:ring-[#C9972C]"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E6A2B]" />
                {navSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setNavSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E7658] hover:text-[#241A10]"
                  >
                    <X size={13} />
                  </button>
                )}
              </form>

              {/* Primary Navigation Tiles */}
              <nav className="space-y-1">
                <SafeLink
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    location.pathname === '/'
                      ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] shadow-xs'
                      : 'text-[#382B1D] hover:bg-[#EEDBB8]/60 hover:text-[#1F160E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={15} className="text-[#C9972C]" />
                    <span>Home</span>
                  </div>
                  <span className="text-[10px] text-[#8E6A2B]">&rarr;</span>
                </SafeLink>

                <SafeLink
                  to="/shop"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    location.pathname === '/shop' && !currentSortParam && !currentCategoryParam
                      ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] shadow-xs'
                      : 'text-[#382B1D] hover:bg-[#EEDBB8]/60 hover:text-[#1F160E]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag size={15} className="text-[#C9972C]" />
                    <span>Shop All Collections</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/70 text-[#5C4010] font-mono font-bold">
                    35+
                  </span>
                </SafeLink>

                <SafeLink
                  to="/shop?sort=newest"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap size={15} className="text-amber-600 fill-amber-500" />
                    <span>New Arrivals</span>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10]">
                    NEW
                  </span>
                </SafeLink>

                <SafeLink
                  to="/shop?sort=trending"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp size={15} className="text-[#C9972C]" />
                    <span>Trending & Best Sellers</span>
                  </div>
                  <span className="text-[9px] text-[#A8791E] font-bold">HOT</span>
                </SafeLink>

                <SafeLink
                  to="/categories"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Store size={15} className="text-[#C9972C]" />
                    <span>Explore Categories</span>
                  </div>
                  <span className="text-[10px] text-[#8E6A2B]">&rarr;</span>
                </SafeLink>
              </nav>

              {/* Categories Pills Grid */}
              <div className="pt-2 border-t border-[#D8C49E]/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E6A2B]">
                    Signature Segments
                  </span>
                  <SafeLink
                    to="/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[10px] font-bold text-[#A8791E] hover:underline"
                  >
                    View All
                  </SafeLink>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(categoriesList.length > 0 ? categoriesList.slice(0, 6) : [
                    { name: 'Luxury Horology' },
                    { name: 'Handcrafted Goods' },
                    { name: 'Fine Fragrance' },
                    { name: 'Designer Eyewear' },
                    { name: 'Haute Couture' },
                  ]).map((cat) => (
                    <SafeLink
                      key={cat._id || cat.slug || cat.name}
                      to={`/shop?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white border border-[#D8C49E]/50 text-[11px] font-semibold text-[#382B1D] shadow-2xs hover:scale-102 transition-all"
                    >
                      {cat.name}
                    </SafeLink>
                  ))}
                </div>
              </div>

              {/* Patron Personal Dossier Quick Actions */}
              <div className="pt-2 border-t border-[#D8C49E]/50 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E6A2B] block mb-1">
                  Patron Services
                </span>

                <SafeLink
                  to="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Heart size={15} className="text-rose-500" />
                    <span>Saved Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <Badge variant="sale" size="sm" className="!px-2 !py-0.2 rounded-full text-[10px]">
                      {wishlistCount}
                    </Badge>
                  )}
                </SafeLink>

                <SafeLink
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <PackageCheck size={15} className="text-[#A8791E]" />
                    <span>My Orders & Tracking</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#A8791E]">Track</span>
                </SafeLink>

                <SafeLink
                  to="/cart"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-[#382B1D] hover:bg-[#EEDBB8]/60 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag size={15} className="text-[#A8791E]" />
                    <span>Shopping Bag</span>
                  </div>
                  {cartCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A8791E] text-white">
                      {cartCount}
                    </span>
                  )}
                </SafeLink>

                {/* Sell With Us / Vendor Onboarding */}
                {(!isAuthenticated || (user && user.role === 'user')) && (
                  <SafeLink
                    to="/vendor/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-[#5C4010] bg-[#EEDBB8]/50 border border-[#D4AF37]/40 hover:bg-[#EEDBB8] transition-all my-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Store size={14} className="text-[#A8791E]" />
                      <span>Sell With Us / Become a Vendor</span>
                    </div>
                    <span className="text-[10px] text-[#A8791E] font-bold">&rarr;</span>
                  </SafeLink>
                )}

                {/* Vendor Portal for Vendors */}
                {isAuthenticated && user && user.role === 'vendor' && (
                  <SafeLink
                    to="/vendor/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-500/20 border border-emerald-600/40"
                  >
                    <span>Merchant Portal</span>
                    <Badge variant="accent" size="sm">Vendor</Badge>
                  </SafeLink>
                )}

                {/* Admin Portal for Admins */}
                {isAuthenticated && user && user.role === 'admin' && (
                  <SafeLink
                    to="/admin/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#5C4010] bg-[#E2B755]/20 border border-[#C9972C]/40"
                  >
                    <span>Admin Orders Ledger</span>
                    <Badge variant="accent" size="sm">Admin</Badge>
                  </SafeLink>
                )}
              </div>
            </div>

            {/* Drawer Bottom Controls: Theme Toggle & Sign Out */}
            <div className="p-4 border-t border-[#D8C49E]/60 bg-[#FAF4E8]/90 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 text-xs font-bold text-[#382B1D] hover:text-[#A8791E] p-1.5 cursor-pointer"
                >
                  {isDark ? <Sun size={15} className="text-[#C9972C]" /> : <Moon size={15} />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                {isAuthenticated && user ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <SafeLink
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-xs text-[#A8791E] font-bold flex items-center gap-1"
                  >
                    <User size={13} />
                    <span>Sign In</span>
                  </SafeLink>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
