import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Radio,
  Activity,
  Zap,
  Battery,
  BatteryCharging,
  Gauge,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Play,
  Pause,
  AlertCircle,
  Plus,
  Eye,
  Send,
  Shield,
  Bike,
  Truck,
  Car,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  Check,
  Copy,
  Package,
  PackageCheck,
} from 'lucide-react';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import VendorFleetRadarMap from '../components/VendorFleetRadarMap';
import { vendorDeliveryService } from '../services/api';

/**
 * Returns appropriate vehicle icon component
 */
function VehicleIcon({ type, className = 'w-4 h-4' }) {
  const norm = (type || '').toLowerCase();
  if (norm.includes('car') || norm.includes('van')) {
    return <Truck className={className} />;
  }
  if (norm.includes('bicycle')) {
    return <Bike className={className} />;
  }
  return <Bike className={className} />;
}

/**
 * Status Pill with distinct aesthetic colors
 */
function FleetStatusBadge({ status }) {
  const norm = (status || 'available').toLowerCase();
  switch (norm) {
    case 'available':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Available
        </span>
      );
    case 'on_delivery':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          On Delivery
        </span>
      );
    case 'offline':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          Offline
        </span>
      );
    case 'inactive':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Inactive
        </span>
      );
  }
}

export default function VendorDeliveryFleet() {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [storeHub, setStoreHub] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    available: 0,
    onDelivery: 0,
    offline: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [autoRadar, setAutoRadar] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'Motorcycle',
    vehicleNumber: '',
    licenseNumber: '',
    emergencyContact: '',
    status: 'available',
    initialAddress: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Dispatch Order Modal States
  const [dispatchModalAgent, setDispatchModalAgent] = useState(null);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchingOrder, setDispatchingOrder] = useState(false);
  const [completingOrderId, setCompletingOrderId] = useState(null);

  // Fetch delivery boys from backend API
  const fetchFleet = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await vendorDeliveryService.getDeliveryBoys({
        search: searchQuery,
        status: statusFilter,
      });

      if (res && res.success) {
        setDeliveryBoys(res.deliveryBoys || []);
        if (res.storeHub) {
          setStoreHub(res.storeHub);
        }
        if (res.summary) {
          setSummary(res.summary);
        }
        // Update selected agent telemetry if already selected
        setSelectedAgent((prev) => {
          if (!prev) return null;
          const fresh = (res.deliveryBoys || []).find((b) => b._id === prev._id);
          return fresh || prev;
        });
      }
    } catch (err) {
      console.error('Error fetching delivery fleet:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Unable to load delivery fleet data.',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchFleet(true);
  }, [fetchFleet]);

  // Auto-Radar Interval (Real-time telemetry pulse every 7s)
  useEffect(() => {
    if (!autoRadar) return;

    const intervalId = setInterval(async () => {
      try {
        await vendorDeliveryService.simulateLiveMovement();
        fetchFleet(false);
      } catch (err) {
        console.error('Auto radar pulse error:', err);
      }
    }, 7000);

    return () => clearInterval(intervalId);
  }, [autoRadar, fetchFleet]);

  // Trigger manual simulation step
  const handleSimulateLivePulse = async () => {
    try {
      setSimulating(true);
      const res = await vendorDeliveryService.simulateLiveMovement();
      if (res && res.success) {
        await fetchFleet(false);
        setFeedbackMessage({
          type: 'success',
          text: 'Live GPS telemetry updated for all active fleet agents.',
        });
      }
    } catch (err) {
      console.error('Failed to trigger GPS simulation:', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Failed to update GPS telemetry.',
      });
    } finally {
      setTimeout(() => setSimulating(false), 600);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      vehicleType: 'Motorcycle',
      vehicleNumber: '',
      licenseNumber: '',
      emergencyContact: '',
      status: 'available',
      initialAddress: '',
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  // Submit Create Agent
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormErrors({});

    try {
      const res = await vendorDeliveryService.createDeliveryBoy(formData);
      if (res && res.success) {
        setIsCreateModalOpen(false);
        setFeedbackMessage({
          type: 'success',
          text: `Agent "${res.deliveryBoy?.name}" registered successfully!`,
        });
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Create delivery boy error:', err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to register delivery agent.',
        });
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (agent) => {
    setAgentToEdit(agent);
    setFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      password: '',
      vehicleType: agent.vehicleType || 'Motorcycle',
      vehicleNumber: agent.vehicleNumber || '',
      licenseNumber: agent.licenseNumber || '',
      emergencyContact: agent.emergencyContact || '',
      status: agent.status || 'available',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Submit Edit Agent
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!agentToEdit) return;
    setFormSubmitting(true);

    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      const res = await vendorDeliveryService.updateDeliveryBoy(agentToEdit._id, payload);
      if (res && res.success) {
        setIsEditModalOpen(false);
        setFeedbackMessage({
          type: 'success',
          text: `Delivery agent "${res.deliveryBoy?.name}" updated successfully.`,
        });
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Update delivery boy error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update delivery agent.',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick Status Toggle on Directory Row
  const handleQuickStatusChange = async (agentId, newStatus) => {
    try {
      await vendorDeliveryService.updateDeliveryBoy(agentId, { status: newStatus });
      await fetchFleet(false);
      setFeedbackMessage({
        type: 'success',
        text: `Status updated to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (err) {
      console.error('Quick status update failed:', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Failed to update agent status.',
      });
    }
  };

  // Delete Delivery Boy
  const handleDeleteAgent = async (agentId) => {
    try {
      const res = await vendorDeliveryService.deleteDeliveryBoy(agentId);
      if (res && res.success) {
        setDeleteConfirmId(null);
        if (selectedAgent?._id === agentId) setSelectedAgent(null);
        setFeedbackMessage({
          type: 'success',
          text: res.message || 'Delivery agent removed from your fleet.',
        });
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Delete delivery boy error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to remove delivery agent.',
      });
    }
  };

  // Open dispatch modal for an agent
  const openDispatchModal = async (agent) => {
    setDispatchModalAgent(agent);
    setSelectedOrderId('');
    setDispatchNotes('');
    setLoadingOrders(true);
    try {
      const res = await vendorDeliveryService.getUnassignedOrders();
      if (res && res.success) {
        setUnassignedOrders(res.orders || []);
        if (res.orders && res.orders.length > 0) {
          setSelectedOrderId(res.orders[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load unassigned orders:', err);
      setFeedbackMessage({
        type: 'error',
        text: 'Failed to load pending store orders.',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  // Submit dispatch order
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!dispatchModalAgent || !selectedOrderId) return;
    setDispatchingOrder(true);
    try {
      const res = await vendorDeliveryService.assignOrder(
        selectedOrderId,
        dispatchModalAgent._id,
        dispatchNotes
      );
      if (res && res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Order dispatched to ${dispatchModalAgent.name} successfully!`,
        });
        setDispatchModalAgent(null);
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Dispatch order failed:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to dispatch order to agent.',
      });
    } finally {
      setDispatchingOrder(false);
    }
  };

  // Mark order complete / delivered
  const handleCompleteOrder = async (orderId) => {
    if (!orderId) return;
    setCompletingOrderId(orderId);
    try {
      const res = await vendorDeliveryService.completeOrderDelivery(orderId);
      if (res && res.success) {
        setFeedbackMessage({
          type: 'success',
          text: 'Order marked as Delivered successfully! Agent is now available.',
        });
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Complete order error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to complete order delivery.',
      });
    } finally {
      setCompletingOrderId(null);
    }
  };

  // Unassign / cancel order dispatch
  const handleUnassignOrder = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await vendorDeliveryService.unassignOrder(orderId);
      if (res && res.success) {
        setFeedbackMessage({
          type: 'success',
          text: 'Order unassigned successfully. Agent has returned to Available status.',
        });
        await fetchFleet(false);
      }
    } catch (err) {
      console.error('Unassign order error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to unassign order.',
      });
    }
  };

  // Calculate Map Coordinate Bounding Box
  const mapCoordinates = useMemo(() => {
    const hub = { lat: 22.7196, lng: 75.8577, name: 'Atelier Central Hub' };

    if (!deliveryBoys.length) {
      return { hub, points: [] };
    }

    const allLats = [hub.lat, ...deliveryBoys.map((b) => b.currentLocation?.latitude || hub.lat)];
    const allLngs = [hub.lng, ...deliveryBoys.map((b) => b.currentLocation?.longitude || hub.lng)];

    const minLat = Math.min(...allLats) - 0.008;
    const maxLat = Math.max(...allLats) + 0.008;
    const minLng = Math.min(...allLngs) - 0.008;
    const maxLng = Math.max(...allLngs) + 0.008;

    const latSpan = maxLat - minLat || 0.02;
    const lngSpan = maxLng - minLng || 0.02;

    const project = (lat, lng) => {
      const x = 12 + ((lng - minLng) / lngSpan) * 76;
      const y = 88 - ((lat - minLat) / latSpan) * 76;
      return { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
    };

    const hubPos = project(hub.lat, hub.lng);

    const points = deliveryBoys.map((boy) => {
      const lat = boy.currentLocation?.latitude || hub.lat;
      const lng = boy.currentLocation?.longitude || hub.lng;
      const pos = project(lat, lng);
      return {
        boy,
        x: pos.x,
        y: pos.y,
        lat,
        lng,
      };
    });

    return { hub: { ...hub, x: hubPos.x, y: hubPos.y }, points };
  }, [deliveryBoys]);

  return (
    <VendorLayout
      activePage="delivery"
      title="Delivery Boy Accounts & Live Tracking"
      subtitle="Manage your store's private delivery agents, create new accounts, and monitor real-time GPS locations."
      actions={
        <div className="flex items-center gap-2">
          {/* Live Simulation Pulse Button */}
          <button
            type="button"
            onClick={handleSimulateLivePulse}
            disabled={simulating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-surface border border-brand-border text-brand-charcoal hover:bg-brand-cream/60 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            title="Simulate realistic GPS telemetry step"
          >
            <RefreshCw size={13} className={simulating ? 'animate-spin text-brand-accent' : 'text-neutral-500'} />
            <span className="hidden sm:inline">Simulate GPS Movement</span>
            <span className="sm:hidden">Pulse</span>
          </button>

          {/* Auto Radar Toggle */}
          <button
            type="button"
            onClick={() => setAutoRadar((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
              autoRadar
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-bold'
                : 'bg-brand-surface text-brand-muted border-brand-border hover:text-brand-black'
            }`}
            title="Toggle automatic live radar refresh every 7 seconds"
          >
            <Radio size={13} className={autoRadar ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'} />
            <span>{autoRadar ? 'Radar Active' : 'Live Radar'}</span>
          </button>

          {/* Register Agent Button */}
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={openCreateModal}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400 shadow-xs"
          >
            + Register Delivery Agent
          </Button>
        </div>
      }
    >
      {/* Toast / Notification feedback */}
      {feedbackMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium transition-all ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'error' ? (
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. METRICS OVERVIEW CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs text-left relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Total Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Bike size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-black text-brand-black">
              {summary.total}
            </span>
            <span className="text-[11px] font-medium text-neutral-400">active accounts</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Multi-tenant isolated for your store</p>
        </div>

        {/* On Active Delivery */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs text-left relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              On Active Delivery
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Navigation size={16} className="animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-black text-blue-700">
              {summary.onDelivery}
            </span>
            <span className="text-[11px] font-semibold text-blue-600">transit live</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Real-time GPS telemetry broadcasting</p>
        </div>

        {/* Available for Dispatch */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs text-left relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Standby Available
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-black text-emerald-700">
              {summary.available}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">ready to assign</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Stationed near dispatch zones</p>
        </div>

        {/* Offline / Inactive */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs text-left relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Off-Duty / Offline
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-200/60 text-neutral-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-black text-neutral-700">
              {summary.offline + summary.inactive}
            </span>
            <span className="text-[11px] font-medium text-neutral-400">offline</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">Can be re-activated any time</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE GPS RADAR & CITY TELEMETRY MAP */}
      {/* ========================================================================= */}
      <VendorFleetRadarMap
        deliveryBoys={deliveryBoys}
        storeHub={storeHub || mapCoordinates.hub}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
        onCompleteOrder={handleCompleteOrder}
        onUnassignOrder={handleUnassignOrder}
        onOpenDispatchModal={openDispatchModal}
        onOpenEditModal={openEditModal}
        completingOrderId={completingOrderId}
        autoRadar={autoRadar}
        onToggleAutoRadar={() => setAutoRadar((prev) => !prev)}
        onSimulateMovement={handleSimulateLivePulse}
        simulating={simulating}
        height="h-[480px] sm:h-[580px]"
      />

      {/* ========================================================================= */}
      {/* 3. FLEET DIRECTORY & MANAGEMENT TABLE */}
      {/* ========================================================================= */}
      <div className="bg-brand-surface border border-brand-border/70 rounded-3xl p-5 sm:p-7 shadow-2xs text-left space-y-5">
        {/* Directory Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-brand-black">
              Fleet Staff Directory
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">
              Create, update, and manage private delivery personnel credentials and equipment.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search name, phone, plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="on_delivery">On Delivery</option>
              <option value="offline">Offline</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Directory Content Table */}
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-brand-muted">Loading delivery staff directory...</p>
          </div>
        ) : deliveryBoys.length === 0 ? (
          <div className="py-14 px-6 text-center bg-brand-offwhite rounded-2xl border border-dashed border-brand-border">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <UserPlus size={22} />
            </div>
            <h4 className="font-serif text-base font-bold text-brand-black">No Delivery Agents Found</h4>
            <p className="text-xs text-brand-muted max-w-md mx-auto mt-1 mb-5">
              {searchQuery || statusFilter !== 'all'
                ? 'No staff members match your active filter criteria. Clear your search to view all.'
                : 'You have not added any delivery personnel to your store yet. Create your first agent account to start dispatching orders.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={openCreateModal}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
            >
              Register First Delivery Agent
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-cream/40 border-b border-brand-border text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Delivery Agent</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Vehicle & Reg</th>
                  <th className="py-3 px-4">Live Status</th>
                  <th className="py-3 px-4">GPS Location</th>
                  <th className="py-3 px-4">Deliveries</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-brand-surface">
                {deliveryBoys.map((agent) => {
                  const isSelected = selectedAgent?._id === agent._id;
                  return (
                    <tr
                      key={agent._id}
                      className={`hover:bg-brand-cream/30 transition-colors ${
                        isSelected ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      {/* Name & Initials */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-accent/20 text-brand-black font-bold flex items-center justify-center text-xs shrink-0 border border-brand-accent/30">
                            {agent.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <p className="font-bold text-brand-black">{agent.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              Joined {new Date(agent.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 font-mono">
                        <a
                          href={`tel:${agent.phone}`}
                          className="text-brand-black hover:text-amber-600 flex items-center gap-1 font-semibold"
                        >
                          <Phone size={11} className="text-neutral-400" />
                          <span>{agent.phone}</span>
                        </a>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Mail size={10} />
                          <span>{agent.email}</span>
                        </p>
                      </td>

                      {/* Vehicle & Registration */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <VehicleIcon type={agent.vehicleType} className="text-neutral-500 w-3.5 h-3.5" />
                          <span className="font-semibold text-brand-black">{agent.vehicleType}</span>
                        </div>
                        {agent.vehicleNumber ? (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-300 mt-1 inline-block">
                            {agent.vehicleNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 italic">No plate registered</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={agent.status}
                          onChange={(e) => handleQuickStatusChange(agent._id, e.target.value)}
                          className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-brand-border bg-white text-brand-black cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="available">Available</option>
                          <option value="on_delivery">On Delivery</option>
                          <option value="offline">Offline</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      {/* Current GPS Location */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-brand-black truncate max-w-[180px]">
                          {agent.currentLocation?.address || 'Indore Hub Dispatch'}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {agent.currentLocation?.latitude?.toFixed(4)},{' '}
                          {agent.currentLocation?.longitude?.toFixed(4)}
                        </p>
                      </td>

                      {/* Deliveries & Rating */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-brand-black">
                          {agent.deliveriesCompleted || 0}{' '}
                          <span className="text-[10px] font-normal text-neutral-400">orders</span>
                        </p>
                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                          <span>★</span>
                          <span>{agent.rating ? agent.rating.toFixed(1) : '5.0'}</span>
                        </p>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick dispatch or complete order */}
                          {agent.activeOrderId || agent.status === 'on_delivery' ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteOrder(agent.activeOrderId)}
                              disabled={completingOrderId === agent.activeOrderId}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark Active Order as Delivered"
                            >
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span className="hidden sm:inline">Delivered</span>
                            </button>
                          ) : agent.status === 'available' ? (
                            <button
                              type="button"
                              onClick={() => openDispatchModal(agent)}
                              className="px-2 py-1 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Dispatch Pending Store Order"
                            >
                              <Package size={12} className="text-amber-600" />
                              <span className="hidden sm:inline">Dispatch</span>
                            </button>
                          ) : null}

                          {/* Focus on radar */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAgent(agent);
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Focus on Radar Map"
                          >
                            <Navigation size={14} />
                          </button>

                          {/* Edit Agent */}
                          <button
                            type="button"
                            onClick={() => openEditModal(agent)}
                            className="p-1.5 text-neutral-500 hover:text-brand-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Agent Details"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete Agent */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(agent._id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Agent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3.5 DISPATCH ORDER TO AGENT MODAL */}
      {/* ========================================================================= */}
      {dispatchModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-xl w-full p-6 sm:p-8 text-left shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-black">
                    Dispatch Order to {dispatchModalAgent.name}
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Select an unassigned confirmed store order to dispatch with this driver.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalAgent(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Driver summary card */}
            <div className="mt-4 p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-charcoal text-white flex items-center justify-center text-xs font-bold">
                  {dispatchModalAgent.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-black">{dispatchModalAgent.name}</p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    {dispatchModalAgent.vehicleType} • {dispatchModalAgent.vehicleNumber || 'No Plate'} • {dispatchModalAgent.phone}
                  </p>
                </div>
              </div>
              <FleetStatusBadge status={dispatchModalAgent.status} />
            </div>

            <form onSubmit={handleDispatchSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1.5">
                  Select Pending Order Awaiting Dispatch
                </label>

                {loadingOrders ? (
                  <div className="py-8 text-center bg-brand-offwhite rounded-xl border border-dashed border-brand-border">
                    <RefreshCw size={18} className="animate-spin text-amber-500 mx-auto mb-1.5" />
                    <p className="text-xs text-brand-muted">Fetching unassigned store orders...</p>
                  </div>
                ) : unassignedOrders.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <p className="font-semibold">No pending orders awaiting dispatch</p>
                    <p className="mt-1 text-[11px] text-amber-700">
                      All confirmed customer orders have already been dispatched or delivered. You can also view orders under Vendor Orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {unassignedOrders.map((ord) => {
                      const isSelected = selectedOrderId === ord._id;
                      const itemsCount = ord.orderItems?.length || 0;
                      const customerName = ord.user?.name || ord.shippingAddress?.fullName || 'Valued Customer';
                      const city = ord.shippingAddress?.city || 'Local Store Area';
                      const total = ord.totalPrice?.toLocaleString('en-IN') || '0';

                      return (
                        <label
                          key={ord._id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400/50'
                              : 'bg-white border-brand-border hover:bg-brand-cream/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedOrder"
                            value={ord._id}
                            checked={isSelected}
                            onChange={() => setSelectedOrderId(ord._id)}
                            className="mt-1 text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-brand-black">
                                #ORD-{ord._id?.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-xs font-bold text-amber-600">
                                ₹{total}
                              </span>
                            </div>
                            <p className="text-[11px] text-brand-charcoal font-medium mt-0.5">
                              {customerName} • {city}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                              {itemsCount} item{itemsCount > 1 ? 's' : ''} • Current status: {ord.orderStatus}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Dispatch Instructions & Rider Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fragile glass packaging, collect cash on delivery, ring bell twice..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDispatchModalAgent(null)}
                  disabled={dispatchingOrder}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={dispatchingOrder || !selectedOrderId || unassignedOrders.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
                >
                  {dispatchingOrder ? 'Dispatching...' : 'Dispatch Order Now'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE DELIVERY AGENT MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-6 sm:p-8 text-left shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Register Delivery Agent
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Create a secure credentials profile for your store's delivery staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={formErrors.name}
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="agent@store.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={formErrors.email}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    error={formErrors.phone}
                    required
                  />
                </div>
              </div>

              {/* Login Password */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Agent Login Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={formErrors.password}
                  required
                />
              </div>

              {/* Vehicle Type & Registration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black font-medium"
                  >
                    <option value="Motorcycle">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter / Activa</option>
                    <option value="Electric Bike">Electric Bike (EV)</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Vehicle Number Plate
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MP-09-AB-1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Driving License & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Driving License No.
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MP-09-2022-0045"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Emergency Contact
                  </label>
                  <Input
                    type="tel"
                    placeholder="Emergency phone no."
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                </div>
              </div>

              {/* Initial Landmark Address */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Starting Station / Landmark
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 56 Dukan Gourmet Square, Zone 1"
                  value={formData.initialAddress}
                  onChange={(e) => setFormData({ ...formData, initialAddress: e.target.value })}
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
                >
                  {formSubmitting ? 'Registering...' : 'Complete Registration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EDIT DELIVERY AGENT MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && agentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-lg w-full p-6 sm:p-8 text-left shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Edit Agent: {agentToEdit.name}
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Update equipment, active duty status, or security password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Status & Vehicle Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Duty Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black font-medium"
                  >
                    <option value="available">Available</option>
                    <option value="on_delivery">On Delivery</option>
                    <option value="offline">Offline</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full py-2.5 px-3 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black font-medium"
                  >
                    <option value="Motorcycle">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter / Activa</option>
                    <option value="Electric Bike">Electric Bike (EV)</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
              </div>

              {/* Vehicle Number & License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Vehicle Number Plate
                  </label>
                  <Input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-black mb-1">
                    Driving License No.
                  </label>
                  <Input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Reset Password (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-brand-black mb-1">
                  Reset Password (leave empty to keep unchanged)
                </label>
                <Input
                  type="password"
                  placeholder="New password (optional)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold border-amber-400"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-sm w-full p-6 text-center shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h4 className="font-serif text-base font-bold text-brand-black">Remove Delivery Agent?</h4>
            <p className="text-xs text-brand-muted mt-1 mb-5">
              This action will remove the delivery agent from your fleet. Any historical completed delivery records will remain intact.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteAgent(deleteConfirmId)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Removal
              </Button>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
