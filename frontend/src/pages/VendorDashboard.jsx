import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  FileCheck,
  CreditCard,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Eye,
  Check,
  Bike,
} from 'lucide-react';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { vendorService, orderService, vendorDeliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VendorOrderStatusBadge } from './VendorOrders';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [store, setStore] = useState(null);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [timeframe, setTimeframe] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const [analyticsRes, storeRes, deliveryRes] = await Promise.allSettled([
        vendorService.getAnalytics({ timeframe }),
        vendorService.getStore(),
        vendorDeliveryService.getDeliveryBoys(),
      ]);

      if (storeRes.status === 'fulfilled' && storeRes.value?.store) {
        setStore(storeRes.value.store);
      }

      if (deliveryRes.status === 'fulfilled' && deliveryRes.value) {
        setDeliveryCount(
          typeof deliveryRes.value.count === 'number'
            ? deliveryRes.value.count
            : deliveryRes.value.deliveryBoys?.length || 0
        );
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      } else if (analyticsRes.status === 'rejected') {
        const err = analyticsRes.reason;
        console.error('Error fetching vendor analytics:', err);
        if (err.response?.status === 403) {
          // If unapproved, store still loads from storeRes
        } else {
          setFetchError(err.response?.data?.message || err.customMessage || 'Failed to load telemetry');
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setFetchError('Unable to synchronize atelier dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/dashboard' } } });
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, navigate, fetchDashboardData]);

  const summary = analytics?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    inFulfillmentOrders: 0,
    readyForPickupOrders: 0,
    cancelledOrders: 0,
    activeProducts: 0,
    draftProducts: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
  };

  const recentOrders = analytics?.recentOrders || [];
  const lowStockProducts = analytics?.lowStockProducts || [];
  const topSellingProducts = analytics?.topSellingProducts || [];
  const ordersByStatus = analytics?.ordersByStatus || [];

  const isApproved = store?.status === 'approved';
  const isPending = store?.status === 'pending';
  const isRejected = store?.status === 'rejected';

  return (
    <VendorLayout
      activePage="dashboard"
      title="Atelier Dashboard"
      subtitle="Executive Store Overview & Real-Time Performance Telemetry"
      store={store}
      actions={
        <div className="flex items-center gap-2">
          {isApproved && (
            <>
              <Link to="/vendor/products">
                <Button variant="outline" size="sm" icon={Plus} className="text-xs">
                  <span>Add Creation</span>
                </Button>
              </Link>
              <Link to="/vendor/delivery-boys">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Bike}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
                >
                  <span>Delivery Agents ({deliveryCount})</span>
                </Button>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={fetchDashboardData}
            className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-lg transition-colors cursor-pointer border border-brand-border/70"
            title="Refresh Dashboard"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      }
    >
      {/* Status Warning Banner for Unapproved Stores */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-amber-900">
                Store Application Under Compliance Review
              </h3>
              <p className="text-xs text-amber-800/80 leading-relaxed mt-0.5">
                Your boutique profile has been submitted and is currently in the administrator verification queue.
                Catalog publishing and customer checkout will activate as soon as your atelier is verified.
              </p>
            </div>
          </div>
          <Link to="/vendor/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs border-amber-300 hover:bg-amber-100">
              Review Store Details
            </Button>
          </Link>
        </div>
      )}

      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle size={18} />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-rose-900">
                Action Required: Application Feedback Provided
              </h3>
              <p className="text-xs text-rose-800/80 leading-relaxed mt-0.5">
                Administrator review note: &quot;{store.rejectionReason || 'Please update your business coordinates and resubmit.'}&quot;
              </p>
            </div>
          </div>
          <Link to="/vendor/settings" className="shrink-0">
            <Button variant="primary" size="sm" className="text-xs bg-rose-600 hover:bg-rose-700 text-white">
              Edit & Resubmit
            </Button>
          </Link>
        </div>
      )}

      {/* Timeframe Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface p-4 rounded-2xl border border-brand-border/70 text-left">
        <div>
          <h2 className="font-serif text-base font-bold text-brand-black">
            Performance Overview
          </h2>
          <p className="text-xs text-brand-muted">
            Telemetry aggregated across verified MongoDB transactions for {store?.name || 'your store'}.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Time' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '7d', label: 'Last 7 Days' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                timeframe === t.id
                  ? 'bg-brand-black text-white shadow-xs'
                  : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream border border-brand-border/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI METRIC CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Net Sales */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Net Sales
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 truncate">
            ${Number(summary.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-0.5">Active acquisitions</p>
        </div>

        {/* Total Orders */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Total Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <ShoppingBag size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {summary.totalOrders}
          </p>
          <p className="text-[10px] text-brand-muted mt-0.5">{summary.totalUnitsSold} items sold</p>
        </div>

        {/* Pending Acceptance */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={14} className="animate-pulse" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700">
            {summary.pendingOrders}
          </p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">Awaiting accept</p>
        </div>

        {/* In Fulfillment */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Fulfillment
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-sky-700">
            {summary.inFulfillmentOrders + summary.readyForPickupOrders}
          </p>
          <p className="text-[10px] text-sky-600/80 mt-0.5">Processing & packed</p>
        </div>

        {/* Active Products */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Active Catalog
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {summary.activeProducts}
          </p>
          <p className="text-[10px] text-brand-muted mt-0.5">{summary.totalProducts} total creations</p>
        </div>

        {/* Average Order Value */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Avg Order Val
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            ${Number(summary.averageOrderValue || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-brand-muted mt-0.5">Per client purchase</p>
        </div>
      </div>

      {/* QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          to="/vendor/orders"
          className="p-4 rounded-2xl bg-brand-surface border border-brand-border/70 shadow-xs hover:border-brand-accent/50 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <ShoppingBag size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-brand-black">Fulfill Orders</p>
              <p className="text-[11px] text-brand-muted">
                {summary.pendingOrders > 0 ? `${summary.pendingOrders} orders require action` : 'Manage dispatches'}
              </p>
            </div>
          </div>
          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-black group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/vendor/products"
          className="p-4 rounded-2xl bg-brand-surface border border-brand-border/70 shadow-xs hover:border-brand-accent/50 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
              <Package size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-brand-black">Manage Catalog</p>
              <p className="text-[11px] text-brand-muted">{summary.activeProducts} published creations</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-black group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/vendor/delivery-boys"
          className="p-4 rounded-2xl bg-brand-surface border border-brand-border/70 shadow-xs hover:border-brand-accent/50 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Bike size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-brand-black">Delivery Agents</p>
              <p className="text-[11px] text-brand-muted">
                {deliveryCount > 0 ? `${deliveryCount} agents · Live GPS` : 'Manage staff & tracking'}
              </p>
            </div>
          </div>
          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-black group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/vendor/analytics"
          className="p-4 rounded-2xl bg-brand-surface border border-brand-border/70 shadow-xs hover:border-brand-accent/50 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-brand-black">Sales Analytics</p>
              <p className="text-[11px] text-brand-muted">View volume & trends</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-black group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          to="/vendor/settings"
          className="p-4 rounded-2xl bg-brand-surface border border-brand-border/70 shadow-xs hover:border-brand-accent/50 transition-all flex items-center justify-between text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Store size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-brand-black">Store Settings</p>
              <p className="text-[11px] text-brand-muted">Branding & logistics</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-brand-muted group-hover:text-brand-black group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* TWO COLUMN GRID: RECENT ORDERS & LOW-STOCK INVENTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* RECENT STORE ORDERS (Cols 1-7) */}
        <div className="lg:col-span-7 bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
            <div>
              <h3 className="font-serif text-base font-bold text-brand-black">
                Recent Store Acquisitions
              </h3>
              <p className="text-[11px] text-brand-muted">Latest purchases for your atelier items</p>
            </div>

            <Link
              to="/vendor/orders"
              className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-brand-muted">Loading transactions...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShoppingBag size={28} className="text-brand-muted mx-auto" />
              <p className="font-serif text-sm font-bold text-brand-black">No Recent Orders</p>
              <p className="text-xs text-brand-muted max-w-xs mx-auto">
                When customers purchase pieces from your collections, they will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-brand-border/40">
              {recentOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-brand-offwhite/50 px-2 rounded-xl transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-black">
                        #{String(ord._id || ord.id || '').slice(-8).toUpperCase()}
                      </span>
                      <VendorOrderStatusBadge status={ord.orderStatus} />
                    </div>
                    <p className="text-brand-charcoal truncate font-medium">
                      {ord.customerName} • {ord.itemsCount} unit(s)
                    </p>
                    <p className="text-[10px] text-brand-muted">
                      {new Date(ord.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-serif font-bold text-sm text-brand-black">
                      ${Number(ord.vendorSubtotal || 0).toLocaleString()}
                    </p>
                    <Link
                      to="/vendor/orders"
                      className="text-[11px] font-semibold text-brand-accent hover:underline mt-0.5 inline-block"
                    >
                      Fulfill &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOW-STOCK INVENTORY ALERT CARD (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-black">
                    Inventory Stock Watch
                  </h3>
                  <p className="text-[11px] text-brand-muted">Creations running low (&le; 5 units)</p>
                </div>
              </div>

              <Link
                to="/vendor/products"
                className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
              >
                <span>Catalog</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
                <p className="font-serif text-sm font-bold text-brand-black">Inventory Healthy</p>
                <p className="text-xs text-brand-muted max-w-xs mx-auto">
                  All active creations have sufficient stock levels above the 5-unit threshold.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p._id}
                    className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-brand-border/60 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white border border-brand-border/60 flex items-center justify-center text-brand-muted shrink-0">
                          <Package size={15} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-brand-black truncate">{p.name}</p>
                        <p className="text-[11px] text-brand-muted font-mono">{p.sku || 'No SKU'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {p.stock} left
                      </span>
                      <Link
                        to="/vendor/products"
                        className="block text-[11px] text-brand-accent hover:underline font-semibold mt-1"
                      >
                        Restock &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOP PERFORMING CREATIONS */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <h3 className="font-serif text-base font-bold text-brand-black flex items-center gap-2">
                <Sparkles size={16} className="text-brand-accent" />
                <span>Top Selling Pieces</span>
              </h3>
              <Link to="/vendor/analytics" className="text-xs font-semibold text-brand-accent hover:underline">
                Full Analytics &rarr;
              </Link>
            </div>

            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-brand-muted py-4 text-center">
                Top selling pieces will populate as customer acquisitions are finalized.
              </p>
            ) : (
              <div className="space-y-3">
                {topSellingProducts.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 font-serif font-bold text-brand-muted">#{idx + 1}</span>
                      <p className="font-bold text-brand-black truncate">{item.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-brand-black">{item.unitsSold} units</p>
                      <p className="text-[10px] text-brand-muted">${Number(item.revenue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}
