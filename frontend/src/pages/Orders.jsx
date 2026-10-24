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
  LogIn
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
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
    customerName: ord.deliveryAddress?.fullName || ord.customerName || '',
    cancellationReason: ord.cancellationReason || '',
    cancelledAt: ord.cancelledAt || null,
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

  // Check if an order is eligible for cancellation (Only Pending or Confirmed)
  const isOrderEligibleForCancel = (status) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed';
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
    if (filterTab === 'active') return s === 'pending' || s === 'confirmed' || s === 'shipped';
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
                label: `Active (${orders.filter((o) => ['pending', 'confirmed', 'shipped'].includes((o.status || '').toLowerCase())).length})`,
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
                              <div className="flex items-center gap-2 text-xs text-brand-muted mt-0.5">
                                <span>Qty: {item.quantity || 1}</span>
                                {item.selectedSize && (
                                  <>
                                    <span>•</span>
                                    <span>Variant: {item.selectedSize}</span>
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
                              <p className="text-[11px] text-brand-muted">
                                ${typeof item.price === 'number' ? item.price.toLocaleString() : item.price}{' '}
                                × {item.quantity || 1}
                                {item.selectedSize && ` (${item.selectedSize})`}
                              </p>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
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
      </Container>
    </div>
  );
}
