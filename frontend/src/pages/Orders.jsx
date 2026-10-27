import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageCheck,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertTriangle,
  Eye,
  MapPin,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  User,
  X,
  Loader2,
  RefreshCw,
  LogIn,
  Bike,
  Compass,
  Navigation,
  Radio,
  Battery,
  Gauge,
  ExternalLink,
  Phone,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LiveDeliveryMap from '../components/LiveDeliveryMap';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';

/**
 * Status Badge Component with Luxury Theme Styles
 * Supported statuses: Pending, Confirmed, Shipped, Delivered, Cancelled
 */
function OrderStatusBadge({ status }) {
  const normalized = (status || 'Pending').toLowerCase();

  switch (normalized) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <Clock size={12} className="text-amber-600 animate-pulse" />
          <span>Pending Processing</span>
        </span>
      );
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
          <CheckCircle2 size={12} className="text-sky-600" />
          <span>Confirmed</span>
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
          <Clock size={12} className="text-blue-600" />
          <span>Processing in Atelier</span>
        </span>
      );
    case 'packed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
          <PackageCheck size={12} className="text-purple-600" />
          <span>Packed & Prepared</span>
        </span>
      );
    case 'ready for pickup':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
          <CheckCircle2 size={12} className="text-teal-600" />
          <span>Ready for Courier Pickup</span>
        </span>
      );
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
          <Truck size={12} className="text-indigo-600" />
          <span>Shipped & In Transit</span>
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
 * Helper to normalize order properties across both backend API documents and local fallback formats
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
    store: p.store || null,
    storeName: p.storeName || (p.store && typeof p.store === 'object' ? p.store.name : '') || '',
    sku: p.sku || '',
  }));

  const itemsPrice =
    ord.itemsPrice ??
    ord.subtotal ??
    items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
  const shippingPrice = ord.shippingPrice ?? ord.shipping ?? (itemsPrice >= 500 ? 0 : 25);
  const taxPrice = ord.taxPrice ?? ord.tax ?? Math.round(itemsPrice * 0.08 * 100) / 100;
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
    stores: ord.stores || [],
    statusHistory: ord.statusHistory || [],
    paymentMethod: ord.paymentMethod || 'Online Payment',
    paymentStatus: ord.paymentStatus || 'pending',
    deliveryAddress: ord.deliveryAddress || null,
    customerName: ord.deliveryAddress?.fullName || ord.customerName || '',
    cancellationReason: ord.cancellationReason || '',
    cancelledAt: ord.cancelledAt || null,
    deliveryBoy: ord.deliveryBoy || null,
    deliveryBoySnapshot: ord.deliveryBoySnapshot || null,
    deliveryStatus: ord.deliveryStatus || 'unassigned',
    deliveryAssignedAt: ord.deliveryAssignedAt || null,
    deliveryNotes: ord.deliveryNotes || '',
  };
};

/**
 * Premium My Orders Page Component
 * Requirements:
 * - Shows logged-in customer's order history via GET /api/orders/my-orders
 * - Displays order ID, date, product names, quantities, total amount, and status
 * - Shows payment method and delivery address
 * - Order status labels: Pending, Confirmed, Shipped, Delivered, Cancelled
 * - View order details dialog via GET /api/orders/:id
 * - Cancel Order button only for eligible orders (Pending / Confirmed) with PATCH /api/orders/:id/cancel
 * - Refreshes order data after cancellation
 * - Redirects unauthenticated users to /login
 * - Connected to Customer Account page
 */
