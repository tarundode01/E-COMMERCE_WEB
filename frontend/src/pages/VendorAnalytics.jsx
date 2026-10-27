import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Store,
  Filter,
  AlertCircle,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { vendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function VendorAnalytics() {
  const navigate = useNavigate();
  const { user, isAuthenticated, store: authStore } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [store, setStore] = useState(authStore || null);
  const [timeframe, setTimeframe] = useState('all'); // 'all' | '7d' | '30d' | '1y'
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders'
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const [analyticsRes, storeRes] = await Promise.allSettled([
        vendorService.getAnalytics({ timeframe }),
        vendorService.getStore(),
      ]);

      if (storeRes.status === 'fulfilled' && storeRes.value?.store) {
        setStore(storeRes.value.store);
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
        if (analyticsRes.value.store) {
          setStore((prev) => prev || analyticsRes.value.store);
        }
      } else if (analyticsRes.status === 'rejected') {
        const err = analyticsRes.reason;
        console.error('Error fetching analytics:', err);
        setFetchError(
          err.response?.data?.message ||
            err.customMessage ||
            'Failed to load store telemetry. Please verify your store approval status.'
        );
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setFetchError('Failed to synchronize store analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/analytics' } } });
      return;
    }
    fetchAnalytics();
  }, [isAuthenticated, navigate, fetchAnalytics]);

  const summary = analytics?.summary || {
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    packedOrders: 0,
    readyForPickupOrders: 0,
    shippedOrders: 0,
    cancelledOrders: 0,
    activeProducts: 0,
    draftProducts: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalUnitsSold: 0,
    averageOrderValue: 0,
  };

  const salesTimeline = analytics?.salesTimeline || [];
  const topSellingProducts = analytics?.topSellingProducts || [];
  const lowStockProducts = analytics?.lowStockProducts || [];
  const recentOrders = analytics?.recentOrders || [];

  // =========================================================================
  // SVG Chart Geometry
  // =========================================================================
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 50;
  const paddingY = 32;

  const maxVal = useMemo(() => {
    if (salesTimeline.length === 0) return chartMetric === 'revenue' ? 100 : 5;
    const values = salesTimeline.map((d) => (chartMetric === 'revenue' ? d.sales || 0 : d.orders || 0));
    const highest = Math.max(...values);
    return highest > 0 ? highest * 1.25 : chartMetric === 'revenue' ? 100 : 5;
  }, [salesTimeline, chartMetric]);

  const chartPoints = useMemo(() => {
    if (salesTimeline.length === 0) return [];
    let items = [...salesTimeline];
    if (items.length === 1) {
      const singleDate = new Date(items[0].date);
      const prevDate = new Date(singleDate.getTime() - 24 * 60 * 60 * 1000);
      items = [
        { date: prevDate.toISOString().split('T')[0], sales: 0, orders: 0 },
        items[0],
      ];
    }

    const step =
      items.length > 1
        ? (svgWidth - paddingX * 2) / (items.length - 1)
        : 0;

    return items.map((item, index) => {
      const metricValue = chartMetric === 'revenue' ? item.sales || 0 : item.orders || 0;
      const x = paddingX + index * step;
      const normalizedHeight = (metricValue / maxVal) * (svgHeight - paddingY * 2);
      const y = svgHeight - paddingY - normalizedHeight;
      return { ...item, x, y, metricValue };
    });
  }, [salesTimeline, maxVal, chartMetric]);

  const pathLine = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      return `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [chartPoints]);

  const pathArea = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    const baseline = svgHeight - paddingY;
    return `${pathLine} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [chartPoints, pathLine]);

  // Order status breakdown items
  const statusItems = [
    {
      label: 'Completed (Delivered)',
      count: summary.completedOrders,
      color: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    {
      label: 'In Transit (Shipped)',
      count: summary.shippedOrders,
      color: 'bg-indigo-500',
      text: 'text-indigo-700',
    },
    {
      label: 'Ready for Pickup',
      count: summary.readyForPickupOrders,
      color: 'bg-teal-500',
      text: 'text-teal-700',
    },
    {
      label: 'Packed & Ready',
      count: summary.packedOrders,
      color: 'bg-purple-500',
      text: 'text-purple-700',
    },
    {
      label: 'Processing',
      count: summary.processingOrders,
      color: 'bg-blue-500',
      text: 'text-blue-700',
    },
    {
      label: 'Confirmed',
      count: summary.confirmedOrders,
      color: 'bg-sky-500',
      text: 'text-sky-700',
    },
    {
      label: 'Pending Acceptance',
      count: summary.pendingOrders,
      color: 'bg-amber-500',
      text: 'text-amber-700',
    },
    {
      label: 'Cancelled / Rejected',
      count: summary.cancelledOrders,
      color: 'bg-rose-500',
      text: 'text-rose-700',
    },
  ];

  const totalValidOrders = summary.totalOrders || 0;

  const pageActions = (
    <div className="flex items-center gap-2.5">
      <div className="inline-flex rounded-xl border border-brand-border/80 bg-brand-surface p-1 shadow-2xs">
        {[
          { id: 'all', label: 'All Time' },
          { id: '30d', label: '30 Days' },
          { id: '7d', label: '7 Days' },
          { id: '1y', label: '1 Year' },
        ].map((tf) => (
          <button
            key={tf.id}
            type="button"
            onClick={() => setTimeframe(tf.id)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
              timeframe === tf.id
                ? 'bg-brand-black text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-black'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={fetchAnalytics}
        className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-xl transition-colors cursor-pointer border border-brand-border/70 shadow-xs"
        title="Refresh Analytics"
      >
        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
      </button>
    </div>
  );

  return (
    <VendorLayout
      activePage="analytics"
      title="Atelier Sales Analytics"
      subtitle={`${store ? store.name : 'vender House'} • Real-time revenue intelligence, order velocity, and merchandise volume`}
      actions={pageActions}
      store={store}
    >
      {/* Error State Banner */}
      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="text-xs">
            Retry Sync
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-left">
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
            Net Sales
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {formatCurrency(summary.totalRevenue)}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">Direct store gross</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
            Total Orders
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {summary.totalOrders}
          </p>
          <p className="text-[10px] text-brand-muted mt-1">
            {summary.pendingOrders} pending confirmation
          </p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
            Avg. Order Value
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {formatCurrency(summary.averageOrderValue)}
          </p>
          <p className="text-[10px] text-brand-muted mt-1">Per fulfilled purchase</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
            Units Sold
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {summary.totalUnitsSold}
          </p>
          <p className="text-[10px] text-brand-muted mt-1">Catalog items purchased</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
            Active Catalog
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black">
            {summary.activeProducts}{' '}
            <span className="text-xs text-brand-muted font-sans font-normal">
              / {summary.totalProducts}
            </span>
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">Published creations</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
            Low Stock Watch
          </span>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-800">
            {summary.lowStockCount}
          </p>
          <p className="text-[10px] text-amber-700 mt-1">Creations &le; 5 units</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-brand-border/60">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles size={14} className="text-brand-accent" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-brand-accent">
                Chronological Performance
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-black">
              Sales Revenue & Order Velocity
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Metric Toggle: Revenue vs Orders */}
            <div className="inline-flex rounded-lg border border-brand-border/80 bg-brand-offwhite p-1 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  chartMetric === 'revenue'
                    ? 'bg-brand-black text-white shadow-xs'
                    : 'text-brand-muted hover:text-brand-black'
                }`}
              >
                Revenue ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  chartMetric === 'orders'
                    ? 'bg-brand-black text-white shadow-xs'
                    : 'text-brand-muted hover:text-brand-black'
                }`}
              >
                Orders
              </button>
            </div>

            <span className="text-xs text-brand-muted hidden sm:inline">
              Timeframe:{' '}
              <strong className="text-brand-black capitalize">
                {timeframe === 'all' ? 'All-Time' : timeframe}
              </strong>
            </span>
          </div>
        </div>

        {salesTimeline.length === 0 ? (
          <div className="py-16 text-center text-xs text-brand-muted">
            <BarChart3 size={32} className="mx-auto mb-2 text-brand-muted opacity-50" />
            <p>No verified sales transactions recorded for this timeframe.</p>
          </div>
        ) : (
          <div className="pt-6 overflow-x-auto">
            <div className="relative min-w-[550px]">
              {hoveredPoint && (
                <div
                  className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-brand-black text-white px-3 py-1.5 rounded-lg text-xs shadow-xl z-20 transition-all border border-white/20"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-wider text-brand-accent font-semibold">
                    {hoveredPoint.date}
                  </p>
                  <p className="font-bold text-sm">
                    {chartMetric === 'revenue'
                      ? formatCurrency(hoveredPoint.sales)
                      : `${hoveredPoint.orders} orders`}
                  </p>
                  <p className="text-[10px] text-neutral-300">
                    Gross: {formatCurrency(hoveredPoint.sales)} • {hoveredPoint.orders} order(s)
                  </p>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-56 sm:h-64 overflow-visible"
              >
                <defs>
                  <linearGradient id="vendorGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const yVal = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
                  return (
                    <g key={ratio}>
                      <line
                        x1={paddingX}
                        y1={yVal}
                        x2={svgWidth - paddingX}
                        y2={yVal}
                        stroke="#e5e5e5"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 8}
                        y={yVal + 3}
                        textAnchor="end"
                        className="text-[9px] fill-neutral-400 font-mono"
                      >
                        {chartMetric === 'revenue'
                          ? formatCurrency(maxVal * ratio)
                          : Math.round(maxVal * ratio)}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area */}
                {pathArea && <path d={pathArea} fill="url(#vendorGoldGrad)" />}

                {/* Trend Line */}
                {pathLine && (
                  <path
                    d={pathLine}
                    fill="none"
                    stroke="#b38f2a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points */}
                {chartPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.date === pt.date ? 6 : 4}
                    fill="#1a1a1a"
                    stroke="#d4af37"
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X-Axis baseline */}
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY}
                  stroke="#262626"
                  strokeWidth="1.5"
                />

                {/* Date labels */}
                {chartPoints.map((pt, idx) => {
                  const step = Math.ceil(chartPoints.length / 7) || 1;
                  if (idx % step !== 0 && idx !== chartPoints.length - 1) return null;

                  return (
                    <text
                      key={idx}
                      x={pt.x}
                      y={svgHeight - paddingY + 18}
                      textAnchor="middle"
                      className="text-[10px] fill-neutral-500 font-sans"
                    >
                      {pt.date}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Status Breakdown & Top Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        {/* Order Status Distribution */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black mb-1">
              Order Fulfillment Breakdown
            </h3>
            <p className="text-xs text-brand-muted mb-4">
              Real-time progression of orders placed with your atelier.
            </p>

            <div className="space-y-3">
              {statusItems.map((st) => {
                const pct =
                  totalValidOrders > 0 ? Math.round((st.count / totalValidOrders) * 100) : 0;
                return (
                  <div key={st.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-brand-charcoal">{st.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-black">{st.count}</span>
                        <span className="text-[10px] text-brand-muted w-10 text-right">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-brand-offwhite rounded-full overflow-hidden border border-brand-border/60">
                      <div
                        className={`h-full ${st.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>
              Total acquisitions tracked: <strong>{totalValidOrders}</strong>
            </span>
            <Link
              to="/vendor/orders"
              className="text-xs font-semibold text-brand-black hover:text-brand-accent flex items-center gap-1"
            >
              <span>View Orders</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {/* Top-Selling Creations */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black mb-1">
              Best-Selling Atelier Creations
            </h3>
            <p className="text-xs text-brand-muted mb-4">
              Ranking by units sold and generated revenue.
            </p>

            {topSellingProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-brand-muted">
                <Package size={28} className="mx-auto mb-2 opacity-50" />
                <p>No sales records available yet to rank creations.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topSellingProducts.map((p, idx) => (
                  <div
                    key={p.productId || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-brand-offwhite/60 border border-brand-border/60 hover:border-brand-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-brand-black text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-lg bg-brand-surface border border-brand-border/70 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-brand-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-black truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-brand-muted">
                          SKU: {p.sku || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-brand-black">
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {p.unitsSold} {p.unitsSold === 1 ? 'unit' : 'units'} sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Showing top {topSellingProducts.length} items</span>
            <Link
              to="/vendor/products"
              className="text-xs font-semibold text-brand-black hover:text-brand-accent flex items-center gap-1"
            >
              <span>Full Catalog</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Low-Stock Inventory Watch Table */}
      {lowStockProducts.length > 0 && (
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
          <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-brand-black">
                  Low-Stock Inventory Replenishment Watch
                </h3>
                <p className="text-[11px] text-brand-muted">
                  These items have 5 or fewer units available. Replenish inventory to avoid sales disruption.
                </p>
              </div>
            </div>

            <Link to="/vendor/products">
              <Button variant="outline" size="sm" className="text-xs">
                Update Inventory
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border/60 text-brand-muted uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Remaining Stock</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {lowStockProducts.map((p) => (
                  <tr key={p._id || p.id} className="hover:bg-brand-offwhite/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-brand-offwhite border border-brand-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={14} className="text-brand-muted" />
                          )}
                        </div>
                        <span className="font-semibold text-brand-black">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-brand-muted">
                      {p.sku || '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-brand-black">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          Number(p.stock) === 0 ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {Number(p.stock) === 0 ? 'Out of Stock (0)' : `${p.stock} units left`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/vendor/products"
                        className="text-xs font-semibold text-brand-accent hover:underline"
                      >
                        Edit Stock &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Acquisitions Table */}
      {recentOrders.length > 0 && (
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
          <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
            <div>
              <h3 className="font-serif text-base font-bold text-brand-black">
                Recent Atelier Acquisitions
              </h3>
              <p className="text-[11px] text-brand-muted">
                Latest customer purchases containing creations from your store.
              </p>
            </div>

            <Link to="/vendor/orders">
              <Button variant="outline" size="sm" className="text-xs">
                View All Orders
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border/60 text-brand-muted uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Order Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Your Items</th>
                  <th className="py-2.5 px-3">Atelier Subtotal</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {recentOrders.map((ord) => (
                  <tr key={ord._id || ord.id} className="hover:bg-brand-offwhite/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-brand-black">
                      #{ord._id}
                    </td>
                    <td className="py-3 px-3 text-brand-charcoal">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-brand-black">
                      {ord.customerName}
                    </td>
                    <td className="py-3 px-3 text-brand-muted">
                      {ord.itemsCount} {ord.itemsCount === 1 ? 'unit' : 'units'}
                    </td>
                    <td className="py-3 px-3 font-serif font-bold text-brand-black">
                      {formatCurrency(ord.vendorSubtotal)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/vendor/orders"
                        className="text-xs font-semibold text-brand-accent hover:underline flex items-center justify-end gap-1"
                      >
                        <Eye size={12} />
                        <span>Fulfill</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
