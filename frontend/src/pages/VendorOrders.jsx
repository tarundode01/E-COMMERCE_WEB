import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  RefreshCw,
  Eye,
  X,
  Search,
  Filter,
  Package,
  Truck,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Layers,
  Calendar,
  AlertTriangle,
  RotateCcw,
  FileText,
  PackageCheck,
  Printer,
  Copy,
  ExternalLink,
  Sparkles,
  Bike,
  Navigation,
  Radio,
} from 'lucide-react';
import Container from '../components/Container';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import LiveDeliveryMap from '../components/LiveDeliveryMap';
import { orderService, vendorService, vendorDeliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Status Badge for Vendor Orders
 */
export function VendorOrderStatusBadge({ status }) {
  const normalized = (status || 'Pending').toLowerCase();

  switch (normalized) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <Clock size={12} className="text-amber-600 animate-pulse" />
          <span>Pending Acceptance</span>
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
          <span>Processing</span>
        </span>
      );
    case 'packed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
          <PackageCheck size={12} className="text-purple-600" />
          <span>Packed & Ready</span>
        </span>
      );
    case 'ready for pickup':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
          <Truck size={12} className="text-teal-600" />
          <span>Ready for Pickup</span>
        </span>
      );
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
          <Truck size={12} className="text-indigo-600" />
          <span>Shipped / In Transit</span>
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
          <span>Cancelled / Rejected</span>
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

