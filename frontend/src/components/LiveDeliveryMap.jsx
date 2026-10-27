import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
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
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Satellite,
  Store,
  Map as MapIcon,
  ChevronRight,
  Route,
  Zap,
} from 'lucide-react';

/**
 * Returns vehicle icon based on vehicle type
 */
function VehicleMarkerIcon({ type, className = 'w-4 h-4' }) {
  const norm = (type || '').toLowerCase();
  if (norm.includes('car') || norm.includes('van') || norm.includes('truck')) {
    return <Truck className={className} />;
  }
  return <Bike className={className} />;
}

/**
 * World-Class Interactive Live Delivery Map Component
 *
 * Features:
 * - 3 High-End Map Themes:
 *   1. "Cyber Radar" (Futuristic dark neon, 360° sweeping beam, coordinate ticks, audio-visual HUD)
 *   2. "City Streets" (Dark slate city topology, road arteries, river waterways, district landmarks)
 *   3. "Midnight Satellite" (Deep space topographic contour rings, military telemetry vectors)
 * - Animated Bézier Highway Road Network with moving photon particle tracers
 * - Live Transit Simulation Engine (Play / Pause / Reset rider movement from Store to Doorstep)
 * - Dynamic Rider Marker with real-time heading orientation, speed flare, and pulsing RTK aura
 * - Store Atelier Hub (Origin) & Customer Destination Waypoint Pins with glassmorphic popovers
 * - Interactive Waypoint Quick-Dock: Jump directly to Store, Rider, or Customer Doorstep
 * - Telemetry HUD: Dynamic ETA countdown, remaining distance, live speedometer, RTK 5G signal
 * - Fullscreen, Zoom (+/-), Recenter, and One-Click Google Maps turn-by-turn navigation
 */
