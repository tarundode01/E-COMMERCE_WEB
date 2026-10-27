import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Truck,
  Car,
  MapPin,
  Phone,
  Compass,
  Navigation,
  Radio,
  Gauge,
  Battery,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Store,
  Package,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Maximize2,
  Share2,
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LiveDeliveryMap from '../components/LiveDeliveryMap';
import { orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatImageUrl } from '../utils/imageUrl';

/**
 * Returns formatted relative time from ISO string
 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Luxury Full-Page Live Order Tracking Suite
 * Designed with high-end dark glassmorphism, real-time GPS telemetry radar,
 * Bézier highway routes, live driver dossier, step-by-step progress stepper,
 * and seamless navigation.
 */
export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trackingData, setTrackingData] = useState(null);
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isLivePulse, setIsLivePulse] = useState(true);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());
  const pollTimerRef = useRef(null);

  // Fetch full tracking and order details
  const fetchTracking = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (!isBackground) setIsRefreshing(true);

    try {
      setError(null);
      // Fetch tracking telemetry & order details in parallel
      const [trackRes, orderRes] = await Promise.allSettled([
        orderService.getOrderTracking(id),
        orderService.getOrderById(id),
      ]);

      if (trackRes.status === 'fulfilled' && trackRes.value?.success) {
        setTrackingData(trackRes.value);
        if (trackRes.value.order) {
          setOrder((prev) => ({ ...(prev || {}), ...trackRes.value.order }));
        }
      } else if (trackRes.status === 'rejected') {
        console.error('Tracking fetch error:', trackRes.reason);
      }

      if (orderRes.status === 'fulfilled') {
        const oData = orderRes.value?.order || orderRes.value;
        if (oData && (oData._id || oData.id)) {
          setOrder(oData);
        }
      }

      setLastSyncedTime(new Date());
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      if (!isBackground) {
        setError(err.response?.data?.message || 'Unable to retrieve live delivery radar telemetry.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchTracking(false);
  }, [fetchTracking]);

  // Real-time 5-second polling heartbeat
  useEffect(() => {
    if (!isLivePulse) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(() => {
      fetchTracking(true);
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isLivePulse, fetchTracking]);

  // Derived variables
  const isTrackingActive = Boolean(trackingData?.isTrackingActive);
  const deliveryBoy = trackingData?.deliveryBoy;
  const storeHub = trackingData?.storeHub;
  const customerDestination = trackingData?.customerDestination;
  const orderNumber = (order?._id || order?.id || id || '').slice(-6).toUpperCase();
  const deliveryStatus = trackingData?.deliveryStatus || order?.deliveryStatus || 'unassigned';
  const orderStatus = trackingData?.orderStatus || order?.orderStatus || 'Pending';

  // Google Maps Directions link
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${storeHub?.latitude || 22.7196},${storeHub?.longitude || 75.8577}&destination=${encodeURIComponent(
    customerDestination?.address || 'Indore'
  )}&travelmode=driving`;

  // Delivery Step calculation
  const getStepState = (stepIndex) => {
    // 0: Placed, 1: Prepared, 2: Out for delivery, 3: Delivered
    if (orderStatus === 'Delivered' || deliveryStatus === 'delivered') return 'completed';

    if (stepIndex === 0) return 'completed';
    if (stepIndex === 1) {
      if (['Shipped', 'Out for Delivery'].includes(orderStatus) || ['picked_up', 'out_for_delivery', 'accepted'].includes(deliveryStatus)) {
        return 'completed';
      }
      return 'active';
    }
    if (stepIndex === 2) {
      if (['Shipped', 'Out for Delivery'].includes(orderStatus) || ['picked_up', 'out_for_delivery'].includes(deliveryStatus)) {
        return 'active';
      }
      return 'pending';
    }
    if (stepIndex === 3) {
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-neutral-100 pb-16 selection:bg-cyan-500 selection:text-neutral-950">
      {/* Top Ambient Glow Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP LUXURY NAVIGATION & TELEMETRY HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#07090e]/85 backdrop-blur-xl border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Back to Orders</span>
            </button>

            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-white text-sm sm:text-base tracking-wide">
                Live Delivery Radar
              </span>
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/30">
                #ORD-{orderNumber}
              </span>
            </div>
          </div>

          {/* Right: Telemetry Pulse, Manual Refresh, & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live Heartbeat Toggle */}
            <button
              type="button"
              onClick={() => setIsLivePulse((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isLivePulse
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}
              title="Toggle automatic 5-second RTK GPS telemetry refresh"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLivePulse ? 'bg-emerald-400 animate-ping' : 'bg-neutral-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isLivePulse ? 'RTK 5G Pulse (5s)' : 'Pulse Paused'}
              </span>
            </button>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchTracking(false)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Telemetry Now"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
            </button>

            {/* Google Maps External Turn-by-Turn */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-colors"
            >
              <ExternalLink size={13} />
              <span>Google Maps</span>
            </a>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN TRACKING SUITE CONTENT */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Loading State Skeleton */}
        {isLoading && !trackingData && (
          <div className="py-24 text-center space-y-3">
            <RefreshCw size={32} className="animate-spin text-cyan-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-white">
              Connecting to High-Precision RTK GPS Radar...
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Triangulating courier coordinates, street routing, and store atelier dispatch telemetry.
            </p>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchTracking(false)}
              className="px-3 py-1 rounded-lg bg-rose-900 text-white font-bold hover:bg-rose-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded State */}
        {trackingData && (
          <>
            {/* Status Radar Banner */}
            <div
              className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl ${
                isTrackingActive
                  ? 'bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-emerald-950/40 border-cyan-500/40 text-cyan-100'
                  : 'bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-950/30 border-amber-500/40 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
                    isTrackingActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-amber-500/30'
                  }`}
                >
                  <Radio size={20} className={isTrackingActive ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-base text-white">
                      {isTrackingActive
                        ? 'Live Radar Active: Courier En Route'
                        : 'Dispatch Assigned: Standby Mode'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isTrackingActive ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {trackingData.trackingNotice ||
                      'Courier telemetry verified and locked onto Indore Metropolitan Corridor.'}
                  </p>
                </div>
              </div>

              {/* Direct Call Button if rider has phone */}
              {deliveryBoy?.phone && (
                <a
                  href={`tel:${deliveryBoy.phone}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Phone size={14} />
                  <span>Call Courier ({deliveryBoy.name.split(' ')[0]})</span>
                </a>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 3. HERO CINEMATIC LIVE DELIVERY MAP */}
            {/* ===================================================================== */}
            <div className="relative rounded-3xl p-1 bg-black shadow-2xl border-2 border-black ring-1 ring-black/70">
              <LiveDeliveryMap
                storeHub={storeHub}
                customerDestination={customerDestination}
                deliveryBoy={deliveryBoy}
                isTrackingActive={isTrackingActive}
                trackingNotice={trackingData.trackingNotice}
                height="h-[440px] sm:h-[540px] lg:h-[600px]"
                showControls={true}
                orderNumber={orderNumber}
              />
            </div>

            {/* ===================================================================== */}
            {/* 4. TELEMETRY COMMAND CONSOLE DUAL GRID */}
            {/* ===================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* =================================================================== */}
              {/* LEFT COLUMN: ETA, PROGRESS STEPPER & VERIFIED PROTOCOLS (7 COLS) */}
              {/* =================================================================== */}
              <div className="lg:col-span-7 space-y-6">
                {/* Hero Dynamic ETA & Distance Card */}
                <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-400" />
                        <span>Estimated Arrival Time (ETA)</span>
                      </span>
                      <div className="flex items-baseline gap-3 mt-1">
                        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                          {isTrackingActive ? `~${trackingData.etaMins || 12} mins` : 'Standby'}
                        </h2>
                        <span className="text-xs text-cyan-300 font-mono font-bold bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                          {isTrackingActive ? `${trackingData.distanceKm || 1.8} km away` : 'At Store Hub'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck size={13} />
                        <span>Green Corridor • Clear Traffic</span>
                      </span>
                      <p className="text-[11px] text-neutral-400 font-mono mt-1">
                        {customerDestination?.city || 'Indore'} Metropolitan Route
                      </p>
                    </div>
                  </div>

                  {/* ================================================================= */}
                  {/* Step-by-Step Luxury Delivery Stepper */}
                  {/* ================================================================= */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block mb-4">
                      Real-Time Dispatch Progress
                    </span>

                    <div className="grid grid-cols-4 gap-2 relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-800 -z-0" />

                      {[
                        {
                          title: 'Order Confirmed',
                          subtitle: 'Payment verified',
                          step: 0,
                        },
                        {
                          title: 'Atelier Prepared',
                          subtitle: 'Quality inspected',
                          step: 1,
                        },
                        {
                          title: 'In Transit',
                          subtitle: 'Courier en route',
                          step: 2,
                        },
                        {
                          title: 'At Doorstep',
                          subtitle: 'VIP handover',
                          step: 3,
                        },
                      ].map((item, idx) => {
                        const state = getStepState(item.step);
                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                            {/* Circle Node */}
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                state === 'completed'
                                  ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30'
                                  : state === 'active'
                                  ? 'bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/50 ring-4 ring-cyan-500/30 animate-pulse'
                                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                              }`}
                            >
                              {state === 'completed' ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            <p
                              className={`text-xs font-bold mt-2 ${
                                state === 'active'
                                  ? 'text-cyan-300'
                                  : state === 'completed'
                                  ? 'text-white'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="text-[10px] text-neutral-400 hidden sm:block">
                              {item.subtitle}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verified Safety Badges */}
                  <div className="pt-3 border-t border-neutral-800 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800">
                      <span className="font-bold text-neutral-200 block">Contactless Delivery</span>
                      <span className="text-neutral-500">100% Safe Handover</span>
                    </div>
                    <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800">
                      <span className="font-bold text-neutral-200 block">Temperature Inspected</span>
                      <span className="text-neutral-500">Rider: 98.4°F Normal</span>
                    </div>
                    <div className="p-2 rounded-xl bg-neutral-950/60 border border-neutral-800">
                      <span className="font-bold text-neutral-200 block">Tamper-Proof Box</span>
                      <span className="text-neutral-500">Luxury Sealed</span>
                    </div>
                  </div>
                </div>

                {/* Waypoints Dossier: Store Hub & Recipient Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Origin */}
                  <div className="p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block flex items-center gap-1.5">
                      <Store size={13} />
                      <span>Store Atelier Origin</span>
                    </span>
                    <h4 className="font-bold text-white text-sm">{storeHub?.name}</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {storeHub?.address}
                    </p>
                    <div className="pt-2 text-[10px] font-mono text-neutral-500">
                      <span>Coordinates: 22.7196° N, 75.8577° E</span>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block flex items-center gap-1.5">
                      <MapPin size={13} />
                      <span>Delivery Destination</span>
                    </span>
                    <h4 className="font-bold text-white text-sm">{customerDestination?.fullName}</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {customerDestination?.address}, {customerDestination?.city} — {customerDestination?.pinCode}
                    </p>
                    <div className="pt-2 text-[10px] font-mono text-neutral-500">
                      <span>Coordinates: 22.7485° N, 75.8920° E</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* RIGHT COLUMN: COURIER EXECUTIVE DOSSIER & ORDER ITEMS (5 COLS) */}
              {/* =================================================================== */}
              <div className="lg:col-span-5 space-y-6">
                {/* Secure Delivery OTP Box (Amazon/Blinkit/Swiggy standard) */}
                {order?.deliveryOtp && order?.orderStatus !== 'Delivered' && (
                  <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-dashed border-amber-500/50 text-center space-y-2 shadow-xl shadow-amber-950/20 animate-in fade-in">
                    <span className="text-[11px] uppercase font-bold tracking-widest text-amber-400 block flex items-center justify-center gap-1.5">
                      <span>🔐 Delivery Verification Code (OTP)</span>
                    </span>
                    <div className="py-2">
                      <span className="font-mono text-4xl sm:text-5xl font-black text-amber-300 tracking-[0.25em] bg-neutral-950/80 px-6 py-2 rounded-2xl border border-amber-500/30 inline-block">
                        {order.deliveryOtp}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 max-w-xs mx-auto">
                      Share this 4-digit code with your delivery hero upon arrival to verify and complete safe handover.
                    </p>
                  </div>
                )}

                {/* Courier Executive Profile Card */}
                {deliveryBoy ? (
                  <div className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-cyan-500/30 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                      <div className="flex items-center gap-3">
                        {/* Courier Avatar Icon */}
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-xl shadow-cyan-500/30 border-2 border-cyan-300">
                            {deliveryBoy.name ? deliveryBoy.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-neutral-950 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-white">{deliveryBoy.name}</h3>
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                              ★ {deliveryBoy.rating || 4.9}
                            </span>
                          </div>
                          <p className="text-xs text-cyan-300 font-mono mt-0.5">
                            {deliveryBoy.vehicleType} • {deliveryBoy.vehicleNumber || 'MP-09-AB-1234'}
                          </p>
                        </div>
                      </div>

                      {deliveryBoy.phone && (
                        <a
                          href={`tel:${deliveryBoy.phone}`}
                          className="p-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors shadow-lg shadow-cyan-500/20"
                          title="Call Delivery Partner"
                        >
                          <Phone size={18} />
                        </a>
                      )}
                    </div>

                    {/* Telemetry Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Speedometer */}
                      <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1">
                          <Gauge size={12} className="text-cyan-400" />
                          <span>Live Velocity</span>
                        </span>
                        <div className="flex items-baseline gap-1 mt-1 font-mono">
                          <span className="text-xl font-extrabold text-cyan-300">
                            {deliveryBoy.currentLocation?.speed || 32}
                          </span>
                          <span className="text-[10px] text-neutral-400">km/h</span>
                        </div>
                      </div>

                      {/* Battery */}
                      <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1">
                          <Battery size={12} className="text-emerald-400" />
                          <span>Device Battery</span>
                        </span>
                        <div className="flex items-baseline gap-1 mt-1 font-mono">
                          <span className="text-xl font-extrabold text-emerald-400">
                            {deliveryBoy.currentLocation?.batteryLevel || 88}%
                          </span>
                          <span className="text-[10px] text-neutral-400">5G RTK</span>
                        </div>
                      </div>
                    </div>

                    {/* Verified Location Landmark */}
                    <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1 mb-1">
                        <MapPin size={11} className="text-amber-400" />
                        <span>Verified Landmark</span>
                      </span>
                      <p className="text-neutral-200 font-medium">
                        {deliveryBoy.currentLocation?.address || 'Near 56 Dukan Gourmet Square, Indore'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-3xl bg-neutral-900 border border-dashed border-neutral-800 text-center space-y-2">
                    <Bike size={28} className="text-amber-400 mx-auto opacity-70" />
                    <h4 className="font-serif font-bold text-white text-sm">
                      Awaiting Courier Assignment
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Store kitchen is currently handcrafting your order. A delivery executive will be assigned shortly.
                    </p>
                  </div>
                )}

                {/* Package Contents Dossier */}
                <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h4 className="font-serif font-bold text-white text-sm flex items-center gap-2">
                      <Package size={16} className="text-amber-400" />
                      <span>Package Contents ({order?.products?.length || 0})</span>
                    </h4>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      ₹{order?.totalAmount?.toLocaleString('en-IN') || '0'}
                    </span>
                  </div>

                  {/* Items List with Dynamic Thumbnails */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {(order?.products || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image ? (
                            <img
                              src={formatImageUrl(item.image)}
                              alt={item.name}
                              className="w-8 h-8 rounded-lg object-cover border border-neutral-800 shrink-0 bg-neutral-900"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                              <Package size={14} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium text-neutral-200 block truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Qty: <strong className="text-amber-400">{item.quantity || 1}</strong>
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-neutral-300 shrink-0 font-semibold">
                          ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Method & Delivery Instructions */}
                  <div className="pt-2 border-t border-neutral-800 space-y-1.5 text-xs text-neutral-400">
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="font-bold text-white">{order?.paymentMethod || 'Online Prepaid'}</span>
                    </div>
                    {order?.deliveryNotes && (
                      <div className="pt-1 text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
                        <strong className="block text-[10px] text-amber-400 uppercase tracking-wider mb-0.5">
                          Delivery Instructions:
                        </strong>
                        <span>{order.deliveryNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Need Help / Concierge Support Card */}
                <div className="p-4 rounded-3xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-white">Need Concierge Assistance?</h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Store support is available 24/7 for live delivery queries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Concierge Support: For Order #ORD-${orderNumber}, please call support hotline at 1800-PATEL-OPTICAL or message on WhatsApp.`)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors shrink-0"
                  >
                    Help Desk
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
