import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Store,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Navigation,
  Bike,
  Sun,
  Moon,
} from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { vendorService, orderService, categoryService, vendorDeliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatImageUrl } from '../utils/imageUrl';

/**
 * Reusable Vendor Layout Component
 * Component-based architecture providing responsive sidebar navigation,
 * top header, store status telemetry, notifications, and mobile drawer.
 */
export default function VendorLayout({
  activePage = 'dashboard',
  title = 'Merchant Atelier Suite',
  subtitle = 'Store Performance, Inventory & Order Fulfillment',
  actions,
  store: propStore,
  children,
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [store, setStore] = useState(null);
  const [counts, setCounts] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    pendingOrders: 0,
    deliveryBoys: 0,
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { user, store: authStore, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const activeStore = propStore || store || authStore;

  useEffect(() => {
    let isMounted = true;

    // Fetch store profile and live counts for sidebar badges
    vendorService.getStore()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.store) {
          setStore(res.store);
          if (res.store.status !== 'approved' && user?.role === 'vendor') {
            navigate('/vendor/approval-status', { replace: true });
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching store in VendorLayout:', err);
      });

    // Fetch live counts for navigation badges
    Promise.allSettled([
      vendorService.getProducts({ limit: 1 }),
      orderService.getVendorOrders({ limit: 1 }),
      categoryService.getCategories(),
      vendorDeliveryService.getDeliveryBoys(),
    ]).then(([pRes, oRes, cRes, dRes]) => {
      if (!isMounted) return;

      const prodTotal =
        pRes.status === 'fulfilled' && typeof pRes.value?.totalProducts === 'number'
          ? pRes.value.totalProducts
          : pRes.status === 'fulfilled' && Array.isArray(pRes.value?.products)
          ? pRes.value.products.length
          : 0;

      const ordTotal =
        oRes.status === 'fulfilled' && typeof oRes.value?.totalOrders === 'number'
          ? oRes.value.totalOrders
          : oRes.status === 'fulfilled' && Array.isArray(oRes.value?.orders)
          ? oRes.value.orders.length
          : 0;

      const pendingOrd =
        oRes.status === 'fulfilled' && typeof oRes.value?.summary?.pending === 'number'
          ? oRes.value.summary.pending
          : 0;

      const catTotal =
        cRes.status === 'fulfilled' && Array.isArray(cRes.value?.categories)
          ? cRes.value.categories.length
          : 0;

      const delivTotal =
        dRes.status === 'fulfilled' && typeof dRes.value?.count === 'number'
          ? dRes.value.count
          : dRes.status === 'fulfilled' && Array.isArray(dRes.value?.deliveryBoys)
          ? dRes.value.deliveryBoys.length
          : 0;

      setCounts({
        products: prodTotal,
        orders: ordTotal,
        pendingOrders: pendingOrd,
        categories: catTotal,
        deliveryBoys: delivTotal,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

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

  const vendorName = user?.name || 'Artisanal Merchant';
  const vendorEmail = user?.email || 'vendor@luxury.test';
  const vendorInitials =
    vendorName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'VM';

  const isApproved = activeStore?.status === 'approved';
  const isPending = activeStore?.status === 'pending';
  const isRejected = activeStore?.status === 'rejected';
  const isSuspended = activeStore?.status === 'suspended' || user?.status === 'suspended';

  // Navigation Items
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/vendor/dashboard',
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      path: '/vendor/products',
      badge: counts.products > 0 ? String(counts.products) : null,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      path: '/vendor/categories',
      badge: counts.categories > 0 ? String(counts.categories) : null,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      path: '/vendor/orders',
      badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} new` : counts.orders > 0 ? String(counts.orders) : null,
      badgeVariant: counts.pendingOrders > 0 ? 'accent' : 'default',
    },
    {
      id: 'delivery',
      label: 'Delivery Agents',
      icon: Bike,
      path: '/vendor/delivery-boys',
      badge: counts.deliveryBoys > 0 ? String(counts.deliveryBoys) : null,
      badgeVariant: 'default',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/vendor/analytics',
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: Store,
      path: '/vendor/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black antialiased transition-colors">
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
        className={`fixed inset-y-0 left-0 z-50 w-64 h-[100dvh] bg-brand-black text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-white/10 select-none shadow-2xl lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Merchant Navigation Sidebar"
      >
        {/* Top Pinned Section: Brand Header & Active Atelier Profile */}
        <div className="shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-serif text-lg font-bold tracking-tight text-white group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Vendor
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

          {/* Store Quick Identifier */}
          <div className="px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-1">
              Active Atelier
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {activeStore?.logoUrl ? (
                  <img src={formatImageUrl(activeStore.logoUrl)} alt={activeStore.name} className="w-full h-full object-cover" />
                ) : (
                  <Store size={15} className="text-brand-accent" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-serif text-xs font-bold text-white truncate">
                  {activeStore?.name || (user?.name ? `${user.name} House` : 'Maison Atelier')}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (activeStore?.status === 'approved' || (!activeStore?.status && user?.role === 'vendor'))
                        ? 'bg-emerald-400'
                        : isRejected
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-[10px] text-neutral-300 capitalize font-medium">
                    {activeStore?.status || (user?.role === 'vendor' ? 'approved' : 'pending')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Scrollable Navigation Links (Hidden scrollbar on Windows & smooth touch) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">
            Merchant Suite
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activePage === item.id ||
                (item.id === 'dashboard' && (location.pathname === '/vendor' || location.pathname === '/vendor/dashboard')) ||
                (item.id === 'products' && location.pathname.startsWith('/vendor/products')) ||
                (item.id === 'categories' && location.pathname.startsWith('/vendor/categories')) ||
                (item.id === 'orders' && location.pathname.startsWith('/vendor/orders')) ||
                (item.id === 'delivery' && location.pathname.startsWith('/vendor/delivery-boys')) ||
                (item.id === 'analytics' && location.pathname.startsWith('/vendor/analytics')) ||
                (item.id === 'settings' && (location.pathname.startsWith('/vendor/settings') || location.pathname.startsWith('/vendor/profile')));

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
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
                        isActive
                          ? 'bg-black/20 text-brand-black'
                          : item.badgeVariant === 'accent'
                          ? 'bg-amber-400 text-neutral-900 font-black'
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

        {/* Bottom Pinned Section: Customer Shop & Vendor Profile Details */}
        <div className="shrink-0 p-3.5 border-t border-white/10 space-y-2.5 bg-brand-black">
          {/* Back to Client Storefront */}
          <Link
            to="/shop"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors border border-white/10"
          >
            <ShoppingBag size={14} />
            <span>Customer Shop</span>
            <ArrowUpRight size={12} className="opacity-70" />
          </Link>

          {/* Vendor Profile & Logout */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-accent text-brand-black text-xs font-bold flex items-center justify-center shrink-0">
                {vendorInitials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-white truncate">{vendorName}</p>
                <p className="text-[10px] text-neutral-400 truncate">{vendorEmail}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VENDOR CONTENT CONTAINER (Offset by fixed sidebar on desktop) */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-300">
        {/* Top Navigation & Status Bar - Ultra-Luxurious Merchant Suite Header */}
        <header className="relative min-h-[4.25rem] sm:h-20 lg:h-22 bg-gradient-to-r from-white via-brand-surface to-brand-offwhite/80 backdrop-blur-2xl border-b border-brand-border/90 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_30px_-6px_rgba(20,20,25,0.04),0_1px_3px_rgba(0,0,0,0.02)] transition-all py-2 sm:py-0">
          {/* Ambient Golden Radial Light Glow */}
          <div className="absolute left-1/4 top-0 w-96 h-12 bg-brand-accent/5 blur-3xl pointer-events-none rounded-full" />

          {/* Top Ambient Specular Light Hairline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent pointer-events-none" />

          {/* Bottom Brushed Champagne Gold Accent Hairline */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent pointer-events-none" />

          {/* Left: Mobile Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-brand-charcoal hover:text-brand-black bg-white/90 hover:bg-brand-cream/80 border border-brand-border/90 hover:border-brand-accent/50 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              <Menu size={19} />
            </button>

            <div className="text-left min-w-0">
              {/* Micro Luxury Atelier Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9E8257]">
                <Sparkles size={11} className="text-brand-accent shrink-0" />
                <span className="truncate max-w-[180px] font-serif font-semibold text-brand-black/85">
                  {activeStore?.name || 'Maison Atelier'}
                </span>
                <span className="text-brand-accent/50">•</span>
                <span className="text-brand-subtle capitalize tracking-normal font-medium">{activePage}</span>
              </div>

              {/* Main Page Title with Live Radar Status Badge */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                <h1 className="font-serif text-sm xs:text-base sm:text-xl lg:text-[23px] font-bold text-brand-black tracking-tight truncate leading-tight">
                  {title}
                </h1>

                {/* Status Badges */}
                {isApproved && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-900 border border-emerald-500/30 shadow-2xs backdrop-blur-xs shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="hidden xs:inline">Verified & Live</span>
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-900 border border-amber-500/30 shadow-xs backdrop-blur-xs shrink-0">
                    <Clock size={12} className="text-amber-600" />
                    <span>Pending Approval</span>
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-rose-500/10 text-rose-900 border border-rose-500/30 shadow-xs backdrop-blur-xs shrink-0">
                    <XCircle size={12} className="text-rose-600" />
                    <span>Action Required</span>
                  </span>
                )}
              </div>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-[11.5px] text-brand-muted hidden md:block truncate max-w-lg font-normal mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Center Enterprise Telemetry Capsule (Large Desktop Screens) */}
          <div className="hidden xl:flex items-center gap-3.5 px-4.5 py-1.5 rounded-full bg-white/95 border border-brand-border/90 shadow-[0_2px_14px_-2px_rgba(197,168,128,0.18)] text-xs backdrop-blur-md hover:border-brand-accent/50 transition-all">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>BOUTIQUE ONLINE</span>
            </div>
            <span className="w-px h-3.5 bg-brand-border" />
            <div className="flex items-center gap-1.5 text-[11px] text-brand-charcoal font-medium">
              <ShieldCheck size={13} className="text-brand-accent" />
              <span className="text-brand-muted">SSL Active</span>
            </div>
            <span className="w-px h-3.5 bg-brand-border" />
            <div className="flex items-center gap-1 text-[11px] text-brand-charcoal font-semibold">
              <Package size={13} className="text-brand-accent" />
              <span className="text-brand-black font-bold">{counts.products}</span>
              <span className="text-brand-muted font-normal">Creations</span>
            </div>
            {counts.pendingOrders > 0 && (
              <>
                <span className="w-px h-3.5 bg-brand-border" />
                <Link
                  to="/vendor/orders"
                  className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 font-bold hover:bg-amber-500/25 transition-colors"
                >
                  <Clock size={11} className="text-amber-700" />
                  <span>{counts.pendingOrders} to pack</span>
                </Link>
              </>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-3.5 shrink-0">
            {actions}

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 text-brand-charcoal hover:text-brand-black bg-white hover:bg-brand-cream/70 border border-brand-border/90 hover:border-brand-accent/60 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs focus:outline-none group active:scale-95"
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={17} className="text-amber-400 group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              ) : (
                <Moon size={17} className="text-brand-charcoal group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="relative p-2 sm:p-2.5 text-brand-charcoal hover:text-brand-black bg-white hover:bg-brand-cream/70 border border-brand-border/90 hover:border-brand-accent/60 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs focus:outline-none group active:scale-95"
                title="Live Telemetry & Notifications"
                aria-label="Live Telemetry & Notifications"
              >
                <Bell size={17} className="transition-transform group-hover:rotate-12 duration-200" />
                {counts.pendingOrders > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9.5px] font-black flex items-center justify-center ring-2 ring-white shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                    {counts.pendingOrders}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="fixed inset-x-3 sm:inset-x-auto sm:right-0 sm:absolute top-16 sm:top-auto sm:mt-3 w-auto sm:w-92 max-w-sm bg-white/95 backdrop-blur-2xl border border-brand-border rounded-2xl shadow-[0_25px_70px_-15px_rgba(17,17,17,0.18)] z-50 p-4 text-left divide-y divide-brand-border/60 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="text-xs font-bold text-brand-black uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={12} className="text-brand-accent" />
                          Atelier Telemetry
                        </h4>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Connected
                      </span>
                    </div>

                    <div className="py-3 space-y-2.5 text-xs">
                      {counts.pendingOrders > 0 ? (
                        <Link
                          to="/vendor/orders"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="block p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                              <Clock size={13} className="text-amber-700" />
                              Orders Awaiting Fulfillment
                            </p>
                            <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                              {counts.pendingOrders} pending
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 mt-1">
                            Customer orders ready for packaging & dispatch.
                          </p>
                        </Link>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-brand-offwhite border border-brand-border/70">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-brand-black flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Orders Ledger Clear
                            </p>
                            <span className="text-[10px] text-brand-muted">Up to date</span>
                          </div>
                          <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">
                            No pending orders require immediate fulfillment confirmation.
                          </p>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-brand-offwhite border border-brand-border/70">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-brand-black flex items-center gap-1.5">
                            <Package size={13} className="text-brand-accent" />
                            Catalog Status
                          </p>
                          <span className="text-[10px] text-brand-muted">{counts.products} SKUs</span>
                        </div>
                        <p className="text-[11px] text-brand-muted mt-1 leading-relaxed">
                          Active creations synchronized with public customer storefront.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 text-center">
                      <Link
                        to="/vendor/orders"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-accent hover:text-brand-accent-hover transition-colors"
                      >
                        <span>Open Order Fulfillment Queue</span>
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Merchant Executive Profile Chip */}
            <div className="flex items-center gap-2 pl-1 sm:pl-3 sm:border-l sm:border-brand-border/80">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#E8DAC2] via-[#C5A880] to-[#8C7148] p-[1.5px] shadow-sm shrink-0 overflow-hidden group hover:shadow-[0_2px_12px_rgba(197,168,128,0.35)] transition-all">
                  {activeStore?.logoUrl ? (
                    <img
                      src={formatImageUrl(activeStore.logoUrl)}
                      alt={activeStore.name}
                      className="w-full h-full object-cover rounded-[10px] sm:rounded-[13px]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[10px] sm:rounded-[13px] bg-brand-black flex items-center justify-center text-brand-accent font-serif font-bold text-xs sm:text-sm tracking-wider">
                      {vendorInitials}
                    </div>
                  )}
                </div>
                {isApproved && (
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 ring-2 ring-white shadow-2xs" />
                )}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-brand-black truncate max-w-[130px]">
                    {activeStore?.name || vendorName}
                  </span>
                  <ShieldCheck size={13} className="text-brand-accent shrink-0" />
                </div>
                <span className="text-[10px] text-brand-muted font-medium tracking-wide flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Verified Merchant
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Children Content Area */}
        <main className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-8 flex-1 max-w-[1700px] w-full mx-auto min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
