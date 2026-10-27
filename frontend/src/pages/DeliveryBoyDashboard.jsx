import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bike,
  Truck,
  Package,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Navigation,
  RefreshCw,
  LogOut,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Battery,
  Gauge,
  User,
  ShoppingBag,
  DollarSign,
  Wallet,
  CheckSquare,
  Square,
  MessageSquare,
  QrCode,
  Calculator,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Sparkles,
  Store,
  KeyRound,
  ArrowRight,
  Send,
  Check,
  Kanban,
  BarChart3,
  FileText,
  Settings,
  Search,
  Menu,
  X,
  Filter,
  Download,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Receipt,
  Cpu,
  Wifi,
  Bell,
  Shield,
  Award,
  Flame,
} from 'lucide-react';
import { deliveryBoyService, vendorDeliveryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LiveDeliveryMap from '../components/LiveDeliveryMap';

/**
 * Web Audio API Sound Synthesizer (Zero external dependencies)
 */
function playAudioTone(type = 'chime') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'chime') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
      });
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Audio context policy
  }
}

/**
 * Returns vehicle icon based on vehicle type
 */
function VehicleIcon({ type, className = 'w-4 h-4' }) {
  const norm = (type || '').toLowerCase();
  if (norm.includes('car') || norm.includes('van') || norm.includes('truck')) {
    return <Truck className={className} />;
  }
  return <Bike className={className} />;
}

