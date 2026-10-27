import React, { useState, useEffect } from 'react';
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
  PackageCheck
} from 'lucide-react';
import Container from './Container';
import Badge from './Badge';
import Input from './Input';
import Button from './Button';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
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
 * Premium, Responsive Ecommerce Navbar
 * Features:
 * - Brand Name: Premium Store
 * - Links: Home, Shop, Categories (with dropdown)
 * - Action Icons: Search (expandable bar), Wishlist, Cart (with badge), Account
 * - Mobile hamburger menu with smooth slide-down drawer
 * - Elegant luxury design with subtle hover effects and full responsive support
 */
export default function Navbar({ cartCount: propCartCount }) {
  const navigate = useNavigate();
  const { cartCount: contextCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = propCartCount !== undefined ? propCartCount : contextCartCount;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);

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
    <header className="sticky top-0 z-50 w-full bg-brand-surface/95 backdrop-blur-md border-b border-brand-border/60 transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-brand-black text-white text-[11px] tracking-widest uppercase py-2 text-center font-medium border-b border-brand-charcoal select-none">
        <span>Complimentary Express Shipping on Orders Over $200</span>
      </div>

      <Container size="default">
        <div className="flex items-center justify-between h-20">
          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-brand-black hover:text-brand-accent transition-colors focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex items-center">
            <SafeLink to="/" className="flex items-center gap-1.5 group">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-black group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mb-1 group-hover:scale-125 transition-transform"></span>
            </SafeLink>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-9">
            <SafeLink
              to="/"
              className="text-xs uppercase tracking-widest font-medium text-brand-charcoal hover:text-brand-accent transition-colors py-2 relative group"
            >
              <span>Home</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
            </SafeLink>

            <SafeLink
              to="/shop"
              className="text-xs uppercase tracking-widest font-medium text-brand-charcoal hover:text-brand-accent transition-colors py-2 relative group"
            >
              <span>Shop</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
            </SafeLink>

            {/* Categories Link with Luxury Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsCatDropdownOpen(true)}
              onMouseLeave={() => setIsCatDropdownOpen(false)}
            >
              <SafeLink
                to="/categories"
                className="flex items-center gap-1 text-xs uppercase tracking-widest font-medium text-brand-charcoal hover:text-brand-accent transition-colors py-2 relative group"
              >
                <span>Categories</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${
                    isCatDropdownOpen ? 'rotate-180 text-brand-accent' : ''
                  }`}
                />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
              </SafeLink>

              {/* Dropdown Panel */}
              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 w-60 bg-brand-surface border border-brand-border/80 rounded-xl shadow-xl py-3 px-2 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-3 py-1.5 border-b border-brand-border/40 mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">
                      Collections
                    </span>
                    <SafeLink
                      to="/categories"
                      onClick={() => setIsCatDropdownOpen(false)}
                      className="text-[10px] font-semibold text-brand-accent hover:underline flex items-center gap-0.5"
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
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/60 transition-colors"
                        >
                          <span className="truncate">{cat.name}</span>
                          {cat.productCount !== undefined && cat.productCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-offwhite text-brand-muted font-mono">
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
                          className="block px-3 py-2 rounded-lg text-xs font-medium text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/60 transition-colors"
                        >
                          {c}
                        </SafeLink>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                className="text-xs uppercase tracking-widest font-medium text-brand-charcoal hover:text-brand-accent transition-colors py-2 relative group"
              >
                <span>Sell With Us</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
              </SafeLink>
            )}
          </nav>

          {/* Action Icons (Search, Wishlist, Cart, Account) */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Icon / Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-brand-charcoal hover:text-brand-accent hover:bg-brand-cream/50 rounded-full transition-colors focus:outline-none cursor-pointer"
              aria-label="Search"
              title="Search"
            >
              <Search size={20} />
            </button>

            {/* Wishlist Icon */}
            <SafeLink
              to="/wishlist"
              className="p-2 text-brand-charcoal hover:text-brand-accent hover:bg-brand-cream/50 rounded-full transition-colors hidden sm:inline-flex relative items-center focus:outline-none"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 transform translate-x-1/3 -translate-y-1/3">
                  <Badge
                    variant="sale"
                    size="sm"
                    className="!px-1.5 !py-0.2 min-w-[18px] h-[18px] text-[10px] rounded-full shadow-xs"
                  >
                    {wishlistCount}
                  </Badge>
                </span>
              )}
            </SafeLink>

            {/* Shopping Cart Icon with Badge */}
            <SafeLink
              to="/cart"
              className="p-2 text-brand-charcoal hover:text-brand-accent hover:bg-brand-cream/50 rounded-full transition-colors relative inline-flex items-center focus:outline-none"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={21} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 transform translate-x-1/3 -translate-y-1/3">
                  <Badge
                    variant="dark"
                    size="sm"
                    className="!px-1.5 !py-0.2 min-w-[18px] h-[18px] text-[10px] rounded-full shadow-xs"
                  >
                    {cartCount}
                  </Badge>
                </span>
              )}
            </SafeLink>

            {/* Account Icon / User Status */}
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-1.5 pl-1">
                {user.role === 'admin' && (
                  <SafeLink
                    to="/admin/orders"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-[11px] font-bold text-amber-800 transition-colors"
                    title="Open Admin Orders Ledger"
                  >
                    <span>Admin Panel</span>
                  </SafeLink>
                )}
                {user.role === 'vendor' && (
                  <SafeLink
                    to="/vendor/dashboard"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-[11px] font-bold text-emerald-800 transition-colors"
                    title="Open Merchant Portal"
                  >
                    <span>Vendor Portal</span>
                  </SafeLink>
                )}
                {user.role === 'delivery_boy' && (
                  <SafeLink
                    to="/delivery/dashboard"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-[11px] font-bold text-amber-800 transition-colors"
                    title="Open Delivery Dispatch Portal"
                  >
                    <span>Rider Portal</span>
                  </SafeLink>
                )}
                <SafeLink
                  to="/orders"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-offwhite border border-brand-border/80 hover:border-brand-accent hover:bg-brand-cream/40 text-xs font-semibold text-brand-charcoal hover:text-brand-black transition-colors"
                  title="View and track your orders"
                >
                  <PackageCheck size={13} className="text-brand-accent" />
                  <span>My Orders</span>
                </SafeLink>
                <SafeLink
                  to={user.role === 'admin' ? '/admin/orders' : user.role === 'vendor' ? '/vendor/dashboard' : user.role === 'delivery_boy' ? '/delivery/dashboard' : '/account'}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cream/70 hover:bg-brand-cream text-xs font-semibold text-brand-black transition-colors"
                  title={`Logged in as ${user.name} • ${user.role === 'admin' ? 'Admin Orders' : user.role === 'vendor' ? 'Vendor Portal' : user.role === 'delivery_boy' ? 'Rider Portal' : 'View Profile'}`}
                >
                  <span className="w-5 h-5 rounded-full bg-brand-black text-white text-[10px] flex items-center justify-center font-bold">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                  <span className="max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                </SafeLink>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-brand-muted hover:text-rose-600 transition-colors cursor-pointer focus:outline-none"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <SafeLink
                to="/login"
                className="p-2 text-brand-charcoal hover:text-brand-accent hover:bg-brand-cream/50 rounded-full transition-colors hidden sm:inline-flex focus:outline-none"
                aria-label="Account / Sign In"
                title="Account / Sign In"
              >
                <User size={20} />
              </SafeLink>
            )}
          </div>
        </div>
      </Container>

      {/* Expandable Search Overlay */}
      {isSearchOpen && (
        <div className="border-t border-brand-border/60 bg-brand-surface py-4 px-4 sm:px-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <Container size="sm">
            <form onSubmit={handleNavSearch} className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  type="search"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search luxury collections, apparel, accessories..."
                  icon={Search}
                  autoFocus
                  className="!py-2 text-sm bg-brand-offwhite pr-8"
                />
                {navSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setNavSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-charcoal cursor-pointer p-0.5 rounded transition-colors"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="shrink-0"
                icon={Search}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(false)}
                className="shrink-0"
              >
                Close
              </Button>
            </form>
          </Container>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border/60 bg-brand-surface py-6 px-6 animate-in slide-in-from-top duration-300 shadow-xl">
          {/* Mobile Search Form */}
          <form onSubmit={handleNavSearch} className="flex items-center gap-2 pb-4 mb-3 border-b border-brand-border/40">
            <div className="flex-1 relative">
              <Input
                type="search"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Search catalog..."
                icon={Search}
                className="!py-2 text-xs bg-brand-offwhite"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" className="shrink-0 text-xs px-3">
              Search
            </Button>
          </form>

          <nav className="flex flex-col space-y-3">
            <SafeLink
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold tracking-wider uppercase text-brand-black hover:text-brand-accent transition-colors py-2 border-b border-brand-border/30"
            >
              Home
            </SafeLink>

            <SafeLink
              to="/shop"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-semibold tracking-wider uppercase text-brand-black hover:text-brand-accent transition-colors py-2 border-b border-brand-border/30"
            >
              Shop
            </SafeLink>

            <div className="border-b border-brand-border/30 pb-2.5">
              <SafeLink
                to="/categories"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-sm font-semibold tracking-wider uppercase text-brand-black hover:text-brand-accent transition-colors py-1.5 flex items-center justify-between"
              >
                <span>Categories</span>
                <span className="text-[10px] text-brand-accent font-bold">Explore All &rarr;</span>
              </SafeLink>
              {categoriesList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {categoriesList.slice(0, 6).map((cat) => (
                    <SafeLink
                      key={cat._id || cat.slug || cat.name}
                      to={`/shop?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-2 py-1 rounded bg-brand-cream/60 hover:bg-brand-cream text-[11px] font-medium text-brand-charcoal hover:text-brand-black transition-colors"
                    >
                      {cat.name}
                    </SafeLink>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Actions: Wishlist & Account */}
            <div className="pt-2 flex flex-col space-y-3">
              <SafeLink
                to="/wishlist"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between text-sm font-medium text-brand-charcoal hover:text-brand-accent py-2"
              >
                <div className="flex items-center gap-3">
                  <Heart size={18} />
                  <span>Wishlist</span>
                </div>
                {wishlistCount > 0 ? (
                  <Badge variant="sale" size="sm" className="!px-2 !py-0.5 rounded-full text-[10px]">
                    {wishlistCount}
                  </Badge>
                ) : (
                  <span className="text-xs text-brand-muted">0</span>
                )}
              </SafeLink>

              {isAuthenticated && (
                <SafeLink
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm font-medium text-brand-charcoal hover:text-brand-accent py-2"
                >
                  <div className="flex items-center gap-3">
                    <PackageCheck size={18} className="text-brand-accent" />
                    <span>My Orders & Tracking</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-brand-muted">Track</span>
                </SafeLink>
              )}

              {isAuthenticated && user && user.role === 'admin' && (
                <SafeLink
                  to="/admin/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-lg"
                >
                  <span>Admin Orders Ledger</span>
                  <Badge variant="accent" size="sm">Admin</Badge>
                </SafeLink>
              )}

              {isAuthenticated && user && user.role === 'vendor' && (
                <SafeLink
                  to="/vendor/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg"
                >
                  <span>Merchant Portal</span>
                  <Badge variant="accent" size="sm">Vendor</Badge>
                </SafeLink>
              )}

              {(!isAuthenticated || (user && user.role === 'user')) && (
                <SafeLink
                  to="/vendor/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-xs font-semibold text-brand-charcoal hover:text-brand-accent px-1 py-1.5"
                >
                  <span>Sell With Us / Become a Vendor</span>
                  <span className="text-[10px] text-brand-accent font-bold">&rarr;</span>
                </SafeLink>
              )}

              {isAuthenticated && user ? (
                <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between">
                  <SafeLink
                    to={user.role === 'admin' ? '/admin/orders' : '/account'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 hover:text-brand-accent transition-colors"
                    title={user.role === 'admin' ? 'View Admin Orders' : 'View Account Profile'}
                  >
                    <span className="w-7 h-7 rounded-full bg-brand-black text-white text-xs flex items-center justify-center font-bold">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-brand-black">{user.name}</p>
                      <p className="text-[10px] text-brand-muted">{user.role === 'admin' ? 'Store Administrator' : user.email}</p>
                    </div>
                  </SafeLink>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <SafeLink
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-sm font-medium text-brand-charcoal hover:text-brand-accent py-2"
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
