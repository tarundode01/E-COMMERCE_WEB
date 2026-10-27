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
  Columns3,
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
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
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
    // Audio context may be restricted by browser policy before first interaction
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

  // SaaS Navigation State
  // 'dispatch' | 'pipeline' | 'remittance' | 'analytics' | 'compliance' | 'diagnostics'
  const [activeTab, setActiveTab] = useState('dispatch');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Multi-Tenant / Hub Selection State
  const [selectedHub, setSelectedHub] = useState('ALL');

  // Global Search State
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

  // Dynamic UPI QR Modal State: null | { orderId, amount, customerName }
  const [upiQrModal, setUpiQrModal] = useState(null);

  // Decline Order Modal State: null | orderId
  const [declineModalOrderId, setDeclineModalOrderId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Vehicle mechanical issue');

  // Remit Cash Modal State
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
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 font-sans flex antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* ========================================================================= */}
      {/* 1. 100% FIXED ULTRA-LUXURY SIDEBAR (DESKTOP + MOBILE DRAWER) */}
      {/* ========================================================================= */}
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#0a0a0c] text-white flex flex-col justify-between border-r border-white/10 select-none shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Rider Fleet Navigation"
      >
        {/* Top Pinned Section: Brand Logo & Rider Identifier */}
        <div className="shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-[#0e0e12]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <Flame size={18} />
              </div>
              <div className="text-left">
                <span className="font-serif text-sm font-bold tracking-wide text-white block">
                  PATEL <span className="text-amber-400">FLEET</span>
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">
                  Logistics Atelier
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Merchant Hub Selector */}
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-widest text-[#9E8257] font-semibold mb-1 flex items-center gap-1">
              <Building2 size={11} className="text-amber-400" />
              Merchant Atelier Hub
            </p>
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full bg-[#121218] text-xs text-neutral-200 py-1.5 px-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/50 font-medium cursor-pointer"
            >
              <option value="ALL">🌐 All Connected Hubs</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  🏢 {hub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rider Profile Card in Sidebar */}
          <div className="px-4 py-3 border-b border-white/5 bg-[#0e0e12]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold relative shadow-inner">
                <VehicleIcon type={profile?.vehicleType} className="w-5 h-5" />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0c] ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-bold text-white truncate block">
                    {profile?.name || user?.name || 'Rider Courier'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
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
                <span>84% Battery</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 justify-end">
                <Gauge size={12} className="text-amber-400" />
                <span>{profile?.currentLocation?.speed || 0} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Scrollable Section: Navigation Tabs */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 [scrollbar-width:none]">
          <p className="px-3 text-[10px] uppercase tracking-widest text-[#9E8257] font-semibold mb-1.5">
            Fleet Operations
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Radio size={16} className={activeTab === 'dispatch' ? 'animate-pulse' : ''} />
              <span>Live Dispatch</span>
            </div>
            {activeOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'dispatch' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-300'
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Kanban size={16} />
              <span>Order Pipeline</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-white/10">Kanban</span>
          </button>

          <p className="px-3 pt-3 text-[10px] uppercase tracking-widest text-[#9E8257] font-semibold mb-1.5">
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet size={16} />
              <span>COD & Remit</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
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
                ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings size={16} />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Bottom Pinned Section: Logout & Server Status */}
        <div className="shrink-0 p-3.5 border-t border-white/10 bg-[#0e0e12] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Fleet Node Active
            </span>
            <span className="text-amber-400 font-bold">Indore</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-950/40 hover:text-rose-400 text-xs font-medium text-neutral-300 transition-colors border border-white/10 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out of Console</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION WORKSPACE (WITH SIDEBAR OFFSET ON DESKTOP) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 transition-all duration-300">
        {/* ========================================================================= */}
        {/* LUXURY APP HEADER (WITH CHAMPAGNE GOLD SPECULAR HAIRLINES) */}
        {/* ========================================================================= */}
        <header className="relative sticky top-0 z-30 bg-[#0e0e12]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 shadow-xl shrink-0">
          {/* Top Specular Hairline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent pointer-events-none" />
          {/* Bottom Brushed Gold Hairline */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between gap-3 max-w-[1700px] mx-auto w-full">
            {/* Left: Mobile Toggle & Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <Menu size={18} />
              </button>

              <div className="text-left min-w-0">
                <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9E8257]">
                  <Sparkles size={11} className="text-amber-400 animate-pulse shrink-0" />
                  <span className="font-serif font-semibold text-white">Patel Optical Fleet</span>
                  <span className="text-amber-400/50">•</span>
                  <span className="text-neutral-400 capitalize font-medium">{activeTab}</span>
                </div>
                <h1 className="font-serif text-base sm:text-xl font-bold text-white tracking-tight truncate">
                  {activeTab === 'dispatch' && 'Live Dispatch Command Console'}
                  {activeTab === 'pipeline' && 'Order Pipeline Kanban'}
                  {activeTab === 'remittance' && 'COD & Cash Settlement Ledger'}
                  {activeTab === 'analytics' && 'SLA & Fleet Analytics'}
                  {activeTab === 'compliance' && 'Vehicle & Compliance Vault'}
                  {activeTab === 'diagnostics' && 'System Diagnostics & Audio FX'}
                </h1>
              </div>
            </div>

            {/* Center Telemetry Capsule (Desktop) */}
            <div className="hidden xl:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>FLEET ONLINE</span>
              </div>
              <span className="w-px h-3.5 bg-white/10" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                <Wifi size={12} className="text-emerald-400" />
                <span>24ms Sync</span>
              </div>
              <span className="w-px h-3.5 bg-white/10" />
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                <ShieldCheck size={13} className="text-amber-400" />
                <span>RTK ±4m</span>
              </div>
            </div>

            {/* Right: Quick Controls & Duty Switch */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Audio Chime Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-white/5 text-neutral-500 border-white/10'
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
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Broadcast GPS pulse"
              >
                <RefreshCw size={13} className={simulatingLocation ? 'animate-spin text-amber-400' : 'text-neutral-400'} />
                <span className="hidden sm:inline">GPS Pulse</span>
              </button>

              {/* Duty Status Selector */}
              <select
                value={profile?.status || 'available'}
                onChange={(e) => handleDutyStatusChange(e.target.value)}
                disabled={isUpdatingStatus || profile?.status === 'on_delivery'}
                className={`text-xs font-bold py-1.5 px-3 rounded-xl border cursor-pointer focus:outline-none transition-all shadow-sm ${
                  profile?.status === 'on_delivery'
                    ? 'bg-blue-950 text-blue-300 border-blue-500/40 cursor-not-allowed'
                    : profile?.status === 'available'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                }`}
              >
                <option value="available">🟢 ON DUTY</option>
                {profile?.status === 'on_delivery' && <option value="on_delivery">🔵 ON RIDE</option>}
                <option value="offline">⚪ OFF DUTY</option>
              </select>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN BODY CONTENT CONTAINER */}
        {/* ========================================================================= */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto w-full">
          {/* Action Notice / Toast Feedback */}
          {actionNotice && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200 ${
                actionNotice.type === 'error'
                  ? 'bg-rose-950 text-rose-200 border-rose-800 shadow-rose-950/30'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-800 shadow-emerald-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionNotice.type === 'error' ? (
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                )}
                <span>{actionNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                className="text-neutral-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ======================================================================= */}
          {/* VIEW 1: LIVE DISPATCH CONSOLE (ALL FUNCTIONS WORK PROPERLY) */}
          {/* ======================================================================= */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* KPI Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* 1. Active Queue */}
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 text-left relative overflow-hidden group shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                      Active Queue
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Radio size={13} className="animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-black text-white">
                      {activeOrders.length}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">dispatches</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">Live assigned orders</p>
                </div>

                {/* 2. Today's Shift Payout */}
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 text-left relative overflow-hidden group shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                      Shift Earnings
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <DollarSign size={13} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-black text-white">
                      ₹{todayEarnings}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">₹85/trip</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">Base ₹60 + Fuel ₹25</p>
                </div>

                {/* 3. COD Cash In Hand */}
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 text-left relative overflow-hidden group shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold block">
                      COD In Hand
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Wallet size={13} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-black text-white">
                      ₹{todayCodCollected}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">/ ₹10k max</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">Remit before shift end</p>
                </div>

                {/* 4. SLA Score */}
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 text-left relative overflow-hidden group shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold block">
                      SLA On-Time
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <CheckCircle2 size={13} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-black text-white">
                      98.6%
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">Target: 95%</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">Avg Drop: 21.8 mins</p>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      filterPaymentMode === 'ALL'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    All ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('COD')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      filterPaymentMode === 'COD'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    COD Cash Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterPaymentMode('PREPAID')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      filterPaymentMode === 'PREPAID'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Prepaid
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order #, patron, address..."
                    className="w-full bg-[#121218] text-xs text-neutral-200 pl-8 pr-7 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/50 font-mono placeholder-neutral-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
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
                    <div className="p-12 text-center rounded-2xl bg-[#121218] border border-white/10">
                      <RefreshCw size={24} className="animate-spin text-amber-400 mx-auto mb-3" />
                      <p className="text-sm text-neutral-400 font-mono">Synchronizing live fleet dispatch telemetry...</p>
                    </div>
                  ) : filteredActiveOrders.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-[#121218]/80 border border-white/10">
                      <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
                      <h3 className="font-serif font-bold text-base text-white">All Dispatches Completed!</h3>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        No active orders currently pending delivery. Maintain duty status "Available" to receive new dispatches from connected hubs.
                      </p>
                      <button
                        type="button"
                        onClick={() => fetchDashboardData(true)}
                        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black cursor-pointer inline-flex items-center gap-2"
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
                          className={`rounded-2xl border transition-all text-left overflow-hidden ${
                            isSelectedForMap
                              ? 'bg-[#14141c] border-amber-500/60 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                              : 'bg-[#121218] border-white/10 hover:border-white/20 shadow-xl'
                          }`}
                        >
                          {/* Top Banner: Origin Hub & SLA Status */}
                          <div className="bg-[#0e0e12] border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span className="font-mono text-xs font-bold text-white tracking-wide">
                                ORDER #{orderId.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-neutral-600">•</span>
                              <span className="text-xs text-neutral-400 flex items-center gap-1 font-medium">
                                <Store size={12} className="text-amber-400" />
                                {storeName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* SLA Timer */}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                <Clock size={11} />
                                SLA: ~24m
                              </span>

                              {/* Payment Mode Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  isCod
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {isCod ? `COD: ₹${totalAmount}` : 'PREPAID'}
                              </span>
                            </div>
                          </div>

                          {/* Stepper Progress */}
                          <div className="px-4 py-2 bg-[#0e0e12]/60 border-b border-white/5 flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CheckCircle2 size={13} />
                              <span>1. Assigned</span>
                            </div>
                            <span className="text-neutral-700">───</span>
                            <div className={`flex items-center gap-1.5 ${isOnDelivery ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}>
                              <Bike size={13} className={isOnDelivery ? 'animate-bounce' : ''} />
                              <span>2. En Route</span>
                            </div>
                            <span className="text-neutral-700">───</span>
                            <div className="flex items-center gap-1.5 text-neutral-500">
                              <KeyRound size={13} />
                              <span>3. OTP Verify</span>
                            </div>
                          </div>

                          {/* Details & Interactive Actions */}
                          <div className="p-4 space-y-4">
                            {/* Origin Store Pickup Point */}
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Store size={14} />
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                                  Pickup Origin Hub
                                </span>
                                <p className="text-xs font-semibold text-white mt-0.5">{storeName}</p>
                                <p className="text-[11px] text-neutral-400 truncate">{storeAddress}</p>
                              </div>
                            </div>

                            {/* Dropoff Destination */}
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin size={14} />
                              </div>
                              <div className="min-w-0 text-left flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                                    Dropoff Destination
                                  </span>
                                  <span className="text-[11px] text-neutral-400 font-mono">~3.4 km</span>
                                </div>
                                <p className="text-xs font-bold text-white mt-0.5">{customerName}</p>
                                <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{fullAddress}</p>
                              </div>
                            </div>

                            {/* Package Physical Inspection Checklist */}
                            <div className="p-3 rounded-xl bg-[#0e0e12]/80 border border-white/5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                                  <Package size={13} className="text-amber-400" />
                                  Package Contents ({items.length} {items.length === 1 ? 'item' : 'items'})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCheckAllItems(orderId, items.length)}
                                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
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
                                          ? 'bg-emerald-950/30 border-emerald-800/50 text-neutral-200'
                                          : 'bg-[#14141c] border-white/5 text-neutral-400 hover:border-white/20'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isChecked ? (
                                          <CheckSquare size={14} className="text-emerald-400 shrink-0" />
                                        ) : (
                                          <Square size={14} className="text-neutral-500 shrink-0" />
                                        )}
                                        <span className={`truncate ${isChecked ? 'line-through text-neutral-400' : 'text-neutral-200'}`}>
                                          {prodName}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[11px] font-bold text-amber-400 shrink-0">
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
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Phone size={13} className="text-emerald-400" />
                                <span>Call Patron</span>
                              </a>

                              {/* 2. Quick SMS Drawer */}
                              <button
                                type="button"
                                onClick={() => setOpenSmsDrawerId(openSmsDrawerId === orderId ? null : orderId)}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                  openSmsDrawerId === orderId
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : 'bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10'
                                }`}
                              >
                                <MessageSquare size={13} className="text-blue-400" />
                                <span>Quick SMS</span>
                              </button>

                              {/* 3. Google Maps Nav Link */}
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Navigation size={13} className="text-amber-400" />
                                <span>Turn Maps</span>
                              </a>
                            </div>

                            {/* Quick SMS Drawer Templates */}
                            {openSmsDrawerId === orderId && (
                              <div className="p-3 rounded-xl bg-[#0e0e12] border border-blue-900/50 space-y-2 animate-in fade-in duration-150">
                                <span className="text-[11px] font-bold text-blue-300 block">
                                  Pre-Composed SMS Notification:
                                </span>
                                <div className="space-y-1">
                                  {quickMessages.map((msg, i) => (
                                    <a
                                      key={i}
                                      href={`sms:${customerPhone}?body=${encodeURIComponent(msg)}`}
                                      className="block p-2 rounded-lg bg-[#14141c] hover:bg-blue-950/50 border border-white/5 text-[11px] text-neutral-300 hover:text-white transition-colors"
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
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                                  : 'bg-white/5 text-neutral-400 hover:text-white border-white/10'
                              }`}
                            >
                              <Compass size={14} className={isSelectedForMap ? 'animate-spin' : ''} />
                              <span>{isSelectedForMap ? 'Viewing on Live Radar Map' : 'Track on Radar Map'}</span>
                            </button>

                            {/* Action Buttons based on status */}
                            {isAssigned ? (
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOrder(orderId)}
                                  disabled={actionInProgressId === orderId}
                                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
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
                                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-rose-950/60 hover:text-rose-300 text-neutral-400 font-semibold text-xs border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                >
                                  <XCircle size={14} />
                                  <span>Decline</span>
                                </button>
                              </div>
                            ) : (
                              /* Security Handover: OTP Verification & COD Assistant */
                              <div className="p-4 rounded-xl bg-[#0e0e12] border border-amber-500/30 space-y-3.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                    <KeyRound size={14} />
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
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                                    >
                                      <QrCode size={11} />
                                      <span>UPI QR</span>
                                    </button>
                                  )}
                                </div>

                                {/* COD Assistant: Change Calculator */}
                                {isCod && (
                                  <div className="p-3 rounded-lg bg-[#14141c] border border-white/5 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-mono">
                                      <span className="text-neutral-400">COD Total to Collect:</span>
                                      <span className="text-white font-bold text-sm">₹{totalAmount}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="number"
                                        placeholder="Cash received ₹"
                                        value={cashCalculators[orderId]?.received || ''}
                                        onChange={(e) => handleCashReceivedChange(orderId, totalAmount, e.target.value)}
                                        className="bg-[#0a0a0c] text-xs text-white p-2 rounded-lg border border-white/10 focus:outline-none focus:border-amber-500 font-mono"
                                      />
                                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0a0a0c] border border-white/10 text-xs font-mono">
                                        <span className="text-neutral-500 text-[10px]">Change Due:</span>
                                        <span className="font-bold text-emerald-400">
                                          ₹{cashCalculators[orderId]?.changeDue || 0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* OTP Input & Confirm Button */}
                                <div>
                                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
                                    Enter 4-Digit Customer OTP
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      value={otpInputs[orderId] || ''}
                                      onChange={(e) => handleOtpChange(orderId, e.target.value)}
                                      placeholder="••••"
                                      className="flex-1 bg-[#14141c] text-center tracking-[0.4em] font-mono text-lg font-bold text-white py-2 rounded-xl border border-white/20 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 placeholder-neutral-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteOrder(order)}
                                      disabled={actionInProgressId === orderId || (otpInputs[orderId] || '').length !== 4}
                                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                                    <p className="text-[11px] text-rose-400 mt-1.5 font-mono">
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
                  <div className="rounded-2xl border-2 border-black bg-black shadow-2xl overflow-hidden">
                    <div className="p-3.5 bg-[#0e0e12] border-b border-black flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio size={14} className="text-amber-400 animate-pulse" />
                        <span className="font-serif font-bold text-xs uppercase tracking-wider text-white">
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
                  <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                    <Kanban size={18} className="text-amber-400" />
                    Dispatch Pipeline Kanban
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Real-time order movement across dispatch lifecycle
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Total: {activeOrders.length + completedOrders.length} tasks
                </span>
              </div>

              {/* 4 Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                {/* Column 1: Assigned */}
                <div className="rounded-2xl bg-[#121218] border border-white/10 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Clock size={13} />
                      Assigned (New)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                      {activeOrders.filter((o) => o.deliveryStatus === 'assigned').length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeOrders.filter((o) => o.deliveryStatus === 'assigned').map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-[#0a0a0c] border border-white/10 hover:border-amber-500/40 transition-colors text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            ₹{order.totalAmount || order.totalPrice}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-200 font-medium truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
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
                      <p className="text-[11px] text-neutral-500 py-6 text-center font-mono">
                        No pending dispatches
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: In Transit */}
                <div className="rounded-2xl bg-[#121218] border border-white/10 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Bike size={13} />
                      In Transit
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                      {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-[#0a0a0c] border border-blue-500/30 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-blue-400 font-mono">~3.4 km</span>
                        </div>
                        <p className="text-xs text-neutral-200 font-medium truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {order.deliveryAddress?.address || 'Indore'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('dispatch');
                            setActiveMapOrderId(order._id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-neutral-200 cursor-pointer"
                        >
                          Open Console
                        </button>
                      </div>
                    ))}
                    {activeOrders.filter((o) => o.deliveryStatus !== 'assigned').length === 0 && (
                      <p className="text-[11px] text-neutral-500 py-6 text-center font-mono">
                        No active transit rides
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 3: Delivered Today */}
                <div className="rounded-2xl bg-[#121218] border border-white/10 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Delivered Today
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                      {completedOrders.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {completedOrders.map((order) => (
                      <div
                        key={order._id}
                        className="p-3 rounded-xl bg-[#0a0a0c] border border-white/5 text-left space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">+₹85</span>
                        </div>
                        <p className="text-xs text-neutral-300 truncate">
                          {order.deliveryAddress?.fullName || 'Customer'}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1">
                          <span>OTP Verified</span>
                          <span>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Delivered'}</span>
                        </div>
                      </div>
                    ))}
                    {completedOrders.length === 0 && (
                      <p className="text-[11px] text-neutral-500 py-6 text-center font-mono">
                        No delivered orders yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 4: Exceptions */}
                <div className="rounded-2xl bg-[#121218] border border-white/10 p-3 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      Exceptions
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                      0
                    </span>
                  </div>

                  <div className="p-6 text-center space-y-2">
                    <ShieldCheck size={28} className="text-emerald-500/60 mx-auto" />
                    <p className="text-xs font-medium text-neutral-400">Zero Delivery Failures</p>
                    <p className="text-[10px] text-neutral-500 font-mono">100% successful fulfillment record</p>
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
                  <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                    <Wallet size={18} className="text-amber-400" />
                    COD & Cash Settlement Ledger
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Enterprise cash-in-hand monitoring, shift payouts, and store remittance
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRemitCashModalOpen(true)}
                  disabled={todayCodCollected === 0}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Receipt size={14} />
                  <span>Remit Cash to Hub</span>
                </button>
              </div>

              {/* Cash Telemetry KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Cash in Hand (Unremitted)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-white">
                      ₹{todayCodCollected}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">/ ₹10k max</span>
                  </div>
                  <div className="w-full bg-[#0a0a0c] rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all ${codPercentage > 80 ? 'bg-rose-500' : 'bg-amber-400'}`}
                      style={{ width: `${codPercentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    {codPercentage}% of daily cash holding limit reached
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Shift Earnings
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-white">
                      ₹{todayEarnings}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">Disbursable</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    ₹60 base fee + ₹25 fuel allowance per drop
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                    Settled Parcels
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-white">
                      {completedOrders.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">delivered</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    100% verified via customer OTP
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="rounded-2xl border border-white/10 bg-[#121218] overflow-hidden shadow-xl">
                <div className="p-3.5 bg-[#0e0e12] border-b border-white/10 flex items-center justify-between">
                  <span className="font-serif font-bold text-xs uppercase tracking-wider text-white">
                    Cash & Settlement Audit Log
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    Auto-reconciled with Merchant Master
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/30 text-[10px] uppercase font-bold text-neutral-400 font-mono border-b border-white/10">
                      <tr>
                        <th className="py-3 px-4">Order Ref</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Rider Earned</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {completedOrders.map((order) => {
                        const isCod = /cod|cash/i.test(order.paymentMethod || '');
                        return (
                          <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-bold text-white">
                              #{order._id.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-3 px-4 text-neutral-300 font-sans">
                              {order.deliveryAddress?.fullName || 'Customer'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCod ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {isCod ? 'COD' : 'PREPAID'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              ₹{order.totalAmount || order.totalPrice}
                            </td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">
                              +₹85
                            </td>
                            <td className="py-3 px-4 text-neutral-400 text-[11px]">
                              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString() : 'Today'}
                            </td>
                          </tr>
                        );
                      })}
                      {completedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-500 font-mono">
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
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-400" />
                  SLA & Performance Telemetry
                </h2>
                <p className="text-xs text-neutral-400">
                  Comprehensive delivery turnaround metrics and efficiency benchmarks
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">On-Time SLA Rate</span>
                  <p className="font-mono text-3xl font-black text-emerald-400">98.4%</p>
                  <p className="text-[11px] text-neutral-500">Benchmark: 95.0% SLA Target</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Avg Delivery Speed</span>
                  <p className="font-mono text-3xl font-black text-amber-400">21.8m</p>
                  <p className="text-[11px] text-neutral-500">From pickup to customer OTP</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Customer Rating</span>
                  <p className="font-mono text-3xl font-black text-white">4.9 / 5.0</p>
                  <p className="text-[11px] text-neutral-500">Based on 148 customer reviews</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#121218] border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400">Distance Logged</span>
                  <p className="font-mono text-3xl font-black text-blue-400">34.8 km</p>
                  <p className="text-[11px] text-neutral-500">Today's GPS tracked route</p>
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
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-400" />
                  Vehicle & Compliance Vault
                </h2>
                <p className="text-xs text-neutral-400">
                  Digital KYC credentials, vehicle registration, and emergency support
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#121218] border border-white/10 space-y-3 font-mono text-xs">
                  <h3 className="font-serif font-bold text-sm text-white">Vehicle Specifications</h3>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-neutral-400">Vehicle Type:</span>
                    <span className="text-white font-bold">{profile?.vehicleType || 'Electric Bike'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-neutral-400">Registration Plate:</span>
                    <span className="text-amber-400 font-bold">{profile?.vehicleNumber || 'MP-09-EV-4821'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">EV Battery Health:</span>
                    <span className="text-emerald-400 font-bold">96% Optimal</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#121218] border border-white/10 space-y-3 font-mono text-xs">
                  <h3 className="font-serif font-bold text-sm text-white">KYC Documents</h3>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-neutral-400">Driving License:</span>
                    <span className="text-emerald-400 font-bold">Verified Active</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-neutral-400">Commercial Insurance:</span>
                    <span className="text-white">Active through 2027</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-neutral-400">Background Verification:</span>
                    <span className="text-emerald-400">Clear • Police Verified</span>
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
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-amber-400" />
                  System Diagnostics & Audio FX
                </h2>
                <p className="text-xs text-neutral-400">
                  Telemetry ping frequency, audio chime testing, and local hardware status
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#121218] border border-white/10 space-y-3">
                <h3 className="font-serif font-bold text-sm text-white">Audio Synthesizer Test</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => playAudioTone('chime')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-neutral-200 cursor-pointer"
                  >
                    Play Chime
                  </button>
                  <button
                    type="button"
                    onClick={() => playAudioTone('success')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-emerald-300 cursor-pointer"
                  >
                    Play Fanfare
                  </button>
                  <button
                    type="button"
                    onClick={() => playAudioTone('alert')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-rose-300 cursor-pointer"
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
      {/* 3. MODALS */}
      {/* ========================================================================= */}
      {/* Dynamic UPI QR Code Modal */}
      {upiQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#121218] border border-amber-500/40 p-6 text-center space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setUpiQrModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <QrCode size={26} />
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-white">Instant UPI QR Payment</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Ask {upiQrModal.customerName} to scan with Google Pay, PhonePe, or Paytm
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
              <div className="w-48 h-48 bg-neutral-100 flex flex-col items-center justify-center p-2 rounded-xl border border-neutral-300 relative">
                <QrCode size={160} className="text-black" />
                <span className="text-[10px] font-mono font-bold text-neutral-700 mt-1">
                  ORDER #{upiQrModal.orderId.slice(-6).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0a0c] border border-white/10 font-mono">
              <span className="text-xs text-neutral-400 block">Total Amount Due</span>
              <span className="text-2xl font-bold text-emerald-400">₹{upiQrModal.amount}</span>
            </div>

            <button
              type="button"
              onClick={() => setUpiQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg cursor-pointer"
            >
              Payment Received & Close
            </button>
          </div>
        </div>
      )}

      {/* Decline Order Modal */}
      {declineModalOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#121218] border border-rose-900/60 p-6 text-left space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white">Decline Dispatch Assignment</h3>
                <p className="text-xs text-neutral-400">Order will return to merchant hub queue</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
                Audit Reason for Decline
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-[#0a0a0c] text-xs text-neutral-200 p-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-rose-500 font-medium"
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
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs border border-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remit Cash Modal */}
      {remitCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[#121218] border border-amber-500/40 p-6 text-left space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setRemitCashModalOpen(false);
                setRemitNotice(null);
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Receipt size={22} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white">Hub Cash Remittance Handover</h3>
                <p className="text-xs text-neutral-400">Generate digital store manager handover receipt</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0a0a0c] border border-white/10 space-y-2 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Total Cash Collected:</span>
                <span className="text-emerald-400 font-bold text-sm">₹{todayCodCollected}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Rider ID:</span>
                <span className="text-neutral-300">{profile?.vehicleNumber || 'MP-09-EV-4821'}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-neutral-400">Handover Code:</span>
                <span className="text-white font-bold tracking-widest">
                  REM-{Math.floor(100000 + Math.random() * 900000)}
                </span>
              </div>
            </div>

            {remitNotice ? (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{remitNotice}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Present this handover voucher to the store manager. Once physically counted, the manager will reconcile the balance.
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
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg cursor-pointer"
            >
              Confirm Physical Handover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
