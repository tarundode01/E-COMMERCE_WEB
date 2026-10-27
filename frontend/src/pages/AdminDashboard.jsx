import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  Users,
  TrendingUp,
  Search,
  Eye,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Layers,
  Clock,
  Truck,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Download,
  Plus,
  X,
  ExternalLink,
  Check,
  ChevronRight,
  AlertCircle,
  Store,
  ArrowRight,
  Building2,
  Sparkles,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import Badge from '../components/Badge';
import {
  productService,
  orderService,
  customerService,
  categoryService,
  adminVendorService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatImageUrl } from '../utils/imageUrl';

/**
 * Status color and styling configuration for orders
 */
const STATUS_CONFIG = {
  Delivered: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    color: 'text-emerald-600',
  },
  Shipped: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Truck,
    color: 'text-indigo-600',
  },
  Confirmed: {
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: CheckCircle2,
    color: 'text-sky-600',
  },
  Pending: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
    color: 'text-amber-600',
  },
  Cancelled: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: XCircle,
    color: 'text-rose-600',
  },
};

const VALID_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['Pending', 'Confirmed', 'Shipped', 'Cancelled'],
  Confirmed: ['Confirmed', 'Shipped', 'Cancelled'],
  Shipped: ['Shipped', 'Delivered', 'Cancelled'],
  Delivered: ['Delivered'],
  Cancelled: ['Cancelled'],
};

