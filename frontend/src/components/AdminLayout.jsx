import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Settings,
  Store,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  BarChart3,
  LogOut,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { productService, categoryService, orderService, adminVendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Reusable Admin Layout Component
 * Provides responsive sidebar navigation and top bar header for all admin management views.
 */
export default function AdminLayout({
  activePage = 'dashboard',
  title = 'Executive Dashboard',
  subtitle = 'Live eCommerce Performance & Management Suite',
  actions,
  children
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    pendingOrders: 0,
    pendingVendors: 0
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Live Counts for Sidebar Badges
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      productService.getProducts({ limit: 1 }),
      categoryService.getCategories(),
      orderService.getAllOrders(),
      adminVendorService.getApplications({ limit: 1, status: 'pending' }),
    ]).then(([pRes, cRes, oRes, vRes]) => {
      if (!isMounted) return;
      const prodTotal =
        pRes.status === 'fulfilled' && typeof pRes.value?.total === 'number'
          ? pRes.value.total
          : pRes.status === 'fulfilled' && pRes.value?.products
          ? pRes.value.products.length
          : 0;

      const catTotal =
        cRes.status === 'fulfilled' && Array.isArray(cRes.value?.categories)
          ? cRes.value.categories.length
          : 0;

      const allOrders =
        oRes.status === 'fulfilled' && Array.isArray(oRes.value?.orders)
          ? oRes.value.orders
          : oRes.status === 'fulfilled' && Array.isArray(oRes.value)
          ? oRes.value
          : [];

      const ordTotal = allOrders.length;
      const pendingOrd = allOrders.filter(
        (o) => (o.orderStatus || o.status || '').toLowerCase() === 'pending'
      ).length;

      const vendorPending =
        vRes.status === 'fulfilled' && typeof vRes.value?.counts?.pending === 'number'
          ? vRes.value.counts.pending
          : 0;

      setCounts({
        products: prodTotal,
        categories: catTotal,
        orders: ordTotal,
        pendingOrders: pendingOrd,
        pendingVendors: vendorPending,
      });
    });
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll on mobile when drawer is open & handle Escape key
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const adminName = user?.name || 'Administrator';
  const adminEmail = user?.email || 'admin@gmail.com';
  const adminInitials =
    adminName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD';

  // Navigation Items with route targets & dynamic badges
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      path: '/admin/products',
      badge: counts.products > 0 ? String(counts.products) : null,
      badgeColor: 'neutral',
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      path: '/admin/categories',
      badge: counts.categories > 0 ? String(counts.categories) : null,
      badgeColor: 'neutral',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      path: '/admin/orders',
      badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} new` : counts.orders > 0 ? String(counts.orders) : null,
      badgeColor: counts.pendingOrders > 0 ? 'amber' : 'neutral',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      path: '/admin/customers',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/admin/analytics',
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: Store,
      path: '/admin/vendors',
      badge: counts.pendingVendors > 0 ? `${counts.pendingVendors} pending` : null,
      badgeColor: 'amber',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings',
    },
  ];

  // Robust path-based active item detection
  const isItemActive = (item) => {
    if (item.id === 'dashboard') {
      return (
        location.pathname === '/admin' ||
        location.pathname === '/admin/' ||
        location.pathname === '/admin/dashboard'
      );
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black antialiased">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* 1. SIDEBAR (100% Fixed on Desktop & Smooth Drawer on Mobile/Tablet) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-brand-black text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-white/10 select-none shadow-2xl lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Admin Navigation Sidebar"
      >
        {/* Top Pinned Section: Brand Header */}
        <div className="shrink-0">
          <div className="h-18 px-6 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-serif text-lg font-bold tracking-tight text-white group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded border border-brand-accent/30">
                Admin
              </span>
            </Link>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Middle Section: Scrollable Navigation Links (Hidden scrollbar on Windows & smooth touch) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
            Management Suite
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                      : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        active
                          ? 'bg-black/20 text-brand-black'
                          : item.badgeColor === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Pinned Section: Back to Store, Admin Identity & Sign Out */}
        <div className="shrink-0 p-4 border-t border-white/10 space-y-2.5 bg-brand-black">
          {/* Back to Customer Storefront Link */}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors border border-white/10"
          >
            <Store size={14} />
            <span>View Public Store</span>
            <ArrowUpRight size={12} className="opacity-70" />
          </Link>

          {/* Admin Profile Details */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-brand-accent text-brand-black text-xs font-bold flex items-center justify-center shrink-0">
              {adminInitials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-white truncate">{adminName}</p>
              <p className="text-[10px] text-neutral-400 truncate">{adminEmail}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 text-xs font-semibold text-neutral-300 transition-colors border border-white/10 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut size={14} className="group-hover:text-rose-400 transition-colors" />
              <span>Sign Out</span>
            </div>
            <span className="text-[10px] text-neutral-500 group-hover:text-rose-400">Exit</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER (Offset by fixed sidebar on desktop) */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        {/* Top Navigation Bar - Ultra-Luxurious SaaS Header */}
        <header className="relative h-20 sm:h-22 bg-brand-surface/90 backdrop-blur-xl border-b border-brand-border/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_28px_-6px_rgba(17,17,17,0.04)] transition-all">
          {/* Subtle Top Ambient Specular Light */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

          {/* Subtle Bottom Brushed Champagne Gold Accent Hairline */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent pointer-events-none" />

          {/* Left: Mobile Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 text-brand-charcoal hover:text-brand-black bg-brand-offwhite/90 hover:bg-brand-cream/80 border border-brand-border/80 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              <Menu size={20} />
            </button>

            <div className="text-left min-w-0">
              {/* Micro Enterprise Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9E8257]">
                <Sparkles size={11} className="text-brand-accent" />
                <span>Patel Optical Suite</span>
                <span className="text-brand-border">•</span>
                <span className="text-brand-subtle capitalize tracking-normal font-medium">{activePage}</span>
              </div>

              {/* Main Page Title with Live Radar Sync Pill */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-lg sm:text-2xl font-bold text-brand-black tracking-tight truncate">
                  {title}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 shadow-2xs backdrop-blur-xs shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="hidden xs:inline">Live Engine</span>
                </span>
              </div>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-[11px] text-brand-muted hidden md:block truncate max-w-md font-normal mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Center Enterprise Telemetry Capsule (Large Desktop Screens) */}
          <div className="hidden xl:flex items-center gap-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-offwhite via-white to-brand-offwhite border border-brand-border/90 shadow-2xs text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Atlas Cluster</span>
            </div>
            <span className="w-px h-3.5 bg-brand-border" />
            <div className="flex items-center gap-1.5 text-[11px] text-brand-charcoal font-medium">
              <ShieldCheck size={13} className="text-brand-accent" />
              <span className="text-brand-muted">TLS 1.3 Active</span>
            </div>
            <span className="w-px h-3.5 bg-brand-border" />
            <div className="flex items-center gap-1 text-[11px] text-brand-charcoal font-semibold">
              <span className="text-brand-black font-bold">{counts.products}</span>
              <span className="text-brand-muted font-normal">SKUs</span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {actions}

            {/* Notification Bell with Luxury Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="relative p-2.5 text-brand-charcoal hover:text-brand-black bg-brand-offwhite/90 hover:bg-brand-cream/70 border border-brand-border/90 hover:border-brand-accent/50 rounded-xl transition-all cursor-pointer shadow-2xs focus:outline-none group active:scale-95"
                title="Live Telemetry & Notifications"
                aria-label="Live Telemetry & Notifications"
              >
                <Bell size={18} className="transition-transform group-hover:rotate-12 duration-200" />
                {((counts.pendingOrders || 0) + (counts.pendingVendors || 0)) > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                    {(counts.pendingOrders || 0) + (counts.pendingVendors || 0)}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white" />
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-84 sm:w-92 bg-white/95 backdrop-blur-xl border border-brand-border rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 p-4 text-left divide-y divide-brand-border/60 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Dropdown Header */}
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <h4 className="text-xs font-bold text-brand-black uppercase tracking-wider">
                          Live System Radar
                        </h4>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Healthy • 99.9%
                      </span>
                    </div>

                    {/* Notifications Feed */}
                    <div className="py-3 space-y-2.5 text-xs">
                      {(counts.pendingVendors || 0) > 0 && (
                        <Link
                          to="/admin/vendors"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="block p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                              <Store size={13} className="text-amber-700" />
                              Merchant Verifications
                            </p>
                            <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                              {counts.pendingVendors} pending
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 mt-1">
                            Review new seller storefront accreditation requests.
                          </p>
                        </Link>
                      )}

                      {(counts.pendingOrders || 0) > 0 && (
                        <Link
                          to="/admin/orders"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="block p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/15 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-blue-900 flex items-center gap-1.5">
                              <ShoppingBag size={13} className="text-blue-700" />
                              Pending Orders
                            </p>
                            <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                              {counts.pendingOrders} awaiting
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-800/80 mt-1">
                            Orders ready for fulfillment processing.
                          </p>
                        </Link>
                      )}

                      <div className="p-2.5 rounded-xl bg-brand-offwhite border border-brand-border/70">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-brand-black flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            MongoDB Sync
                          </p>
                          <span className="text-[10px] text-brand-muted">Real-time</span>
                        </div>
                        <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">
                          {counts.products} active products, {counts.categories} categories, {counts.orders} recorded transactions.
                        </p>
                      </div>
                    </div>

                    {/* Footer Link */}
                    <div className="pt-2.5 text-center">
                      <Link
                        to="/admin/analytics"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-accent hover:text-brand-accent-hover transition-colors"
                      >
                        <span>View Executive Telemetry Dossier</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Live Storefront Link */}
            <Link to="/shop" target="_blank" rel="noopener noreferrer">
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-black via-[#1f1f22] to-brand-black hover:from-[#26262b] hover:to-brand-black text-white text-xs font-semibold shadow-2xs hover:shadow-sm transition-all border border-neutral-700/60 hover:border-brand-accent/50 group cursor-pointer active:scale-95"
                title="Open Customer Storefront"
              >
                <Store size={14} className="text-brand-accent group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Storefront</span>
                <ArrowUpRight size={13} className="text-neutral-400 group-hover:text-white transition-colors" />
              </button>
            </Link>

            {/* Administrator Executive Profile Chip */}
            <div className="flex items-center gap-2.5 pl-1.5 sm:pl-3 sm:border-l sm:border-brand-border/80">
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#E8DAC2] via-[#C5A880] to-[#8C7148] p-[1.5px] shadow-2xs shrink-0">
                  <div className="w-full h-full rounded-[9px] bg-brand-black flex items-center justify-center text-brand-accent font-serif font-bold text-xs sm:text-sm tracking-wider">
                    {adminInitials}
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-brand-black truncate max-w-[110px]">
                    {adminName}
                  </span>
                  <ShieldCheck size={12} className="text-brand-accent shrink-0" />
                </div>
                <span className="text-[10px] text-brand-muted font-medium">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Children Content Area */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
