import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Loader2,
  ShieldAlert,
  LogIn,
  RotateCcw,
  Sparkles,
  BarChart3,
  Package,
  Layers,
  ArrowUpRight,
  Clock,
  Truck,
  XCircle,
  HelpCircle
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import { analyticsService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Status color and icon mapping for order status breakdown
 */
const STATUS_CONFIG = {
  Delivered: {
    label: 'Delivered',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    barColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  Shipped: {
    label: 'Shipped',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    barColor: 'bg-purple-500',
    icon: Truck,
  },
  Confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    barColor: 'bg-blue-500',
    icon: Clock,
  },
  Pending: {
    label: 'Pending',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    barColor: 'bg-amber-500',
    icon: HelpCircle,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-50 text-rose-800 border-rose-200',
    barColor: 'bg-rose-500',
    icon: XCircle,
  },
};

/**
 * Currency formatter with safe fallback
 */
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Premium Admin Sales & Analytics Page Component
 * Connects directly to backend Analytics APIs:
 * - GET /api/admin/analytics/summary
 * - GET /api/admin/analytics/sales
 * - GET /api/admin/analytics/top-products
 * - GET /api/admin/analytics/order-status
 */
export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Backend Analytics API State
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    deliveredOrders: 0,
    deliveryRate: 0,
    revenueOrdersCount: 0,
  });
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);

  // Telemetry UI State
  const [isLoading, setIsLoading] = useState(() => Boolean(isAuthenticated && user?.role === 'admin'));
  const [apiError, setApiError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Date Range Filter State
  const [datePreset, setDatePreset] = useState('all'); // 'all' | '7d' | '30d' | 'this_month' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Chart Grouping State
  const [chartGrouping, setChartGrouping] = useState('day'); // 'day' | 'month'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Fetch real analytics data from backend endpoints
  useEffect(() => {
    let active = true;
    if (!isAdmin) {
      return;
    }

    const timer = setTimeout(
      async () => {
        setIsLoading(true);
        setApiError(null);

        try {
          const baseParams = {};
          if (datePreset === '7d' || datePreset === '30d' || datePreset === 'this_month') {
            baseParams.period = datePreset;
          } else if (datePreset === 'custom') {
            if (customStart) baseParams.startDate = customStart;
            if (customEnd) baseParams.endDate = customEnd;
          }

          // Fetch all 4 dedicated backend analytics endpoints concurrently
          const [summaryRes, salesRes, topProductsRes, orderStatusRes] = await Promise.all([
            analyticsService.getSummary(baseParams),
            analyticsService.getSales({ ...baseParams, groupBy: chartGrouping }),
            analyticsService.getTopProducts({ ...baseParams, limit: 5 }),
            analyticsService.getOrderStatus(baseParams),
          ]);

          if (!active) return;

          // 1. Summary KPIs
          if (summaryRes && summaryRes.success && summaryRes.summary) {
            setSummary(summaryRes.summary);
          } else {
            setSummary({
              totalRevenue: 0,
              totalOrders: 0,
              averageOrderValue: 0,
              deliveredOrders: 0,
              deliveryRate: 0,
              revenueOrdersCount: 0,
            });
          }

          // 2. Sales Chart Telemetry
          if (salesRes && salesRes.success && Array.isArray(salesRes.sales)) {
            setSalesData(salesRes.sales);
          } else {
            setSalesData([]);
          }

          // 3. Top-Selling Products
          if (topProductsRes && topProductsRes.success && Array.isArray(topProductsRes.topProducts)) {
            setTopProducts(topProductsRes.topProducts);
          } else {
            setTopProducts([]);
          }

          // 4. Order Status Breakdown
          if (orderStatusRes && orderStatusRes.success && Array.isArray(orderStatusRes.breakdown)) {
            setStatusBreakdown(
              orderStatusRes.breakdown.map((item) => ({
                ...item,
                config: STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending,
              }))
            );
          } else {
            setStatusBreakdown([]);
          }
        } catch (err) {
          if (!active) return;
          console.error('Failed to load analytics telemetry from backend:', err);
          const statusCode = err.response?.status;
          if (statusCode === 401) {
            logout();
            navigate('/login', { state: { from: { pathname: '/admin/analytics' } } });
            return;
          }

          if (statusCode === 403) {
            setApiError('Access forbidden. Administrative privileges are required to view business analytics.');
            return;
          }

          setApiError(
            err.response?.data?.message ||
              err.customMessage ||
              'Unable to retrieve sales analytics from the server. Please verify backend service.'
          );
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      },
      datePreset === 'custom' ? 350 : 0
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAdmin, datePreset, customStart, customEnd, chartGrouping, refreshKey, logout, navigate]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleSelectPreset = (presetId) => {
    setDatePreset(presetId);
    if (presetId !== 'custom') {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const handleResetDate = () => {
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
  };

  // Format date labels for chart coordinates
  const formattedSalesData = useMemo(() => {
    return salesData.map((d) => {
      let displayLabel = d.date || d.key;
      if (d.date) {
        const parts = String(d.date).split('-');
        if (parts.length === 3) {
          // YYYY-MM-DD
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          displayLabel = isNaN(dateObj.getTime())
            ? d.date
            : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (parts.length === 2) {
          // YYYY-MM
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          displayLabel = isNaN(dateObj.getTime())
            ? d.date
            : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
      }
      return {
        ...d,
        displayLabel,
      };
    });
  }, [salesData]);

  // SVG Chart Dimensions & Math
  const maxChartRevenue = useMemo(() => {
    if (formattedSalesData.length === 0) return 100;
    const maxVal = Math.max(...formattedSalesData.map((d) => d.revenue || 0));
    return maxVal > 0 ? maxVal * 1.15 : 100; // 15% visual headroom
  }, [formattedSalesData]);

  const svgWidth = 800;
  const svgHeight = 260;
  const paddingX = 45;
  const paddingY = 30;

  const chartCoordinates = useMemo(() => {
    if (formattedSalesData.length === 0) return [];
    const step =
      formattedSalesData.length > 1
        ? (svgWidth - paddingX * 2) / (formattedSalesData.length - 1)
        : 0;

    return formattedSalesData.map((item, index) => {
      const x = formattedSalesData.length === 1 ? svgWidth / 2 : paddingX + index * step;
      const normalizedHeight = ((item.revenue || 0) / maxChartRevenue) * (svgHeight - paddingY * 2);
      const y = svgHeight - paddingY - normalizedHeight;
      return { ...item, x, y };
    });
  }, [formattedSalesData, maxChartRevenue]);

  const pathD = useMemo(() => {
    if (chartCoordinates.length === 0) return '';
    return chartCoordinates.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      return `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [chartCoordinates]);

  const areaD = useMemo(() => {
    if (chartCoordinates.length === 0) return '';
    const first = chartCoordinates[0];
    const last = chartCoordinates[chartCoordinates.length - 1];
    const baseline = svgHeight - paddingY;
    return `${pathD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [chartCoordinates, pathD]);

  // Check if dataset is completely empty
  const isEmpty =
    summary.totalOrders === 0 &&
    topProducts.length === 0 &&
    salesData.length === 0;

  return (
    <AdminLayout
      activePage="analytics"
      title="Sales & Business Intelligence"
      subtitle="Executive telemetry, real-time revenue analytics, and merchandise velocity"
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>
        </div>
      }
    >
      {/* ========================================================================= */}
      {/* 1. ACCESS RESTRICTION FOR NON-ADMINS */}
      {/* ========================================================================= */}
      {!isAdmin ? (
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-12 text-center shadow-xs my-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldAlert size={32} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-black mb-2">
            Administrator Clearance Required
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto mb-6 leading-relaxed">
            Executive revenue intelligence, conversion analytics, and order telemetry are reserved for authorized store administrators.
          </p>
          <Link to="/login">
            <Button variant="primary" size="md" icon={LogIn}>
              Sign In as Administrator
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Database API Error Alert */}
          {apiError && (
            <div className="p-4 rounded-xl border bg-rose-50 text-rose-900 border-rose-200 flex items-start justify-between gap-3 text-xs text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={17} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 font-semibold">Analytics Error:</strong>
                  <span>{apiError}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleRefresh}
                icon={RefreshCw}
                className="border-rose-300 hover:bg-rose-100 shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. DATE-RANGE CONTROLS & TELEMETRY TOOLBAR */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Presets Toolbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-brand-muted font-semibold uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1 shrink-0">
                <Calendar size={13} className="text-brand-accent" />
                <span>Period:</span>
              </span>

              {[
                { id: 'all', label: 'All History' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap text-[11px] ${
                    datePreset === p.id
                      ? 'bg-brand-black text-white shadow-xs font-bold'
                      : 'bg-brand-offwhite text-brand-charcoal border border-brand-border hover:bg-brand-cream/70'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-muted text-[11px] font-medium">From:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-brand-offwhite border border-brand-border px-2.5 py-1.5 rounded-lg text-xs font-mono text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-brand-muted text-[11px] font-medium">To:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-brand-offwhite border border-brand-border px-2.5 py-1.5 rounded-lg text-xs font-mono text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black"
                  />
                </div>
                {(customStart || customEnd) && (
                  <button
                    type="button"
                    onClick={handleResetDate}
                    className="p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-cream rounded-md transition-colors cursor-pointer"
                    title="Reset Custom Range"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. SUMMARY CARDS (Revenue, Orders, AOV, Delivered) */}
          {/* ========================================================================= */}
          {isLoading ? (
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <Loader2 size={36} className="text-brand-accent animate-spin mx-auto mb-4" />
              <h3 className="font-serif text-lg font-bold text-brand-black mb-1">
                Compiling Sales Analytics...
              </h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Aggregating real-time transactions and merchandise telemetry from backend APIs.
              </p>
            </div>
          ) : isEmpty ? (
            /* Clean Empty State (Zero Fake Numbers Presented as Real Business Data) */
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-12 sm:p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-4">
                <BarChart3 size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-black mb-2">
                No Sales Data Available
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto mb-6 leading-relaxed">
                {datePreset === 'all'
                  ? 'There are currently no transaction or customer acquisition records in the database. When clients place orders, live sales performance, revenue velocity, and merchandise telemetry will populate here automatically.'
                  : 'No customer transactions matched your selected date interval.'}
              </p>
              {datePreset !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetDate}
                  icon={RotateCcw}
                >
                  View All Historical Data
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 text-left">
                {/* 1. Total Revenue Card */}
                <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                      Total Revenue
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-brand-black tracking-tight mb-1">
                      {formatCurrency(summary.totalRevenue)}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                      <TrendingUp size={12} />
                      <span>{summary.revenueOrdersCount || 0} recognized revenue orders</span>
                    </div>
                  </div>
                </div>

                {/* 2. Total Orders Card */}
                <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                      Total Orders
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-brand-black tracking-tight mb-1">
                      {Number(summary.totalOrders || 0).toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-brand-muted">
                      Across active boutique clientele
                    </p>
                  </div>
                </div>

                {/* 3. Average Order Value (AOV) Card */}
                <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                      Average Order Value
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                      <BarChart3 size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-brand-black tracking-tight mb-1">
                      {formatCurrency(summary.averageOrderValue)}
                    </h3>
                    <p className="text-[11px] text-brand-muted">
                      Per verified completed transaction
                    </p>
                  </div>
                </div>

                {/* 4. Delivered Orders Card */}
                <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                      Delivered Orders
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-3xl font-bold text-brand-black tracking-tight mb-1">
                      {Number(summary.deliveredOrders || 0).toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>{summary.deliveryRate || 0}% fulfillment rate</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 4. INTERACTIVE SALES CHART (SVG Area & Bar Telemetry) */}
              {/* ========================================================================= */}
              <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
                {/* Chart Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-brand-border/60">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-brand-accent" />
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-accent">
                        Revenue Projection & Velocity
                      </span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-black">
                      Sales Trend Telemetry
                    </h3>
                  </div>

                  {/* Grouping Toggle (Day / Month) */}
                  <div className="inline-flex rounded-lg border border-brand-border bg-brand-offwhite p-1 self-start sm:self-auto text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setChartGrouping('day')}
                      className={`px-3 py-1 rounded-md uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                        chartGrouping === 'day'
                          ? 'bg-brand-black text-white shadow-xs font-bold'
                          : 'text-brand-charcoal hover:text-brand-black'
                      }`}
                    >
                      Group by Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartGrouping('month')}
                      className={`px-3 py-1 rounded-md uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                        chartGrouping === 'month'
                          ? 'bg-brand-black text-white shadow-xs font-bold'
                          : 'text-brand-charcoal hover:text-brand-black'
                      }`}
                    >
                      Group by Month
                    </button>
                  </div>
                </div>

                {/* SVG Chart Rendering */}
                {formattedSalesData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-brand-muted">
                    No recognized sales revenue points recorded for the selected period.
                  </div>
                ) : (
                  <div className="pt-6 overflow-x-auto">
                    <div className="relative min-w-[550px]">
                      {/* Hover Point Tooltip */}
                      {hoveredPoint && (
                        <div
                          className="absolute pointer-events-none -top-2 transform -translate-x-1/2 bg-brand-black text-white px-3 py-1.5 rounded-lg text-xs shadow-xl z-20 transition-all border border-white/20"
                          style={{
                            left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-wider text-brand-accent font-semibold">
                            {hoveredPoint.displayLabel}
                          </p>
                          <p className="font-bold text-sm">
                            {formatCurrency(hoveredPoint.revenue)}
                          </p>
                          <p className="text-[10px] text-neutral-300">
                            {hoveredPoint.ordersCount || 0}{' '}
                            {(hoveredPoint.ordersCount || 0) === 1 ? 'order' : 'orders'}
                          </p>
                        </div>
                      )}

                      <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full h-56 sm:h-64 overflow-visible"
                      >
                        <defs>
                          <linearGradient id="luxurySalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.45" />
                            <stop offset="60%" stopColor="#C5A059" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#C5A059" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const y = paddingY + (svgHeight - paddingY * 2) * pct;
                          const val = Math.round(maxChartRevenue * (1 - pct));
                          return (
                            <g key={idx}>
                              <line
                                x1={paddingX}
                                y1={y}
                                x2={svgWidth - paddingX}
                                y2={y}
                                stroke="currentColor"
                                className="text-brand-border/60"
                                strokeDasharray="3 3"
                              />
                              <text
                                x={paddingX - 8}
                                y={y + 4}
                                textAnchor="end"
                                className="fill-brand-muted text-[9px] font-mono"
                              >
                                {formatCurrency(val)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Shaded Area */}
                        {areaD && (
                          <path
                            d={areaD}
                            fill="url(#luxurySalesGrad)"
                            className="transition-all duration-300"
                          />
                        )}

                        {/* Line Stroke */}
                        {pathD && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#C5A059"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300 drop-shadow-sm"
                          />
                        )}

                        {/* Data Points */}
                        {chartCoordinates.map((pt, i) => (
                          <g
                            key={i}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredPoint(pt)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredPoint?.key === pt.key ? 6 : 4}
                              fill="#1A1A1A"
                              stroke="#C5A059"
                              strokeWidth={hoveredPoint?.key === pt.key ? '3' : '2'}
                              className="transition-all duration-150"
                            />
                            {/* X Axis Label */}
                            <text
                              x={pt.x}
                              y={svgHeight - 10}
                              textAnchor="middle"
                              className="fill-brand-muted text-[10px] font-medium"
                            >
                              {pt.displayLabel}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* ===================================================================== */}
              {/* 5. DUAL INTELLIGENCE: TOP PRODUCTS & STATUS BREAKDOWN */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                {/* Top-Selling Products (Cols 1-7) */}
                <div className="lg:col-span-7 bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-brand-border/60 mb-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-black flex items-center gap-2">
                        <Package size={17} className="text-brand-accent" />
                        <span>Top-Selling Luxury Merchandise</span>
                      </h4>
                      <p className="text-xs text-brand-muted">
                        Ranked by total acquisition volume in selected timeframe
                      </p>
                    </div>
                    <Link
                      to="/admin/products"
                      className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
                    >
                      <span>Catalogue</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {topProducts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-brand-muted">
                      No merchandise acquisition records found for this period.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topProducts.map((prod) => (
                        <div
                          key={prod.id || prod.productId || prod.name}
                          className="p-3.5 rounded-xl bg-brand-offwhite border border-brand-border/70 hover:bg-brand-cream/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                  prod.rank === 1
                                    ? 'bg-amber-400 text-brand-black font-serif shadow-xs'
                                    : prod.rank === 2
                                    ? 'bg-neutral-300 text-brand-black'
                                    : prod.rank === 3
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-brand-border text-brand-muted'
                                }`}
                              >
                                #{prod.rank}
                              </span>
                              <div>
                                <h5 className="font-bold text-brand-black text-xs sm:text-sm">
                                  {prod.name}
                                </h5>
                                <span className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">
                                  {prod.category} • {prod.unitsSold || 0}{' '}
                                  {(prod.unitsSold || 0) === 1 ? 'unit sold' : 'units sold'}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-serif font-bold text-brand-black text-sm">
                                {formatCurrency(prod.revenue)}
                              </span>
                              <span className="text-[10px] text-brand-muted block">
                                in {prod.ordersCount || 0}{' '}
                                {(prod.ordersCount || 0) === 1 ? 'order' : 'orders'}
                              </span>
                            </div>
                          </div>

                          {/* Velocity Progress Bar */}
                          <div className="w-full bg-brand-border/50 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-accent h-full rounded-full transition-all duration-500"
                              style={{ width: `${prod.sharePercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Status Breakdown (Cols 8-12) */}
                <div className="lg:col-span-5 bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-brand-border/60 mb-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-black flex items-center gap-2">
                        <Layers size={17} className="text-brand-accent" />
                        <span>Fulfillment & Status Breakdown</span>
                      </h4>
                      <p className="text-xs text-brand-muted">
                        Acquisition pipeline lifecycle metrics
                      </p>
                    </div>
                    <Link
                      to="/admin/orders"
                      className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
                    >
                      <span>Ledger</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  {statusBreakdown.length === 0 ? (
                    <div className="py-12 text-center text-xs text-brand-muted">
                      No order status breakdown available for this period.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {statusBreakdown.map((item) => {
                        const Icon = item.config?.icon || HelpCircle;
                        return (
                          <div
                            key={item.status}
                            className="p-3.5 rounded-xl bg-brand-offwhite border border-brand-border/70 text-xs"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border flex items-center gap-1 ${
                                    item.config?.color || 'bg-brand-cream text-brand-black border-brand-border'
                                  }`}
                                >
                                  <Icon size={11} />
                                  <span>{item.config?.label || item.status}</span>
                                </span>
                                <span className="text-[11px] text-brand-muted font-medium">
                                  {item.count || 0} {(item.count || 0) === 1 ? 'order' : 'orders'}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-brand-black">
                                  {item.percentage || 0}%
                                </span>
                                <span className="text-[10px] text-brand-muted block font-mono">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                            </div>

                            {/* Visual Distribution Bar */}
                            <div className="w-full bg-brand-border/50 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.config?.barColor || 'bg-brand-accent'
                                }`}
                                style={{ width: `${item.percentage || 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}