/**
 * Premium Admin Executive Dashboard Component
 * 100% dynamically connected to live MongoDB backend:
 * - Real-time Revenue & Orders from Orders Collection
 * - Real-time Product Catalog counts from Product Collection
 * - Real-time Registered Customer metrics from User Collection
 * - Live Multi-Vendor Merchant Applications & Sales from Store Collection
 * - Real-life Merchant Leaderboard & Category Share breakdown
 * - Dynamic interactive SVG Sales Performance chart with INR (₹) formatting
 * - Live Order Quick Dossier modal with real-time status update capability
 * - CSV Order Ledger export
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Dashboard Data State
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorCounts, setVendorCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [vendorSummary, setVendorSummary] = useState({
    totalVendors: 0,
    pendingApprovals: 0,
    approvedVendors: 0,
    totalMarketplaceSales: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Filters & Period State
  const [chartPeriod, setChartPeriod] = useState('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Order Detail Dossier Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateMsg, setStatusUpdateMsg] = useState(null);

  // Fetch all live metrics across transactional collections
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const [ordersRes, productsRes, categoriesRes, customersRes, vendorsRes] =
        await Promise.allSettled([
          orderService.getAllOrders(),
          productService.getProducts({ limit: 100 }),
          categoryService.getCategories(),
          customerService.getCustomers(),
          adminVendorService.getApplications({ limit: 100 }),
        ]);

      // 1. Orders
      let loadedOrders = [];
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        if (Array.isArray(ordersRes.value.orders)) {
          loadedOrders = ordersRes.value.orders;
        } else if (Array.isArray(ordersRes.value.data)) {
          loadedOrders = ordersRes.value.data;
        } else if (Array.isArray(ordersRes.value)) {
          loadedOrders = ordersRes.value;
        }
      }
      setOrders(loadedOrders);

      // 2. Products
      let loadedProducts = [];
      if (productsRes.status === 'fulfilled' && productsRes.value) {
        if (Array.isArray(productsRes.value.products)) {
          loadedProducts = productsRes.value.products;
        }
      }
      setProducts(loadedProducts);

      // 3. Categories
      let loadedCategories = [];
      if (categoriesRes.status === 'fulfilled' && categoriesRes.value) {
        if (Array.isArray(categoriesRes.value.categories)) {
          loadedCategories = categoriesRes.value.categories;
        }
      }
      setCategories(loadedCategories);

      // 4. Customers
      let loadedCustomers = [];
      if (customersRes.status === 'fulfilled' && customersRes.value) {
        if (Array.isArray(customersRes.value.customers)) {
          loadedCustomers = customersRes.value.customers;
        } else if (Array.isArray(customersRes.value.users)) {
          loadedCustomers = customersRes.value.users;
        } else if (Array.isArray(customersRes.value.data)) {
          loadedCustomers = customersRes.value.data;
        }
      }
      setCustomers(loadedCustomers);

      // 5. Vendors & Stores
      let loadedVendors = [];
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value) {
        if (Array.isArray(vendorsRes.value.stores)) {
          loadedVendors = vendorsRes.value.stores;
        }
        if (vendorsRes.value.counts) {
          setVendorCounts(vendorsRes.value.counts);
        }
        if (vendorsRes.value.summary) {
          setVendorSummary(vendorsRes.value.summary);
        }
      }
      setVendors(loadedVendors);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setApiError('Unable to connect to live database metrics. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle toast timeout
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Total Gross Revenue from all live orders (excluding cancelled) in INR
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => (o.orderStatus || o.status) !== 'Cancelled')
      .reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0);
  }, [orders]);

  // Pending Orders Count awaiting admin / vendor action
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => (o.orderStatus || o.status || '').toLowerCase() === 'pending'
    ).length;
  }, [orders]);

  // Active (non-cancelled) Orders count
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.orderStatus || o.status) !== 'Cancelled').length;
  }, [orders]);

  // Low stock products alert (stock <= 5)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const stock =
        typeof p.countInStock === 'number'
          ? p.countInStock
          : typeof p.stock === 'number'
          ? p.stock
          : 10;
      return stock <= 5;
    });
  }, [products]);

  // Top Performing Merchants sorted by Gross Sales
  const topVendors = useMemo(() => {
    return [...vendors]
      .sort((a, b) => (Number(b.totalSales) || 0) - (Number(a.totalSales) || 0))
      .slice(0, 5);
  }, [vendors]);

  // Order Status Distribution Breakdown
  const orderStatusDistribution = useMemo(() => {
    const counts = {
      Delivered: 0,
      Shipped: 0,
      Confirmed: 0,
      Pending: 0,
      Cancelled: 0,
    };
    orders.forEach((o) => {
      const st = o.orderStatus || o.status || 'Pending';
      if (counts[st] !== undefined) counts[st]++;
      else counts.Pending++;
    });
    const total = orders.length || 1;
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
      config: STATUS_CONFIG[status] || STATUS_CONFIG.Pending,
    }));
  }, [orders]);

  // Dynamic Executive KPI Metric Cards
  const kpiStats = useMemo(() => {
    const formattedRevenue = `₹${Number(totalRevenue || 0).toLocaleString('en-IN')}`;

    return [
      {
        title: 'Platform Gross Revenue',
        value: formattedRevenue,
        change: `${orders.length} order${orders.length !== 1 ? 's' : ''}`,
        trend: 'up',
        period: 'live customer GMV',
        icon: TrendingUp,
        accent: 'text-amber-700 bg-amber-500/10 border-amber-500/20',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        link: '/admin/orders',
      },
      {
        title: 'Total Client Orders',
        value: String(orders.length),
        change:
          pendingOrdersCount > 0
            ? `${pendingOrdersCount} pending action`
            : `${activeOrdersCount} active`,
        trend: pendingOrdersCount > 0 ? 'alert' : 'up',
        period: 'in live ledger',
        icon: ShoppingBag,
        accent: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
        badgeClass:
          pendingOrdersCount > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200',
        link: '/admin/orders',
      },
      {
        title: 'Merchant Partners',
        value: String(vendorCounts.approved || 0),
        change:
          vendorCounts.pending > 0
            ? `${vendorCounts.pending} awaiting review`
            : `${vendorCounts.all} registered`,
        trend: vendorCounts.pending > 0 ? 'alert' : 'neutral',
        period: 'licensed stores',
        icon: Store,
        accent: 'text-indigo-700 bg-indigo-500/10 border-indigo-500/20',
        badgeClass:
          vendorCounts.pending > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200',
        link: '/admin/vendors',
      },
      {
        title: 'Product Catalog',
        value: String(products.length),
        change:
          lowStockProducts.length > 0
            ? `${lowStockProducts.length} low stock`
            : 'healthy inventory',
        trend: lowStockProducts.length > 0 ? 'alert' : 'neutral',
        period: `in ${categories.length || 1} categories`,
        icon: Package,
        accent: 'text-sky-700 bg-sky-500/10 border-sky-500/20',
        badgeClass:
          lowStockProducts.length > 0
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-sky-50 text-sky-800 border-sky-200',
        link: '/admin/products',
      },
      {
        title: 'Verified Patrons',
        value: String(customers.length),
        change: `${customers.length} registered`,
        trend: 'up',
        period: 'client profiles',
        icon: Users,
        accent: 'text-purple-700 bg-purple-500/10 border-purple-500/20',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        link: '/admin/customers',
      },
    ];
  }, [
    totalRevenue,
    orders,
    activeOrdersCount,
    pendingOrdersCount,
    vendorCounts,
    products,
    lowStockProducts,
    categories,
    customers,
  ]);

  // Dynamic Category Share breakdown based on live products
  const categoryStats = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const cat = p.category?.name || p.category || 'Curated Signature';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = products.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => {
        const percentage = Math.round((count / total) * 100);
        return {
          name,
          count: `${count} item${count > 1 ? 's' : ''}`,
          percentage,
          amount: `₹${Math.round((percentage * (totalRevenue || 1000)) / 100).toLocaleString('en-IN')}`,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [products, totalRevenue]);

  // Dynamic Recent Orders List (filtered by Search & Status)
  const filteredRecentOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const q = searchQuery.toLowerCase().trim();
        const id = (order._id || order.id || '').toLowerCase();
        const customerName = (
          order.deliveryAddress?.fullName ||
          order.customer?.name ||
          'Client'
        ).toLowerCase();
        const email = (
          order.deliveryAddress?.email ||
          order.customer?.email ||
          ''
        ).toLowerCase();
        const itemNames = (order.products || [])
          .map((p) => (p.name || '').toLowerCase())
          .join(' ');
        const storeNames = (order.products || [])
          .map((p) => (p.storeName || p.store?.name || '').toLowerCase())
          .join(' ');

        const matchesSearch =
          !q ||
          id.includes(q) ||
          customerName.includes(q) ||
          email.includes(q) ||
          itemNames.includes(q) ||
          storeNames.includes(q);

        const orderStatus = (order.orderStatus || order.status || 'Pending').toLowerCase();
        const matchesStatus =
          statusFilter === 'All' || orderStatus === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .slice(0, 8);
  }, [orders, searchQuery, statusFilter]);

  // Fully Dynamic Sales Chart Calculations in INR (₹)
  const chartData = useMemo(() => {
    const width = 600;
    const height = 220;
    const paddingX = 40;
    const paddingTop = 30;
    const paddingBottom = 40;

    let points = [];

    if (chartPeriod === 'weekly') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayValues = [0, 0, 0, 0, 0, 0, 0];
      const dayOrders = [0, 0, 0, 0, 0, 0, 0];

      orders.forEach((o) => {
        if ((o.orderStatus || o.status) === 'Cancelled') return;
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const dayIdx = (d.getDay() + 6) % 7; // Convert Sun(0)->6, Mon(1)->0
        dayValues[dayIdx] += Number(o.totalAmount) || 0;
        dayOrders[dayIdx] += 1;
      });

      points = days.map((label, idx) => ({
        label,
        value: dayValues[idx],
        ordersCount: dayOrders[idx],
      }));
    } else if (chartPeriod === 'annual') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const qValues = [0, 0, 0, 0];
      const qOrders = [0, 0, 0, 0];

      orders.forEach((o) => {
        if ((o.orderStatus || o.status) === 'Cancelled') return;
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const month = d.getMonth();
        const qIdx = Math.floor(month / 3);
        qValues[qIdx] += Number(o.totalAmount) || 0;
        qOrders[qIdx] += 1;
      });

      points = quarters.map((label, idx) => ({
        label,
        value: qValues[idx],
        ordersCount: qOrders[idx],
      }));
    } else {
      // Monthly: recent 6 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const recentMonths = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        recentMonths.push({
          monthIdx: d.getMonth(),
          year: d.getFullYear(),
          label: monthNames[d.getMonth()],
          value: 0,
          ordersCount: 0,
        });
      }

      orders.forEach((o) => {
        if ((o.orderStatus || o.status) === 'Cancelled') return;
        const d = o.createdAt ? new Date(o.createdAt) : new Date();
        const m = d.getMonth();
        const y = d.getFullYear();
        const match = recentMonths.find((rm) => rm.monthIdx === m && rm.year === y);
        if (match) {
          match.value += Number(o.totalAmount) || 0;
          match.ordersCount += 1;
        } else if (recentMonths.length > 0) {
          recentMonths[recentMonths.length - 1].value += Number(o.totalAmount) || 0;
          recentMonths[recentMonths.length - 1].ordersCount += 1;
        }
      });

      points = recentMonths.map((m) => ({
        label: m.label,
        value: m.value,
        ordersCount: m.ordersCount,
      }));
    }

    const maxValue = Math.max(...points.map((p) => p.value), 500);

    const coords = points.map((p, i) => {
      const x = paddingX + (i / Math.max(1, points.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingBottom - (p.value / maxValue) * (height - paddingTop - paddingBottom);
      return { ...p, x, y };
    });

    let pathD = '';
    let areaD = '';
    if (coords.length > 0) {
      pathD = `M ${coords[0].x} ${coords[0].y}`;
      areaD = `M ${coords[0].x} ${height - paddingBottom} L ${coords[0].x} ${coords[0].y}`;

      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (curr.x - prev.x) / 2;
        const cp2y = curr.y;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
        areaD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }

      areaD += ` L ${coords[coords.length - 1].x} ${height - paddingBottom} Z`;
    }

    return { coords, pathD, areaD, maxValue, points };
  }, [orders, chartPeriod]);

  // Open Order Dossier Modal
  const handleOpenOrderModal = (order) => {
    setSelectedOrder(order);
    setNewOrderStatus(order.orderStatus || order.status || 'Pending');
    setStatusUpdateMsg(null);
  };

  // Close Order Dossier Modal
  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    setStatusUpdateMsg(null);
  };

  // Update Order Status Handler
  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder || !newOrderStatus) return;
    setIsUpdatingStatus(true);
    setStatusUpdateMsg(null);

    try {
      const orderId = selectedOrder._id || selectedOrder.id;
      await orderService.updateOrderStatus(orderId, newOrderStatus, 'Updated via Executive Dashboard');

      // Update local orders state immediately
      setOrders((prev) =>
        prev.map((o) => {
          if ((o._id || o.id) === orderId) {
            return { ...o, orderStatus: newOrderStatus, status: newOrderStatus };
          }
          return o;
        })
      );

      setSelectedOrder((prev) =>
        prev ? { ...prev, orderStatus: newOrderStatus, status: newOrderStatus } : null
      );

      setSuccessToast(`Order #${orderId.slice(-8)} updated to ${newOrderStatus}`);
      setStatusUpdateMsg({ type: 'success', text: `Status successfully updated to ${newOrderStatus}.` });
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusUpdateMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update order status.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Export Orders as CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Email', 'Payment Method', 'Status', 'Total Amount (INR)'];
    const rows = orders.map((o) => [
      `"${o._id || o.id}"`,
      `"${new Date(o.createdAt || Date.now()).toISOString()}"`,
      `"${(o.deliveryAddress?.fullName || o.customer?.name || 'Customer').replace(/"/g, '""')}"`,
      `"${(o.deliveryAddress?.email || o.customer?.email || '').replace(/"/g, '""')}"`,
      `"${o.paymentMethod || 'Online'}"`,
      `"${o.orderStatus || o.status || 'Pending'}"`,
      `"${Number(o.totalAmount || 0).toFixed(2)}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessToast('Orders ledger exported as CSV successfully.');
  };

  return (
    <AdminLayout
      activePage="dashboard"
      title="Executive Dashboard"
      subtitle="Live Multi-Vendor Performance, Merchant Telemetry & Fulfillment Suite"
      actions={
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <div className="hidden md:block w-64 relative">
            <Input
              type="search"
              placeholder="Search orders, clients, stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="!py-1.5 text-xs bg-brand-offwhite"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-black cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-brand-border bg-brand-offwhite hover:bg-brand-cream text-xs font-semibold rounded-lg text-brand-charcoal transition-colors cursor-pointer"
            title="Export Orders Ledger as CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50 border border-brand-border"
            title="Refresh from MongoDB"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-7">
        {/* ========================================================================= */}
        {/* 1. SUCCESS TOAST & LIVE DATABASE STATUS BANNER */}
        {/* ========================================================================= */}
        {successToast && (
          <div className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-white/80 hover:text-white cursor-pointer ml-3"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Live Synchronized Telemetry Banner */}
        <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 text-left shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={19} className="text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Live Enterprise Database Connected:</span>
              <span className="ml-1 text-emerald-800">
                {products.length} catalog products, {categories.length} taxonomies, {orders.length} client orders, and {vendors.length} merchant stores synchronized with local MongoDB.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Real-time Active Telemetry
            </span>
          </div>
        </div>

        {/* Urgent Action / Attention Center */}
        {(vendorCounts.pending > 0 || pendingOrdersCount > 0) && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-400/50 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-serif text-sm sm:text-base font-bold text-brand-black">
                  Administrative Action Required
                </h4>
                <div className="text-xs text-brand-charcoal mt-0.5 space-y-0.5">
                  {vendorCounts.pending > 0 && (
                    <p className="font-semibold text-amber-900">
                      • <strong className="text-amber-950">{vendorCounts.pending}</strong> new vendor store application{vendorCounts.pending > 1 ? 's' : ''} awaiting your administrative approval before they can access the vendor suite.
                    </p>
                  )}
                  {pendingOrdersCount > 0 && (
                    <p className="font-semibold text-emerald-900">
                      • <strong className="text-emerald-950">{pendingOrdersCount}</strong> customer order{pendingOrdersCount > 1 ? 's' : ''} currently in Pending status awaiting fulfillment confirmation.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
              {vendorCounts.pending > 0 && (
                <Link
                  to="/admin/vendors"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Store size={14} />
                  <span>Review Vendors ({vendorCounts.pending})</span>
                </Link>
              )}
              {pendingOrdersCount > 0 && (
                <Link
                  to="/admin/orders"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-black hover:bg-brand-charcoal text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <ShoppingBag size={14} />
                  <span>Process Orders ({pendingOrdersCount})</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* API Error Alert if any */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{apiError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} icon={RefreshCw}>
              Retry Connection
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. DYNAMIC SUMMARY KPI CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {kpiStats.map((stat, index) => {
            const Icon = stat.icon;
            const CardWrapper = stat.link ? Link : 'div';
            const wrapperProps = stat.link ? { to: stat.link } : {};
            return (
              <CardWrapper
                key={index}
                {...wrapperProps}
                className={`bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between ${
                  stat.link ? 'hover:border-brand-accent/50 group cursor-pointer block' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                    {stat.title}
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stat.accent}`}>
                    <Icon size={18} />
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-black text-brand-black tracking-tight mb-2">
                    {isLoading ? (
                      <span className="inline-block w-20 h-7 bg-brand-border/40 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`flex items-center font-bold px-1.5 py-0.5 rounded border text-[10px] ${stat.badgeClass}`}>
                      {stat.change}
                    </span>
                    <span className="text-brand-muted text-[10px] truncate">{stat.period}</span>
                  </div>
                </div>
              </CardWrapper>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. QUICK ACTIONS BAR */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
              Executive Controls:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-black hover:bg-brand-charcoal text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add New Product</span>
            </Link>
            <Link
              to="/admin/vendors"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-cream border border-brand-border text-brand-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Store size={14} className="text-amber-600" />
              <span>Review Merchants ({vendorCounts.pending})</span>
            </Link>
            <Link
              to="/admin/categories"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-cream border border-brand-border text-brand-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Layers size={14} />
              <span>Manage Taxonomies</span>
            </Link>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-cream border border-brand-border text-brand-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>All Orders Ledger</span>
            </Link>
            <Link
              to="/shop"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-offwhite hover:bg-brand-cream border border-brand-border text-brand-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Store size={14} />
              <span>View Storefront</span>
              <ExternalLink size={12} className="opacity-70" />
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. DYNAMIC SALES OVERVIEW & MERCHANT LEADERBOARD */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Sales Chart Widget (Cols 1-8) */}
          <div className="xl:col-span-8 bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-brand-border/60">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Revenue & Sales Performance Trends
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Total Processed Revenue:{' '}
                  <strong className="text-brand-black font-serif font-bold">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </strong>{' '}
                  across {orders.length} customer acquisitions
                </p>
              </div>

              {/* Period Selector Tabs */}
              <div className="inline-flex rounded-xl border border-brand-border bg-brand-offwhite p-1 self-start sm:self-auto">
                {['weekly', 'monthly', 'annual'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition-colors cursor-pointer ${
                      chartPeriod === period
                        ? 'bg-brand-black text-white shadow-xs'
                        : 'text-brand-charcoal hover:text-brand-black'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Handcrafted SVG Chart */}
            <div className="mt-6">
              <div className="h-64 sm:h-72 w-full relative">
                {/* Hover Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 -translate-x-1/2 -translate-y-full mb-2 bg-brand-black text-white px-3 py-1.5 rounded-xl text-xs shadow-xl pointer-events-none transition-all border border-brand-accent/40"
                    style={{
                      left: `${(hoveredPoint.x / 600) * 100}%`,
                      top: `${(hoveredPoint.y / 220) * 100}%`,
                    }}
                  >
                    <p className="font-bold text-brand-accent">{hoveredPoint.label}</p>
                    <p className="text-[11px] font-mono">₹{hoveredPoint.value.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] text-neutral-300">{hoveredPoint.ordersCount || 0} order(s)</p>
                  </div>
                )}

                <svg
                  viewBox="0 0 600 220"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="luxuryChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#C5A880" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#C5A880" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Reference Grid Lines */}
                  <line x1="40" y1="30" x2="560" y2="30" stroke="#E5E2DC" strokeDasharray="3 3" />
                  <line x1="40" y1="80" x2="560" y2="80" stroke="#E5E2DC" strokeDasharray="3 3" />
                  <line x1="40" y1="130" x2="560" y2="130" stroke="#E5E2DC" strokeDasharray="3 3" />
                  <line x1="40" y1="180" x2="560" y2="180" stroke="#E5E2DC" />

                  {/* Dynamic Shaded Area Fill */}
                  {chartData.areaD && (
                    <path
                      d={chartData.areaD}
                      fill="url(#luxuryChartGradient)"
                      className="transition-all duration-500"
                    />
                  )}

                  {/* Dynamic Smooth Spline Golden Line */}
                  {chartData.pathD && (
                    <path
                      d={chartData.pathD}
                      fill="none"
                      stroke="#A88B60"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}

                  {/* Dynamic Coordinates Data Nodes */}
                  {chartData.coords.map((point, i) => (
                    <g
                      key={i}
                      className="group cursor-pointer"
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={hoveredPoint?.label === point.label ? '7.5' : '5'}
                        fill="#FFFFFF"
                        stroke="#111111"
                        strokeWidth="2.5"
                        className="transition-all duration-200"
                      />
                    </g>
                  ))}
                </svg>
              </div>

              {/* X-Axis Periods Readout */}
              <div className="grid grid-cols-4 sm:grid-cols-6 text-center text-xs text-brand-muted font-medium pt-3 border-t border-brand-border/60">
                {chartData.points.map((m, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="font-semibold text-brand-charcoal">{m.label}</span>
                    <span className="text-[11px] text-brand-muted font-mono">
                      ₹{m.value.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-Metric Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 mt-5 border-t border-brand-border/60 text-xs">
              <div>
                <span className="text-brand-muted">Average Order Value</span>
                <p className="font-serif text-base font-bold text-brand-black mt-0.5">
                  ₹{orders.length > 0 ? Math.round(totalRevenue / orders.length).toLocaleString('en-IN') : '0'}
                </p>
              </div>
              <div>
                <span className="text-brand-muted">Active Catalog Models</span>
                <p className="font-serif text-base font-bold text-brand-black mt-0.5">
                  {products.length} Items
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-brand-muted">Taxonomies</span>
                <p className="font-serif text-base font-bold text-brand-black mt-0.5">
                  {categories.length} Segments
                </p>
              </div>
            </div>
          </div>

          {/* Top Performing Merchants & Ateliers Leaderboard (Cols 9-12) */}
          <div className="xl:col-span-4 bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black">
                  Merchant Leaderboard
                </h3>
                <p className="text-[11px] text-brand-muted">Top grossing partner stores</p>
              </div>
              <Link
                to="/admin/vendors"
                className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
              >
                <span>All Stores</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {topVendors.length === 0 ? (
                <div className="py-8 text-center text-xs text-brand-muted">
                  <Store size={24} className="mx-auto mb-2 text-brand-border" />
                  <p>No vendor store records found.</p>
                </div>
              ) : (
                topVendors.map((v, i) => (
                  <div
                    key={v._id || v.id || i}
                    className="p-3 rounded-xl bg-brand-offwhite/50 border border-brand-border/60 flex items-center justify-between gap-3 hover:bg-brand-cream/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                        #{i + 1}
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="font-bold text-brand-black text-xs truncate">{v.name}</p>
                        <p className="text-[10px] text-brand-muted truncate">
                          {v.ordersCount || v.totalOrders || 0} orders • {v.productsCount || 0} products
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-serif font-bold text-brand-black text-xs block">
                        ₹{Number(v.totalSales || 0).toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full capitalize ${
                          v.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Merchant Directory Quick Stat Link */}
            <div className="p-3 bg-brand-cream/40 rounded-xl border border-brand-border/60 text-xs text-brand-charcoal flex items-center justify-between">
              <div>
                <span className="font-bold block text-brand-black">Partner Network</span>
                <span className="text-[10px] text-brand-muted">
                  {vendorCounts.approved} active, {vendorCounts.pending} pending review
                </span>
              </div>
              <Link
                to="/admin/vendors"
                className="text-xs font-bold text-brand-black hover:text-brand-accent transition-colors"
              >
                Manage &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. FULFILLMENT VELOCITY & CATEGORY SHARE DUAL SECTION */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start text-left">
          {/* Order Fulfillment Status Velocity */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black">
                  Fulfillment Status Breakdown
                </h3>
                <p className="text-[11px] text-brand-muted">Order journey progression across catalog</p>
              </div>
              <Link to="/admin/orders" className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1">
                <span>View Orders</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3.5">
              {orderStatusDistribution.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === 'Delivered' ? 'bg-emerald-500' :
                        item.status === 'Shipped' ? 'bg-indigo-500' :
                        item.status === 'Confirmed' ? 'bg-sky-500' :
                        item.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <span className="text-brand-charcoal">{item.status}</span>
                    </div>
                    <span className="font-bold text-brand-black font-mono">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-brand-offwhite rounded-full h-2 overflow-hidden border border-brand-border/60">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        item.status === 'Delivered' ? 'bg-emerald-500' :
                        item.status === 'Shipped' ? 'bg-indigo-500' :
                        item.status === 'Confirmed' ? 'bg-sky-500' :
                        item.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(3, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Category Share Widget */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-brand-black">
                  Category Catalog Share
                </h3>
                <p className="text-[11px] text-brand-muted">Product distribution across departments</p>
              </div>
              <Link to="/admin/categories" className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1">
                <span>Taxonomies</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3.5">
              {categoryStats.length === 0 ? (
                <p className="text-xs text-brand-muted py-6 text-center">No categories recorded yet.</p>
              ) : (
                categoryStats.slice(0, 5).map((cat, i) => (
                  <Link
                    key={i}
                    to="/admin/products"
                    className="block space-y-1 p-1 rounded-lg hover:bg-brand-offwhite transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-brand-charcoal font-semibold group-hover:text-brand-accent transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-brand-black font-bold">
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-brand-offwhite rounded-full h-2 overflow-hidden border border-brand-border/60">
                      <div
                        className="bg-brand-accent h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(4, cat.percentage)}%` }}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. LOW STOCK INVENTORY ATTENTION WIDGET */}
        {/* ========================================================================= */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertCircle size={16} className="text-amber-700" />
                <span>Inventory Attention Required ({lowStockProducts.length} items low in stock)</span>
              </div>
              <Link to="/admin/products" className="text-xs font-semibold text-amber-900 hover:underline">
                Manage Stock &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {lowStockProducts.slice(0, 3).map((prod) => (
                <div
                  key={prod._id || prod.id}
                  className="p-3 rounded-xl bg-white border border-amber-200 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <img
                      src={formatImageUrl(prod.images?.[0] || prod.image)}
                      alt={prod.name || prod.title}
                      className="w-9 h-9 rounded-lg object-cover bg-brand-offwhite border border-brand-border shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="truncate">
                      <p className="font-semibold text-brand-black truncate text-xs">{prod.name || prod.title}</p>
                      <p className="text-[10px] text-brand-muted font-mono">
                        ₹{Number(prod.price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    {prod.countInStock || prod.stock || 0} in stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. DYNAMIC RECENT CLIENT ACQUISITIONS TABLE */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl shadow-xs overflow-hidden text-left">
          {/* Table Header & Controls */}
          <div className="p-5 sm:p-6 border-b border-brand-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-brand-black">
                Recent Client Acquisitions
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Showing {filteredRecentOrders.length} recent orders placed across storefront channels
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-muted font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-brand-offwhite border border-brand-border text-xs px-2.5 py-1.5 rounded-lg cursor-pointer focus:outline-none"
                >
                  <option value="All">All Orders ({orders.length})</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-brand-offwhite/80 border-b border-brand-border/60 text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 px-5">Order ID</th>
                  <th scope="col" className="py-3.5 px-5">Client Patron</th>
                  <th scope="col" className="py-3.5 px-5">Purchased Item & Vendor</th>
                  <th scope="col" className="py-3.5 px-5">Date</th>
                  <th scope="col" className="py-3.5 px-5">Payment</th>
                  <th scope="col" className="py-3.5 px-5">Amount (₹)</th>
                  <th scope="col" className="py-3.5 px-5">Status</th>
                  <th scope="col" className="py-3.5 px-5 text-right">Quick View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-brand-muted">
                      <Loader2 size={24} className="animate-spin text-brand-accent mx-auto mb-2" />
                      <span>Retrieving live orders ledger...</span>
                    </td>
                  </tr>
                ) : filteredRecentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-brand-muted">
                      <ShoppingBag size={28} className="mx-auto mb-2 text-brand-border" />
                      <p className="font-semibold text-brand-charcoal text-sm">No orders found.</p>
                      <p className="text-xs">
                        {orders.length === 0
                          ? 'No customer orders have been placed in the database yet.'
                          : 'Try changing your status filter or search query.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRecentOrders.map((order) => {
                    const orderId = order._id || order.id || 'N/A';
                    const customerName =
                      order.deliveryAddress?.fullName ||
                      order.customer?.name ||
                      'Valued Client';
                    const customerEmail =
                      order.deliveryAddress?.email ||
                      order.customer?.email ||
                      '';
                    const firstProduct = order.products?.[0];
                    const storeName =
                      firstProduct?.storeName ||
                      firstProduct?.store?.name ||
                      (order.stores && order.stores[0]?.name) ||
                      'Patel Optical';

                    const status = order.orderStatus || order.status || 'Pending';
                    const statusStyle = STATUS_CONFIG[status]?.badge || STATUS_CONFIG.Pending.badge;

                    const initials = customerName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'VC';

                    return (
                      <tr
                        key={orderId}
                        onClick={() => handleOpenOrderModal(order)}
                        className="hover:bg-brand-offwhite/50 transition-colors cursor-pointer group"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-5 font-mono font-bold text-brand-black group-hover:text-brand-accent transition-colors">
                          #{orderId.slice(-8)}
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-cream border border-brand-border text-brand-charcoal text-[11px] font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-brand-black">{customerName}</p>
                              <p className="text-[10px] text-brand-muted">{customerEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* Purchased Item & Vendor Store */}
                        <td className="py-3.5 px-5 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            {firstProduct && (
                              <img
                                src={formatImageUrl(firstProduct.image)}
                                alt={firstProduct.name}
                                className="w-8 h-8 rounded-lg object-cover bg-brand-offwhite border border-brand-border shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="truncate min-w-0">
                              <p className="font-semibold text-brand-black truncate text-xs">
                                {firstProduct?.name || 'Luxury Acquisition'}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  <Store size={10} className="text-amber-700 shrink-0" />
                                  <span className="truncate max-w-[120px]">{storeName}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-5 text-brand-muted">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recent'}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-5 text-brand-charcoal capitalize">
                          {order.paymentMethod || 'Online'}
                        </td>

                        {/* Amount in INR */}
                        <td className="py-3.5 px-5 font-serif font-bold text-brand-black text-sm">
                          ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle}`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Quick View Button */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenOrderModal(order);
                            }}
                            className="inline-flex p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-cream rounded-md transition-colors cursor-pointer"
                            title="Open Order Dossier"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-brand-offwhite/40 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <span>Showing {filteredRecentOrders.length} of {orders.length} transactions</span>
            <Link
              to="/admin/orders"
              className="flex items-center gap-1 font-semibold text-brand-accent hover:underline cursor-pointer"
            >
              <span>View Full Orders Ledger</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 8. QUICK VIEW ORDER DOSSIER MODAL WITH STATUS CHANGER */}
        {/* ========================================================================= */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-left space-y-6 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-bold text-brand-black">
                      Order Dossier #{selectedOrder._id?.slice(-8) || selectedOrder.id}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_CONFIG[selectedOrder.orderStatus || selectedOrder.status]?.badge ||
                        STATUS_CONFIG.Pending.badge
                      }`}
                    >
                      {selectedOrder.orderStatus || selectedOrder.status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseOrderModal}
                  className="p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-offwhite rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Update Banner / Feedback */}
              {statusUpdateMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    statusUpdateMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {statusUpdateMsg.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span>{statusUpdateMsg.text}</span>
                </div>
              )}

              {/* Status Update Control */}
              <div className="p-4 bg-brand-offwhite rounded-xl border border-brand-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                    Update Order Status
                  </span>
                  <span className="text-[11px] text-brand-muted">Direct MongoDB sync</span>
                </div>
                {(() => {
                  const currentSt = selectedOrder.orderStatus || selectedOrder.status || 'Pending';
                  const isTerminal = currentSt === 'Delivered' || currentSt === 'Cancelled';
                  const availableOptions = ALLOWED_STATUS_TRANSITIONS[currentSt] || VALID_STATUSES;

                  if (isTerminal) {
                    return (
                      <div className="py-2.5 px-3.5 bg-white rounded-lg border border-brand-border text-xs text-brand-muted">
                        This order is marked as <strong className="text-brand-black">{currentSt}</strong> (terminal status). Further transitions are locked.
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <select
                        value={newOrderStatus}
                        onChange={(e) => setNewOrderStatus(e.target.value)}
                        className="flex-1 bg-white border border-brand-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        {availableOptions.map((st) => (
                          <option key={st} value={st}>
                            {st} {st === currentSt ? '(Current)' : ''}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleUpdateOrderStatus}
                        disabled={isUpdatingStatus || newOrderStatus === currentSt}
                        className="shrink-0"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 size={14} className="animate-spin mr-1.5" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} className="mr-1.5" />
                            <span>Confirm Status</span>
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* Client & Delivery Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-brand-muted">
                    Client Details
                  </span>
                  <p className="font-semibold text-brand-black">
                    {selectedOrder.deliveryAddress?.fullName || selectedOrder.customer?.name || 'Valued Client'}
                  </p>
                  <p className="text-brand-charcoal">{selectedOrder.deliveryAddress?.email || selectedOrder.customer?.email || 'N/A'}</p>
                  <p className="text-brand-muted">{selectedOrder.deliveryAddress?.mobileNumber || selectedOrder.deliveryAddress?.phone || 'No phone recorded'}</p>
                </div>

                <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-brand-muted">
                    Delivery Address
                  </span>
                  <p className="text-brand-black">{selectedOrder.deliveryAddress?.address || 'Standard Address'}</p>
                  <p className="text-brand-charcoal">
                    {selectedOrder.deliveryAddress?.city || ''}{' '}
                    {selectedOrder.deliveryAddress?.pinCode || selectedOrder.deliveryAddress?.postalCode ? `- ${selectedOrder.deliveryAddress.pinCode || selectedOrder.deliveryAddress.postalCode}` : ''}
                  </p>
                  <p className="text-brand-muted">{selectedOrder.deliveryAddress?.state || 'India'}</p>
                </div>
              </div>

              {/* Products in this order */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                  Items Purchased ({selectedOrder.products?.length || 0})
                </span>
                <div className="divide-y divide-brand-border border border-brand-border rounded-xl overflow-hidden bg-white">
                  {(selectedOrder.products || []).map((item, idx) => {
                    const storeName = item.storeName || item.store?.name || 'Patel Optical';
                    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);

                    return (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={formatImageUrl(item.image)}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-md border border-brand-border shrink-0"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="truncate">
                            <p className="font-semibold text-brand-black truncate">{item.name || 'Product'}</p>
                            <p className="text-[11px] text-brand-muted">
                              Qty: {item.quantity} &times; ₹{Number(item.price || 0).toLocaleString('en-IN')}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5">
                              <Store size={10} className="text-amber-600" />
                              <span>Store: {storeName}</span>
                            </span>
                          </div>
                        </div>
                        <span className="font-serif font-bold text-brand-black shrink-0">
                          ₹{Number(lineTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Totals Summary in INR */}
              <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border text-xs space-y-1.5">
                <div className="flex justify-between text-brand-muted">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-brand-black capitalize">{selectedOrder.paymentMethod || 'Online'}</span>
                </div>
                <div className="flex justify-between text-brand-muted">
                  <span>Payment Status:</span>
                  <span className="font-semibold text-brand-black capitalize">{selectedOrder.paymentStatus || 'Pending'}</span>
                </div>
                <div className="pt-2 border-t border-brand-border/60 flex justify-between text-sm font-bold text-brand-black font-serif">
                  <span>Total Amount:</span>
                  <span>₹{Number(selectedOrder.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/admin/orders"
                  className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
                >
                  <span>Go to Orders Ledger</span>
                  <ExternalLink size={12} />
                </Link>
                <Button variant="outline" size="sm" onClick={handleCloseOrderModal}>
                  Close Dossier
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
