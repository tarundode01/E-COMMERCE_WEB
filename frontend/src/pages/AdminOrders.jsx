import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Truck,
  XCircle,
  MapPin,
  CreditCard,
  RotateCcw,
  RefreshCw,
  Loader2,
  ShieldAlert,
  LogIn,
  User,
  Phone,
  Mail,
  SlidersHorizontal,
  ArrowRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VALID_ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
  Confirmed: ['Confirmed', 'Pending', 'Shipped', 'Delivered', 'Cancelled'],
  Shipped: ['Shipped', 'Pending', 'Confirmed', 'Delivered', 'Cancelled'],
  Delivered: ['Delivered', 'Shipped', 'Confirmed'],
  Cancelled: ['Cancelled', 'Pending', 'Confirmed'],
};

/**
 * Status Badge for Admin Order Table & Modals
 */
function OrderStatusBadge({ status }) {
  const normalized = (status || 'Pending').toLowerCase();

  switch (normalized) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <Clock size={12} className="text-amber-600 animate-pulse" />
          <span>Pending</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
          <CheckCircle2 size={12} className="text-sky-600" />
          <span>Confirmed</span>
        </span>
      );
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
          <Truck size={12} className="text-indigo-600" />
          <span>Shipped</span>
        </span>
      );
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <CheckCircle2 size={12} className="text-emerald-600" />
          <span>Delivered</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
          <XCircle size={12} className="text-rose-600" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-cream text-brand-charcoal border border-brand-border">
          <span>{status}</span>
        </span>
      );
  }
}

/**
 * Normalizer for backend Order documents to guarantee uniform properties
 */
const normalizeOrder = (ord) => {
  if (!ord) return null;
  const orderId = ord._id || ord.id || 'N/A';
  const rawProducts = ord.products || ord.items || [];
  const items = rawProducts.map((p) => ({
    id: p.product?._id || p.product || p.productId || p.id || p._id || orderId,
    name: p.name || 'Signature Item',
    price: typeof p.price === 'number' ? p.price : 0,
    quantity: Number(p.quantity) || 1,
    image: p.image || null,
    selectedSize: p.selectedSize || 'Standard',
  }));

  const itemsPrice =
    ord.itemsPrice ??
    ord.subtotal ??
    items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
  const shippingPrice = ord.shippingPrice ?? ord.shipping ?? (itemsPrice >= 200 ? 0 : 25);
  const taxPrice = ord.taxPrice ?? ord.tax ?? Math.round(itemsPrice * 0.08);
  const totalAmount = ord.totalAmount ?? ord.total ?? itemsPrice + shippingPrice + taxPrice;
  const status = ord.orderStatus || ord.status || 'Pending';

  return {
    id: orderId,
    _id: orderId,
    date: ord.createdAt || ord.date || new Date().toISOString(),
    createdAt: ord.createdAt || ord.date || new Date().toISOString(),
    status,
    orderStatus: status,
    total: totalAmount,
    totalAmount,
    itemsPrice,
    subtotal: itemsPrice,
    shipping: shippingPrice,
    shippingPrice,
    tax: taxPrice,
    taxPrice,
    items,
    products: rawProducts,
    paymentMethod: ord.paymentMethod || 'Online Payment',
    paymentStatus: ord.paymentStatus || 'unpaid',
    deliveryAddress: ord.deliveryAddress || null,
    customerName:
      ord.deliveryAddress?.fullName ||
      ord.customer?.name ||
      ord.customerName ||
      'Distinguished Patron',
    customerEmail:
      ord.deliveryAddress?.email ||
      ord.customer?.email ||
      ord.customerEmail ||
      'client@luxury.com',
    customerPhone:
      ord.deliveryAddress?.mobileNumber ||
      ord.customer?.mobile ||
      ord.customerPhone ||
      '',
    cancellationReason: ord.cancellationReason || '',
    cancelledAt: ord.cancelledAt || null,
    deliveredAt: ord.deliveredAt || null,
    statusHistory: ord.statusHistory || [],
  };
};

