import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  BarChart3
} from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { productService, categoryService, orderService } from '../services/api';
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
  const [counts, setCounts] = useState({ products: 0, categories: 0, orders: 0 });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      productService.getProducts({ limit: 1 }),
      categoryService.getCategories(),
      orderService.getAllOrders(),
    ]).then(([pRes, cRes, oRes]) => {
      if (!isMounted) return;
      const prodTotal = pRes.status === 'fulfilled' && typeof pRes.value?.total === 'number'
        ? pRes.value.total
        : pRes.status === 'fulfilled' && pRes.value?.products
        ? pRes.value.products.length
        : 0;
      const catTotal = cRes.status === 'fulfilled' && Array.isArray(cRes.value?.categories)
        ? cRes.value.categories.length
        : 0;
      const ordTotal = oRes.status === 'fulfilled' && Array.isArray(oRes.value?.orders)
        ? oRes.value.orders.length
        : oRes.status === 'fulfilled' && Array.isArray(oRes.value)
        ? oRes.value.length
        : 0;
      setCounts({ products: prodTotal, categories: catTotal, orders: ordTotal });
    });
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  const adminName = user?.name || 'Administrator';
  const adminEmail = user?.email || 'admin@gmail.com';
  const adminInitials = adminName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  // Navigation Items with route targets
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin'
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      path: '/admin/products',
      badge: counts.products > 0 ? String(counts.products) : null
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      path: '/admin/categories',
      badge: counts.categories > 0 ? String(counts.categories) : null
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      path: '/admin/orders',
      badge: counts.orders > 0 ? String(counts.orders) : null
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
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/admin/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black flex flex-col lg:flex-row antialiased">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. SIDEBAR (Fixed Desktop & Collapsible Mobile Drawer) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-black text-white flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
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

          {/* Navigation Links */}
          <div className="px-3 py-6">
            <p className="px-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-3">
              Management Suite
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activePage === item.id ||
                  (item.id === 'dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/dashboard')) ||
                  (item.id === 'products' && location.pathname.startsWith('/admin/products')) ||
                  (item.id === 'categories' && location.pathname.startsWith('/admin/categories')) ||
                  (item.id === 'orders' && location.pathname.startsWith('/admin/orders')) ||
                  (item.id === 'customers' && location.pathname.startsWith('/admin/customers')) ||
                  (item.id === 'analytics' && location.pathname.startsWith('/admin/analytics')) ||
                  (item.id === 'settings' && location.pathname.startsWith('/admin/settings'));

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
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
        </div>

        {/* Sidebar Footer: Back to Store & Admin Identity */}
        <div className="p-4 border-t border-white/10 space-y-3">
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
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-18 bg-brand-surface border-b border-brand-border/70 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Left: Mobile Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-brand-black hover:bg-brand-cream/60 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              <Menu size={22} />
            </button>

            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold text-brand-black tracking-tight">
                  {title}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-brand-muted hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {actions}

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-full transition-colors relative cursor-pointer focus:outline-none"
                title="Notifications"
              >
                <Bell size={18} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse"></span>
              </button>

              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-brand-surface border border-brand-border rounded-xl shadow-xl z-50 p-4 text-left">
                    <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                      <h4 className="text-xs font-bold text-brand-black">Live Notifications</h4>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                        Connected
                      </span>
                    </div>
                    <div className="py-2 space-y-2.5 text-xs">
                      <div className="p-2 rounded-lg bg-brand-offwhite border border-brand-border/60">
                        <p className="font-semibold text-brand-black">MongoDB Database Online</p>
                        <p className="text-[11px] text-brand-muted">
                          {counts.products} products, {counts.categories} categories, {counts.orders} orders synchronized.
                        </p>
                      </div>
                      <Link
                        to="/admin/orders"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="block p-2 rounded-lg hover:bg-brand-offwhite transition-colors"
                      >
                        <p className="font-semibold text-brand-black">Orders Ledger</p>
                        <p className="text-[11px] text-brand-muted">
                          {counts.orders} client transaction(s) recorded in database.
                        </p>
                      </Link>
                    </div>
                    <div className="pt-2 border-t border-brand-border text-center">
                      <Link
                        to="/admin/analytics"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-[11px] font-semibold text-brand-accent hover:underline"
                      >
                        View Full Telemetry &rarr;
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Live Storefront Link */}
            <Link to="/shop">
              <Button variant="outline" size="sm" icon={Store} className="hidden sm:inline-flex text-xs">
                Storefront
              </Button>
            </Link>
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
