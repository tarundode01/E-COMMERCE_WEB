import React, { useState, useEffect } from 'react';
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
  MapPin,
  Zap,
} from 'lucide-react';
import Container from './Container';
import Badge from './Badge';
import Input from './Input';
import Button from './Button';
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
 * Premium, Responsive Royal Luxury Ecommerce Navbar
 * Features:
 * - Brand Logo: Premium Store • Royal Luxury Atelier
 * - Navigation: Home, Shop, Categories (with live dropdown from MongoDB), Sell With Us / Vendor Portal
 * - Actions: Search (expandable overlay), Dark/Light toggle, Wishlist (badge), Cart (badge), My Orders, Account
 * - Color: Royal Champagne Gold & Silk Pearl luxury palette (Zero black!)
 * - Fully responsive with smooth mobile drawer
 */
export default function Navbar({ cartCount: propCartCount }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentCategoryParam = new URLSearchParams(location.search).get('category') || '';
  const { cartCount: contextCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const cartCount = propCartCount !== undefined ? propCartCount : contextCartCount;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);

  // Fetch live categories from backend API / MongoDB
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

  const handleNavSearch = (e) => {
    e.preventDefault();
    const query = navSearchQuery.trim();
    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/shop');
    }
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#FAF4E8] via-[#F5E8D2] to-[#ECE0C8] border-b border-[#D4AF37]/60 shadow-[0_6px_30px_rgba(180,140,70,0.15)] transition-all">
      <Container size="default">
        <div className="flex items-center justify-between h-20">
          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
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
          <div className="flex items-center">
            <SafeLink to="/" className="flex items-center gap-2.5 sm:gap-3 group">
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

          {/* Desktop Navigation Links: Home, Shop, Categories, Sell With Us */}
          <nav className="hidden md:flex items-center space-x-8 lg:space-x-10">
            {/* 1. Home */}
            <SafeLink
              to="/"
              className="text-xs uppercase tracking-widest font-bold text-[#382B1D] hover:text-[#A8791E] transition-colors py-2 relative group"
            >
              <span>Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C9972C] to-[#E2B755] transition-all duration-300 group-hover:w-full rounded-full"></span>
            </SafeLink>

            {/* 2. Shop */}
            <SafeLink
              to="/shop"
              className="text-xs uppercase tracking-widest font-bold text-[#382B1D] hover:text-[#A8791E] transition-colors py-2 relative group"
            >
              <span>Shop</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C9972C] to-[#E2B755] transition-all duration-300 group-hover:w-full rounded-full"></span>
            </SafeLink>

            {/* 3. Categories Link with Luxury Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsCatDropdownOpen(true)}
              onMouseLeave={() => setIsCatDropdownOpen(false)}
            >
              <SafeLink
                to="/categories"
                className="flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-[#382B1D] hover:text-[#A8791E] transition-colors py-2 relative group"
              >
                <span>Categories</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isCatDropdownOpen ? 'rotate-180 text-[#A8791E]' : ''
                  }`}
                />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C9972C] to-[#E2B755] transition-all duration-300 group-hover:w-full rounded-full"></span>
              </SafeLink>

              {/* Dropdown Panel */}
              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 w-64 bg-[#FAF5EB] border-2 border-[#D4AF37]/50 rounded-2xl shadow-2xl py-3 px-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-3 py-1.5 border-b border-[#D8C49E]/50 mb-1 flex items-center justify-between">
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

                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {categoriesList.length > 0 ? (
                      categoriesList.map((cat) => (
                        <SafeLink
                          key={cat._id || cat.slug || cat.name}
                          to={`/shop?category=${encodeURIComponent(cat.name)}`}
                          onClick={() => setIsCatDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:text-[#1F160E] hover:bg-[#EEDBB8]/60 transition-colors"
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
                          className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#382B1D] hover:text-[#1F160E] hover:bg-[#EEDBB8]/60 transition-colors"
                        >
                          {c}
                        </SafeLink>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Vendor Portal / Sell With Us */}
            {isAuthenticated && user?.role === 'vendor' ? (
              <SafeLink
                to="/vendor/dashboard"
                className="text-xs uppercase tracking-widest font-bold text-emerald-800 hover:text-emerald-950 transition-colors py-2 relative group"
              >
                <span>Vendor Portal</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-full"></span>
              </SafeLink>
            ) : (
              <SafeLink
                to="/vendor/register"
                className="text-xs uppercase tracking-widest font-bold text-[#382B1D] hover:text-[#A8791E] transition-colors py-2 relative group"
              >
                <span>Sell With Us</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C9972C] to-[#E2B755] transition-all duration-300 group-hover:w-full rounded-full"></span>
              </SafeLink>
            )}
          </nav>

          {/* Action Icons (Search, Theme Toggle, Wishlist, Cart, My Orders, Account) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Search Icon / Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all focus:outline-none cursor-pointer"
              aria-label="Search"
              title="Search luxury collections"
            >
              <Search size={19} />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all duration-300 focus:outline-none cursor-pointer relative group"
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={19} className="text-[#C9972C] group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(201,151,44,0.6)]" />
              ) : (
                <Moon size={19} className="text-[#382B1D] group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Wishlist Icon */}
            <SafeLink
              to="/wishlist"
              className="p-2.5 text-[#382B1D] hover:text-rose-600 hover:bg-[#E7D4B0]/60 rounded-xl transition-all hidden sm:inline-flex relative items-center focus:outline-none"
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

            {/* Shopping Cart Icon with Badge */}
            <SafeLink
              to="/cart"
              className="p-2.5 text-[#382B1D] hover:text-[#8E6A2B] hover:bg-[#E7D4B0]/60 rounded-xl transition-all relative inline-flex items-center focus:outline-none"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-[#B47C1E] to-[#E2A638] text-white rounded-full shadow-xs px-1">
                  {cartCount}
                </span>
              )}
            </SafeLink>

            {/* Account Icon / User Status */}
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-2 pl-1">
                {user.role === 'admin' && (
                  <SafeLink
                    to="/admin/orders"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E2B755]/20 border border-[#C9972C]/40 hover:bg-[#E2B755]/30 text-[11px] font-bold text-[#5C4010] transition-colors shadow-2xs"
                    title="Open Admin Orders Ledger"
                  >
                    <span>Admin Panel</span>
                  </SafeLink>
                )}
                {user.role === 'vendor' && (
                  <SafeLink
                    to="/vendor/dashboard"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-600/40 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-900 transition-colors shadow-2xs"
                    title="Open Merchant Portal"
                  >
                    <span>Vendor Portal</span>
                  </SafeLink>
                )}
                {user.role === 'delivery_boy' && (
                  <SafeLink
                    to="/delivery/dashboard"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E2B755]/20 border border-[#C9972C]/40 hover:bg-[#E2B755]/30 text-[11px] font-bold text-[#5C4010] transition-colors shadow-2xs"
                    title="Open Delivery Dispatch Portal"
                  >
                    <span>Rider Portal</span>
                  </SafeLink>
                )}

                {/* My Orders Button */}
                <SafeLink
                  to="/orders"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-[#D4AF37]/50 text-xs font-bold text-[#382B1D] transition-all shadow-2xs"
                  title="View and track your orders"
                >
                  <PackageCheck size={14} className="text-[#A8791E]" />
                  <span>My Orders</span>
                </SafeLink>

                {/* User Profile Pill */}
                <SafeLink
                  to={user.role === 'admin' ? '/admin/orders' : user.role === 'vendor' ? '/vendor/dashboard' : user.role === 'delivery_boy' ? '/delivery/dashboard' : '/account'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-[#D4AF37]/60 text-xs font-bold text-[#241A10] transition-all shadow-xs"
                  title={`Logged in as ${user.name} • View Account`}
                >
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#E2B755] to-[#9E6E16] text-white text-[11px] flex items-center justify-center font-bold shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="max-w-[85px] truncate">{user.name.split(' ')[0]}</span>
                </SafeLink>

                <button
                  type="button"
                  onClick={logout}
                  className="p-2 text-[#7C6348] hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer focus:outline-none"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
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

      {/* Royal Champagne Category Filtering Sub-Header (Live MongoDB API Integration) */}
      <div className="bg-[#FAF4E8]/95 border-t border-[#D8C49E]/50 px-4 py-2 overflow-x-auto scrollbar-none shadow-2xs">
        <Container size="default">
          <div className="flex items-center gap-2 sm:gap-3 text-xs whitespace-nowrap">
            {/* Quick label */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-[#8E6A2B] pr-2.5 border-r border-[#D8C49E]/60 shrink-0">
              <Sparkles size={12} className="text-[#C9972C]" />
              <span className="uppercase tracking-wider">Collections:</span>
            </div>

            {/* "All Pieces / Reset" Pill */}
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
                !currentCategoryParam || currentCategoryParam.toLowerCase() === 'all'
                  ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black shadow-sm border border-[#D4AF37]'
                  : 'bg-white/70 hover:bg-white text-[#382B1D] hover:text-[#A8791E] border border-[#D8C49E]/70'
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
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black shadow-sm border border-[#D4AF37]'
                      : 'bg-white/70 hover:bg-white text-[#382B1D] hover:text-[#A8791E] border border-[#D8C49E]/70'
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

            {/* Right Side Luxury Courier Tag */}
            <div className="ml-auto hidden xl:flex items-center gap-2 text-[11px] font-bold text-[#8E6A2B] shrink-0 pl-3">
              <Zap size={12} className="text-[#A8791E] fill-amber-500" />
              <span>Express White-Glove Dispatch Available</span>
            </div>
          </div>
        </Container>
      </div>

      {/* Expandable Live Search Overlay */}
      {isSearchOpen && (
        <div className="border-t border-[#D8C49E]/60 bg-[#FAF5EB] py-4 px-4 sm:px-6 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Container size="sm">
            <form onSubmit={handleNavSearch} className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="search"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search 35+ luxury watches, apparel, perfumes & pantry..."
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9972C] to-[#E2B755] text-[#241A10] font-black text-xs shrink-0 cursor-pointer shadow-xs"
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
          </Container>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#D8C49E]/60 bg-[#FAF5EB] py-5 px-6 animate-in slide-in-from-top duration-300 shadow-2xl">
          {/* Mobile Search Form */}
          <form onSubmit={handleNavSearch} className="flex items-center gap-2 pb-4 mb-3 border-b border-[#D8C49E]/40">
            <input
              type="search"
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

          <nav className="flex flex-col space-y-3">
            <SafeLink
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5 border-b border-[#D8C49E]/30"
            >
              Home
            </SafeLink>

            <SafeLink
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5 border-b border-[#D8C49E]/30"
            >
              Shop
            </SafeLink>

            <div className="border-b border-[#D8C49E]/30 pb-2.5">
              <SafeLink
                to="/categories"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-bold text-[#241A10] hover:text-[#A8791E] py-1.5 flex items-center justify-between"
              >
                <span>Categories</span>
                <span className="text-[10px] text-[#A8791E] font-bold">Explore All &rarr;</span>
              </SafeLink>
              {categoriesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {categoriesList.slice(0, 6).map((cat) => (
                    <SafeLink
                      key={cat._id || cat.slug || cat.name}
                      to={`/shop?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-2 py-1 rounded-lg bg-[#EEDBB8]/60 hover:bg-[#EEDBB8] text-[11px] font-semibold text-[#382B1D]"
                    >
                      {cat.name}
                    </SafeLink>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Actions: Wishlist & Account */}
            <div className="pt-2 flex flex-col space-y-2">
              <SafeLink
                to="/wishlist"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between text-sm font-bold text-[#382B1D] hover:text-[#A8791E] py-1.5"
              >
                <div className="flex items-center gap-3">
                  <Heart size={18} className="text-rose-500" />
                  <span>Wishlist</span>
                </div>
                {wishlistCount > 0 && (
                  <Badge variant="sale" size="sm" className="!px-2 !py-0.5 rounded-full text-[10px]">
                    {wishlistCount}
                  </Badge>
                )}
              </SafeLink>

              {isAuthenticated && (
                <SafeLink
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm font-bold text-[#382B1D] hover:text-[#A8791E] py-1.5"
                >
                  <div className="flex items-center gap-3">
                    <PackageCheck size={18} className="text-[#A8791E]" />
                    <span>My Orders & Tracking</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#A8791E]">Track</span>
                </SafeLink>
              )}

              {isAuthenticated && user && user.role === 'admin' && (
                <SafeLink
                  to="/admin/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5C4010] bg-[#E2B755]/20 border border-[#C9972C]/40 px-3 py-2 rounded-xl"
                >
                  <span>Admin Orders Ledger</span>
                  <Badge variant="accent" size="sm">Admin</Badge>
                </SafeLink>
              )}

              {isAuthenticated && user && user.role === 'vendor' && (
                <SafeLink
                  to="/vendor/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-500/20 border border-emerald-600/40 px-3 py-2 rounded-xl"
                >
                  <span>Merchant Portal</span>
                  <Badge variant="accent" size="sm">Vendor</Badge>
                </SafeLink>
              )}

              {(!isAuthenticated || (user && user.role === 'user')) && (
                <SafeLink
                  to="/vendor/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-bold text-[#382B1D] hover:text-[#A8791E] px-1 py-1.5"
                >
                  <span>Sell With Us / Become a Vendor</span>
                  <span className="text-[10px] text-[#A8791E] font-bold">&rarr;</span>
                </SafeLink>
              )}

              {isAuthenticated && user ? (
                <div className="pt-2 border-t border-[#D8C49E]/40 flex items-center justify-between">
                  <SafeLink
                    to={user.role === 'admin' ? '/admin/orders' : '/account'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 hover:text-[#A8791E] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E2B755] to-[#9E6E16] text-white text-xs flex items-center justify-center font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#241A10]">{user.name}</p>
                      <p className="text-[10px] text-[#7C6348]">{user.email}</p>
                    </div>
                  </SafeLink>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-700 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <SafeLink
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-sm font-bold text-[#382B1D] hover:text-[#A8791E] py-2"
                >
                  <User size={18} />
                  <span>My Account / Sign In</span>
                </SafeLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