/**
 * Premium Admin Order Management Page Component
 * Connects directly to backend admin order endpoints:
 * - GET /api/admin/orders
 * - PATCH /api/admin/orders/:id/status
 */
export default function AdminOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Orders State
  const [ordersList, setOrdersList] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(isAuthenticated && user?.role === 'admin'));
  const [apiError, setApiError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  // Modal State for Order Details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalStatusSelection, setDetailsModalStatusSelection] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    order: null,
    newStatus: '',
    note: '',
    error: null,
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fetch real orders from backend admin endpoint
  const fetchOrders = useCallback(async (withLoader = true) => {
    if (withLoader) {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const res = await orderService.getAllOrders();
      let fetched = [];
      if (res && res.success && Array.isArray(res.orders)) {
        fetched = res.orders;
      } else if (res && Array.isArray(res.data || res.orders)) {
        fetched = res.data || res.orders;
      }
      setOrdersList(fetched.map(normalizeOrder));
    } catch (err) {
      console.error('Failed to retrieve orders from database:', err);

      const statusCode = err.response?.status;
      if (statusCode === 401) {
        showToast('Your session has expired. Please sign in again.', 'error');
        logout();
        navigate('/login', { state: { from: { pathname: '/admin/orders' } } });
        return;
      }

      if (statusCode === 403) {
        setApiError('Access forbidden. Administrative privileges are required to view this ledger.');
        setOrdersList([]);
        return;
      }

      setApiError(
        err.response?.data?.message ||
        err.customMessage ||
        'Unable to retrieve orders from the database. Please ensure backend server is active.'
      );
      setOrdersList([]);
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate, showToast]);

  // Initial load
  useEffect(() => {
    let active = true;
    if (isAdmin) {
      (async () => {
        try {
          const res = await orderService.getAllOrders();
          let fetched = [];
          if (res && res.success && Array.isArray(res.orders)) {
            fetched = res.orders;
          } else if (res && Array.isArray(res.data || res.orders)) {
            fetched = res.data || res.orders;
          }
          if (active) {
            setOrdersList(fetched.map(normalizeOrder));
          }
        } catch (err) {
          if (active) {
            console.error('Failed to retrieve orders:', err);
            const statusCode = err.response?.status;
            if (statusCode === 401) {
              showToast('Your session has expired. Please sign in again.', 'error');
              logout();
              navigate('/login', { state: { from: { pathname: '/admin/orders' } } });
              return;
            }
            if (statusCode === 403) {
              setApiError('Access forbidden. Administrative privileges are required.');
              setOrdersList([]);
              return;
            }
            setApiError(err.response?.data?.message || err.customMessage || 'Unable to retrieve orders.');
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [isAdmin, logout, navigate, showToast]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    return ordersList
      .filter((order) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          order.id.toLowerCase().includes(q) ||
          (order._id && order._id.toLowerCase().includes(q)) ||
          order.customerName.toLowerCase().includes(q) ||
          order.customerEmail.toLowerCase().includes(q) ||
          order.customerPhone.includes(q) ||
          (order.deliveryAddress?.city && order.deliveryAddress.city.toLowerCase().includes(q));

        const matchesStatus =
          statusFilter === 'All' ||
          (order.status || '').toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date) - new Date(a.date);
        }
        if (sortBy === 'oldest') {
          return new Date(a.date) - new Date(b.date);
        }
        if (sortBy === 'highest') {
          return b.total - a.total;
        }
        if (sortBy === 'lowest') {
          return a.total - b.total;
        }
        return 0;
      });
  }, [ordersList, searchQuery, statusFilter, sortBy]);

  // Status Counts for Tabs
  const statusCounts = useMemo(() => {
    const counts = {
      All: ordersList.length,
      Pending: 0,
      Confirmed: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    ordersList.forEach((ord) => {
      const s = ord.status || 'Pending';
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });
    return counts;
  }, [ordersList]);

  // Open Details Modal for an Order
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setDetailsModalStatusSelection(order.status || 'Pending');
  };

  // Open Confirmation Dialog before modifying order status
  const handleOpenConfirmDialog = (order, targetStatus) => {
    if (!order || !targetStatus) return;

    if (targetStatus === order.status) {
      showToast(`Order #${(order.id || '').slice(-8)} is already in '${targetStatus}' status.`, 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      order,
      newStatus: targetStatus,
      note: '',
      error: null,
    });
  };

  // Execute Status Update via PATCH /api/admin/orders/:id/status
  const handleExecuteStatusUpdate = async () => {
    if (!confirmDialog.order || !confirmDialog.newStatus) return;

    setIsUpdatingStatus(true);
    setConfirmDialog((prev) => ({ ...prev, error: null }));

    const targetId = confirmDialog.order._id || confirmDialog.order.id;
    const targetStatus = confirmDialog.newStatus;
    const auditNote = confirmDialog.note.trim();

    try {
      const res = await orderService.updateOrderStatus(targetId, targetStatus, auditNote);

      showToast(
        res.message || `Order #${targetId.slice(-8)} status successfully updated to '${targetStatus}'.`,
        'success'
      );

      // Close confirmation dialog
      setConfirmDialog({
        isOpen: false,
        order: null,
        newStatus: '',
        note: '',
        error: null,
      });

      // Update active modal order view if open
      if (selectedOrder && (selectedOrder.id === targetId || selectedOrder._id === targetId)) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: targetStatus,
          orderStatus: targetStatus,
          cancellationReason: targetStatus === 'Cancelled' ? auditNote || 'Cancelled by administrator' : prev.cancellationReason,
          deliveredAt: targetStatus === 'Delivered' ? new Date().toISOString() : prev.deliveredAt,
        }));
        setDetailsModalStatusSelection(targetStatus);
      }

      // Refresh order ledger list from backend
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);

      const statusCode = err.response?.status;
      if (statusCode === 401) {
        showToast('Your session has expired. Please sign in again.', 'error');
        logout();
        navigate('/login', { state: { from: { pathname: '/admin/orders' } } });
        return;
      }

      if (statusCode === 403) {
        setConfirmDialog((prev) => ({
          ...prev,
          error: 'Access Forbidden: Administrator privileges required to perform status updates.',
        }));
        showToast('Access forbidden. Administrator privileges required.', 'error');
        return;
      }

      const errorMessage =
        err.response?.data?.message ||
        err.customMessage ||
        'Unable to update order status. Please review transition rules and try again.';

      setConfirmDialog((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      showToast(errorMessage, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <AdminLayout
      activePage="orders"
      title="Client Acquisitions & Orders"
      subtitle="Executive registry of luxury orders, customer addresses, and fulfillment tracking"
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh from Database"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>
        </div>
      }
    >
      {/* ========================================================================= */}
      {/* 1. FLOATING TOAST NOTIFICATION */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-500'
              : toastMessage.type === 'info'
              ? 'bg-brand-charcoal text-white border-brand-border'
              : 'bg-brand-black text-white border-brand-accent/40'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-brand-accent shrink-0" />
          )}
          <span>{toastMessage.message}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ACCESS RESTRICTION FOR NON-ADMINS */}
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
            This executive ledger is restricted exclusively to authenticated store administrators.
            Please sign in with your administrative credentials to manage client acquisitions and update fulfillment statuses.
          </p>
          <Link to="/login">
            <Button variant="primary" size="md" icon={LogIn}>
              Sign In as Administrator
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Admin Verified Active Notice */}
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 text-left">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={17} className="text-emerald-700 shrink-0" />
              <span>
                <strong>Authenticated Administrator:</strong> Signed in as{' '}
                <span className="font-semibold">{user.email}</span>. Live backend order synchronization active.
              </span>
            </div>
            <Badge variant="default" size="sm" className="hidden md:inline-flex !bg-emerald-100 text-emerald-800">
              Admin Privileges Active
            </Badge>
          </div>

          {/* Database API Error Alert */}
          {apiError && (
            <div className="p-4 rounded-xl border bg-rose-50 text-rose-900 border-rose-200 flex items-start justify-between gap-3 text-xs text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={17} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 font-semibold">Ledger Connection Issue:</strong>
                  <span>{apiError}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={fetchOrders}
                icon={RefreshCw}
                className="border-rose-300 hover:bg-rose-100 shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. SEARCH & STATUS FILTER TABS */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Search Row & Sort Controls */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search by Order ID, Client Name, Email, Phone, or City..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={Search}
                  className="!py-2 text-xs sm:text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-black cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-brand-muted font-medium">
                  <SlidersHorizontal size={14} className="text-brand-accent" />
                  <span>Sort:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-brand-offwhite border border-brand-border text-xs font-semibold text-brand-black px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-black cursor-pointer"
                >
                  <option value="newest">Newest Orders First</option>
                  <option value="oldest">Oldest Orders First</option>
                  <option value="highest">Highest Total Amount</option>
                  <option value="lowest">Lowest Total Amount</option>
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-brand-border/50 text-xs">
              {[
                { id: 'All', label: 'All Orders', count: statusCounts.All },
                { id: 'Pending', label: 'Pending', count: statusCounts.Pending },
                { id: 'Confirmed', label: 'Confirmed', count: statusCounts.Confirmed },
                { id: 'Shipped', label: 'Shipped', count: statusCounts.Shipped },
                { id: 'Delivered', label: 'Delivered', count: statusCounts.Delivered },
                { id: 'Cancelled', label: 'Cancelled', count: statusCounts.Cancelled },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-brand-black text-white shadow-xs'
                      : 'bg-brand-offwhite text-brand-charcoal border border-brand-border hover:bg-brand-cream/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-border text-brand-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. RESPONSIVE ORDERS TABLE */}
          {/* ========================================================================= */}
          {isLoading ? (
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <Loader2 size={36} className="text-brand-accent animate-spin mx-auto mb-4" />
              <h3 className="font-serif text-lg font-bold text-brand-black mb-1">
                Accessing Executive Order Registry...
              </h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Retrieving real-time verified customer acquisitions from MongoDB via admin endpoint.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            /* Clean Empty State (Zero Mock Data) */
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-12 sm:p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-black mb-2">
                No Client Acquisitions Found
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto mb-6 leading-relaxed">
                {ordersList.length === 0
                  ? 'There are currently no customer orders recorded in the live database. When shoppers place acquisitions through the store checkout, their orders will populate this registry automatically.'
                  : `No orders matched your current search ("${searchQuery}") or status filter ("${statusFilter}").`}
              </p>
              {(searchQuery || statusFilter !== 'All') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  icon={RotateCcw}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            /* Populated Orders Table with Quick Status Transition Dropdowns */
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-brand-offwhite/80 border-b border-brand-border/70 text-[11px] uppercase tracking-wider font-semibold text-brand-muted">
                      <th className="py-3.5 px-4 sm:px-6">Order Reference</th>
                      <th className="py-3.5 px-4">Client Dossier</th>
                      <th className="py-3.5 px-4">Date Placed</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Payment Method</th>
                      <th className="py-3.5 px-4">Fulfillment Status</th>
                      <th className="py-3.5 px-4">Update Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/50">
                    {filteredOrders.map((order) => {
                      const dateStr = new Date(order.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const isTerminal = order.status === 'Delivered' || order.status === 'Cancelled';

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-brand-offwhite/40 transition-colors group"
                        >
                          {/* Order Reference */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-brand-offwhite border border-brand-border flex items-center justify-center text-brand-accent shrink-0">
                                <ShoppingBag size={16} />
                              </div>
                              <div>
                                <span className="font-mono text-xs font-bold text-brand-black block">
                                  #{order.id.slice(-8)}
                                </span>
                                <span className="text-[11px] text-brand-muted">
                                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-brand-black">
                              {order.customerName}
                            </div>
                            <div className="text-[11px] text-brand-muted truncate max-w-xs">
                              {order.customerEmail}
                            </div>
                            {order.customerPhone && (
                              <div className="text-[11px] text-brand-muted font-mono">
                                +91 {order.customerPhone}
                              </div>
                            )}
                          </td>

                          {/* Order Date */}
                          <td className="py-4 px-4 text-xs text-brand-charcoal whitespace-nowrap">
                            {dateStr}
                          </td>

                          {/* Total Amount */}
                          <td className="py-4 px-4 font-serif font-bold text-brand-black text-sm whitespace-nowrap">
                            ${Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Payment Method */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-brand-black text-xs">
                              {order.paymentMethod}
                            </div>
                            <div className="text-[10px] text-brand-muted mt-0.5">
                              {order.paymentStatus === 'unpaid' ? (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Unpaid (Demo)
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {order.paymentStatus}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Order Status Badge */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <OrderStatusBadge status={order.status} />
                          </td>

                          {/* Quick Status Update Dropdown */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleOpenConfirmDialog(order, e.target.value)}
                              className="bg-brand-surface border border-brand-border text-xs font-semibold text-brand-black px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-black cursor-pointer hover:border-brand-accent transition-colors"
                            >
                              {(ALLOWED_STATUS_TRANSITIONS[order.status] || VALID_ORDER_STATUSES).map((st) => (
                                <option key={st} value={st}>
                                  {st} {st === order.status ? '(Current)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenDetails(order)}
                              icon={Eye}
                              className="hover:border-brand-black"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-4 bg-brand-offwhite/40 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
                <span>
                  Showing <strong>{filteredOrders.length}</strong> of{' '}
                  <strong>{ordersList.length}</strong> live catalog orders
                </span>
                <span>PATCH /api/admin/orders/:id/status Connected</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. CONFIRMATION DIALOG FOR STATUS CHANGES */}
      {/* ========================================================================= */}
      {confirmDialog.isOpen && confirmDialog.order && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-brand-accent" />
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Confirm Status Transition
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  !isUpdatingStatus &&
                  setConfirmDialog({ isOpen: false, order: null, newStatus: '', note: '', error: null })
                }
                disabled={isUpdatingStatus}
                className="text-brand-muted hover:text-brand-black p-1 cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Transition Visual Representation */}
            <div className="bg-brand-offwhite/70 border border-brand-border/70 rounded-xl p-4 mb-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-brand-muted font-mono mb-2">
                Order #{confirmDialog.order.id.slice(-8)}
              </p>
              <div className="flex items-center justify-center gap-3">
                <OrderStatusBadge status={confirmDialog.order.status} />
                <ArrowRight size={16} className="text-brand-muted shrink-0" />
                <OrderStatusBadge status={confirmDialog.newStatus} />
              </div>
            </div>

            {/* Consequence Advisory Box */}
            {confirmDialog.newStatus === 'Cancelled' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs mb-4 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Inventory Restock Notice:</strong>
                  <span>
                    Cancelling this order will immediately restore all purchased item units back into database stock.
                  </span>
                </div>
              </div>
            )}

            {confirmDialog.newStatus === 'Delivered' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs mb-4 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Terminal State Notice:</strong>
                  <span>
                    Marking this order as Delivered records a permanent delivery timestamp and finalizes fulfillment.
                  </span>
                </div>
              </div>
            )}

            {confirmDialog.newStatus === 'Shipped' && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs mb-4 flex items-start gap-2.5">
                <Truck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Fulfillment Dispatch:</strong>
                  <span>
                    Order will be flagged as in-transit with the courier. Customers will no longer be eligible to self-cancel.
                  </span>
                </div>
              </div>
            )}

            {/* Error Message if API Rejected Transition */}
            {confirmDialog.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4 flex items-start gap-2">
                <XCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{confirmDialog.error}</span>
              </div>
            )}

            {/* Optional Audit Note Input */}
            <div className="mb-5">
              <label
                htmlFor="admin-note"
                className="block text-xs uppercase tracking-wider font-semibold text-brand-charcoal mb-1.5 flex items-center gap-1.5"
              >
                <FileText size={13} className="text-brand-accent" />
                <span>Audit Note / Reason (Optional)</span>
              </label>
              <input
                id="admin-note"
                type="text"
                placeholder={
                  confirmDialog.newStatus === 'Cancelled'
                    ? 'e.g. Customer requested cancellation via concierge'
                    : confirmDialog.newStatus === 'Shipped'
                    ? 'e.g. FedEx tracking #FDX-882910'
                    : 'e.g. Payment verified & approved by admin'
                }
                value={confirmDialog.note}
                onChange={(e) => setConfirmDialog((prev) => ({ ...prev, note: e.target.value }))}
                disabled={isUpdatingStatus}
                className="w-full bg-brand-offwhite border border-brand-border text-xs text-brand-black px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-black"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirmDialog({ isOpen: false, order: null, newStatus: '', note: '', error: null })
                }
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteStatusUpdate}
                isLoading={isUpdatingStatus}
                icon={CheckCircle2}
              >
                Yes, Update Status
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. COMPLETE ORDER DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-brand-surface/95 backdrop-blur-md p-5 sm:p-6 border-b border-brand-border/60 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent">
                    Executive Order Dossier
                  </span>
                  <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                  <span className="font-mono text-xs font-bold text-brand-black">
                    #{selectedOrder.id}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-black">
                  Order Details & Fulfillment
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-brand-muted hover:text-brand-black rounded-full hover:bg-brand-cream/60 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Status & Date Bar with Status Transition Control */}
              <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                    Current Status
                  </p>
                  <div className="mt-1">
                    <OrderStatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                    Timestamp
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-brand-black mt-1">
                    {new Date(selectedOrder.date).toLocaleString()}
                  </p>
                </div>

                {/* Admin Status Transition Control */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <select
                      value={detailsModalStatusSelection}
                      onChange={(e) => setDetailsModalStatusSelection(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="bg-brand-surface border border-brand-border text-xs font-semibold text-brand-black px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-black cursor-pointer disabled:opacity-50"
                    >
                      {(ALLOWED_STATUS_TRANSITIONS[selectedOrder.status] || VALID_ORDER_STATUSES).map((st) => (
                        <option key={st} value={st}>
                          {st} {st === selectedOrder.status ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleOpenConfirmDialog(selectedOrder, detailsModalStatusSelection)}
                      disabled={
                        isUpdatingStatus ||
                        detailsModalStatusSelection === selectedOrder.status
                      }
                    >
                      Update
                    </Button>
                  </div>
                )}
              </div>

              {/* Cancellation Reason if Cancelled */}
              {selectedOrder.status === 'Cancelled' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Order Cancelled</strong>
                    <span>
                      Acquisition terminated and inventory restocked.
                      {selectedOrder.cancellationReason && (
                        <span className="block mt-1 text-rose-700">
                          Reason: {selectedOrder.cancellationReason}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery Timestamp if Delivered */}
              {selectedOrder.status === 'Delivered' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Order Delivered</strong>
                    <span>
                      Completed and confirmed on {selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleString() : new Date(selectedOrder.date).toLocaleString()}.
                    </span>
                  </div>
                </div>
              )}

              {/* Customer & Delivery Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Details */}
                <div className="p-4 rounded-xl border border-brand-border/70 bg-brand-offwhite/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-2">
                    <User size={13} className="text-brand-accent" />
                    <span>Customer Details</span>
                  </div>
                  <p className="font-bold text-brand-black text-sm">{selectedOrder.customerName}</p>
                  <p className="text-brand-charcoal flex items-center gap-1.5">
                    <Mail size={12} className="text-brand-muted" />
                    <span>{selectedOrder.customerEmail}</span>
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="text-brand-charcoal flex items-center gap-1.5">
                      <Phone size={12} className="text-brand-muted" />
                      <span>+91 {selectedOrder.customerPhone}</span>
                    </p>
                  )}
                </div>

                {/* Delivery Address */}
                <div className="p-4 rounded-xl border border-brand-border/70 bg-brand-offwhite/40 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-2">
                    <MapPin size={13} className="text-brand-accent" />
                    <span>Delivery Address</span>
                  </div>
                  {selectedOrder.deliveryAddress ? (
                    <>
                      <p className="font-bold text-brand-black">
                        {selectedOrder.deliveryAddress.fullName || selectedOrder.customerName}
                      </p>
                      <p className="text-brand-charcoal">{selectedOrder.deliveryAddress.address}</p>
                      <p className="text-brand-charcoal">
                        {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} —{' '}
                        {selectedOrder.deliveryAddress.pinCode}
                      </p>
                      {selectedOrder.deliveryAddress.mobileNumber && (
                        <p className="text-brand-muted pt-1">
                          Phone: +91 {selectedOrder.deliveryAddress.mobileNumber}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-brand-muted italic">Delivery address not recorded.</p>
                  )}
                </div>
              </div>

              {/* Ordered Products Breakdown */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-charcoal mb-2.5">
                  Purchased Items ({selectedOrder.items.length})
                </h4>
                <div className="border border-brand-border/70 rounded-xl overflow-hidden divide-y divide-brand-border/60">
                  {selectedOrder.items.map((item, idx) => {
                    const lineTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover bg-brand-offwhite border border-brand-border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-brand-offwhite border border-brand-border flex items-center justify-center text-brand-muted shrink-0">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                          <div>
                            <p className="font-serif font-bold text-brand-black">{item.name}</p>
                            <p className="text-brand-muted text-[11px]">
                              Qty: {item.quantity} {item.selectedSize && `• Size: ${item.selectedSize}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-serif font-bold text-brand-black">
                            ${Number(lineTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details & Server Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment Details */}
                <div className="p-4 rounded-xl border border-brand-border/70 bg-brand-offwhite/40 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-2">
                    <CreditCard size={13} className="text-brand-accent" />
                    <span>Payment Information</span>
                  </div>
                  <p className="font-bold text-brand-black">{selectedOrder.paymentMethod}</p>
                  {selectedOrder.paymentStatus === 'unpaid' ? (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                      <strong className="block font-semibold">Status: Unpaid (Sandbox Demo)</strong>
                      <span>Real transaction not charged. Verified catalog booking only.</span>
                    </div>
                  ) : (
                    <p className="text-emerald-700 font-medium">Status: {selectedOrder.paymentStatus}</p>
                  )}
                  <p className="text-brand-muted">Dispatch: White-Glove Luxury Courier</p>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-xl bg-brand-cream/40 border border-brand-border/70 text-xs space-y-2">
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold">${Number(selectedOrder.itemsPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Express Shipping:</span>
                    <span className="font-semibold text-emerald-800">
                      {selectedOrder.shippingPrice === 0 ? 'Complimentary' : `$${Number(selectedOrder.shippingPrice || 0).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Luxury Tax (8%):</span>
                    <span className="font-semibold">${Number(selectedOrder.taxPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-brand-border/60 flex justify-between font-bold text-sm text-brand-black">
                    <span>Verified Grand Total:</span>
                    <span className="font-serif text-base">${Number(selectedOrder.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Order Status History Audit if available */}
              {Array.isArray(selectedOrder.statusHistory) && selectedOrder.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-charcoal mb-2 flex items-center gap-1.5">
                    <Clock size={13} className="text-brand-accent" />
                    <span>Status History Audit Log</span>
                  </h4>
                  <div className="border border-brand-border/60 rounded-xl p-3 bg-brand-offwhite/30 space-y-2 text-xs">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between pb-1.5 border-b border-brand-border/40 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={h.status} />
                          <span className="text-brand-charcoal">{h.note || 'Status updated'}</span>
                        </div>
                        <span className="text-[11px] text-brand-muted font-mono">
                          {new Date(h.changedAt || h.updatedAt || 0).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-brand-border/60 flex items-center justify-between gap-3 bg-brand-surface">
              <span className="text-xs text-brand-muted font-mono">
                Order Reference: #{selectedOrder.id}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedOrder(null)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