export default function VendorOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Store & Orders State
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    packed: 0,
    readyForPickup: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Pagination & Filtering state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [limit, setLimit] = useState(10);

  // Order Details Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isFetchingOrderDetails, setIsFetchingOrderDetails] = useState(false);

  // Reject / Cancel Modal State
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Milestone Note / Dispatch Modal State
  const [milestoneOrder, setMilestoneOrder] = useState(null);
  const [milestoneTargetStatus, setMilestoneTargetStatus] = useState('');
  const [milestoneNote, setMilestoneNote] = useState('');
  const [isSubmittingMilestone, setIsSubmittingMilestone] = useState(false);

  // Packing Slip Modal State
  const [packingSlipOrder, setPackingSlipOrder] = useState(null);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(null);

  // Status transition in progress state
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Delivery Assignment States
  const [deliveryFleet, setDeliveryFleet] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [selectedDeliveryBoyId, setSelectedDeliveryBoyId] = useState('');
  const [assignDeliveryNotes, setAssignDeliveryNotes] = useState('');
  // Live Radar Tracking Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const handleOpenTrackingModal = async (order) => {
    setTrackingModalOrder(order);
    setLoadingTracking(true);
    try {
      const res = await orderService.getOrderTracking(order._id);
      if (res && res.success) {
        setTrackingData(res);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoadingTracking(false);
    }
  };

  // Fetch store delivery fleet
  const fetchDeliveryFleet = useCallback(async () => {
    try {
      const res = await vendorDeliveryService.getDeliveryBoys();
      if (res && res.success) {
        setDeliveryFleet(res.deliveryBoys || []);
      }
    } catch (err) {
      console.error('Error fetching delivery fleet in VendorOrders:', err);
    }
  }, []);

  useEffect(() => {
    fetchDeliveryFleet();
  }, [fetchDeliveryFleet]);

  // Open modal to assign delivery boy
  const handleOpenAssignModal = (order) => {
    setOrderToAssign(order);
    setAssignDeliveryNotes(order.deliveryNotes || '');
    if (order.deliveryBoy?._id || order.deliveryBoy) {
      setSelectedDeliveryBoyId(order.deliveryBoy?._id || order.deliveryBoy);
    } else {
      const availableBoy = deliveryFleet.find((b) => b.status === 'available');
      setSelectedDeliveryBoyId(availableBoy?._id || deliveryFleet[0]?._id || '');
    }
    setIsAssignModalOpen(true);
  };

  // Submit delivery boy assignment
  const handleAssignDeliveryBoy = async (e) => {
    e.preventDefault();
    if (!orderToAssign || !selectedDeliveryBoyId) return;

    setIsAssigningDelivery(true);
    setActionError('');
    try {
      const res = await vendorDeliveryService.assignOrder(
        orderToAssign._id,
        selectedDeliveryBoyId,
        assignDeliveryNotes
      );
      if (res && res.success) {
        setActionSuccess(res.message || 'Order dispatched to delivery agent successfully!');
        setIsAssignModalOpen(false);
        setOrderToAssign(null);
        await Promise.all([fetchOrders(), fetchDeliveryFleet()]);
      }
    } catch (err) {
      console.error('Failed to assign delivery boy:', err);
      setActionError(err.response?.data?.message || 'Failed to dispatch order to delivery agent.');
    } finally {
      setIsAssigningDelivery(false);
    }
  };

  // Complete delivery directly
  const handleCompleteOrderDelivery = async (orderId) => {
    try {
      setUpdatingOrderId(orderId);
      const res = await vendorDeliveryService.completeOrderDelivery(orderId);
      if (res && res.success) {
        setActionSuccess(res.message || 'Order marked as Delivered!');
        await Promise.all([fetchOrders(), fetchDeliveryFleet()]);
      }
    } catch (err) {
      console.error('Error completing delivery:', err);
      setActionError(err.response?.data?.message || 'Failed to mark order as delivered.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Unassign delivery boy
  const handleUnassignOrder = async (orderId) => {
    try {
      setUpdatingOrderId(orderId);
      const res = await vendorDeliveryService.unassignOrder(orderId);
      if (res && res.success) {
        setActionSuccess(res.message || 'Delivery assignment cancelled.');
        await Promise.all([fetchOrders(), fetchDeliveryFleet()]);
      }
    } catch (err) {
      console.error('Error unassigning delivery:', err);
      setActionError(err.response?.data?.message || 'Failed to cancel delivery assignment.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Vendor Store details and orders
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const params = {
        page: currentPage,
        limit,
      };

      if (selectedStatus && selectedStatus !== 'All') {
        params.status = selectedStatus;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }

      const res = await orderService.getVendorOrders(params);

      if (res && res.success) {
        setOrders(res.orders || []);
        setTotalOrders(res.totalOrders || 0);
        setTotalPages(res.totalPages || 1);
        if (res.store) {
          setStore(res.store);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching vendor orders:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401) {
        setFetchError('Your session has expired. Please sign in again.');
      } else if (statusCode === 403) {
        setFetchError(
          err.response?.data?.message ||
            'Access restricted. Only approved vendor stores can access order fulfillment.'
        );
      } else if (statusCode === 404) {
        setFetchError('No registered store profile found for this account.');
      } else {
        setFetchError(
          err.response?.data?.message ||
            err.customMessage ||
            'Failed to load store orders. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, selectedStatus, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/orders' } } });
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate, fetchOrders]);

  // Open Details Modal and fetch latest scoped order
  const handleOpenDetails = async (order) => {
    setSelectedOrder(order);
    const targetId = order._id || order.id;
    if (!targetId) return;

    setIsFetchingOrderDetails(true);
    try {
      const res = await orderService.getVendorOrderById(targetId);
      if (res && res.success && res.order) {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      console.error('Failed to fetch detailed vendor order:', err);
    } finally {
      setIsFetchingOrderDetails(false);
    }
  };

  // Perform fulfillment status update (Confirmed, Processing, Packed, Ready for Pickup)
  const handleUpdateStatus = async (orderId, targetStatus, customNote = '') => {
    setUpdatingOrderId(orderId);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await orderService.updateVendorOrderStatus(
        orderId,
        targetStatus,
        '',
        customNote
      );

      setActionSuccess(
        res.message || `Order #${orderId} status successfully transitioned to ${targetStatus}.`
      );
      setTimeout(() => setActionSuccess(''), 4500);

      // Refresh order list immediately
      await fetchOrders();

      // If active in details modal, update modal state
      if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
        if (res.order) {
          setSelectedOrder(res.order);
        } else {
          setSelectedOrder((prev) => ({
            ...prev,
            orderStatus: targetStatus,
          }));
        }
      }
    } catch (err) {
      console.error(`Error transitioning status to ${targetStatus}:`, err);
      setActionError(
        err.response?.data?.message ||
          err.customMessage ||
          `Failed to transition status to ${targetStatus}.`
      );
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Open Milestone Note modal (for Packed or Ready for Pickup)
  const handleOpenMilestoneModal = (order, targetStatus) => {
    setMilestoneOrder(order);
    setMilestoneTargetStatus(targetStatus);
    setMilestoneNote('');
  };

  const handleConfirmMilestone = async (e) => {
    if (e) e.preventDefault();
    if (!milestoneOrder || !milestoneTargetStatus) return;

    setIsSubmittingMilestone(true);
    try {
      await handleUpdateStatus(
        milestoneOrder._id || milestoneOrder.id,
        milestoneTargetStatus,
        milestoneNote.trim()
      );
      setMilestoneOrder(null);
      setMilestoneTargetStatus('');
      setMilestoneNote('');
    } finally {
      setIsSubmittingMilestone(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (order) => {
    setRejectingOrder(order);
    setRejectionReason('Atelier stock shortage / material delay');
    setRejectionError('');
  };

  // Submit Rejection / Cancellation
  const handleConfirmRejection = async (e) => {
    if (e) e.preventDefault();
    if (!rejectingOrder) return;

    const reason = rejectionReason.trim() || 'Atelier stock shortage / material delay';
    const targetId = rejectingOrder._id || rejectingOrder.id;
    setIsSubmittingRejection(true);
    setRejectionError('');

    try {
      const res = await orderService.updateVendorOrderStatus(
        targetId,
        'Cancelled',
        reason,
        `Rejected by merchant: ${reason}`
      );

      setActionSuccess(
        res.message || `Order #${targetId} has been rejected and product inventory restored.`
      );
      setTimeout(() => setActionSuccess(''), 4500);

      // Close modal and refresh data
      setRejectingOrder(null);
      await fetchOrders();

      // Update details modal if showing this order
      if (selectedOrder && (selectedOrder._id === targetId || selectedOrder.id === targetId)) {
        if (res.order) {
          setSelectedOrder(res.order);
        } else {
          setSelectedOrder((prev) => ({
            ...prev,
            orderStatus: 'Cancelled',
            cancellationReason: reason,
          }));
        }
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
      setRejectionError(
        err.response?.data?.message ||
          err.customMessage ||
          'Failed to reject order. Please try again.'
      );
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatus('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Quick Date Range Helpers
  const handleSetDatePreset = (preset) => {
    const today = new Date();
    const formatYMD = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = formatYMD(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
    } else if (preset === 'month') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(today));
    } else if (preset === 'clear') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  // Copy helpers
  const handleCopy = (text, type, id) => {
    navigator.clipboard?.writeText(text);
    if (type === 'id') {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else if (type === 'phone') {
      setCopiedPhone(id);
      setTimeout(() => setCopiedPhone(null), 2000);
    }
  };

  // Complete status filter tabs with Shipped & Delivered
  const statusFilterTabs = [
    { id: 'All', label: `All (${summary.total || 0})` },
    { id: 'Pending', label: `Pending (${summary.pending || 0})` },
    { id: 'Confirmed', label: `Confirmed (${summary.confirmed || 0})` },
    { id: 'Processing', label: `Processing (${summary.processing || 0})` },
    { id: 'Packed', label: `Packed (${summary.packed || 0})` },
    { id: 'Ready for Pickup', label: `Ready (${summary.readyForPickup || 0})` },
    { id: 'Shipped', label: `Shipped (${summary.shipped || 0})` },
    { id: 'Delivered', label: `Delivered (${summary.delivered || 0})` },
    { id: 'Cancelled', label: `Cancelled (${summary.cancelled || 0})` },
  ];

  const pageActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={fetchOrders}
        className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-xl transition-colors cursor-pointer border border-brand-border/70 shadow-xs"
        title="Refresh Orders"
      >
        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
      </button>

      <Link to="/vendor/products">
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={Layers}
          className="text-xs font-semibold"
        >
          Catalog
        </Button>
      </Link>
    </div>
  );

  return (
    <VendorLayout
      activePage="orders"
      title="Atelier Order Fulfillment"
      subtitle={`${store ? store.name : 'Authorized Vendor Portal'} • Fulfill customer purchases and manage dispatch milestones`}
      actions={pageActions}
      store={store}
    >
      {/* Global Feedback Notifications */}
      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess('')}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-rose-700 hover:text-rose-950 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Urgent Pending Acceptance Banner */}
      {summary.pending > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={16} className="animate-pulse text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Action Required: {summary.pending} New Acquisition(s) Pending Acceptance
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                Please accept and confirm pending orders to reserve items and initiate fulfillment.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setSelectedStatus('Pending')}
            className="text-xs bg-amber-700 hover:bg-amber-800 text-white shrink-0 shadow-xs"
          >
            Review Pending Orders
          </Button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* KPI SUMMARY CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              Total Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <ShoppingBag size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-black">
            {summary.total}
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5">Lifetime acquisitions</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Acceptance
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={14} className="animate-pulse" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-700">
            {summary.pending}
          </p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Requires confirmation</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              In Fulfillment
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <PackageCheck size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-sky-700">
            {summary.confirmed + summary.processing + summary.packed}
          </p>
          <p className="text-[11px] text-sky-600/80 mt-0.5">Confirmed & packed</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
              Ready for Pickup
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Truck size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-teal-700">
            {summary.readyForPickup}
          </p>
          <p className="text-[11px] text-teal-600/80 mt-0.5">Awaiting courier</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Store Volume
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700">
            ${Number(summary.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Net active sales</p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FILTER & SEARCH TOOLBAR */}
      {/* ===================================================================== */}
      <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs mb-8 space-y-5 text-left">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-brand-border/50">
          {statusFilterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-brand-black text-white shadow-xs'
                  : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream/80 border border-brand-border/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Input (Cols 1-5) */}
          <div className="md:col-span-5 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Customer name, Phone, or Item..."
              className="w-full pl-10 pr-9 py-2.5 bg-brand-surface border border-brand-border/80 rounded-xl text-xs text-brand-black focus:border-brand-black focus:outline-none transition-all placeholder:text-brand-muted"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-black"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Range Start (Cols 6-7) */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-brand-surface border border-brand-border/80 rounded-xl text-xs text-brand-black focus:border-brand-black focus:outline-none"
              title="Filter by Order Start Date"
            />
          </div>

          {/* Date Range End (Cols 8-9) */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-brand-surface border border-brand-border/80 rounded-xl text-xs text-brand-black focus:border-brand-black focus:outline-none"
              title="Filter by Order End Date"
            />
          </div>

          {/* Date Range Presets & Reset Filters (Cols 10-12) */}
          <div className="md:col-span-3 flex items-center justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-brand-offwhite border border-brand-border/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSetDatePreset('today')}
                className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-brand-surface text-brand-charcoal transition-colors cursor-pointer"
                title="Orders from Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('week')}
                className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-brand-surface text-brand-charcoal transition-colors cursor-pointer"
                title="Orders from Last 7 Days"
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('month')}
                className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-brand-surface text-brand-charcoal transition-colors cursor-pointer"
                title="Orders from Last 30 Days"
              >
                30D
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-brand-muted hover:text-brand-black hover:bg-brand-cream/60 transition-colors border border-brand-border/70 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="Reset all search and filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ORDERS CONTENT LIST / TABLE */}
      {/* ===================================================================== */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center max-w-lg mx-auto shadow-xs my-8">
          <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-serif text-lg font-bold text-brand-black mb-1">
            Synchronizing Store Orders...
          </h3>
          <p className="text-xs text-brand-muted">
            Loading verified purchases for {store?.name || 'your atelier'}.
          </p>
        </div>
      ) : fetchError ? (
        <div className="bg-brand-surface border border-rose-200 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-xs my-8">
          <AlertCircle size={32} className="text-rose-600 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-brand-black mb-2">
            Order Ledger Error
          </h3>
          <p className="text-xs text-brand-muted mb-6">{fetchError}</p>
          <Button variant="primary" size="sm" onClick={fetchOrders} className="text-xs mx-auto">
            Retry Order Sync
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center max-w-md mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-full bg-brand-cream text-brand-charcoal flex items-center justify-center mx-auto mb-4">
            <Package size={28} />
          </div>
          <h3 className="font-serif text-xl font-bold text-brand-black mb-2">
            No Orders Found
          </h3>
          <p className="text-xs text-brand-muted mb-6 leading-relaxed">
            {search || selectedStatus !== 'All' || startDate || endDate
              ? 'No acquisitions match your filter criteria. Try adjusting your search or date parameters.'
              : 'Your atelier has not received any customer orders yet. When customers acquire products from your collections, they will appear here.'}
          </p>
          {(search || selectedStatus !== 'All' || startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs mx-auto"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A';

            const orderStatus = order.orderStatus || 'Pending';
            const isUpdating = updatingOrderId === order._id;

            return (
              <div
                key={order._id}
                className="bg-brand-surface border border-brand-border/75 rounded-2xl overflow-hidden shadow-xs hover:border-brand-accent/50 transition-all text-left"
              >
                {/* Card Header Bar */}
                <div className="p-4 sm:p-5 border-b border-brand-border/60 bg-brand-offwhite/50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Order Number
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-brand-black text-sm">
                          #{order._id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order._id, 'id', order._id)}
                          className="p-1 text-brand-muted hover:text-brand-black transition-colors rounded-md hover:bg-brand-cream/80 cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedId === order._id ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Order Date
                      </span>
                      <span className="text-brand-charcoal font-medium">{formattedDate}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Atelier Subtotal
                      </span>
                      <span className="font-serif font-bold text-brand-black text-sm">
                        ${Number(order.vendorSubtotal || 0).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Payment
                      </span>
                      <span
                        className={`font-semibold capitalize text-xs ${
                          order.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {order.paymentStatus || 'pending'} ({order.paymentMethod || 'Online'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <VendorOrderStatusBadge status={orderStatus} />
                  </div>
                </div>

                {/* Card Body: Items Preview & Customer Fulfillment Address */}
                <div className="p-4 sm:p-6 divide-y divide-brand-border/40 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Products Belonging to This Store (Cols 1-7) */}
                    <div className="md:col-span-7 space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Your Store Items ({order.vendorItemsCount || order.items?.length || 0} units)
                      </span>

                      <div className="space-y-2.5">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover bg-brand-offwhite border border-brand-border/60 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-brand-offwhite border border-brand-border/60 flex items-center justify-center text-brand-muted shrink-0">
                                <Package size={16} />
                              </div>
                            )}

                            <div className="flex-1 min-w-0 text-xs">
                              <p className="font-serif font-bold text-brand-black truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 text-brand-muted text-[11px] mt-0.5">
                                <span>Qty: {item.quantity}</span>
                                {item.selectedSize && (
                                  <>
                                    <span>•</span>
                                    <span>Size: {item.selectedSize}</span>
                                  </>
                                )}
                                {item.sku && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">SKU: {item.sku}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="font-semibold text-brand-black">
                                  ${Number(item.price || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permitted Customer Fulfillment Info (Cols 8-12) */}
                    <div className="md:col-span-5 bg-brand-offwhite/60 p-4 rounded-xl border border-brand-border/50 text-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-brand-border/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                          Customer Fulfillment Delivery Coordinates
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <User size={13} className="text-brand-accent shrink-0 mt-0.5" />
                        <span className="font-bold text-brand-black">
                          {order.deliveryAddress?.fullName || order.customer?.name || 'Customer'}
                        </span>
                      </div>

                      {order.deliveryAddress?.mobileNumber && (
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-brand-accent shrink-0" />
                          <span className="font-medium text-brand-charcoal">
                            {order.deliveryAddress.mobileNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(order.deliveryAddress.mobileNumber, 'phone', order._id)
                            }
                            className="p-0.5 text-brand-muted hover:text-brand-black cursor-pointer"
                            title="Copy Phone Number"
                          >
                            {copiedPhone === order._id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      )}

                      {order.deliveryAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-brand-accent shrink-0 mt-0.5" />
                          <div className="text-brand-charcoal leading-relaxed">
                            <p>{order.deliveryAddress.address}</p>
                            <p className="font-semibold text-brand-black">
                              {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
                              {order.deliveryAddress.pinCode}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Real-World Delivery Agent Assignment Banner */}
                  <div className="p-3 sm:p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-offwhite/50 border-brand-border/70">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        order.deliveryBoySnapshot?.name || order.deliveryBoy?.name
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        <Bike size={18} />
                      </div>
                      <div>
                        {order.deliveryBoySnapshot?.name || order.deliveryBoy?.name ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-brand-black">
                                Assigned Agent: {order.deliveryBoySnapshot?.name || order.deliveryBoy?.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                order.deliveryStatus === 'delivered' || orderStatus === 'Delivered'
                                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                              }`}>
                                {order.deliveryStatus === 'delivered' || orderStatus === 'Delivered' ? 'Delivered' : 'On Active Delivery'}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5 font-mono">
                              <span>📞 {order.deliveryBoySnapshot?.phone || order.deliveryBoy?.phone}</span>
                              {(order.deliveryBoySnapshot?.vehicleType || order.deliveryBoy?.vehicleType) && (
                                <span>• 🛵 {order.deliveryBoySnapshot?.vehicleType || order.deliveryBoy?.vehicleType} ({order.deliveryBoySnapshot?.vehicleNumber || order.deliveryBoy?.vehicleNumber || 'No plate'})</span>
                              )}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-neutral-700">
                              No Delivery Agent Assigned
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              Dispatch an active delivery boy from your store fleet for customer drop-off.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.deliveryBoySnapshot?.name || order.deliveryBoy?.name ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenTrackingModal(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
                            title="Preview courier live GPS tracking on map"
                          >
                            <Navigation size={13} className="text-amber-400" />
                            <span>Quick Radar</span>
                          </button>

                          <Link
                            to="/vendor/delivery-boys"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-brand-border bg-white text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs"
                            title="Open full-screen store fleet radar"
                          >
                            <ExternalLink size={12} className="text-neutral-500" />
                            <span className="hidden sm:inline">Fleet Hub</span>
                          </Link>

                          {orderStatus !== 'Delivered' && orderStatus !== 'Cancelled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(order)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-brand-border bg-white text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                              >
                                Reassign
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCompleteOrderDelivery(order._id)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              >
                                Mark Delivered
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        orderStatus !== 'Cancelled' && orderStatus !== 'Delivered' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Bike}
                            onClick={() => handleOpenAssignModal(order)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400 shadow-2xs"
                          >
                            Assign Delivery Boy
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-brand-muted">
                      {orderStatus === 'Ready for Pickup' ? (
                        <span className="text-teal-700 font-semibold flex items-center gap-1.5">
                          <Truck size={13} />
                          <span>Package is ready. Awaiting courier collection and dispatch milestone.</span>
                        </span>
                      ) : orderStatus === 'Shipped' ? (
                        <span className="text-indigo-700 font-semibold flex items-center gap-1.5">
                          <Truck size={13} />
                          <span>Dispatched to courier • In transit to customer coordinates.</span>
                        </span>
                      ) : orderStatus === 'Delivered' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>Successfully delivered to customer • Order completed.</span>
                        </span>
                      ) : orderStatus === 'Cancelled' ? (
                        <span className="text-rose-700 font-medium">
                          Cancelled: {order.cancellationReason || 'Order rejected'}
                        </span>
                      ) : (
                        <span>Select next fulfillment step for your atelier items</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Print Packing Slip Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Printer}
                        onClick={() => setPackingSlipOrder(order)}
                        className="text-xs"
                        title="Print Packing Slip / Manifest"
                      >
                        Packing Slip
                      </Button>

                      {/* View Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Eye}
                        onClick={() => handleOpenDetails(order)}
                        className="text-xs"
                      >
                        View Details
                      </Button>

                      {/* State Machine Transition Actions */}
                      {orderStatus === 'Pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleOpenRejectModal(order)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Reject Order
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            isLoading={isUpdating}
                            onClick={() => handleUpdateStatus(order._id, 'Confirmed')}
                            className="text-xs bg-emerald-700 hover:bg-emerald-800"
                          >
                            Accept Order
                          </Button>
                        </>
                      )}

                      {orderStatus === 'Confirmed' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleOpenRejectModal(order)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Clock}
                            isLoading={isUpdating}
                            onClick={() => handleUpdateStatus(order._id, 'Processing')}
                            className="text-xs bg-blue-700 hover:bg-blue-800"
                          >
                            Start Processing
                          </Button>
                        </>
                      )}

                      {orderStatus === 'Processing' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleOpenRejectModal(order)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={PackageCheck}
                            isLoading={isUpdating}
                            onClick={() => handleOpenMilestoneModal(order, 'Packed')}
                            className="text-xs bg-purple-700 hover:bg-purple-800"
                          >
                            Mark as Packed
                          </Button>
                        </>
                      )}

                      {orderStatus === 'Packed' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleOpenRejectModal(order)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Truck}
                            isLoading={isUpdating}
                            onClick={() => handleOpenMilestoneModal(order, 'Ready for Pickup')}
                            className="text-xs bg-teal-700 hover:bg-teal-800"
                          >
                            Ready for Pickup
                          </Button>
                        </>
                      )}

                      {orderStatus === 'Ready for Pickup' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={XCircle}
                          onClick={() => handleOpenRejectModal(order)}
                          className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-border/60">
              <span className="text-xs text-brand-muted">
                Showing page <strong className="text-brand-black">{currentPage}</strong> of{' '}
                <strong className="text-brand-black">{totalPages}</strong> ({totalOrders} total store orders)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  icon={ChevronLeft}
                  iconPosition="left"
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  icon={ChevronRight}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ORDER DETAILS MODAL / DRAWER */}
      {/* ===================================================================== */}
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
                    Store Fulfillment Dossier
                  </span>
                  <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                  <span className="font-mono text-xs font-bold text-brand-black">
                    #{selectedOrder._id}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-black flex items-center gap-2">
                  <span>Order Fulfillment Details</span>
                  {isFetchingOrderDetails && (
                    <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
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

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Status & Timestamp */}
              <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-brand-muted font-medium block">
                    Current Fulfillment Status
                  </span>
                  <div className="mt-1">
                    <VendorOrderStatusBadge status={selectedOrder.orderStatus} />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider text-brand-muted font-medium block">
                    Order Date
                  </span>
                  <span className="text-xs font-bold text-brand-black">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Customer Fulfillment Address */}
              <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/80 shadow-2xs space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-brand-muted font-bold block pb-1 border-b border-brand-border/40">
                  Permitted Customer Delivery Address (For Dispatch)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-brand-muted block text-[10px] font-semibold">Recipient Name</span>
                    <span className="font-bold text-brand-black">
                      {selectedOrder.deliveryAddress?.fullName || selectedOrder.customer?.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-brand-muted block text-[10px] font-semibold">Contact Phone</span>
                    <span className="font-bold text-brand-black">
                      {selectedOrder.deliveryAddress?.mobileNumber || 'N/A'}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-brand-muted block text-[10px] font-semibold">Shipping Address</span>
                    <span className="text-brand-charcoal font-medium">
                      {selectedOrder.deliveryAddress?.address}, {selectedOrder.deliveryAddress?.city},{' '}
                      {selectedOrder.deliveryAddress?.state} - {selectedOrder.deliveryAddress?.pinCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchased Products (Store Scoped) */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-black block">
                  Your Store Products to Pack ({selectedOrder.items?.length || 0})
                </span>

                <div className="border border-brand-border/60 rounded-xl divide-y divide-brand-border/40 overflow-hidden">
                  {(selectedOrder.items || []).map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        {it.image ? (
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-12 h-12 rounded-lg object-cover bg-brand-offwhite border border-brand-border/50 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-brand-offwhite border border-brand-border/50 flex items-center justify-center text-brand-muted shrink-0">
                            <Package size={16} />
                          </div>
                        )}

                        <div>
                          <p className="font-serif font-bold text-brand-black">{it.name}</p>
                          <p className="text-[11px] text-brand-muted">
                            Variant: {it.selectedSize || 'Standard'} • Quantity: {it.quantity}
                          </p>
                          {it.sku && <p className="text-[10px] font-mono text-brand-muted">SKU: {it.sku}</p>}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-brand-black">
                          ${Number(it.price * it.quantity).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-brand-muted">
                          ${Number(it.price).toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-brand-offwhite rounded-xl border border-brand-border/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-charcoal">Atelier Products Subtotal:</span>
                  <span className="font-serif font-bold text-sm text-brand-black">
                    ${Number(selectedOrder.vendorSubtotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Transition History / Audit Trail */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-black block">
                    Status History & Audit Trail
                  </span>

                  <div className="border border-brand-border/60 rounded-xl divide-y divide-brand-border/40 overflow-hidden text-xs">
                    {selectedOrder.statusHistory.map((hist, idx) => (
                      <div key={idx} className="p-3 flex items-start justify-between gap-3 bg-brand-surface">
                        <div>
                          <div className="flex items-center gap-2">
                            <VendorOrderStatusBadge status={hist.status} />
                            {hist.previousStatus && (
                              <span className="text-[11px] text-brand-muted">
                                from {hist.previousStatus}
                              </span>
                            )}
                          </div>
                          {hist.note && (
                            <p className="text-[11px] text-brand-charcoal mt-1 italic">
                              &quot;{hist.note}&quot;
                            </p>
                          )}
                        </div>

                        <span className="text-[10px] text-brand-muted shrink-0">
                          {new Date(hist.changedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-brand-border/60 bg-brand-offwhite/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Printer}
                  onClick={() => {
                    setPackingSlipOrder(selectedOrder);
                  }}
                  className="text-xs"
                >
                  Print Packing Slip
                </Button>

                {['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Pickup'].includes(
                  selectedOrder.orderStatus
                ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    onClick={() => handleOpenRejectModal(selectedOrder)}
                    className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-300"
                  >
                    Cancel Order
                  </Button>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedOrder(null)}
                className="text-xs"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MILESTONE / DISPATCH NOTE MODAL */}
      {/* ===================================================================== */}
      {milestoneOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-brand-accent" />
                <h3 className="font-serif text-base font-bold text-brand-black">
                  Transition to {milestoneTargetStatus}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMilestoneOrder(null)}
                className="text-brand-muted hover:text-brand-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Order #{milestoneOrder._id} will be updated to{' '}
              <strong className="text-brand-black">{milestoneTargetStatus}</strong>. You may optionally attach
              a packaging note or courier dispatch tracking reference.
            </p>

            <form onSubmit={handleConfirmMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                  Packaging / Courier Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={milestoneNote}
                  onChange={(e) => setMilestoneNote(e.target.value)}
                  placeholder="e.g. Wrapped with luxury gift packaging. Courier: DHL Express AWB #8921734"
                  className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border/80 rounded-lg text-xs text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMilestoneOrder(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingMilestone}
                  className="text-xs"
                >
                  Confirm {milestoneTargetStatus}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REJECT / CANCEL ORDER MODAL */}
      {/* ===================================================================== */}
      {rejectingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-rose-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-left space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert size={18} />
                </div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Cancel / Reject Store Order #{rejectingOrder._id}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="p-1.5 text-brand-muted hover:text-brand-black rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 text-xs space-y-1">
              <strong className="block font-semibold">Inventory Restock Guarantee:</strong>
              <p className="text-rose-900/80 leading-relaxed">
                Cancelling or rejecting this order will mark it as cancelled and automatically restock the reserved units
                back to your catalog inventory.
              </p>
            </div>

            {rejectionError && (
              <div className="p-3 bg-rose-100/70 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold">
                {rejectionError}
              </div>
            )}

            {/* Quick Reason Suggestions */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-2">
                Select or Customize Reason
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Atelier stock shortage / material delay',
                  'Incomplete or unverifiable delivery address',
                  'Quality inspection defect detected',
                  'Customer requested cancellation',
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectionReason(r)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
                      rejectionReason === r
                        ? 'bg-rose-100 border-rose-300 text-rose-900 font-semibold shadow-2xs'
                        : 'bg-brand-offwhite hover:bg-brand-cream border-brand-border/70 text-brand-charcoal'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <form onSubmit={handleConfirmRejection} className="space-y-4">
              <div>
                <label
                  htmlFor="rejectionReasonText"
                  className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-1"
                >
                  Cancellation / Rejection Reason
                </label>
                <textarea
                  id="rejectionReasonText"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a specific reason for cancellation..."
                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-black focus:border-brand-black focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingOrder(null)}
                  className="text-xs"
                >
                  Keep Order
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingRejection}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Order Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRINTABLE PACKING SLIP / MANIFEST MODAL */}
      {/* ===================================================================== */}
      {packingSlipOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white text-neutral-900 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-left space-y-6">
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b pb-4 border-neutral-200">
              <div>
                <h2 className="text-xl font-bold font-serif tracking-tight text-neutral-900">
                  {store?.name || 'Luxury Atelier'}
                </h2>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mt-0.5">
                  Official Packing Slip & Dispatch Manifest
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  Order ID: <strong className="font-mono text-neutral-900">#{packingSlipOrder._id}</strong>
                </p>
              </div>

              <div className="text-right text-xs text-neutral-500">
                <p>Date: {new Date(packingSlipOrder.createdAt).toLocaleDateString()}</p>
                <p className="capitalize">
                  Payment: <strong>{packingSlipOrder.paymentStatus || 'Paid'}</strong>
                </p>
              </div>
            </div>

            {/* Delivery Address & Customer */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                Ship To / Recipient Coordinates:
              </span>
              <p className="font-bold text-sm text-neutral-900">
                {packingSlipOrder.deliveryAddress?.fullName || packingSlipOrder.customer?.name}
              </p>
              {packingSlipOrder.deliveryAddress?.mobileNumber && (
                <p className="text-neutral-700 mt-0.5">
                  Contact: {packingSlipOrder.deliveryAddress.mobileNumber}
                </p>
              )}
              {packingSlipOrder.deliveryAddress && (
                <p className="text-neutral-700 mt-1 leading-relaxed">
                  {packingSlipOrder.deliveryAddress.address}, {packingSlipOrder.deliveryAddress.city},{' '}
                  {packingSlipOrder.deliveryAddress.state} - {packingSlipOrder.deliveryAddress.pinCode}
                </p>
              )}
            </div>

            {/* Line Items Table */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block mb-2">
                Order Enclosure Items ({packingSlipOrder.items?.length || 0})
              </span>

              <table className="w-full text-xs border border-neutral-200 rounded-lg overflow-hidden">
                <thead className="bg-neutral-100 text-neutral-700 text-left">
                  <tr>
                    <th className="p-2.5 font-bold">Item Description</th>
                    <th className="p-2.5 font-bold text-center">SKU</th>
                    <th className="p-2.5 font-bold text-center">Variant</th>
                    <th className="p-2.5 font-bold text-center">Qty</th>
                    <th className="p-2.5 font-bold text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {(packingSlipOrder.items || []).map((it, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="p-2.5 font-semibold text-neutral-900">{it.name}</td>
                      <td className="p-2.5 font-mono text-center text-neutral-600">
                        {it.sku || 'N/A'}
                      </td>
                      <td className="p-2.5 text-center text-neutral-600">
                        {it.selectedSize || 'Standard'}
                      </td>
                      <td className="p-2.5 font-bold text-center text-neutral-900">{it.quantity}</td>
                      <td className="p-2.5 text-right font-semibold text-neutral-900">
                        ${Number(it.price * it.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-3 text-sm font-bold text-neutral-900">
                <span>Atelier Total: ${Number(packingSlipOrder.vendorSubtotal || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Packaging Checklist */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 text-[11px] text-neutral-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-neutral-400 inline-block"></span>
                <span>Quality Inspection Passed & Tagged</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-neutral-400 inline-block"></span>
                <span>Packaged in Protective Dustbag / Luxury Box</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-neutral-400 inline-block"></span>
                <span>Enclosed with Authenticity Certificate</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setPackingSlipOrder(null)}
                className="text-xs text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs bg-neutral-900 hover:bg-black text-white"
                >
                  Print Packing Slip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ASSIGN DELIVERY AGENT / FLEET DISPATCH MODAL */}
      {/* ===================================================================== */}
      {isAssignModalOpen && orderToAssign && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-brand-border rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl text-left space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Bike size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-black">
                    Dispatch Order #{orderToAssign._id.toString().slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-[11px] text-brand-muted">
                    Assign a private delivery boy from your store fleet for customer drop-off.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setOrderToAssign(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Order Destination Brief */}
            <div className="p-3 bg-brand-offwhite rounded-xl border border-brand-border/60 text-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-[10px] uppercase font-bold">
                <span>Destination Coordinates</span>
                <span className="font-serif text-brand-black text-xs font-bold">
                  Total: ${Number(orderToAssign.vendorSubtotal || 0).toLocaleString()}
                </span>
              </div>
              <p className="font-bold text-brand-black">
                {orderToAssign.deliveryAddress?.fullName || 'Customer'} (📞 {orderToAssign.deliveryAddress?.mobileNumber})
              </p>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                {orderToAssign.deliveryAddress?.address}, {orderToAssign.deliveryAddress?.city} - {orderToAssign.deliveryAddress?.pinCode}
              </p>
            </div>

            {/* Select Delivery Agent */}
            <form onSubmit={handleAssignDeliveryBoy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-black mb-2">
                  Select Delivery Agent from Fleet ({deliveryFleet.length} registered)
                </label>

                {deliveryFleet.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-2">
                    <p className="font-semibold">No delivery agents registered yet.</p>
                    <p className="text-[11px] text-amber-800">
                      Create your delivery boys first in the Delivery Agents menu.
                    </p>
                    <Link
                      to="/vendor/delivery-boys"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      <Plus size={12} />
                      <span>Register Delivery Boy</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {deliveryFleet.map((boy) => {
                      const isSelected = selectedDeliveryBoyId === boy._id;
                      const isAvailable = boy.status === 'available';
                      const isOnDelivery = boy.status === 'on_delivery';

                      return (
                        <div
                          key={boy._id}
                          onClick={() => setSelectedDeliveryBoyId(boy._id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30 shadow-2xs'
                              : 'bg-brand-surface border-brand-border/70 hover:bg-brand-cream/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-brand-accent/20 text-brand-black font-bold flex items-center justify-center text-xs shrink-0">
                              {boy.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-brand-black truncate">
                                {boy.name}
                              </p>
                              <p className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5 font-mono">
                                <span>📞 {boy.phone}</span>
                                <span>•</span>
                                <span>🛵 {boy.vehicleType}</span>
                                {boy.vehicleNumber && <span>({boy.vehicleNumber})</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                  : isOnDelivery
                                  ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {isAvailable ? 'Available' : isOnDelivery ? 'On Duty' : 'Offline'}
                            </span>

                            <input
                              type="radio"
                              name="selectedDeliveryBoy"
                              checked={isSelected}
                              onChange={() => setSelectedDeliveryBoyId(boy._id)}
                              className="text-amber-500 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Special Delivery Notes */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Special Delivery Instructions / Dispatch Notes
                </label>
                <textarea
                  rows={2}
                  value={assignDeliveryNotes}
                  onChange={(e) => setAssignDeliveryNotes(e.target.value)}
                  placeholder="e.g. Fragile package, call on arrival, deliver before 5 PM..."
                  className="w-full px-3 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black placeholder:text-neutral-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setOrderToAssign(null);
                  }}
                  disabled={isAssigningDelivery}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isAssigningDelivery || !selectedDeliveryBoyId || deliveryFleet.length === 0}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
                >
                  {isAssigningDelivery ? 'Dispatching...' : 'Confirm Dispatch & Assign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE RADAR TRACKING MODAL */}
      {/* ========================================================================= */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-6 text-white space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
                  <Navigation size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <span>Live GPS Delivery Radar</span>
                    <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                      #ORD-{trackingModalOrder.orderNumber || trackingModalOrder._id.toString().slice(-6).toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real-time courier telemetry between your store dispatch hub and customer doorstep.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/vendor/delivery-boys"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md"
                >
                  <ExternalLink size={12} />
                  <span>Fleet Hub ↗</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setTrackingModalOrder(null);
                    setTrackingData(null);
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tracking Content */}
            {loadingTracking ? (
              <div className="py-20 text-center">
                <RefreshCw size={28} className="animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-xs text-neutral-400">Locking live GPS telemetry signal...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                {/* Embedded LiveDeliveryMap with Crisp Black Border */}
                <div className="rounded-3xl border-2 border-black shadow-2xl overflow-hidden p-0.5 bg-black ring-1 ring-black/80">
                  <LiveDeliveryMap
                    storeHub={trackingData.storeHub}
                    customerDestination={trackingData.customerDestination}
                    deliveryBoy={trackingData.deliveryBoy}
                    isTrackingActive={trackingData.isTrackingActive}
                    height="h-80 sm:h-[420px]"
                    orderNumber={trackingModalOrder.orderNumber}
                  />
                </div>

                {/* Telemetry Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Assigned Courier
                    </span>
                    <p className="font-bold text-white mt-1 truncate">
                      {trackingData.deliveryBoy?.name || 'Assigned Courier'}
                    </p>
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      {trackingData.deliveryBoy?.phone || ''}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Vehicle & Plate
                    </span>
                    <p className="font-bold text-white mt-1">
                      {trackingData.deliveryBoy?.vehicleType || 'Motorcycle'}
                    </p>
                    <p className="text-[10px] text-cyan-300 font-mono mt-0.5">
                      {trackingData.deliveryBoy?.vehicleNumber || 'MP-09-AB-1234'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Remaining Distance
                    </span>
                    <p className="font-bold text-white mt-1 font-mono text-sm">
                      {trackingData.distanceKm} km
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">Direct Corridor</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                      Dynamic ETA
                    </span>
                    <p className="font-bold text-amber-400 mt-1 font-mono text-sm">
                      ~{trackingData.etaMins} mins
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Real-time GPS Speed</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-400">
                Failed to lock GPS telemetry. Try refreshing in a moment.
              </div>
            )}
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