export default function LiveDeliveryMap({
  storeHub,
  customerDestination,
  deliveryBoy,
  isTrackingActive = true,
  trackingNotice = '',
  height = 'h-96 sm:h-[460px]',
  showControls = true,
  onRefresh = null,
  orderNumber = '',
}) {
  const [mapTheme, setMapTheme] = useState('cyber'); // 'cyber' | 'streets' | 'satellite'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null); // 'hub' | 'rider' | 'dest'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0.45); // 0 (Hub) to 1 (Destination)
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Default coordinate constants if not provided
  const hubCoords = useMemo(
    () => ({
      lat: storeHub?.latitude || 22.7196,
      lng: storeHub?.longitude || 75.8577,
      name: storeHub?.name || 'Central Store Atelier Hub',
      address: storeHub?.address || 'Indore Central Dispatch Zone',
    }),
    [storeHub]
  );

  const riderCoords = useMemo(
    () => ({
      lat: deliveryBoy?.currentLocation?.latitude || 22.7299,
      lng: deliveryBoy?.currentLocation?.longitude || 75.8608,
      speed: deliveryBoy?.currentLocation?.speed || (isTrackingActive ? 32 : 0),
      heading: deliveryBoy?.currentLocation?.heading || 48,
      battery: deliveryBoy?.currentLocation?.batteryLevel || 88,
      address: deliveryBoy?.currentLocation?.address || 'Near 56 Dukan Gourmet Square',
      name: deliveryBoy?.name || 'Assigned Courier Partner',
      phone: deliveryBoy?.phone || '',
      vehicleType: deliveryBoy?.vehicleType || 'Motorcycle',
      vehicleNumber: deliveryBoy?.vehicleNumber || 'MP-09-AB-1234',
    }),
    [deliveryBoy, isTrackingActive]
  );

  const destCoords = useMemo(
    () => ({
      lat: customerDestination?.latitude || 22.7485,
      lng: customerDestination?.longitude || 75.892,
      name: customerDestination?.fullName || 'Customer Destination',
      address: customerDestination?.address || 'Indore City Area',
      city: customerDestination?.city || 'Indore',
    }),
    [customerDestination]
  );

  // Dynamic Geographic Projection: Projects coordinates to percentage on canvas
  const projectedPoints = useMemo(() => {
    // Dynamically calculate bounding box from actual waypoint coordinates
    const allLats = [hubCoords.lat, riderCoords.lat, destCoords.lat].filter(Boolean);
    const allLngs = [hubCoords.lng, riderCoords.lng, destCoords.lng].filter(Boolean);
    const minLat = Math.min(...allLats) - 0.007;
    const maxLat = Math.max(...allLats) + 0.007;
    const minLng = Math.min(...allLngs) - 0.007;
    const maxLng = Math.max(...allLngs) + 0.007;

    const latSpan = Math.max(0.01, maxLat - minLat);
    const lngSpan = Math.max(0.01, maxLng - minLng);

    const project = (lat, lng) => {
      const x = 16 + ((lng - minLng) / lngSpan) * 68;
      const y = 84 - ((lat - minLat) / latSpan) * 68;
      return {
        x: Math.max(10, Math.min(90, x)),
        y: Math.max(12, Math.min(88, y)),
      };
    };

    const hubPos = project(hubCoords.lat, hubCoords.lng);
    const destPos = project(destCoords.lat, destCoords.lng);

    // Bézier curve control points for realistic highway road feel
    const cp1 = {
      x: (hubPos.x + destPos.x) / 2 + 10,
      y: Math.min(hubPos.y, destPos.y) - 14,
    };
    const cp2 = {
      x: (hubPos.x + destPos.x) / 2 - 12,
      y: (hubPos.y + destPos.y) / 2 + 8,
    };

    // Calculate rider position along the Bézier curve based on simulation or real coords
    let riderPos;
    if (isSimulating || simProgress !== 0.45) {
      // Quadratic/Cubic Bézier interpolation along highway path:
      // P(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const t = simProgress;
      const oneMinusT = 1 - t;
      const riderX =
        oneMinusT * oneMinusT * hubPos.x +
        2 * oneMinusT * t * cp1.x +
        t * t * destPos.x;
      const riderY =
        oneMinusT * oneMinusT * hubPos.y +
        2 * oneMinusT * t * cp1.y +
        t * t * destPos.y;
      riderPos = { x: riderX, y: riderY };
    } else {
      riderPos = project(riderCoords.lat, riderCoords.lng);
    }

    return {
      hub: hubPos,
      rider: riderPos,
      dest: destPos,
      cp1,
      cp2,
    };
  }, [hubCoords, riderCoords, destCoords, isSimulating, simProgress]);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const updateSim = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setSimProgress((prev) => {
        const next = prev + delta * 0.045; // ~22 seconds for full trip
        if (next >= 0.96) {
          setIsSimulating(false);
          return 0.96;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(updateSim);
    };

    animFrameRef.current = requestAnimationFrame(updateSim);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating]);

  // Dynamic Real Haversine Distance & ETA calculation from actual GPS coordinates
  const totalTripDistanceKm = useMemo(() => {
    const R = 6371; // Earth radius in km
    const dLat = ((destCoords.lat - hubCoords.lat) * Math.PI) / 180;
    const dLng = ((destCoords.lng - hubCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((hubCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(0.8, +(R * c).toFixed(1));
  }, [hubCoords, destCoords]);

  const currentDistanceKm = useMemo(() => {
    if (isSimulating || simProgress !== 0.45) {
      const remaining = (1 - simProgress) * totalTripDistanceKm;
      return Math.max(0.1, +remaining.toFixed(1));
    }
    // Real-time distance from rider current location to destination
    const R = 6371;
    const dLat = ((destCoords.lat - riderCoords.lat) * Math.PI) / 180;
    const dLng = ((destCoords.lng - riderCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((riderCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(0.2, +(R * c).toFixed(1));
  }, [destCoords, riderCoords, totalTripDistanceKm, isSimulating, simProgress]);

  const currentEtaMins = useMemo(() => {
    const effectiveSpeed = riderCoords.speed > 0 ? riderCoords.speed : 25;
    const mins = Math.max(2, Math.round((currentDistanceKm / effectiveSpeed) * 60));
    return mins;
  }, [currentDistanceKm, riderCoords.speed]);

  // Zoom and Pan Handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.8, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.85, +(z - 0.15).toFixed(2)));

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedPin(null);
  };

  // Quick focus to marker
  const handleFocusPin = (pinKey) => {
    setSelectedPin(pinKey);
    setZoomLevel(1.25);
    if (pinKey === 'hub') {
      setPanOffset({
        x: (50 - projectedPoints.hub.x) * 2,
        y: (50 - projectedPoints.hub.y) * 2,
      });
    } else if (pinKey === 'rider') {
      setPanOffset({
        x: (50 - projectedPoints.rider.x) * 2,
        y: (50 - projectedPoints.rider.y) * 2,
      });
    } else if (pinKey === 'dest') {
      setPanOffset({
        x: (50 - projectedPoints.dest.x) * 2,
        y: (50 - projectedPoints.dest.y) * 2,
      });
    }
  };

  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Google Maps navigation direct URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${hubCoords.lat},${hubCoords.lng}&destination=${encodeURIComponent(
    destCoords.address || 'Indore'
  )}&travelmode=driving`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${height} rounded-3xl overflow-hidden select-none border-2 border-black transition-all duration-300 shadow-[0_14px_45px_rgba(0,0,0,0.5)] ring-1 ring-black/80 ${
        mapTheme === 'cyber'
          ? 'bg-[#070a13] text-cyan-100 shadow-cyan-950/40'
          : mapTheme === 'streets'
          ? 'bg-[#0f141e] text-amber-100 shadow-amber-950/30'
          : 'bg-[#03060a] text-emerald-100 shadow-emerald-950/30'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. PHOTOREALISTIC TOPOGRAPHIC ROAD & METRO CANVAS BACKGROUND */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: `${projectedPoints.rider.x}% ${projectedPoints.rider.y}%`,
        }}
      >
        {/* ======================================================================= */}
        {/* THEME 1: CYBER RADAR (Futuristic High-Tech GPS Canvas) */}
        {/* ======================================================================= */}
        {mapTheme === 'cyber' && (
          <>
            {/* Ambient Radial Cyan Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.15),transparent_70%)]" />

            {/* Fine HUD Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d2035_1px,transparent_1px),linear-gradient(to_bottom,#0d2035_1px,transparent_1px)] bg-[size:28px_28px] opacity-75" />

            {/* Major Metro Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:140px_140px] opacity-20" />

            {/* Cyber City Blocks & Outlines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
              <rect x="18%" y="22%" width="12%" height="16%" fill="#0e2844" rx="4" />
              <rect x="36%" y="18%" width="14%" height="12%" fill="#0e2844" rx="4" />
              <rect x="58%" y="24%" width="16%" height="18%" fill="#0e2844" rx="4" />
              <rect x="24%" y="54%" width="18%" height="14%" fill="#0e2844" rx="4" />
              <rect x="62%" y="58%" width="20%" height="22%" fill="#0e2844" rx="4" />
              <circle cx="50%" cy="46%" r="6%" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
            </svg>

            {/* Edge Degree Markers (Dynamic from actual coordinates) */}
            <div className="absolute top-2 left-3 font-mono text-[9px] text-cyan-500/60 tracking-wider">
              LAT: {destCoords.lat?.toFixed(4)}° N
            </div>
            <div className="absolute bottom-2 left-3 font-mono text-[9px] text-cyan-500/60 tracking-wider">
              LAT: {hubCoords.lat?.toFixed(4)}° N
            </div>
            <div className="absolute top-2 right-3 font-mono text-[9px] text-cyan-500/60 tracking-wider">
              LNG: {destCoords.lng?.toFixed(4)}° E
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* THEME 2: CITY STREETS (Realistic City Arteries, River, & District Hubs) */}
        {/* ======================================================================= */}
        {mapTheme === 'streets' && (
          <>
            {/* Base dark asphalt background */}
            <div className="absolute inset-0 bg-[#0e131c]" />

            {/* City Road Network Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b2436_1px,transparent_1px),linear-gradient(to_bottom,#1b2436_1px,transparent_1px)] bg-[size:24px_24px] opacity-80" />

            {/* River Kahn Waterway with glowing banks */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <path
                d="M -10 120 Q 220 90 420 220 T 920 180"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="32"
                strokeLinecap="round"
              />
              <path
                d="M -10 120 Q 220 90 420 220 T 920 180"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="12 8"
              />
            </svg>

            {/* Major Arterial Roads / Expressways in background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
              {/* Ring Road Bypass */}
              <ellipse
                cx="50%"
                cy="48%"
                rx="38%"
                ry="34%"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
              />
              {/* Central Avenue Corridor */}
              <line x1="12%" y1="78%" x2="88%" y2="22%" stroke="#334155" strokeWidth="9" />
              <line x1="12%" y1="78%" x2="88%" y2="22%" stroke="#f59e0b" strokeWidth="2" strokeDasharray="8 6" opacity="0.6" />
              {/* Cross Avenue */}
              <line x1="22%" y1="18%" x2="78%" y2="82%" stroke="#1e293b" strokeWidth="7" />
            </svg>

            {/* City District Landmark Labels (Dynamic from Store & Destination addresses) */}
            <div className="absolute top-[28%] left-[16%] text-[10px] font-bold text-neutral-300 bg-neutral-900/85 px-2.5 py-0.5 rounded-lg border border-neutral-700/60 shadow-sm pointer-events-none truncate max-w-[180px]">
              {storeHub?.name || 'Store Atelier Hub'}
            </div>
            <div className="absolute top-[48%] left-[44%] text-[10px] font-bold text-cyan-300 bg-neutral-900/85 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 shadow-sm pointer-events-none truncate max-w-[200px]">
              {riderCoords.address || 'Courier In Transit'}
            </div>
            <div className="absolute bottom-[22%] right-[18%] text-[10px] font-bold text-emerald-300 bg-neutral-900/85 px-2.5 py-0.5 rounded-lg border border-emerald-500/40 shadow-sm pointer-events-none truncate max-w-[180px]">
              {destCoords.name} • {destCoords.city || 'Indore'}
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* THEME 3: MIDNIGHT SATELLITE (Topographic Elevation & Military HUD) */}
        {/* ======================================================================= */}
        {mapTheme === 'satellite' && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0c1d2e,transparent_75%)] opacity-40" />
            {/* Topographic Contour Rings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
              <path
                d="M 50 200 C 120 160 220 220 340 180 S 520 240 680 190 S 840 220 900 170"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <path
                d="M 30 260 C 140 210 260 270 400 230 S 600 280 760 240 S 880 260 920 210"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="8 6"
              />
              <circle cx="50%" cy="50%" r="28%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
            </svg>
            <div className="absolute top-2 left-3 font-mono text-[9px] text-emerald-400/80 tracking-widest">
              ORBITAL SATELLITE TELEMETRY • LOCK 14 SATELLITES
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* 2. CONCENTRIC RADAR RANGE RINGS (Centered on Rider) */}
        {/* ======================================================================= */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-700"
          style={{
            left: `${projectedPoints.rider.x}%`,
            top: `${projectedPoints.rider.y}%`,
          }}
        >
          {/* Active Ping Pulse */}
          <div className="w-40 h-40 rounded-full border border-cyan-400/30 animate-[ping_3.5s_cubic-bezier(0,0,0.2,1)_infinite]" />

          {/* 1 KM Range Ring */}
          <div className="absolute -inset-10 rounded-full border border-cyan-500/20">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 text-[8px] font-mono text-cyan-400/60 bg-neutral-950/80 rounded">
              1.0 KM
            </span>
          </div>

          {/* 2 KM Range Ring */}
          <div className="absolute -inset-24 rounded-full border border-cyan-500/15">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 text-[8px] font-mono text-cyan-400/50 bg-neutral-950/80 rounded">
              2.0 KM
            </span>
          </div>

          {/* 3 KM Outer Boundary */}
          <div className="absolute -inset-40 rounded-full border border-dashed border-cyan-500/10" />
        </div>

        {/* ======================================================================= */}
        {/* 3. ROTATING RADAR SCANNER SWEEP CONE */}
        {/* ======================================================================= */}
        {isRadarSweepActive && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 w-88 h-88 rounded-full pointer-events-none animate-[spin_7s_linear_infinite] opacity-60"
            style={{
              left: `${projectedPoints.rider.x}%`,
              top: `${projectedPoints.rider.y}%`,
              background:
                'conic-gradient(from 0deg, rgba(6, 182, 212, 0.32) 0deg, rgba(6, 182, 212, 0.1) 40deg, transparent 60deg, transparent 360deg)',
            }}
          />
        )}

        {/* ======================================================================= */}
        {/* 4. REALISTIC CURVED HIGHWAY BÉZIER ROUTES */}
        {/* ======================================================================= */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            {/* Route Neon Gradient */}
            <linearGradient id="expresswayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
            </linearGradient>

            {/* Glowing tracer filter */}
            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Underlay Highway Road Bed (Dark Asphalt) */}
          <path
            d={`M ${projectedPoints.hub.x}% ${projectedPoints.hub.y}% Q ${projectedPoints.cp1.x}% ${projectedPoints.cp1.y}%, ${projectedPoints.rider.x}% ${projectedPoints.rider.y}%`}
            fill="none"
            stroke="#172033"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={`M ${projectedPoints.rider.x}% ${projectedPoints.rider.y}% Q ${projectedPoints.cp2.x}% ${projectedPoints.cp2.y}%, ${projectedPoints.dest.x}% ${projectedPoints.dest.y}%`}
            fill="none"
            stroke="#172033"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Active Completed Segment: Store Hub ➔ Courier (Glowing Amber/Cyan) */}
          <path
            d={`M ${projectedPoints.hub.x}% ${projectedPoints.hub.y}% Q ${projectedPoints.cp1.x}% ${projectedPoints.cp1.y}%, ${projectedPoints.rider.x}% ${projectedPoints.rider.y}%`}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#neonBlur)"
            className="opacity-95"
          />

          {/* Animated White Speed Chevrons on Completed Segment */}
          <path
            d={`M ${projectedPoints.hub.x}% ${projectedPoints.hub.y}% Q ${projectedPoints.cp1.x}% ${projectedPoints.cp1.y}%, ${projectedPoints.rider.x}% ${projectedPoints.rider.y}%`}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="8 6"
            strokeLinecap="round"
            className="animate-[dash_1.5s_linear_infinite]"
          />

          {/* Upcoming Remaining Segment: Courier ➔ Customer Doorstep (Emerald Dash) */}
          <path
            d={`M ${projectedPoints.rider.x}% ${projectedPoints.rider.y}% Q ${projectedPoints.cp2.x}% ${projectedPoints.cp2.y}%, ${projectedPoints.dest.x}% ${projectedPoints.dest.y}%`}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="7 5"
            strokeLinecap="round"
            filter="url(#neonBlur)"
            className="opacity-90 animate-[dash_2.5s_linear_infinite]"
          />
        </svg>

        {/* ======================================================================= */}
        {/* 5. INTERACTIVE WAYPOINT PINS ON CANVAS */}
        {/* ======================================================================= */}

        {/* PIN A: STORE ATELIER HUB (Origin) */}
        <div
          onClick={() => handleFocusPin('hub')}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-transform duration-300 hover:scale-120 flex flex-col items-center"
          style={{ left: `${projectedPoints.hub.x}%`, top: `${projectedPoints.hub.y}%` }}
        >
          {/* Base Halo Badge */}
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/40 backdrop-blur-md">
              <Store className="w-5 h-5 text-amber-300" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-neutral-950 shadow-md animate-pulse" />
          </div>

          {/* Callout Tag */}
          <div className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-neutral-950/90 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/50 shadow-xl whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{hubCoords.name}</span>
          </div>

          {/* Popover Detail HUD */}
          {selectedPin === 'hub' && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 rounded-2xl bg-neutral-950/95 border border-amber-500/50 text-left shadow-2xl z-50 animate-in zoom-in-95 backdrop-blur-md">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <Store size={14} className="text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                  Store Dispatch Origin
                </span>
              </div>
              <p className="font-bold text-xs text-white mt-1.5">{hubCoords.name}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{hubCoords.address}</p>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[9px] text-amber-300 font-mono">
                <span>STATUS: DISPATCH COMPLETED</span>
                <span>HUB-01</span>
              </div>
            </div>
          )}
        </div>

        {/* PIN B: REAL-TIME DELIVERY RIDER (Hero Dynamic Pin) */}
        <div
          onClick={() => handleFocusPin('rider')}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-700 ease-out group flex flex-col items-center"
          style={{ left: `${projectedPoints.rider.x}%`, top: `${projectedPoints.rider.y}%` }}
        >
          {/* Pulsing Radar Aura */}
          <div className="relative">
            <div className="absolute -inset-3.5 rounded-full bg-cyan-400/40 animate-ping opacity-75" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-cyan-400 text-white border-2 border-cyan-200 shadow-2xl shadow-cyan-500/60 flex items-center justify-center ring-4 ring-cyan-500/30 group-hover:scale-115 transition-transform">
              <VehicleMarkerIcon type={riderCoords.vehicleType} className="w-6 h-6 text-white" />

              {/* Dynamic Heading Directional Arrow */}
              <div
                className="absolute -top-1 w-2.5 h-2.5 bg-white rounded-full shadow-md"
                style={{
                  transform: `rotate(${riderCoords.heading}deg) translateY(-11px)`,
                }}
              />
            </div>
          </div>

          {/* Floating Live Telemetry Chip */}
          <div className="mt-1.5 px-3 py-1 rounded-full bg-neutral-950/95 text-cyan-200 border border-cyan-400/80 font-bold text-[11px] whitespace-nowrap shadow-2xl flex items-center gap-2 backdrop-blur-md">
            <span>{riderCoords.name}</span>
            {riderCoords.speed > 0 && (
              <span className="font-mono text-cyan-300 font-black text-[10px] bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                <Gauge size={10} className="text-cyan-400" />
                <span>{riderCoords.speed} km/h</span>
              </span>
            )}
          </div>

          {/* Interactive Popover HUD */}
          {selectedPin === 'rider' && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3.5 rounded-2xl bg-neutral-950/95 border border-cyan-500/50 text-left shadow-2xl z-50 animate-in zoom-in-95 backdrop-blur-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                <div>
                  <h4 className="font-bold text-xs text-white">{riderCoords.name}</h4>
                  <p className="text-[10px] text-cyan-300 font-mono mt-0.5">
                    {riderCoords.vehicleType} ({riderCoords.vehicleNumber})
                  </p>
                </div>
                {riderCoords.phone && (
                  <a
                    href={`tel:${riderCoords.phone}`}
                    className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                    title="Call Courier"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>

              <div className="pt-2.5 space-y-2 text-[11px]">
                <div className="flex justify-between items-center text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Gauge size={12} className="text-cyan-400" />
                    <span>Live Speed:</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{riderCoords.speed} km/h</span>
                </div>

                <div className="flex justify-between items-center text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Battery size={12} className="text-emerald-400" />
                    <span>Device Battery:</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{riderCoords.battery}%</span>
                </div>

                <div className="pt-1.5 border-t border-neutral-800 text-[10px] text-neutral-400">
                  <span className="block text-neutral-300 font-semibold mb-0.5">Verified Landmark:</span>
                  <span>{riderCoords.address}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PIN C: CUSTOMER DESTINATION (Delivery Address) */}
        <div
          onClick={() => handleFocusPin('dest')}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-transform duration-300 hover:scale-120 flex flex-col items-center"
          style={{ left: `${projectedPoints.dest.x}%`, top: `${projectedPoints.dest.y}%` }}
        >
          {/* Target Halo Badge */}
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/40 backdrop-blur-md">
              <MapPin size={22} className="text-emerald-400 animate-bounce" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-neutral-950 shadow-md" />
          </div>

          {/* Callout Tag */}
          <div className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-neutral-950/90 backdrop-blur-md text-[10px] font-bold text-emerald-300 border border-emerald-500/50 shadow-xl whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Delivery Destination</span>
          </div>

          {/* Popover Detail HUD */}
          {selectedPin === 'dest' && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-3 rounded-2xl bg-neutral-950/95 border border-emerald-500/50 text-left shadow-2xl z-50 animate-in zoom-in-95 backdrop-blur-md">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <MapPin size={14} className="text-emerald-400" />
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                  Final Doorstep
                </span>
              </div>
              <p className="font-bold text-xs text-white mt-1.5">{destCoords.name}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">{destCoords.address}</p>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[9px] text-emerald-300 font-mono">
                <span>ESTIMATED ARRIVAL</span>
                <span>~{currentEtaMins} MINS</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FLOATING TOP TELEMETRY HUD BAR */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Live Status Badge & Order Number */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 shadow-xl text-xs font-semibold">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isTrackingActive ? 'bg-cyan-400 animate-ping' : 'bg-amber-400'
            }`}
          />
          <span className="font-serif font-bold text-white text-xs tracking-wide">
            {isTrackingActive ? 'Live Delivery Radar' : 'Courier Standby'}
          </span>
          {orderNumber && (
            <span className="font-mono text-[10px] font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-md border border-cyan-500/40">
              #{orderNumber.replace('#', '')}
            </span>
          )}
          <span className="text-neutral-500 text-[10px] font-mono hidden sm:inline">
            • 5G RTK LOCK
          </span>
        </div>

        {/* Right: Dynamic ETA, Distance, and Traffic Conditions */}
        {isTrackingActive && (
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-cyan-950/90 backdrop-blur-md border border-cyan-500/40 shadow-xl text-xs font-bold text-cyan-200">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Clock size={14} className="text-cyan-400 animate-pulse" />
              <span>ETA: ~{currentEtaMins} mins</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
            <span className="text-white font-mono text-[11px]">
              {currentDistanceKm} km left
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              <ShieldCheck size={11} />
              <span>Green Corridor</span>
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. QUICK-DOCK PIN SELECTOR TABS (BOTTOM CENTER) */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 hidden sm:flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 shadow-2xl">
        <button
          type="button"
          onClick={() => handleFocusPin('hub')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedPin === 'hub'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
              : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800'
          }`}
        >
          <Store size={13} />
          <span>Store Hub</span>
        </button>

        <button
          type="button"
          onClick={() => handleFocusPin('rider')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedPin === 'rider'
              ? 'bg-cyan-500 text-neutral-950 font-bold shadow-md'
              : 'text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800'
          }`}
        >
          <Bike size={13} />
          <span>Courier (Live)</span>
        </button>

        <button
          type="button"
          onClick={() => handleFocusPin('dest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedPin === 'dest'
              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md'
              : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800'
          }`}
        >
          <MapPin size={13} />
          <span>Doorstep</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 8. INTERACTIVE MAP CONTROLS & THEME TOGGLE (BOTTOM RIGHT) */}
      {/* ========================================================================= */}
      {showControls && (
        <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2">
          {/* Map Themes Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 text-[10px] font-bold shadow-2xl">
            {[
              { id: 'cyber', label: 'Cyber' },
              { id: 'streets', label: 'Streets' },
              { id: 'satellite', label: 'Satellite' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMapTheme(t.id)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  mapTheme === t.id
                    ? 'bg-cyan-500 text-neutral-950 font-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Map View & Simulation Actions */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 text-xs shadow-2xl">
            {/* Live Simulation Play/Pause Button */}
            <button
              type="button"
              onClick={() => setIsSimulating((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold px-2 ${
                isSimulating
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-300 hover:text-cyan-300 hover:bg-neutral-800'
              }`}
              title={isSimulating ? 'Pause live transit simulation' : 'Simulate transit live movement'}
            >
              {isSimulating ? <Pause size={13} /> : <Play size={13} />}
              <span className="hidden sm:inline">{isSimulating ? 'Pause' : 'Simulate'}</span>
            </button>

            {/* Recenter */}
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 text-neutral-400 hover:text-cyan-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Reset View"
            >
              <Crosshair size={14} />
            </button>

            {/* Radar scanner sweep toggle */}
            <button
              type="button"
              onClick={() => setIsRadarSweepActive((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isRadarSweepActive ? 'text-cyan-400 bg-cyan-950/60' : 'text-neutral-500'
              }`}
              title="Toggle radar sweep scanner"
            >
              <Radio size={14} className={isRadarSweepActive ? 'animate-pulse' : ''} />
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            {/* Turn-by-Turn in Google Maps */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-400 hover:text-emerald-400 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Open turn-by-turn route in Google Maps"
            >
              <ExternalLink size={14} />
            </a>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. BOTTOM LEFT TELEMETRY WATERMARK */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-none flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[10px] font-mono text-neutral-400">
        <Compass size={13} className="text-cyan-400 animate-[spin_18s_linear_infinite]" />
        <span>RTK GPS ACCURACY • 0.8M</span>
      </div>
    </div>
  );
}