export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Change of mind');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(isAuthenticated && user));
  const [apiError, setApiError] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Filter tab: 'all' | 'active' | 'completed' | 'cancelled'
  const [filterTab, setFilterTab] = useState('all');

  // Live Radar Tracking Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [isFetchingTracking, setIsFetchingTracking] = useState(false);
  const [autoTrackingPulse, setAutoTrackingPulse] = useState(true);

  // Open live radar tracking modal
  const handleOpenTrackingModal = async (order) => {
    setTrackingModalOrder(order);
    setTrackingData(null);
    setIsFetchingTracking(true);
    try {
      const res = await orderService.getOrderTracking(order.id || order._id);
      if (res && res.success) {
        setTrackingData(res);
      }
    } catch (err) {
      console.error('Failed to load tracking telemetry:', err);
    } finally {
      setIsFetchingTracking(false);
    }
  };

  // Auto-refresh tracking radar while modal is open (every 6 seconds)
  useEffect(() => {
    if (!trackingModalOrder || !autoTrackingPulse) return;

    const interval = setInterval(async () => {
      try {
        const res = await orderService.getOrderTracking(
          trackingModalOrder.id || trackingModalOrder._id
        );
        if (res && res.success) {
          setTrackingData(res);
        }
      } catch (err) {
        console.error('Tracking poll error:', err);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [trackingModalOrder, autoTrackingPulse]);

  // Redirect to /login if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Load orders from backend API (GET /api/orders/my-orders)
  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await orderService.getMyOrders();
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(res.orders.map(normalizeOrder));
      } else if (res && Array.isArray(res.data || res.orders)) {
        setOrders((res.data || res.orders).map(normalizeOrder));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to retrieve order history from API:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401) {
        setApiError('Your session has expired. Please sign in again to view your order history.');
      } else {
        setApiError(
          err.response?.data?.message ||
          err.customMessage ||
          'Unable to load orders from the server. Please check your network connection.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      orderService
        .getMyOrders()
        .then((res) => {
          if (!active) return;
          if (res && res.success && Array.isArray(res.orders)) {
            setOrders(res.orders.map(normalizeOrder));
          } else if (res && Array.isArray(res.data || res.orders)) {
            setOrders((res.data || res.orders).map(normalizeOrder));
          } else {
            setOrders([]);
          }
        })
        .catch((err) => {
          if (!active) return;
          const statusCode = err.response?.status;
          if (statusCode === 401) {
            setApiError('Your session has expired. Please sign in again to view your order history.');
          } else {
            setApiError(
              err.response?.data?.message ||
              err.customMessage ||
              'Unable to load orders from the server. Please check your network connection.'
            );
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if an order is eligible for cancellation (Any order before Shipped, Delivered, or Cancelled)
  const isOrderEligibleForCancel = (status) => {
    const s = (status || '').toLowerCase();
    return !['shipped', 'delivered', 'cancelled'].includes(s);
  };

  // Open detailed modal and fetch freshest details from GET /api/orders/:id
  const handleOpenDetails = async (order) => {
    setSelectedOrder(normalizeOrder(order));
    const targetId = order._id || order.id;
    if (!targetId) return;

    setIsFetchingDetails(true);
    try {
      const res = await orderService.getOrderById(targetId);
      if (res && res.success && res.order) {
        setSelectedOrder(normalizeOrder(res.order));
      }
    } catch (err) {
      console.error('Failed to fetch detailed order by ID:', err);
      // Fallback already in selectedOrder
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Handle Cancel Order Action: PATCH /api/orders/:id/cancel
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;

    const targetId = orderToCancel._id || orderToCancel.id;
    setIsCancelling(true);

    try {
      const res = await orderService.cancelOrder(targetId, cancelReason);

      setNotification({
        type: 'success',
        message:
          res.message || `Order #${targetId} has been successfully cancelled and inventory restocked.`,
      });

      // Refresh order list immediately from backend
      await fetchOrders();

      // Update active modal view if it was showing this order
      if (selectedOrder && (selectedOrder.id === targetId || selectedOrder._id === targetId)) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: 'Cancelled',
          orderStatus: 'Cancelled',
          cancellationReason: cancelReason,
        }));
      }

      setOrderToCancel(null);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setNotification({
        type: 'error',
        message:
          err.response?.data?.message ||
          err.customMessage ||
          'Failed to cancel the order. Please try again.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    const s = (order.status || 'Pending').toLowerCase();
    if (filterTab === 'active') {
      return ['pending', 'confirmed', 'processing', 'packed', 'ready for pickup', 'shipped'].includes(s);
    }
    if (filterTab === 'completed') return s === 'delivered';
    if (filterTab === 'cancelled') return s === 'cancelled';
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-brand-offwhite py-10 sm:py-14 transition-colors">
      <Container size="default">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-xs font-medium text-brand-muted mb-6 overflow-x-auto whitespace-nowrap"
        >
          <Link to="/" className="hover:text-brand-black transition-colors">
            Home
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <Link to="/account" className="hover:text-brand-black transition-colors">
            Customer Account
          </Link>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-brand-black font-semibold">My Orders</span>
        </nav>

        {/* Page Header */}
        <div className="border-b border-brand-border/60 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-accent">
                Client Acquisitions
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              <span className="text-xs text-brand-muted font-medium">Order History</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-black">
                My Orders
              </h1>
              {orders.length > 0 && (
                <Badge variant="accent" size="md" className="rounded-full shadow-2xs font-bold">
                  {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm sm:text-base text-brand-muted max-w-2xl leading-relaxed font-light">
              Review your purchase invoices, real-time courier tracking milestones, and dispatch
              status for all signature pieces ordered with this account.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/account">
              <Button variant="outline" size="sm" icon={User}>
                Account Profile
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="primary" size="sm" icon={ShoppingBag}>
                Explore Catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Notification Toast */}
        {notification.message && (
          <div
            className={`p-4 rounded-xl border mb-6 flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification({ type: '', message: '' })}
              className="text-brand-muted hover:text-brand-black p-0.5 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* API Error Notification */}
        {apiError && (
          <div className="p-4 rounded-xl border mb-6 bg-rose-50 text-rose-900 border-rose-200 flex items-start justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Order Service Notice:</strong>
                <span>{apiError}</span>
                {apiError.toLowerCase().includes('sign in') && (
                  <div className="mt-2">
                    <Link to="/login" state={{ from: location }}>
                      <Button
                        variant="primary"
                        size="xs"
                        icon={LogIn}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Sign In Now
                      </Button>
                    </Link>
                  </div>
                )}
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

        {/* Orders Filter Tabs (Visible when orders exist) */}
        {!isLoading && orders.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-brand-border/40">
            {[
              { id: 'all', label: `All Orders (${orders.length})` },
              {
                id: 'active',
                label: `Active (${orders.filter((o) => ['pending', 'confirmed', 'processing', 'packed', 'ready for pickup', 'shipped'].includes((o.status || '').toLowerCase())).length})`,
              },
              {
                id: 'completed',
                label: `Delivered (${orders.filter((o) => (o.status || '').toLowerCase() === 'delivered').length})`,
              },
              {
                id: 'cancelled',
                label: `Cancelled (${orders.filter((o) => (o.status || '').toLowerCase() === 'cancelled').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-brand-black text-white shadow-xs'
                    : 'bg-brand-surface text-brand-charcoal border border-brand-border hover:bg-brand-cream/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading State or Orders Content */}
        {isLoading ? (
          <div className="bg-brand-surface border border-brand-border/60 rounded-2xl p-12 sm:p-16 text-center max-w-xl mx-auto shadow-xs my-8 animate-in fade-in duration-200">
            <Loader2 size={36} className="text-brand-accent animate-spin mx-auto mb-4" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-black mb-1">
              Accessing Order Dossier...
            </h3>
            <p className="text-xs text-brand-muted max-w-sm mx-auto">
              Connecting to secure fulfillment catalog and retrieving your verified acquisitions.
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* Clean Empty Orders State (No fake sample orders) */
          <div className="bg-brand-surface border border-brand-border/60 rounded-2xl p-10 sm:p-16 text-center max-w-2xl mx-auto shadow-xs my-8 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-6 shadow-inner">
              <PackageCheck size={36} strokeWidth={1.5} />
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black mb-3">
              No Order History Yet
            </h2>

            <p className="text-sm sm:text-base text-brand-muted max-w-md mx-auto mb-8 leading-relaxed font-light">
              You haven&apos;t placed any orders with this account yet. When you complete checkout, your
              order confirmation, tracking updates, and invoices will be cataloged here.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/shop" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowLeft}
                  iconPosition="left"
                  className="shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  Discover Collections
                </Button>
              </Link>
              <Link to="/account" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Account Profile
                </Button>
              </Link>
            </div>

            {/* Concierge Assurances */}
            <div className="mt-12 pt-8 border-t border-brand-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-3 bg-brand-offwhite rounded-xl border border-brand-border/50">
                <Truck size={16} className="text-brand-accent mb-1.5" />
                <p className="text-xs font-bold text-brand-black">Express Dispatch</p>
                <p className="text-[11px] text-brand-muted">Complimentary on orders $200+</p>
              </div>
              <div className="p-3 bg-brand-offwhite rounded-xl border border-brand-border/50">
                <ShieldCheck size={16} className="text-brand-accent mb-1.5" />
                <p className="text-xs font-bold text-brand-black">Certified Authenticity</p>
                <p className="text-[11px] text-brand-muted">Archival certificate included</p>
              </div>
              <div className="p-3 bg-brand-offwhite rounded-xl border border-brand-border/50">
                <RotateCcw size={16} className="text-brand-accent mb-1.5" />
                <p className="text-xs font-bold text-brand-black">Privilege Return</p>
                <p className="text-[11px] text-brand-muted">Complimentary 30-day window</p>
              </div>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty state for specific filter tab */
          <div className="bg-brand-surface border border-brand-border/60 rounded-xl p-10 text-center my-6">
            <p className="text-sm text-brand-muted">
              No orders found matching the selected filter ({filterTab}).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterTab('all')}
              className="mt-4"
            >
              View All Orders
            </Button>
          </div>
        ) : (
          /* Populated Responsive Orders List */
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const formattedDate = order.date
                ? new Date(order.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent Order';

              const eligibleToCancel = isOrderEligibleForCancel(order.status);
              const itemsCount = (order.items || []).reduce(
                (sum, it) => sum + (Number(it.quantity) || 1),
                0
              );

              return (
                <div
                  key={order.id}
                  className="bg-brand-surface border border-brand-border/70 rounded-2xl overflow-hidden shadow-xs hover:border-brand-accent/40 transition-all text-left"
                >
                  {/* Order Card Top Bar */}
                  <div className="p-5 sm:p-6 border-b border-brand-border/60 bg-brand-offwhite/40 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-muted">
                          Order Number
                        </p>
                        <p className="font-mono text-sm sm:text-base font-bold text-brand-black">
                          #{order.id}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-muted">
                          Date Placed
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-brand-charcoal">
                          {formattedDate}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-muted">
                          Total Amount
                        </p>
                        <p className="font-serif text-sm sm:text-base font-bold text-brand-black">
                          ${typeof order.total === 'number' ? order.total.toLocaleString() : order.total}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Order Products Preview */}
                  <div className="p-5 sm:p-6 divide-y divide-brand-border/40">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pb-4">
                      {/* Products Summary (Cols 1-7) */}
                      <div className="md:col-span-7 space-y-3">
                        {(order.items || []).slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3.5">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 rounded-lg object-cover bg-brand-offwhite border border-brand-border/70 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-brand-offwhite border border-brand-border/70 flex items-center justify-center text-brand-muted shrink-0">
                                <ShoppingBag size={18} />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="font-serif text-sm font-bold text-brand-black truncate">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted mt-0.5">
                                <span>Qty: {item.quantity || 1}</span>
                                {item.selectedSize && (
                                  <>
                                    <span>•</span>
                                    <span>Variant: {item.selectedSize}</span>
                                  </>
                                )}
                                {item.storeName && (
                                  <>
                                    <span>•</span>
                                    <span className="text-brand-accent font-medium">{item.storeName}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="font-semibold text-brand-black">
                                  ${typeof item.price === 'number' ? item.price.toLocaleString() : item.price}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {order.items && order.items.length > 3 && (
                          <p className="text-xs text-brand-muted pl-1">
                            + {order.items.length - 3} additional luxury items
                          </p>
                        )}
                      </div>

                      {/* Payment & Delivery Summary (Cols 8-12) */}
                      <div className="md:col-span-5 bg-brand-offwhite/60 p-4 rounded-xl border border-brand-border/50 text-xs space-y-2">
                        {order.paymentMethod && (
                          <div className="flex items-start gap-2">
                            <CreditCard size={14} className="text-brand-accent shrink-0 mt-0.5" />
                            <div>
                              <span className="text-brand-muted font-medium">Payment: </span>
                              <span className="font-semibold text-brand-black">
                                {order.paymentMethod}
                              </span>
                            </div>
                          </div>
                        )}

                        {order.deliveryAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-brand-accent shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-brand-muted font-medium">Delivering to: </span>
                              <span className="font-semibold text-brand-black">
                                {order.deliveryAddress.fullName || order.customerName}
                              </span>
                              <p className="text-brand-muted truncate mt-0.5">
                                {order.deliveryAddress.address}, {order.deliveryAddress.city}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Boy Assignment & Live Radar Tracker Card */}
                    {(order.deliveryBoy || order.deliveryBoySnapshot) && (
                      <div
                        className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          order.deliveryStatus === 'out_for_delivery' || order.deliveryStatus === 'accepted'
                            ? 'bg-blue-50/80 border-blue-200 text-blue-950 shadow-2xs'
                            : order.deliveryStatus === 'delivered'
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                            : 'bg-amber-50/80 border-amber-200 text-amber-950 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                              order.deliveryStatus === 'out_for_delivery' || order.deliveryStatus === 'accepted'
                                ? 'bg-blue-600 text-white border-blue-400 shadow-sm animate-pulse'
                                : order.deliveryStatus === 'delivered'
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                : 'bg-amber-500/20 text-amber-800 border-amber-300'
                            }`}
                          >
                            <Bike size={20} />
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-brand-black text-sm">
                                Courier: {order.deliveryBoy?.name || order.deliveryBoySnapshot?.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current text-brand-charcoal">
                                {order.deliveryBoy?.vehicleNumber || order.deliveryBoySnapshot?.vehicleNumber || 'Store Courier'}
                              </span>
                            </div>

                            <p className="text-[11px] text-brand-charcoal mt-1">
                              {order.deliveryStatus === 'out_for_delivery' || order.deliveryStatus === 'accepted' ? (
                                <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                  <span>Out for delivery • Live GPS tracking radar active</span>
                                </span>
                              ) : order.deliveryStatus === 'delivered' ? (
                                <span className="text-emerald-700 font-semibold">
                                  ✓ Delivered successfully to your destination
                                </span>
                              ) : (
                                <span className="text-amber-800 font-medium">
                                  Assigned to rider • Waiting for courier to accept & start transit
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Tracking button & Call driver */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {(order.deliveryBoy?.phone || order.deliveryBoySnapshot?.phone) && (
                            <a
                              href={`tel:${order.deliveryBoy?.phone || order.deliveryBoySnapshot?.phone}`}
                              className="px-3 py-1.5 rounded-lg bg-white border border-brand-border hover:bg-brand-cream/50 text-brand-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <Phone size={12} className="text-neutral-500" />
                              <span>Call Rider</span>
                            </a>
                          )}

                          {/* Track buttons: Quick Radar Modal and Full Page Dedicated Suite */}
                          {order.deliveryStatus === 'out_for_delivery' || order.deliveryStatus === 'accepted' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenTrackingModal(order)}
                                className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Compass size={13} className="animate-spin text-cyan-400" />
                                <span>Quick Radar</span>
                              </button>
                              <Link
                                to={`/orders/${order.id}/track`}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 flex items-center gap-1.5 transition-all"
                              >
                                <Sparkles size={12} className="text-cyan-200" />
                                <span>Track Full Page ↗</span>
                              </Link>
                            </div>
                          ) : order.deliveryStatus === 'assigned' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenTrackingModal(order)}
                                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Clock size={12} />
                                <span>Radar Standby</span>
                              </button>
                              <Link
                                to={`/orders/${order.id}/track`}
                                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
                              >
                                <span>Full Page ↗</span>
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Bottom Actions Row */}
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-brand-muted">
                        Total {itemsCount} {itemsCount === 1 ? 'item' : 'items'} in shipment
                      </p>

                      <div className="flex items-center gap-2.5">
                        {/* View Order Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(order)}
                          icon={Eye}
                        >
                          View Order Details
                        </Button>

                        {/* Cancel Order Button (Only for eligible orders: Pending or Confirmed) */}
                        {eligibleToCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOrderToCancel(order)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                            icon={XCircle}
                          >
                            Cancel Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-left">
              {/* Modal Header */}
              <div className="sticky top-0 bg-brand-surface/95 backdrop-blur-md p-5 sm:p-6 border-b border-brand-border/60 flex items-center justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent">
                      Acquisition Details
                    </span>
                    <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                    <span className="font-mono text-xs font-bold text-brand-black">
                      #{selectedOrder.id}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-black flex items-center gap-2">
                    <span>Order Overview</span>
                    {isFetchingDetails && (
                      <Loader2 size={16} className="text-brand-accent animate-spin" />
                    )}
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
                {/* Status & Date */}
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                      Order Status
                    </p>
                    <div className="mt-1">
                      <OrderStatusBadge status={selectedOrder.status} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                      Date & Timestamp
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-brand-black mt-1">
                      {new Date(selectedOrder.date).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Cancellation notice if cancelled */}
                {selectedOrder.status === 'Cancelled' && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                    <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block mb-0.5">Order Cancelled</strong>
                      <span>
                        This acquisition has been cancelled. Any pre-authorized payment hold was released.
                        {selectedOrder.cancellationReason && (
                          <span className="block mt-1 text-rose-700">
                            Reason: {selectedOrder.cancellationReason}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Visual Order Progress Timeline */}
                {selectedOrder.status !== 'Cancelled' && (
                  <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/70">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-muted mb-3">
                      Courier Dispatch & Milestone Tracker
                    </p>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {[
                        { key: 'Confirmed', label: 'Confirmed', desc: 'Atelier verified' },
                        { key: 'Processing', label: 'Processing', desc: 'Preparing item' },
                        { key: 'Packed', label: 'Packed', desc: 'Ready for courier' },
                        { key: 'Shipped', label: 'In Transit', desc: 'Out for delivery' },
                        { key: 'Delivered', label: 'Delivered', desc: 'Order completed' },
                      ].map((step, idx) => {
                        const stepOrder = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered'];
                        const curIdx = stepOrder.indexOf(selectedOrder.status);
                        const stepTargetIdx = step.key === 'Shipped' ? 5 : step.key === 'Packed' ? 3 : step.key === 'Processing' ? 2 : step.key === 'Confirmed' ? 1 : 6;
                        const isDone = curIdx >= stepTargetIdx || (selectedOrder.status === 'Ready for Pickup' && step.key === 'Packed');
                        const isCurrent = (step.key === 'Confirmed' && selectedOrder.status === 'Confirmed') ||
                          (step.key === 'Processing' && selectedOrder.status === 'Processing') ||
                          (step.key === 'Packed' && (selectedOrder.status === 'Packed' || selectedOrder.status === 'Ready for Pickup')) ||
                          (step.key === 'Shipped' && selectedOrder.status === 'Shipped') ||
                          (step.key === 'Delivered' && selectedOrder.status === 'Delivered');

                        return (
                          <div key={step.key} className="text-center">
                            <div
                              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-brand-black text-white ring-2 ring-brand-accent animate-pulse'
                                  : 'bg-brand-offwhite text-brand-muted border border-brand-border'
                              }`}
                            >
                              {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                            </div>
                            <p className="text-[10px] sm:text-[11px] font-bold text-brand-black mt-1.5 leading-tight">
                              {step.label}
                            </p>
                            <p className="text-[9px] text-brand-muted hidden sm:block mt-0.5">
                              {step.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Breakdown Table */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-charcoal mb-3">
                    Purchased Signature Items
                  </h4>
                  <div className="border border-brand-border/70 rounded-xl overflow-hidden divide-y divide-brand-border/60">
                    {(selectedOrder.items || []).map((item, i) => {
                      const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                      return (
                        <div key={i} className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover bg-brand-offwhite border border-brand-border/70 shrink-0"
                            />
                            <div>
                              <p className="font-serif text-xs sm:text-sm font-bold text-brand-black line-clamp-1">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-brand-muted mt-0.5">
                                <span>
                                  ${typeof item.price === 'number' ? item.price.toLocaleString() : item.price}{' '}
                                  × {item.quantity || 1}
                                </span>
                                {item.selectedSize && <span>• {item.selectedSize}</span>}
                                {item.sku && <span>• SKU: {item.sku}</span>}
                                {item.storeName && (
                                  <span className="text-brand-accent font-medium">• {item.storeName}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-serif text-xs sm:text-sm font-bold text-brand-black">
                              ${itemTotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery & Payment Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delivery Address */}
                  {selectedOrder.deliveryAddress && (
                    <div className="p-4 rounded-xl border border-brand-border/70 bg-brand-offwhite/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-2">
                        <MapPin size={13} className="text-brand-accent" />
                        <span>Delivery Address</span>
                      </div>
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
                    </div>
                  )}

                  {/* Payment Details */}
                  <div className="p-4 rounded-xl border border-brand-border/70 bg-brand-offwhite/40 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-2">
                      <CreditCard size={13} className="text-brand-accent" />
                      <span>Payment Protocol</span>
                    </div>
                    <p className="font-bold text-brand-black">
                      {selectedOrder.paymentMethod || 'Online Payment'}
                    </p>
                    {selectedOrder.paymentStatus === 'unpaid' ? (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <strong className="block font-semibold">Status: Unpaid (Verification Pending)</strong>
                        <span>Real payment transaction pending gateway integration. Order registered in catalog demo mode.</span>
                      </div>
                    ) : (
                      <p className="text-emerald-700 font-medium">
                        Payment Status: {selectedOrder.paymentStatus}
                      </p>
                    )}
                    <p className="text-brand-muted">
                      Courier: Express White-Glove Luxury Delivery
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-xl bg-brand-cream/40 border border-brand-border/70 text-xs space-y-2">
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Items Subtotal</span>
                    <span className="font-semibold">
                      ${(selectedOrder.subtotal || selectedOrder.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-brand-charcoal">
                    <span>Express Shipping</span>
                    <span className="font-semibold text-emerald-800">
                      {selectedOrder.shipping === 0 ? 'Complimentary' : `$${selectedOrder.shipping || 0}`}
                    </span>
                  </div>
                  {selectedOrder.tax !== undefined && (
                    <div className="flex justify-between text-brand-charcoal">
                      <span>Estimated Luxury Tax (8%)</span>
                      <span className="font-semibold">${selectedOrder.tax.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-brand-border/60 flex justify-between text-sm font-bold text-brand-black">
                    <span>Grand Total</span>
                    <span className="font-serif text-base">
                      ${(selectedOrder.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 sm:p-6 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-3 bg-brand-surface">
                {isOrderEligibleForCancel(selectedOrder.status) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrderToCancel(selectedOrder)}
                    className="text-rose-600 hover:text-white hover:bg-rose-600 border-rose-300"
                    icon={XCircle}
                  >
                    Cancel Order
                  </Button>
                ) : (
                  <div></div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL ORDER CONFIRMATION MODAL */}
        {orderToCancel && (
          <div
            role="alertdialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          >
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-left animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>

              <h3 className="font-serif text-xl font-bold text-brand-black mb-1">
                Cancel Order #{orderToCancel.id}?
              </h3>

              <p className="text-xs text-brand-muted leading-relaxed mb-4">
                Are you sure you want to cancel this acquisition? Once confirmed, the order will be
                immediately terminated and items released from reservation.
              </p>

              {/* Cancellation Reason Dropdown */}
              <div className="mb-5">
                <label
                  htmlFor="cancel-reason"
                  className="block text-xs uppercase tracking-wider font-semibold text-brand-charcoal mb-1.5"
                >
                  Reason for Cancellation
                </label>
                <select
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-brand-offwhite border border-brand-border text-xs sm:text-sm font-medium text-brand-black px-3 py-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-black cursor-pointer"
                >
                  <option value="Change of mind">Change of mind</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Delivery duration too long">Delivery duration too long</option>
                  <option value="Incorrect shipping address">Incorrect shipping address</option>
                  <option value="Found alternative item">Found alternative luxury piece</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderToCancel(null)}
                  disabled={isCancelling}
                >
                  Keep Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmCancel}
                  isLoading={isCancelling}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* LIVE DELIVERY RADAR TRACKING MODAL */}
        {/* ========================================================================= */}
        {trackingModalOrder && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-brand-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          >
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl text-left animate-in zoom-in-95 duration-200 text-neutral-100">
              {/* Modal Top Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                    <Compass size={22} className="animate-spin text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-bold text-white">
                        Live Delivery Radar
                      </h3>
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        #ORD-{trackingModalOrder.id?.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Real-time courier GPS tracking and dispatch route
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/orders/${trackingModalOrder.id}/track`}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1"
                    title="Open Fullscreen Dedicated Tracking Page"
                  >
                    <Maximize2 size={12} />
                    <span>Full Page ↗</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setAutoTrackingPulse((prev) => !prev)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      autoTrackingPulse
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                    title="Auto-refresh radar telemetry every 6 seconds"
                  >
                    <Radio size={11} className="inline mr-1 text-emerald-400 animate-pulse" />
                    <span>{autoTrackingPulse ? 'Live Pulse' : 'Paused'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrackingModalOrder(null)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {isFetchingTracking && !trackingData ? (
                  <div className="py-16 text-center">
                    <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto mb-2" />
                    <p className="text-xs text-neutral-400">Connecting to courier RTK GPS telemetry...</p>
                  </div>
                ) : trackingData ? (
                  <>
                    {/* Status Notice Banner */}
                    <div
                      className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                        trackingData.isTrackingActive
                          ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            trackingData.isTrackingActive
                              ? 'bg-blue-500 animate-ping'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold">{trackingData.trackingNotice}</span>
                      </div>

                      {trackingData.deliveryBoy?.phone && (
                        <a
                          href={`tel:${trackingData.deliveryBoy.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <Phone size={11} />
                          <span>Call Rider</span>
                        </a>
                      )}
                    </div>

                    {/* Driver Telemetry HUD */}
                    {trackingData.deliveryBoy && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                            Courier Partner
                          </span>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">
                            {trackingData.deliveryBoy.name}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {trackingData.deliveryBoy.vehicleNumber || trackingData.deliveryBoy.vehicleType}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                            Speedometer
                          </span>
                          <p className="font-mono text-xs font-bold text-blue-400 mt-0.5 flex items-center gap-1">
                            <Gauge size={13} />
                            <span>{trackingData.deliveryBoy.currentLocation?.speed || 0} km/h</span>
                          </p>
                          <p className="text-[10px] text-neutral-400">Moving</p>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                            Device Battery
                          </span>
                          <p className="font-mono text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                            <Battery size={13} />
                            <span>{trackingData.deliveryBoy.currentLocation?.batteryLevel || 85}%</span>
                          </p>
                          <p className="text-[10px] text-neutral-400">RTK Connected</p>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">
                            Estimated ETA
                          </span>
                          <p className="font-mono text-xs font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                            <Clock size={13} />
                            <span>
                              {trackingData.isTrackingActive ? '~10-15 mins' : 'Standby'}
                            </span>
                          </p>
                          <p className="text-[10px] text-neutral-400">2.1 km away</p>
                        </div>
                      </div>
                    )}

                    {/* ================================================================= */}
                    {/* VISUAL LIVE RADAR MAP COMPONENT */}
                    {/* ================================================================= */}
                    <div className="rounded-3xl border-2 border-black shadow-2xl overflow-hidden p-0.5 bg-black ring-1 ring-black/80">
                      <LiveDeliveryMap
                        storeHub={trackingData.storeHub}
                        customerDestination={trackingData.customerDestination}
                        deliveryBoy={trackingData.deliveryBoy}
                        isTrackingActive={trackingData.isTrackingActive}
                        trackingNotice={trackingData.trackingNotice}
                        height="h-96 sm:h-[460px]"
                        showControls={true}
                        orderNumber={trackingModalOrder.id || trackingModalOrder._id}
                      />
                    </div>

                    {/* Current Landmark Address & Direct Navigation */}
                    <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold flex items-center gap-1">
                          <MapPin size={11} className="text-amber-400" />
                          <span>Courier Last Verified Location</span>
                        </span>
                        <p className="text-neutral-200 font-medium mt-0.5">
                          {trackingData.deliveryBoy?.currentLocation?.address || 'Near 56 Dukan Gourmet Square'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {trackingData.deliveryBoy?.phone && (
                          <a
                            href={`tel:${trackingData.deliveryBoy.phone}`}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30"
                          >
                            <Phone size={12} />
                            <span>Call Courier</span>
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${trackingData.deliveryBoy?.currentLocation?.latitude || 22.7196},${trackingData.deliveryBoy?.currentLocation?.longitude || 75.8577}&destination=${encodeURIComponent(
                            trackingData.customerDestination?.address || 'Indore'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
                        >
                          <ExternalLink size={12} />
                          <span>Google Maps</span>
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-neutral-400 py-8 text-center">
                    Unable to load tracking telemetry.
                  </p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-neutral-800 flex items-center justify-end bg-neutral-900/80">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTrackingModalOrder(null)}
                  className="bg-white text-neutral-950 font-bold hover:bg-neutral-200"
                >
                  Close Radar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