export default function DeliveryBoyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Core Data State
  const [profile, setProfile] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [simulatingLocation, setSimulatingLocation] = useState(false);
  const [activeMapOrderId, setActiveMapOrderId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tab State: 'dispatch' | 'pipeline' | 'remittance' | 'analytics' | 'compliance' | 'diagnostics'
  const [activeTab, setActiveTab] = useState('dispatch');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Multi-Tenant / Hub Selection State
  const [selectedHub, setSelectedHub] = useState('ALL');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('ALL');

  // Interactive Checklist State per order: { [orderId]: { [itemIndex]: boolean } }
  const [checkedItems, setCheckedItems] = useState({});

  // OTP Verification Input State: { [orderId]: string }
  const [otpInputs, setOtpInputs] = useState({});
  const [otpErrors, setOtpErrors] = useState({});

  // COD Cash Calculator State: { [orderId]: { received: string, changeDue: number } }
  const [cashCalculators, setCashCalculators] = useState({});

  // Quick SMS Drawer State per order: { [orderId]: boolean }
  const [openSmsDrawerId, setOpenSmsDrawerId] = useState(null);

  // Modals
  const [upiQrModal, setUpiQrModal] = useState(null);
  const [declineModalOrderId, setDeclineModalOrderId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Vehicle mechanical issue');
  const [remitCashModalOpen, setRemitCashModalOpen] = useState(false);
  const [remitNotice, setRemitNotice] = useState(null);

  // Fetch delivery boy profile, assigned active orders, and completed ledger
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await deliveryBoyService.getMyOrders();
      if (res && res.success) {
        setProfile(res.profile);
        setActiveOrders(res.activeOrders || []);
        setCompletedOrders(res.completedOrders || []);
        setSummaryData(res.summary || null);
      }
    } catch (err) {
      console.error('Failed to load delivery boy dashboard:', err);
      setActionNotice({
        type: 'error',
        text: err.response?.data?.message || 'Unable to retrieve assigned deliveries.',
      });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Real-Time GPS Simulation Pulse
  useEffect(() => {
    if (!simulatingLocation) return;

    let step = 0;
    const interval = setInterval(async () => {
      step = (step + 1) % 10;
      const baseLat = 22.7200;
      const baseLng = 75.8580;
      const newLat = +(baseLat + step * 0.003).toFixed(5);
      const newLng = +(baseLng + step * 0.0035).toFixed(5);
      const newSpeed = 28 + Math.floor(Math.random() * 12);
      const newHeading = 45 + (step * 8);
      const battery = Math.max(70, 88 - Math.floor(step / 3));

      try {
        await deliveryBoyService.updateLocation({
          latitude: newLat,
          longitude: newLng,
          speed: newSpeed,
          heading: newHeading,
          batteryLevel: battery,
          address: `En route near Metro Pillar ${100 + step * 4}, A.B. Road`,
        });
        setProfile((prev) => prev ? ({
          ...prev,
          currentLocation: {
            ...prev.currentLocation,
            latitude: newLat,
            longitude: newLng,
            speed: newSpeed,
            heading: newHeading,
            batteryLevel: battery,
            address: `En route near Metro Pillar ${100 + step * 4}, A.B. Road`,
          }
        }) : prev);
      } catch (err) {
        console.error('Failed to broadcast simulated GPS:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [simulatingLocation]);

  // Handle Accept Order (Live Dispatch Core Action)
  const handleAcceptOrder = async (orderId) => {
    setActionInProgressId(orderId);
    setActionNotice(null);
    try {
      const res = await deliveryBoyService.acceptOrder(orderId);
      if (res && res.success) {
        if (soundEnabled) playAudioTone('success');
        setActionNotice({
          type: 'success',
          text: res.message || 'Dispatch accepted! Live customer GPS radar is now active.',
        });
        await fetchDashboardData(false);
        setActiveMapOrderId(orderId);
      }
    } catch (err) {
      console.error('Failed to accept order:', err);
      if (soundEnabled) playAudioTone('alert');
      setActionNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to accept order assignment.',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Decline Order with Reason
  const handleConfirmDecline = async () => {
    if (!declineModalOrderId) return;
    setActionInProgressId(declineModalOrderId);
    setActionNotice(null);
    try {
      const res = await deliveryBoyService.rejectOrder(declineModalOrderId, declineReason);
      if (res && res.success) {
        if (soundEnabled) playAudioTone('chime');
        setActionNotice({
          type: 'success',
          text: 'Dispatch declined and returned to merchant hub queue.',
        });
        setDeclineModalOrderId(null);
        await fetchDashboardData(false);
      }
    } catch (err) {
      console.error('Failed to decline order:', err);
      setActionNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to decline order.',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (orderId, value) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    setOtpInputs((prev) => ({ ...prev, [orderId]: clean }));
    if (otpErrors[orderId]) {
      setOtpErrors((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  // Handle Change Calculator input
  const handleCashReceivedChange = (orderId, totalAmount, value) => {
    const receivedNum = parseFloat(value) || 0;
    const due = Math.max(0, receivedNum - totalAmount);
    setCashCalculators((prev) => ({
      ...prev,
      [orderId]: {
        received: value,
        changeDue: due,
      },
    }));
  };

  // Toggle individual parcel item checklist
  const handleToggleChecklistItem = (orderId, idx) => {
    setCheckedItems((prev) => {
      const currentOrderChecks = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...currentOrderChecks,
          [idx]: !currentOrderChecks[idx],
        },
      };
    });
  };

  // 1-Click Check all items
  const handleCheckAllItems = (orderId, totalCount) => {
    setCheckedItems((prev) => {
      const allChecked = {};
      for (let i = 0; i < totalCount; i++) {
        allChecked[i] = true;
      }
      return {
        ...prev,
        [orderId]: allChecked,
      };
    });
  };

  // Handle Complete / Deliver Order with OTP & COD validation
  const handleCompleteOrder = async (order) => {
    const orderId = order._id;
    const enteredOtp = otpInputs[orderId] || '';

    if (order.deliveryOtp && (!enteredOtp || enteredOtp.length !== 4)) {
      setOtpErrors((prev) => ({
        ...prev,
        [orderId]: 'Please enter the 4-digit customer delivery OTP.',
      }));
      if (soundEnabled) playAudioTone('alert');
      return;
    }

    const isCod = /cod|cash/i.test(order.paymentMethod || '');
    const cashCollected = isCod ? Number(order.totalAmount || order.totalPrice || 0) : 0;

    setActionInProgressId(orderId);
    setActionNotice(null);
    try {
      const res = await deliveryBoyService.completeOrder(orderId, enteredOtp, cashCollected);
      if (res && res.success) {
        if (soundEnabled) playAudioTone('success');
        setActionNotice({
          type: 'success',
          text: `🎉 Order #${orderId.slice(-6).toUpperCase()} verified via OTP and marked as Delivered!`,
        });
        setOtpInputs((prev) => ({ ...prev, [orderId]: '' }));
        setCashCalculators((prev) => ({ ...prev, [orderId]: null }));
        if (activeMapOrderId === orderId) setActiveMapOrderId(null);
        await fetchDashboardData(false);
      }
    } catch (err) {
      console.error('Failed to mark delivered:', err);
      if (soundEnabled) playAudioTone('alert');
      const msg = err.response?.data?.message || 'Failed to complete order delivery.';
      setOtpErrors((prev) => ({ ...prev, [orderId]: msg }));
      setActionNotice({
        type: 'error',
        text: msg,
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Duty Status change (Available / Offline)
  const handleDutyStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    setActionNotice(null);
    try {
      const res = await deliveryBoyService.updateStatus(newStatus);
      if (res && res.success) {
        if (soundEnabled) playAudioTone('chime');
        setActionNotice({
          type: 'success',
          text: `Duty status updated to ${newStatus === 'available' ? 'Available (Receiving Dispatches)' : 'Offline (Duty Break)'}.`,
        });
        await fetchDashboardData(false);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setActionNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update duty status.',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Simulate GPS Step (Realistic movement pulse)
  const handleSimulateGps = async () => {
    setSimulatingLocation(true);
    try {
      await vendorDeliveryService.simulateLiveMovement();
      await fetchDashboardData(false);
      if (soundEnabled) playAudioTone('chime');
      setActionNotice({
        type: 'success',
        text: 'Live GPS location & speed telemetry pulsed to fleet dispatch server.',
      });
    } catch (err) {
      console.error('GPS step error:', err);
    } finally {
      setTimeout(() => setSimulatingLocation(false), 500);
    }
  };

  // Handle Rider Logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Pre-set Quick SMS templates
  const quickMessages = [
    "I have arrived outside at the main gate. Please collect your parcel.",
    "I am waiting near your building entrance. Please open the door.",
    "Your luxury delivery is arriving in approximately 2 minutes.",
    "Please have your 4-digit delivery verification OTP ready.",
  ];

  const isOnline = profile?.status === 'available' || profile?.status === 'on_delivery';

  // Extract distinct hubs for multi-tenant filtering
  const hubs = useMemo(() => {
    const hubMap = new Map();
    [...activeOrders, ...completedOrders].forEach((order) => {
      const storeName = order.stores?.[0]?.name || order.store?.name || order.vendor?.storeName || 'Patel Optical Atelier';
      const storeId = order.stores?.[0]?._id || order.store?._id || order.vendor?._id || 'main';
      if (!hubMap.has(storeId)) {
        hubMap.set(storeId, { id: storeId, name: storeName });
      }
    });
    return Array.from(hubMap.values());
  }, [activeOrders, completedOrders]);

  // Filter active and completed orders based on hub and search
  const filteredActiveOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      const storeId = order.stores?.[0]?._id || order.store?._id || order.vendor?._id || 'main';
      if (selectedHub !== 'ALL' && storeId !== selectedHub) return false;

      const isCod = /cod|cash/i.test(order.paymentMethod || '');
      if (filterPaymentMode === 'COD' && !isCod) return false;
      if (filterPaymentMode === 'PREPAID' && isCod) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderId = (order._id || '').toLowerCase();
        const customer = (order.deliveryAddress?.fullName || order.customer?.name || order.user?.name || '').toLowerCase();
        const phone = (order.deliveryAddress?.mobileNumber || order.deliveryAddress?.phone || '').toLowerCase();
        const address = (order.deliveryAddress?.address || order.deliveryAddress?.city || '').toLowerCase();
        const store = (order.stores?.[0]?.name || order.store?.name || order.vendor?.storeName || '').toLowerCase();
        return orderId.includes(q) || customer.includes(q) || phone.includes(q) || address.includes(q) || store.includes(q);
      }
      return true;
    });
  }, [activeOrders, selectedHub, filterPaymentMode, searchQuery]);

  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter((order) => {
      const storeId = order.stores?.[0]?._id || order.store?._id || order.vendor?._id || 'main';
      if (selectedHub !== 'ALL' && storeId !== selectedHub) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderId = (order._id || '').toLowerCase();
        const customer = (order.deliveryAddress?.fullName || order.customer?.name || order.user?.name || '').toLowerCase();
        return orderId.includes(q) || customer.includes(q);
      }
      return true;
    });
  }, [completedOrders, selectedHub, searchQuery]);

  // Active Map Order (default to first active order or selected)
  const currentMapOrder = useMemo(() => {
    if (activeMapOrderId) {
      return activeOrders.find((o) => o._id === activeMapOrderId) || activeOrders[0] || null;
    }
    return activeOrders[0] || null;
  }, [activeOrders, activeMapOrderId]);

  // Financial Calculations
  const todayCodCollected = summaryData?.todayCodCollected ?? (
    completedOrders
      .filter((o) => /cod|cash/i.test(o.paymentMethod || ''))
      .reduce((sum, o) => sum + Number(o.totalAmount || o.totalPrice || 0), 0)
  );
  const codLimit = 10000;
  const codPercentage = Math.min(100, Math.round((todayCodCollected / codLimit) * 100));
  const todayEarnings = summaryData?.todayEarnings ?? (completedOrders.length * 85);

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black antialiased font-sans flex select-none">
      {/* ========================================================================= */}
      {/* 1. SIDEBAR (MATCHING ADMIN & VENDOR DASHBOARDS: bg-brand-black text-white) */}
      {/* ========================================================================= */}
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-brand-black text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-white/10 select-none shadow-2xl lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Rider Fleet Navigation"
      >
        {/* Top Pinned Section: Brand Logo & Rider Identifier */}
        <div className="shrink-0">
          {/* Brand Header */}
          <div className="h-18 px-6 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-serif text-lg font-bold tracking-tight text-white group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded border border-brand-accent/30">
                Delivery
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

          {/* Active Merchant Hub Selector */}
          <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-1 flex items-center gap-1">
              <Building2 size={11} className="text-brand-accent" />
              Merchant Atelier Hub
            </p>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full bg-white/10 text-xs text-white py-1.5 px-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand-accent font-medium cursor-pointer"
            >
              <option value="ALL" className="bg-brand-black text-white">🌐 All Connected Hubs</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id} className="bg-brand-black text-white">
                  🏢 {hub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rider Profile Card in Sidebar */}
          <div className="px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-brand-accent flex items-center justify-center font-bold relative shrink-0">
                <VehicleIcon type={profile?.vehicleType} className="w-5 h-5" />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-brand-black ${
                    isOnline ? 'bg-emerald-400' : 'bg-neutral-500'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-bold text-white truncate block">
                    {profile?.name || user?.name || 'Rider Courier'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-brand-accent/20 text-brand-accent border border-brand-accent/30 font-bold shrink-0">
                    ★ {profile?.rating || '4.9'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono truncate">
                  {profile?.vehicleNumber || 'MP-09-EV-4821'}
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/5 grid grid-cols-2 gap-1 text-[11px] font-mono">
              <div className="flex items-center gap-1 text-neutral-400">
                <Battery size={12} className="text-emerald-400" />
                <span>84% EV</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 justify-end">
                <Gauge size={12} className="text-brand-accent" />
                <span>{profile?.currentLocation?.speed || 0} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Scrollable Navigation Links */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 [scrollbar-width:none]">
          <p className="px-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">
            Rider Operations
          </p>

          {/* 1. Live Dispatch Console */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('dispatch');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dispatch'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Radio size={16} className={activeTab === 'dispatch' ? 'animate-pulse' : ''} />
              <span>Live Dispatch</span>
            </div>
            {activeOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'dispatch' ? 'bg-black/20 text-brand-black' : 'bg-brand-accent text-brand-black'
              }`}>
                {activeOrders.length}
              </span>
            )}
          </button>

          {/* 2. Order Pipeline Kanban */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pipeline');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Kanban size={16} />
              <span>Order Pipeline</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/10">Kanban</span>
          </button>

          <p className="px-3 pt-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mb-2">
            Financials & Telemetry
          </p>

          {/* 3. COD & Remittance */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('remittance');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'remittance'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet size={16} />
              <span>COD & Remit</span>
            </div>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
              activeTab === 'remittance' ? 'bg-black/20 text-brand-black' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              ₹{todayCodCollected}
            </span>
          </button>

          {/* 4. Fleet Analytics */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BarChart3 size={16} />
            <span>SLA Analytics</span>
          </button>

          {/* 5. Compliance Vault */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('compliance');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Compliance Vault</span>
          </button>

          {/* 6. Diagnostics & Audio FX */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('diagnostics');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-brand-accent text-brand-black font-bold shadow-sm'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings size={16} />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Bottom Pinned Section: Logout & Server Status */}
        <div className="shrink-0 p-3.5 border-t border-white/10 bg-brand-black space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Fleet Node Active
            </span>
            <span className="text-brand-accent font-bold">Indore</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-950/40 hover:text-rose-400 text-xs font-medium text-neutral-300 transition-colors border border-white/10 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION CONTENT (MATCHING VENDOR & ADMIN DASHBOARDS) */}
      {/* ========================================================================= */}
      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0 flex-1 transition-all duration-300">
        {/* Top Header matching Admin/Vendor Header (bg-gradient from white to brand-surface) */}
        <header className="relative h-18 sm:h-22 bg-gradient-to-r from-white via-brand-surface to-brand-offwhite/80 backdrop-blur-2xl border-b border-brand-border/90 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_30px_-6px_rgba(20,20,25,0.04)] transition-all">
          {/* Top Ambient Specular Light Hairline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent pointer-events-none" />
          {/* Bottom Brushed Champagne Gold Accent Hairline */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between gap-3 w-full">
            {/* Left: Mobile Sidebar Toggle & Page Title */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-brand-charcoal hover:text-brand-black bg-white/90 hover:bg-brand-cream/80 border border-brand-border/90 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                aria-label="Toggle mobile menu"
              >
                <Menu size={20} />
              </button>

              <div className="text-left min-w-0">
                {/* Micro Enterprise Breadcrumb */}
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9E8257]">
                  <Sparkles size={11} className="text-brand-accent animate-pulse shrink-0" />
                  <span className="font-serif font-semibold text-brand-black/85">Patel Optical Fleet</span>
                  <span className="text-brand-accent/50">•</span>
                  <span className="text-brand-subtle capitalize tracking-normal font-medium">{activeTab}</span>
                </div>

                {/* Main Page Title */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  <h1 className="font-serif text-base sm:text-xl lg:text-[23px] font-bold text-brand-black tracking-tight truncate leading-tight">
                    {activeTab === 'dispatch' && 'Live Dispatch Command Console'}
                    {activeTab === 'pipeline' && 'Order Pipeline Kanban'}
                    {activeTab === 'remittance' && 'COD & Cash Settlement Ledger'}
                    {activeTab === 'analytics' && 'SLA & Fleet Analytics'}
                    {activeTab === 'compliance' && 'Vehicle & Compliance Vault'}
                    {activeTab === 'diagnostics' && 'System Diagnostics & Audio FX'}
                  </h1>

                  {/* Live Status Pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 shadow-[0_2px_8px_rgba(16,185,129,0.12)] shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="hidden xs:inline">Verified & Live</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center Telemetry Capsule (Large Desktop) */}
            <div className="hidden xl:flex items-center gap-3.5 px-4.5 py-1.5 rounded-full bg-white/95 border border-brand-border/90 shadow-[0_2px_14px_-2px_rgba(197,168,128,0.18)] text-xs backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px] tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>FLEET ONLINE</span>
              </div>
              <span className="w-px h-3.5 bg-brand-border" />
              <div className="flex items-center gap-1.5 text-[11px] text-brand-charcoal font-medium">
                <Wifi size={12} className="text-emerald-600" />
                <span className="text-brand-muted">24ms Latency</span>
              </div>
              <span className="w-px h-3.5 bg-brand-border" />
              <div className="flex items-center gap-1.5 text-[11px] text-brand-charcoal font-medium">
                <ShieldCheck size={13} className="text-brand-accent" />
                <span className="text-brand-muted">RTK ±4m</span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sound FX Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-brand-accent/20 text-brand-black border-brand-accent/50'
                    : 'bg-white text-neutral-400 border-brand-border'
                }`}
                title={soundEnabled ? 'Alert Sounds: ON' : 'Alert Sounds: MUTED'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* GPS Pulse Simulation */}
              <button
                type="button"
                onClick={handleSimulateGps}
                disabled={simulatingLocation}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-cream text-brand-charcoal border border-brand-border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                title="Broadcast GPS pulse"
              >
                <RefreshCw size={13} className={simulatingLocation ? 'animate-spin text-brand-accent' : 'text-neutral-500'} />
                <span className="hidden sm:inline">GPS Pulse</span>
              </button>

              {/* Duty Status Selector */}
              <select
                value={profile?.status || 'available'}
                onChange={(e) => handleDutyStatusChange(e.target.value)}
                disabled={isUpdatingStatus || profile?.status === 'on_delivery'}
                className={`text-xs font-bold py-1.5 px-3 rounded-xl border cursor-pointer focus:outline-none transition-all shadow-2xs ${
                  profile?.status === 'on_delivery'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : profile?.status === 'available'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-brand-charcoal border-brand-border'
                }`}
              >
                <option value="available">🟢 ON DUTY</option>
                {profile?.status === 'on_delivery' && <option value="on_delivery">🔵 ON RIDE</option>}
                <option value="offline">⚪ OFF DUTY</option>
              </select>
            </div>
          </div>
        </header>

        {/* Main Body Content on Warm Alabaster Off-White Background */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] w-full mx-auto">
          {/* Action Notice / Feedback Toast */}
          {actionNotice && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200 ${
                actionNotice.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionNotice.type === 'error' ? (
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                )}
                <span>{actionNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                className="text-neutral-400 hover:text-neutral-700 px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 1: LIVE DISPATCH CONSOLE */}
          {/* ======================================================================= */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* Top KPI Metrics Strip (Crisp White Surface Cards matching VendorDashboard) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Active Queue */}
                <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Active Queue
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Radio size={14} className="animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-serif font-bold text-brand-black truncate">
                    {activeOrders.length} <span className="text-xs font-normal text-brand-muted">dispatches</span>
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Live assigned deliveries</p>
                </div>

                {/* 2. Today's Shift Earnings */}
                <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Shift Earnings
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign size={14} />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 truncate">
                    ₹{todayEarnings}
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">₹60 base + ₹25 fuel allowance</p>
                </div>

                {/* 3. COD Cash In Hand */}
                <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      COD In Hand
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Wallet size={14} />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-serif font-bold text-blue-700 truncate">
                    ₹{todayCodCollected} <span className="text-xs font-normal text-brand-muted">/ ₹10k</span>
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Remit before shift end</p>
                </div>

                {/* 4. SLA Score */}
                <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      SLA On-Time
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-serif font-bold text-purple-700 truncate">
                    98.6%
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Target benchmark: 95.0%</p>
                </div>
              </div>

              {/* Filter Tabs & Instant Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface p-4 rounded-2xl border border-brand-border/80 text-left shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      filterPaymentMode === 'ALL'
                        ? 'bg-brand-black text-white shadow-xs'
                        : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream border border-brand-border/70'
                    }`}
                  >
                    All Dispatches ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('COD')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      filterPaymentMode === 'COD'
                        ? 'bg-brand-black text-white shadow-xs'
                        : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream border border-brand-border/70'
                    }`}
                  >
                    COD Cash Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('PREPAID')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                      filterPaymentMode === 'PREPAID'
                        ? 'bg-brand-black text-white shadow-xs'
                        : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream border border-brand-border/70'
                    }`}
                  >
                    Prepaid
                  </button>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order #, patron, address..."
                    className="w-full bg-brand-offwhite text-xs text-brand-black pl-8 pr-7 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-black font-sans placeholder-brand-muted/70"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Split Screen Grid: Cards (7 cols) + Sticky Live Radar Map with Black Border (5 cols) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Left Column: Active Order Dispatch Cards (7 cols) */}
                <div className="xl:col-span-7 space-y-4">
                  {isLoading ? (
                    <div className="p-12 text-center rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs">
                      <RefreshCw size={24} className="animate-spin text-brand-accent mx-auto mb-3" />
                      <p className="text-sm text-brand-muted font-sans">Synchronizing live fleet dispatch telemetry...</p>
                    </div>
                  ) : filteredActiveOrders.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs">
                      <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-3" />
                      <h3 className="font-serif font-bold text-base text-brand-black">All Dispatches Completed!</h3>
                      <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
                        No active orders currently pending delivery. Maintain duty status "Available" to receive new dispatches from connected hubs.
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        className="mt-4 px-4 py-2 rounded-xl bg-brand-black hover:bg-neutral-800 text-xs font-bold text-white cursor-pointer inline-flex items-center gap-2 shadow-xs"
                      >
                        <RefreshCw size={13} />
                        Refresh Queue
                      </button>
                    </div>
                  ) : (
                    filteredActiveOrders.map((order) => {
                      const orderId = order._id;
                      const isAssigned = order.deliveryStatus === 'assigned';
                      const isOnDelivery = order.deliveryStatus === 'out_for_delivery' || order.orderStatus === 'Shipped';
                      const isCod = /cod|cash/i.test(order.paymentMethod || '');
                      const totalAmount = Number(order.totalAmount || order.totalPrice || 0);

                      // Robust normalized fields
                      const items = order.products || order.items || order.orderItems || [];
                      const addressObj = order.deliveryAddress || order.shippingAddress || {};
                      const customerName = addressObj.fullName || order.customer?.name || order.user?.name || 'Customer Patron';
                      const customerPhone = addressObj.mobileNumber || addressObj.phone || order.customer?.mobileNumber || '9876543210';
                      const fullAddress = `${addressObj.address || ''}, ${addressObj.city || 'Indore'} ${addressObj.state ? '- ' + addressObj.state : ''} ${addressObj.pinCode ? '(' + addressObj.pinCode + ')' : ''}`.trim();
                      const storeName = order.stores?.[0]?.name || order.store?.name || order.vendor?.storeName || 'Patel Optical Main Atelier';
                      const storeAddress = order.stores?.[0]?.address || order.store?.address || 'MG Road Commercial Node, Indore';
                      const isSelectedForMap = (currentMapOrder?._id === orderId);

                      return (
                        <div
                          key={orderId}
                          className={`rounded-2xl border transition-all text-left overflow-hidden bg-brand-surface shadow-xs ${
                            isSelectedForMap
                              ? 'border-brand-accent ring-2 ring-brand-accent/30 shadow-md'
                              : 'border-brand-border/90 hover:border-brand-border'
                          }`}
                        >
                          {/* Card Top Banner */}
                          <div className="bg-brand-offwhite/90 border-b border-brand-border/70 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-xs font-bold text-brand-black tracking-wide">
                                ORDER #{orderId.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-brand-border">•</span>
                              <span className="text-xs text-brand-muted flex items-center gap-1 font-medium">
                                <Store size={12} className="text-brand-accent" />
                                {storeName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                                <Clock size={11} />
                                SLA: ~24m
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  isCod
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {isCod ? `COD: ₹${totalAmount}` : 'PREPAID'}
                              </span>
                            </div>
                          </div>

                          {/* Stepper Progress */}
                          <div className="px-4 py-2 bg-brand-offwhite/40 border-b border-brand-border/60 flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <CheckCircle2 size={13} />
                              <span>1. Assigned</span>
                            </div>
                            <span className="text-brand-border">───</span>
                            <div className={`flex items-center gap-1.5 ${isOnDelivery ? 'text-amber-800 font-bold' : 'text-brand-muted'}`}>
                              <Bike size={13} className={isOnDelivery ? 'animate-bounce' : ''} />
                              <span>2. En Route</span>
                            </div>
                            <span className="text-brand-border">───</span>
                            <div className="flex items-center gap-1.5 text-brand-muted">
                              <KeyRound size={13} />
                              <span>3. OTP Verify</span>
                            </div>
                          </div>

                          {/* Card Content & Interactive Actions */}
                          <div className="p-4 sm:p-5 space-y-4">
                            {/* Origin Store Pickup Point */}
                            <div className="p-3 rounded-xl bg-brand-offwhite border border-brand-border/70 flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                                <Store size={14} />
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <span className="text-[10px] uppercase font-bold text-[#9E8257] tracking-wider block">
                                  Pickup Origin Hub
                                </span>
                                <p className="text-xs font-semibold text-brand-black mt-0.5">{storeName}</p>
                                <p className="text-[11px] text-brand-muted truncate">{storeAddress}</p>
                              </div>
                            </div>

                            {/* Dropoff Destination */}
                            <div className="p-3 rounded-xl bg-brand-offwhite border border-brand-border/70 flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin size={14} />
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                                    Dropoff Destination
                                  </span>
                                  <span className="text-[11px] text-brand-muted font-mono">~3.4 km</span>
                                </div>
                                <p className="text-xs font-bold text-brand-black mt-0.5">{customerName}</p>
                                <p className="text-xs text-brand-charcoal mt-0.5 leading-relaxed">{fullAddress}</p>
                              </div>
                            </div>

                            {/* Package Physical Inspection Checklist */}
                            <div className="p-3 rounded-xl bg-brand-offwhite border border-brand-border/70 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-brand-charcoal flex items-center gap-1.5">
                                  <Package size={13} className="text-brand-accent" />
                                  Package Contents ({items.length} {items.length === 1 ? 'item' : 'items'})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCheckAllItems(orderId, items.length)}
                                  className="text-[10px] font-mono text-brand-charcoal font-semibold hover:text-brand-accent underline cursor-pointer"
                                >
                                  Verify All Items
                                </button>
                              </div>

                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {items.map((item, idx) => {
                                  const isChecked = !!checkedItems[orderId]?.[idx];
                                  const prodName = item.name || item.product?.name || `Item #${idx + 1}`;
                                  const qty = item.quantity || 1;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => handleToggleChecklistItem(orderId, idx)}
                                      className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-emerald-50 border-emerald-200 text-brand-black'
                                          : 'bg-brand-surface border-brand-border/60 text-brand-charcoal hover:border-brand-border'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isChecked ? (
                                          <CheckSquare size={14} className="text-emerald-700 shrink-0" />
                                        ) : (
                                          <Square size={14} className="text-neutral-400 shrink-0" />
                                        )}
                                        <span className={`truncate ${isChecked ? 'line-through text-brand-muted' : 'text-brand-black'}`}>
                                          {prodName}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[11px] font-bold text-brand-black shrink-0">
                                        ×{qty}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Customer Communication & Maps Navigation */}
                            <div className="grid grid-cols-3 gap-2">
                              {/* 1. Phone Call */}
                              <a
                                href={`tel:${customerPhone}`}
                                className="p-2.5 rounded-xl bg-brand-offwhite hover:bg-brand-cream text-brand-charcoal border border-brand-border/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Phone size={13} className="text-emerald-700" />
                                <span>Call Patron</span>
                              </a>

                              {/* 2. Quick SMS Drawer */}
                              <button
                                type="button"
                                onClick={() => setOpenSmsDrawerId(openSmsDrawerId === orderId ? null : orderId)}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                  openSmsDrawerId === orderId
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : 'bg-brand-offwhite hover:bg-brand-cream text-brand-charcoal border border-brand-border/80'
                                }`}
                              >
                                <MessageSquare size={13} className="text-blue-700" />
                                <span>Quick SMS</span>
                              </button>

                              {/* 3. Google Maps Nav Link */}
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-xl bg-brand-offwhite hover:bg-brand-cream text-brand-charcoal border border-brand-border/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Navigation size={13} className="text-amber-700" />
                                <span>Turn Maps</span>
                              </a>
                            </div>

                            {/* Quick SMS Drawer Templates */}
                            {openSmsDrawerId === orderId && (
                              <div className="p-3 rounded-xl bg-brand-offwhite border border-blue-200 space-y-2 animate-in fade-in duration-150">
                                <span className="text-[11px] font-bold text-blue-900 block">
                                  Pre-Composed SMS Notification:
                                </span>
                                <div className="space-y-1">
                                  {quickMessages.map((msg, i) => (
                                    <a
                                      key={i}
                                      href={`sms:${customerPhone}?body=${encodeURIComponent(msg)}`}
                                      className="block p-2 rounded-lg bg-brand-surface hover:bg-blue-50 border border-brand-border/60 text-[11px] text-brand-charcoal transition-colors"
                                    >
                                      💬 "{msg}"
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Focus on Radar Map Trigger */}
                            <button
                              type="button"
                              onClick={() => setActiveMapOrderId(orderId)}
                              className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelectedForMap
                                  ? 'bg-brand-accent/20 text-brand-black border-brand-accent'
                                  : 'bg-brand-offwhite text-brand-charcoal hover:bg-brand-cream border-brand-border/80'
                              }`}
                            >
                              <Compass size={14} className={isSelectedForMap ? 'animate-spin' : ''} />
                              <span>{isSelectedForMap ? 'Viewing on Live Radar Map' : 'Track on Radar Map'}</span>
                            </button>

                            {/* Action Buttons based on status */}
                            {isAssigned ? (
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-border/70">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOrder(orderId)}
                                  disabled={actionInProgressId === orderId}
                                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                                >
                                  {actionInProgressId === orderId ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Bike size={14} />
                                  )}
                                  <span>Accept & Start Trip</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeclineModalOrderId(orderId)}
                                  disabled={actionInProgressId === orderId}
                                  className="py-2.5 px-4 rounded-xl bg-brand-offwhite hover:bg-rose-50 hover:text-rose-700 text-brand-muted font-semibold text-xs border border-brand-border/80 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                >
                                  <XCircle size={14} />
                                  <span>Decline</span>
                                </button>
                              </div>
                            ) : (
                              /* Security Handover: OTP Verification & COD Assistant */
                              <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-accent/40 space-y-3.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-brand-black flex items-center gap-1.5">
                                    <KeyRound size={14} className="text-amber-700" />
                                    Customer OTP Handover
                                  </span>
                                  {isCod && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUpiQrModal({
                                          orderId,
                                          amount: totalAmount,
                                          customerName,
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 flex items-center gap-1 cursor-pointer"
                                    >
                                      <QrCode size={11} />
                                      <span>UPI QR</span>
                                    </button>
                                  )}
                                </div>

                                {/* COD Assistant: Change Calculator */}
                                {isCod && (
                                  <div className="p-3 rounded-lg bg-brand-surface border border-brand-border space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-mono">
                                      <span className="text-brand-muted">COD Total to Collect:</span>
                                      <span className="text-brand-black font-bold text-sm">₹{totalAmount}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        placeholder="Cash received ₹"
                                        value={cashCalculators[orderId]?.received || ''}
                                        onChange={(e) => handleCashReceivedChange(orderId, totalAmount, e.target.value)}
                                        className="bg-brand-offwhite text-xs text-brand-black p-2 rounded-lg border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-black font-mono"
                                      />
                                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-brand-offwhite border border-brand-border text-xs font-mono">
                                        <span className="text-brand-muted text-[10px]">Change Due:</span>
                                        <span className="font-bold text-emerald-700">
                                          ₹{cashCalculators[orderId]?.changeDue || 0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* OTP Input & Confirm Button */}
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-brand-muted block mb-1.5">
                                    Enter 4-Digit Customer OTP
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      value={otpInputs[orderId] || ''}
                                      onChange={(e) => handleOtpChange(orderId, e.target.value)}
                                      placeholder="••••"
                                      className="flex-1 bg-brand-surface text-center tracking-[0.4em] font-mono text-lg font-bold text-brand-black py-2 rounded-xl border border-brand-border focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/30 placeholder-neutral-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteOrder(order)}
                                      disabled={actionInProgressId === orderId || (otpInputs[orderId] || '').length !== 4}
                                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                      {actionInProgressId === orderId ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                      ) : (
                                        <CheckCircle2 size={14} />
                                      )}
                                      <span>Verify & Deliver</span>
                                    </button>
                                  </div>
                                  {otpErrors[orderId] && (
                                    <p className="text-[11px] text-rose-600 mt-1.5 font-mono">
                                      {otpErrors[orderId]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Column: Sticky Live Radar Map with SLEEK BLACK BORDER (5 cols) */}
                <div className="xl:col-span-5 sticky top-24 space-y-4">
                  {/* Map Container with Sleek Black Border as requested by user */}
                  <div className="rounded-2xl border-2 border-brand-black bg-black shadow-lg overflow-hidden">
                    <div className="p-3.5 bg-brand-black border-b border-white/10 flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Radio size={14} className="text-amber-400 animate-pulse" />
                        <span className="font-serif font-bold text-xs uppercase tracking-wider">
                          Fleet Radar & Route
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                        Live GPS Telemetry
                      </span>
                    </div>

                    <div className="p-1 bg-black">
                      <LiveDeliveryMap
                        storeHub={{
                          name: currentMapOrder?.stores?.[0]?.name || currentMapOrder?.store?.name || currentMapOrder?.vendor?.storeName || 'Patel Optical Main Atelier',
                          address: currentMapOrder?.stores?.[0]?.address || currentMapOrder?.store?.address || 'Indore Central Hub',
                          latitude: 22.7196,
                          longitude: 75.8577,
                        }}
                        customerDestination={{
                          name: currentMapOrder?.deliveryAddress?.fullName || currentMapOrder?.customer?.name || 'Customer Dropoff',
                          address: currentMapOrder?.deliveryAddress?.address || 'Doorstep Destination',
                          latitude: 22.7350,
                          longitude: 75.8820,
                        }}
                        deliveryBoy={{
                          name: profile?.name || user?.name || 'Rider Courier',
                          vehicleType: profile?.vehicleType || 'Motorcycle',
                          vehicleNumber: profile?.vehicleNumber || 'MP-09-EV-4821',
                          phone: profile?.phone || '9876543210',
                          rating: profile?.rating || 4.9,
                          currentLocation: profile?.currentLocation || {
                            latitude: 22.7245,
                            longitude: 75.8690,
                            speed: 32,
                            heading: 65,
                            batteryLevel: 84,
                          },
                        }}
                        height="h-[460px] sm:h-[520px]"
                        orderNumber={currentMapOrder?._id?.slice(-6)?.toUpperCase() || 'DISPATCH'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 2: ORDER PIPELINE KANBAN VIEW */}
          {/* ======================================================================= */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-base font-serif font-bold text-brand-black flex items-center gap-2">
                    <Kanban size={18} className="text-brand-accent" />
                    Dispatch Pipeline Kanban
                  </h2>
                  <p className="text-xs text-brand-muted">
                    Real-time order movement across dispatch lifecycle
                  </p>
                </div>
                <span className="text-xs font-mono text-brand-muted">
                  Total: {activeOrders.length + completedOrders.length} tasks
                </span>
              </div>

              {/* 4 Kanban Columns matching Admin/Vendor styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {/* Column 1: Assigned */}
                <div className="rounded-2xl bg-brand-surface border border-brand-border/80 p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-border/70">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <Clock size={13} />
                      Assigned (New)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900">
                      {activeOrders.filter((o) => o.deliveryStatus === 'assigned').length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeOrders.filter((o) => o.deliveryStatus === 'assigned').map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-brand-offwhite border border-brand-border/70 hover:border-brand-accent/50 transition-colors text-left space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand-black">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-amber-800 font-mono font-bold">
                            ₹{order.totalAmount || order.totalPrice}
                          </span>
                        </div>
                        <p className="text-xs text-brand-charcoal font-medium truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <p className="text-[11px] text-brand-muted truncate">
                          {order.deliveryAddress?.address || 'Indore'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAcceptOrder(order._id)}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Accept Dispatch
                        </button>
                      </div>
                    ))}
                    {activeOrders.filter((o) => o.deliveryStatus === 'assigned').length === 0 && (
                      <p className="text-[11px] text-brand-muted py-6 text-center font-mono">
                        No pending dispatches
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: In Transit */}
                <div className="rounded-2xl bg-brand-surface border border-brand-border/80 p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-border/70">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Bike size={13} />
                      In Transit
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-900">
                      {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-brand-offwhite border border-blue-200 text-left space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand-black">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-blue-800 font-mono font-bold">~3.4 km</span>
                        </div>
                        <p className="text-xs text-brand-charcoal font-medium truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <p className="text-[11px] text-brand-muted truncate">
                          {order.deliveryAddress?.address || 'Indore'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('dispatch');
                            setActiveMapOrderId(order._id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-brand-surface hover:bg-brand-cream text-xs font-semibold text-brand-charcoal border border-brand-border/70 cursor-pointer"
                        >
                          Open Console
                        </button>
                      </div>
                    ))}
                    {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').length === 0 && (
                      <p className="text-[11px] text-brand-muted py-6 text-center font-mono">
                        No active transit rides
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 3: Delivered Today */}
                <div className="rounded-2xl bg-brand-surface border border-brand-border/80 p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-border/70">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Delivered Today
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900">
                      {completedOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {completedOrders.map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-brand-offwhite border border-brand-border/70 text-left space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-brand-black">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-mono font-bold">+₹85</span>
                        </div>
                        <p className="text-xs text-brand-charcoal truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-brand-muted font-mono pt-1">
                          <span>OTP Verified</span>
                          <span>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Delivered'}</span>
                        </div>
                      </div>
                    ))}
                    {completedOrders.length === 0 && (
                      <p className="text-[11px] text-brand-muted py-6 text-center font-mono">
                        No delivered orders yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 4: Exceptions */}
                <div className="rounded-2xl bg-brand-surface border border-brand-border/80 p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-brand-border/70">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      Exceptions
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-900">
                      0
                    </span>
                  </div>

                  <div className="p-6 text-center space-y-2">
                    <ShieldCheck size={28} className="text-emerald-600 mx-auto" />
                    <p className="text-xs font-medium text-brand-charcoal">Zero Delivery Failures</p>
                    <p className="text-[10px] text-brand-muted font-mono">100% successful fulfillment record</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 3: COD & CASH REMITTANCE HUB */}
          {/* ======================================================================= */}
          {activeTab === 'remittance' && (
            <div className="space-y-5 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-serif font-bold text-brand-black flex items-center gap-2">
                    <Wallet size={18} className="text-brand-accent" />
                    COD & Cash Settlement Ledger
                  </h2>
                  <p className="text-xs text-brand-muted">
                    Enterprise cash-in-hand monitoring, shift payouts, and store remittance
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRemitCashModalOpen(true)}
                  disabled={todayCodCollected === 0}
                  className="px-4 py-2 rounded-xl bg-brand-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Receipt size={14} />
                  <span>Remit Cash to Hub</span>
                </button>
              </div>

              {/* Cash Telemetry KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Cash in Hand (Unremitted)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-brand-black">
                      ₹{todayCodCollected}
                    </span>
                    <span className="text-xs text-brand-muted font-mono">/ ₹10k max</span>
                  </div>
                  <div className="w-full bg-brand-offwhite rounded-full h-2 overflow-hidden border border-brand-border/60">
                    <div
                      className={`h-full transition-all ${codPercentage > 80 ? 'bg-rose-500' : 'bg-brand-accent'}`}
                      style={{ width: `${codPercentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-brand-muted font-mono">
                    {codPercentage}% of daily cash holding limit reached
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Shift Earnings
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-emerald-700">
                      ₹{todayEarnings}
                    </span>
                    <span className="text-xs text-emerald-800 font-mono">Disbursable</span>
                  </div>
                  <p className="text-[11px] text-brand-muted font-mono">
                    ₹60 base fee + ₹25 fuel allowance per drop
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                    Settled Parcels
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-brand-black">
                      {completedOrders.length}
                    </span>
                    <span className="text-xs text-brand-muted font-mono">delivered</span>
                  </div>
                  <p className="text-[11px] text-brand-muted font-mono">
                    100% verified via customer OTP
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="rounded-2xl border border-brand-border/80 bg-brand-surface overflow-hidden shadow-xs">
                <div className="p-4 bg-brand-offwhite/80 border-b border-brand-border/70 flex items-center justify-between">
                  <span className="font-serif font-bold text-xs uppercase tracking-wider text-brand-black">
                    Cash & Settlement Audit Log
                  </span>
                  <span className="text-xs text-brand-muted font-mono">
                    Auto-reconciled with Merchant Master
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-offwhite/50 text-[10px] uppercase font-bold text-brand-muted font-mono border-b border-brand-border/70">
                      <tr>
                        <th className="py-3 px-4">Order Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Rider Earned</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/60 font-mono text-brand-charcoal">
                      {completedOrders.map((order) => {
                        const isCod = /cod|cash/i.test(order.paymentMethod || '');
                        return (
                          <tr key={order._id} className="hover:bg-brand-offwhite/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-brand-black">
                              #{order._id.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-3 px-4 text-brand-charcoal font-sans">
                              {order.deliveryAddress?.fullName || 'Customer'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCod ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}>
                                {isCod ? 'COD' : 'PREPAID'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-brand-black">
                              ₹{order.totalAmount || order.totalPrice}
                            </td>
                            <td className="py-3 px-4 text-emerald-700 font-bold">
                              +₹85
                            </td>
                            <td className="py-3 px-4 text-brand-muted text-[11px]">
                              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : 'Today'}
                            </td>
                          </tr>
                        );
                      })}
                      {completedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-brand-muted font-mono">
                            No settlement entries recorded yet today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 4: SLA ANALYTICS */}
          {/* ======================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-5 text-left">
              <div>
                <h2 className="text-base font-serif font-bold text-brand-black flex items-center gap-2">
                  <BarChart3 size={18} className="text-brand-accent" />
                  SLA & Performance Telemetry
                </h2>
                <p className="text-xs text-brand-muted">
                  Comprehensive delivery turnaround metrics and efficiency benchmarks
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-brand-muted">On-Time SLA Rate</span>
                  <p className="font-mono text-3xl font-black text-emerald-700">98.4%</p>
                  <p className="text-[11px] text-brand-muted">Benchmark: 95.0% SLA Target</p>
                </div>
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-brand-muted">Avg Delivery Speed</span>
                  <p className="font-mono text-3xl font-black text-amber-800">21.8m</p>
                  <p className="text-[11px] text-brand-muted">From pickup to customer OTP</p>
                </div>
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-brand-muted">Customer Rating</span>
                  <p className="font-mono text-3xl font-black text-brand-black">4.9 / 5.0</p>
                  <p className="text-[11px] text-brand-muted">Based on 148 customer reviews</p>
                </div>
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-brand-muted">Distance Logged</span>
                  <p className="font-mono text-3xl font-black text-blue-700">34.8 km</p>
                  <p className="text-[11px] text-brand-muted">Today's GPS tracked route</p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 5: COMPLIANCE VAULT */}
          {/* ======================================================================= */}
          {activeTab === 'compliance' && (
            <div className="space-y-5 text-left">
              <div>
                <h2 className="text-base font-serif font-bold text-brand-black flex items-center gap-2">
                  <ShieldCheck size={18} className="text-brand-accent" />
                  Vehicle & Compliance Vault
                </h2>
                <p className="text-xs text-brand-muted">
                  Digital KYC credentials, vehicle registration, and emergency support
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-3 font-mono text-xs">
                  <h3 className="font-serif font-bold text-sm text-brand-black">Vehicle Specifications</h3>
                  <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                    <span className="text-brand-muted">Vehicle Type:</span>
                    <span className="text-brand-black font-bold">{profile?.vehicleType || 'Electric Bike'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                    <span className="text-brand-muted">Registration Plate:</span>
                    <span className="text-brand-black font-bold">{profile?.vehicleNumber || 'MP-09-EV-4821'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-brand-muted">EV Battery Health:</span>
                    <span className="text-emerald-700 font-bold">96% Optimal</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-3 font-mono text-xs">
                  <h3 className="font-serif font-bold text-sm text-brand-black">KYC Documents</h3>
                  <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                    <span className="text-brand-muted">Driving License:</span>
                    <span className="text-emerald-700 font-bold">Verified Active</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-border/60">
                    <span className="text-brand-muted">Commercial Insurance:</span>
                    <span className="text-brand-black">Active through 2027</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-brand-muted">Background Verification:</span>
                    <span className="text-emerald-700">Clear • Police Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 6: DIAGNOSTICS */}
          {/* ======================================================================= */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-5 text-left">
              <div>
                <h2 className="text-base font-serif font-bold text-brand-black flex items-center gap-2">
                  <Settings size={18} className="text-brand-accent" />
                  System Diagnostics & Audio FX
                </h2>
                <p className="text-xs text-brand-muted">
                  Telemetry ping frequency, audio chime testing, and local hardware status
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border/80 shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-sm text-brand-black">Audio Synthesizer Test</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => playAudioTone('chime')}
                    className="px-3.5 py-2 rounded-xl bg-brand-offwhite hover:bg-brand-cream border border-brand-border text-xs text-brand-charcoal font-semibold cursor-pointer"
                  >
                    Play Chime
                  </button>
                  <button
                    type="button"
                    onClick={() => playAudioTone('success')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs text-emerald-800 font-semibold cursor-pointer"
                  >
                    Play Fanfare
                  </button>
                  <button
                    type="button"
                    onClick={() => playAudioTone('alert')}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-xs text-rose-800 font-semibold cursor-pointer"
                  >
                    Play Error
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS (MATCHING ADMIN/VENDOR DIALOG STYLING) */}
      {/* ========================================================================= */}
      {/* Dynamic UPI QR Code Modal */}
      {upiQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-brand-surface border border-brand-border p-6 text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setUpiQrModal(null)}
              className="absolute top-4 right-4 text-brand-muted hover:text-brand-black p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto">
              <QrCode size={26} />
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-brand-black">Instant UPI QR Payment</h3>
              <p className="text-xs text-brand-muted mt-1">
                Ask {upiQrModal.customerName} to scan with Google Pay, PhonePe, or Paytm
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto border border-brand-border/70">
              <div className="w-48 h-48 bg-neutral-50 flex flex-col items-center justify-center p-2 rounded-xl border border-neutral-200 relative">
                <QrCode size={160} className="text-black" />
                <span className="text-[10px] font-mono font-bold text-neutral-700 mt-1">
                  ORDER #{upiQrModal.orderId.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-brand-offwhite border border-brand-border font-mono">
              <span className="text-xs text-brand-muted block">Total Amount Due</span>
              <span className="text-2xl font-bold text-emerald-700">₹{upiQrModal.amount}</span>
            </div>

            <button
              type="button"
              onClick={() => setUpiQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-brand-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Payment Received & Close
            </button>
          </div>
        </div>
      )}

      {/* Decline Order Modal */}
      {declineModalOrderId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-brand-surface border border-rose-200 p-6 text-left space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-brand-black">Decline Dispatch Assignment</h3>
                <p className="text-xs text-brand-muted">Order will return to merchant hub queue</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-brand-muted block mb-1.5">
                Audit Reason for Decline
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-brand-offwhite text-xs text-brand-black p-2.5 rounded-xl border border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-black font-medium"
              >
                <option value="Vehicle mechanical issue">Vehicle mechanical / puncture issue</option>
                <option value="Far out of delivery zone">Destination is outside current service cluster</option>
                <option value="Heavy rain / weather hazard">Severe weather or road closure hazard</option>
                <option value="Package dimension oversized">Parcel dimensions exceed two-wheeler capacity</option>
                <option value="Shift concluding">End of daily scheduled driving hours</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModalOrderId(null)}
                className="py-2.5 rounded-xl bg-brand-offwhite hover:bg-brand-cream text-brand-charcoal font-bold text-xs border border-brand-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remit Cash Modal */}
      {remitCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-brand-surface border border-brand-border p-6 text-left space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setRemitCashModalOpen(false);
                setRemitNotice(null);
              }}
              className="absolute top-4 right-4 text-brand-muted hover:text-brand-black p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold">
                <Receipt size={22} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-brand-black">Hub Cash Remittance Handover</h3>
                <p className="text-xs text-brand-muted">Generate digital store manager handover receipt</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-brand-offwhite border border-brand-border space-y-2 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-brand-muted">Total Cash Collected:</span>
                <span className="text-emerald-700 font-bold text-sm">₹{todayCodCollected}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-brand-muted">Rider ID:</span>
                <span className="text-brand-charcoal">{profile?.vehicleNumber || 'MP-09-EV-4821'}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-brand-border">
                <span className="text-brand-muted">Handover Code:</span>
                <span className="text-brand-black font-bold tracking-widest">
                  REM-{Math.floor(100000 + Math.random() * 900000)}
                </span>
              </div>
            </div>

            {remitNotice ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{remitNotice}</span>
              </div>
            ) : (
              <p className="text-xs text-brand-muted leading-relaxed">
                Present this handover voucher to the store manager. Once physically counted, the manager will reconcile the balance in their vendor portal.
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setRemitNotice('Cash remittance voucher dispatched to store manager portal.');
                if (soundEnabled) playAudioTone('success');
                setTimeout(() => {
                  setRemitCashModalOpen(false);
                  setRemitNotice(null);
                }, 2000);
              }}
              className="w-full py-2.5 rounded-xl bg-brand-black hover:bg-neutral-800 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Confirm Physical Handover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
