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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crosshair,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Store,
  Package,
  X,
  Edit3,
  Layers,
  Sparkles,
  RefreshCw,
  Home,
  ChevronRight,
  Route,
  Zap,
  Activity,
  User,
  Sliders,
  Copy,
  Check,
} from 'lucide-react';

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

/**
 * World-Class Interactive Vendor Fleet Radar Map Component
 *
 * Designed for Luxury E-Commerce Store Dispatch Operations:
 * - Real-time simultaneous multi-agent fleet tracking on an ultra-modern city canvas
 * - 3 Switchable Themes:
 *   1. "Cyber Radar" (High-tech neon cyan HUD, sweeping scanner cone, coordinate degree marks)
 *   2. "City Streets" (Dark indigo metro topology, glowing Kahn River waterway, arterial highway bypasses)
 *   3. "Midnight Satellite" (Topographic contour elevation rings, military emerald RTK vectors)
 * - Dual-Stage Bézier Highway Roads: Store Hub ──> Courier ──> Customer Doorstep
 * - Live Customer Destination Waypoint Pins for orders in transit
 * - Interactive Glassmorphic Driver Dossier & Dispatch Action Panel
 * - Mouse Drag & Scroll Wheel Panning / Zooming
 * - Quick-Fleet Dock along the bottom for instant camera focus
 * - Dynamic Haversine distance and real-time ETA calculation
 */
export default function VendorFleetRadarMap({
  deliveryBoys = [],
  storeHub,
  selectedAgent,
  onSelectAgent,
  onCompleteOrder,
  onUnassignOrder,
  onOpenDispatchModal,
  onOpenEditModal,
  completingOrderId = null,
  autoRadar = true,
  onToggleAutoRadar = null,
  onSimulateMovement = null,
  simulating = false,
  height = 'h-[480px] sm:h-[580px]',
}) {
  const [mapTheme, setMapTheme] = useState('cyber'); // 'cyber' | 'streets' | 'satellite'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockFilter, setDockFilter] = useState('all'); // 'all' | 'available' | 'on_delivery' | 'offline'
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const containerRef = useRef(null);

  // Update sync timestamp whenever deliveryBoys updates
  useEffect(() => {
    setLastSyncTime(new Date());
  }, [deliveryBoys]);

  // Central Store Hub coords (Dynamically provided from vendor store profile or Indore center)
  const hubCoords = useMemo(
    () => ({
      lat: storeHub?.latitude || 22.7196,
      lng: storeHub?.longitude || 75.8577,
      name: storeHub?.name || 'Store Atelier Dispatch Hub',
      address: storeHub?.address || 'Indore Central Dispatch Zone',
      phone: storeHub?.phone || '',
    }),
    [storeHub]
  );

  // Dynamic Geographic Projection: Project all agents, hub, & customer destinations dynamically
  const projectedData = useMemo(() => {
    const hub = hubCoords;
    const allLats = [hub.lat];
    const allLngs = [hub.lng];

    deliveryBoys.forEach((b) => {
      if (b.currentLocation?.latitude) allLats.push(b.currentLocation.latitude);
      if (b.currentLocation?.longitude) allLngs.push(b.currentLocation.longitude);

      // Customer destination if assigned to an active order
      const order = b.activeOrderId;
      if (order && order.deliveryAddress) {
        if (order.deliveryAddress.latitude) allLats.push(order.deliveryAddress.latitude);
        if (order.deliveryAddress.longitude) allLngs.push(order.deliveryAddress.longitude);
      }
    });

    const minLat = Math.min(...allLats) - 0.009;
    const maxLat = Math.max(...allLats) + 0.009;
    const minLng = Math.min(...allLngs) - 0.009;
    const maxLng = Math.max(...allLngs) + 0.009;

    const latSpan = Math.max(0.012, maxLat - minLat);
    const lngSpan = Math.max(0.012, maxLng - minLng);

    const project = (lat, lng) => {
      const x = 16 + ((lng - minLng) / lngSpan) * 68;
      const y = 84 - ((lat - minLat) / latSpan) * 68;
      return {
        x: Math.max(8, Math.min(92, x)),
        y: Math.max(10, Math.min(90, y)),
      };
    };

    const hubPos = project(hub.lat, hub.lng);

    const agentPoints = deliveryBoys.map((boy) => {
      const lat = boy.currentLocation?.latitude || hub.lat;
      const lng = boy.currentLocation?.longitude || hub.lng;
      const pos = project(lat, lng);

      // Customer destination point if order assigned
      let destPoint = null;
      let cpDest = null;
      const order = boy.activeOrderId;

      if (order && typeof order === 'object') {
        const destLat = order.deliveryAddress?.latitude || (lat + 0.012);
        const destLng = order.deliveryAddress?.longitude || (lng + 0.014);
        const destPos = project(destLat, destLng);

        // Mathematical Haversine Distance from Courier to Customer Doorstep
        const R = 6371;
        const dLat = ((destLat - lat) * Math.PI) / 180;
        const dLng = ((destLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((destLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Math.max(0.2, +(R * c).toFixed(1));

        // Speed-based dynamic ETA calculation
        const effectiveSpeed = boy.currentLocation?.speed > 5 ? boy.currentLocation.speed : 30;
        const etaMins = Math.max(2, Math.round((distanceKm / effectiveSpeed) * 60));

        destPoint = {
          x: destPos.x,
          y: destPos.y,
          lat: destLat,
          lng: destLng,
          customerName: order.deliveryAddress?.fullName || 'Customer Doorstep',
          address:
            order.deliveryAddress?.street ||
            order.deliveryAddress?.address ||
            order.deliveryAddress?.city ||
            'Indore Metro Area',
          city: order.deliveryAddress?.city || 'Indore',
          orderNumber:
            order.orderNumber ||
            (order._id ? order._id.toString().slice(-6).toUpperCase() : boy.activeOrderNumber),
          totalAmount: order.totalAmount || 0,
          itemsCount: order.items?.length || 1,
          distanceKm,
          etaMins,
        };

        // Bézier curve control point from Courier to Doorstep
        cpDest = {
          x: (pos.x + destPos.x) / 2 + (destPos.x > pos.x ? 6 : -6),
          y: (pos.y + destPos.y) / 2 - 8,
        };
      }

      // Highway route control point from Hub to Courier
      const cpHigway = {
        x: (hubPos.x + pos.x) / 2 + (pos.x > hubPos.x ? 7 : -7),
        y: (hubPos.y + pos.y) / 2 - 10,
      };

      return {
        boy,
        x: pos.x,
        y: pos.y,
        cp: cpHigway,
        lat,
        lng,
        speed: boy.currentLocation?.speed || 0,
        heading: boy.currentLocation?.heading || 45,
        battery: boy.currentLocation?.batteryLevel || 88,
        address: boy.currentLocation?.address || 'Indore Central Transit Zone',
        destPoint,
        cpDest,
      };
    });

    return {
      hub: { ...hub, x: hubPos.x, y: hubPos.y },
      agents: agentPoints,
      bounds: { minLat, maxLat, minLng, maxLng },
    };
  }, [hubCoords, deliveryBoys]);

  // Zoom & Pan Handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.2, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.15).toFixed(2)));

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    onSelectAgent?.(null);
  };

  // Jump camera to agent
  const handleFocusAgent = (boy) => {
    onSelectAgent?.(boy);
    const pt = projectedData.agents.find((a) => a.boy._id === boy._id);
    if (pt) {
      setZoomLevel(1.3);
      setPanOffset({
        x: (50 - pt.x) * 2.2,
        y: (50 - pt.y) * 2.2,
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

  // Mouse Drag to Pan Handlers
  const handleMouseDown = (e) => {
    // Only drag on canvas background, not on buttons or popovers
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.interactive-dossier')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((z) => Math.min(2.2, Math.max(0.75, +(z + delta).toFixed(2))));
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = (lat, lng) => {
    if (!lat || !lng) return;
    navigator.clipboard?.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Filtered agents for bottom dock
  const filteredAgents = useMemo(() => {
    if (dockFilter === 'available') {
      return projectedData.agents.filter((a) => a.boy.status === 'available');
    }
    if (dockFilter === 'on_delivery') {
      return projectedData.agents.filter((a) => a.boy.status === 'on_delivery');
    }
    if (dockFilter === 'offline') {
      return projectedData.agents.filter((a) => a.boy.status === 'offline' || a.boy.status === 'inactive');
    }
    return projectedData.agents;
  }, [projectedData.agents, dockFilter]);

  // Active point for selected agent
  const activeAgentPoint = useMemo(() => {
    if (!selectedAgent) return null;
    return projectedData.agents.find((a) => a.boy._id === selectedAgent._id);
  }, [selectedAgent, projectedData.agents]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full ${height} rounded-3xl overflow-hidden select-none border transition-all duration-300 shadow-2xl cursor-grab active:cursor-grabbing ${
        mapTheme === 'cyber'
          ? 'bg-[#040711] border-cyan-500/35 text-cyan-100 shadow-cyan-950/50'
          : mapTheme === 'streets'
          ? 'bg-[#090d16] border-amber-500/35 text-amber-100 shadow-amber-950/40'
          : 'bg-[#020509] border-emerald-500/35 text-emerald-100 shadow-emerald-950/40'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. PHOTOREALISTIC TOPOGRAPHIC ROAD & METRO CANVAS BACKGROUND */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ======================================================================= */}
        {/* THEME 1: CYBER RADAR (Futuristic High-Tech GPS Canvas) */}
        {/* ======================================================================= */}
        {mapTheme === 'cyber' && (
          <>
            {/* Ambient Radial Cyan Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.16),transparent_72%)]" />

            {/* Fine HUD Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#082136_1px,transparent_1px),linear-gradient(to_bottom,#082136_1px,transparent_1px)] bg-[size:26px_26px] opacity-80" />

            {/* Major Metro Sector Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:130px_130px] opacity-20" />

            {/* Cyber City Blocks & District Layout */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
              <rect x="14%" y="18%" width="14%" height="16%" fill="#0a223a" rx="6" />
              <rect x="34%" y="16%" width="16%" height="14%" fill="#0a223a" rx="6" />
              <rect x="58%" y="22%" width="18%" height="20%" fill="#0a223a" rx="6" />
              <rect x="22%" y="56%" width="16%" height="14%" fill="#0a223a" rx="6" />
              <rect x="64%" y="60%" width="22%" height="20%" fill="#0a223a" rx="6" />
              <circle cx="50%" cy="48%" r="9%" fill="none" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="5 5" />
            </svg>

            {/* Edge Coordinate Degree Markers */}
            <div className="absolute top-2 left-4 font-mono text-[9px] text-cyan-400/70 tracking-widest pointer-events-none">
              LAT {projectedData.bounds.maxLat?.toFixed(4)}° N • INDORE URBAN RADAR
            </div>
            <div className="absolute bottom-2 left-4 font-mono text-[9px] text-cyan-400/70 tracking-widest pointer-events-none">
              LAT {projectedData.bounds.minLat?.toFixed(4)}° N
            </div>
            <div className="absolute top-2 right-4 font-mono text-[9px] text-cyan-400/70 tracking-widest pointer-events-none">
              LNG {projectedData.bounds.maxLng?.toFixed(4)}° E
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* THEME 2: CITY STREETS (Realistic City Arteries, River, & District Hubs) */}
        {/* ======================================================================= */}
        {mapTheme === 'streets' && (
          <>
            <div className="absolute inset-0 bg-[#090d16]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#162032_1px,transparent_1px),linear-gradient(to_bottom,#162032_1px,transparent_1px)] bg-[size:24px_24px] opacity-80" />

            {/* River Kahn Waterway with glowing banks */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45">
              <path
                d="M -20 130 Q 220 85 430 220 T 940 170"
                fill="none"
                stroke="#1d3557"
                strokeWidth="36"
                strokeLinecap="round"
              />
              <path
                d="M -20 130 Q 220 85 430 220 T 940 170"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="14 8"
                className="animate-[dash_6s_linear_infinite]"
              />
            </svg>

            {/* Major Arterial Roads / Expressways in background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
              <ellipse
                cx="50%"
                cy="48%"
                rx="38%"
                ry="34%"
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
              />
              <line x1="10%" y1="80%" x2="90%" y2="20%" stroke="#1e293b" strokeWidth="10" />
              <line x1="10%" y1="80%" x2="90%" y2="20%" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="8 6" opacity="0.7" />
              <line x1="20%" y1="16%" x2="80%" y2="84%" stroke="#1e293b" strokeWidth="8" />
            </svg>

            {/* City District Landmark Labels */}
            <div className="absolute top-[28%] left-[16%] text-[10px] font-bold text-neutral-300 bg-neutral-900/90 px-2.5 py-0.5 rounded-lg border border-neutral-700/70 shadow-sm pointer-events-none">
              {hubCoords.name} (Dispatch Zone)
            </div>
            <div className="absolute bottom-[20%] right-[18%] text-[10px] font-bold text-emerald-300 bg-neutral-900/90 px-2.5 py-0.5 rounded-lg border border-emerald-500/50 shadow-sm pointer-events-none">
              Indore Metro Delivery Sector
            </div>
            <div className="absolute top-[18%] right-[24%] text-[9px] font-bold text-cyan-300 bg-neutral-900/80 px-2 py-0.5 rounded-md border border-cyan-500/40 pointer-events-none">
              Vijay Nagar Express
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* THEME 3: MIDNIGHT SATELLITE (Topographic Elevation & Military HUD) */}
        {/* ======================================================================= */}
        {mapTheme === 'satellite' && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#091a2a,transparent_75%)] opacity-50" />
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35">
              <path
                d="M 50 190 C 130 150 230 210 350 170 S 530 230 690 180 S 850 210 920 160"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.6"
                strokeDasharray="6 4"
              />
              <path
                d="M 30 250 C 150 200 270 260 410 220 S 610 270 770 230 S 890 250 930 200"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.4"
                strokeDasharray="8 6"
              />
              <circle cx="50%" cy="50%" r="28%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
              <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
            </svg>
            <div className="absolute top-2 left-4 font-mono text-[9px] text-emerald-400/85 tracking-widest pointer-events-none">
              AEROSPACE RADAR • LOCK {projectedData.agents.length} AGENTS • RTK PRECISION
            </div>
          </>
        )}

        {/* ======================================================================= */}
        {/* 2. CONCENTRIC RADAR RANGE RINGS (Centered on Store Hub) */}
        {/* ======================================================================= */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-700"
          style={{
            left: `${projectedData.hub.x}%`,
            top: `${projectedData.hub.y}%`,
          }}
        >
          <div className="w-48 h-48 rounded-full border border-amber-400/35 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />

          {/* 1 KM Range Ring */}
          <div className="absolute -inset-10 rounded-full border border-cyan-500/25">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 text-[8px] font-mono text-cyan-400/70 bg-neutral-950/90 rounded border border-cyan-500/30">
              1.0 KM DISPATCH RADIUS
            </span>
          </div>

          {/* 2 KM Range Ring */}
          <div className="absolute -inset-28 rounded-full border border-cyan-500/18">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 text-[8px] font-mono text-cyan-400/60 bg-neutral-950/90 rounded border border-cyan-500/20">
              2.0 KM TRANSIT RADIUS
            </span>
          </div>

          {/* 3 KM Outer Ring */}
          <div className="absolute -inset-44 rounded-full border border-dashed border-cyan-500/12" />
        </div>

        {/* ======================================================================= */}
        {/* 3. ROTATING RADAR SCANNER SWEEP CONE */}
        {/* ======================================================================= */}
        {isRadarSweepActive && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none animate-[spin_8s_linear_infinite] opacity-65"
            style={{
              left: `${projectedData.hub.x}%`,
              top: `${projectedData.hub.y}%`,
              background:
                'conic-gradient(from 0deg, rgba(6, 182, 212, 0.35) 0deg, rgba(6, 182, 212, 0.12) 40deg, transparent 65deg, transparent 360deg)',
            }}
          />
        )}

        {/* ======================================================================= */}
        {/* 4. DUAL-STAGE HIGHWAY BÉZIER ROUTES: STORE ──> COURIER ──> DOORSTEP */}
        {/* ======================================================================= */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            <filter id="vendorGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render routes for active riders or selected agent */}
          {projectedData.agents.map((pt) => {
            const isSelected = selectedAgent?._id === pt.boy._id;
            const isOnDelivery = pt.boy.status === 'on_delivery';

            if (!isSelected && !isOnDelivery) return null;

            return (
              <g key={`route-${pt.boy._id}`}>
                {/* STAGE 1: STORE HUB ──> COURIER (Travelled Transit Road) */}
                {/* Highway Road Underlay */}
                <path
                  d={`M ${projectedData.hub.x}% ${projectedData.hub.y}% Q ${pt.cp.x}% ${pt.cp.y}%, ${pt.x}% ${pt.y}%`}
                  fill="none"
                  stroke="#121b2d"
                  strokeWidth="9"
                  strokeLinecap="round"
                />

                {/* Glowing Transit Highway Vector */}
                <path
                  d={`M ${projectedData.hub.x}% ${projectedData.hub.y}% Q ${pt.cp.x}% ${pt.cp.y}%, ${pt.x}% ${pt.y}%`}
                  fill="none"
                  stroke={isSelected ? '#f59e0b' : '#06b6d4'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  filter="url(#vendorGlowEffect)"
                  className="opacity-95"
                />

                {/* Animated Speed Dash Chevrons */}
                <path
                  d={`M ${projectedData.hub.x}% ${projectedData.hub.y}% Q ${pt.cp.x}% ${pt.cp.y}%, ${pt.x}% ${pt.y}%`}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                  className="animate-[dash_1.4s_linear_infinite]"
                />

                {/* STAGE 2: COURIER ──> CUSTOMER DOORSTEP (Remaining Delivery Road) */}
                {pt.destPoint && pt.cpDest && (
                  <>
                    <path
                      d={`M ${pt.x}% ${pt.y}% Q ${pt.cpDest.x}% ${pt.cpDest.y}%, ${pt.destPoint.x}% ${pt.destPoint.y}%`}
                      fill="none"
                      stroke="#1a273b"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${pt.x}% ${pt.y}% Q ${pt.cpDest.x}% ${pt.cpDest.y}%, ${pt.destPoint.x}% ${pt.destPoint.y}%`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="6 5"
                      strokeLinecap="round"
                      filter="url(#vendorGlowEffect)"
                      className="opacity-90 animate-[dash_2s_linear_infinite]"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* ======================================================================= */}
        {/* 5. STORE ATELIER DISPATCH HUB PIN */}
        {/* ======================================================================= */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectAgent?.(null);
            setZoomLevel(1.25);
            setPanOffset({
              x: (50 - projectedData.hub.x) * 2,
              y: (50 - projectedData.hub.y) * 2,
            });
          }}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group transition-transform duration-300 hover:scale-115 flex flex-col items-center"
          style={{ left: `${projectedData.hub.x}%`, top: `${projectedData.hub.y}%` }}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/25 border-2 border-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/50 backdrop-blur-md">
              <Store className="w-6 h-6 text-amber-300" />
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-neutral-950 shadow-md animate-pulse" />
          </div>

          <div className="mt-1.5 px-3 py-0.5 rounded-xl bg-neutral-950/95 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/60 shadow-2xl whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{hubCoords.name}</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* 6. CUSTOMER DESTINATION WAYPOINT PINS (FOR ORDERS IN TRANSIT) */}
        {/* ======================================================================= */}
        {projectedData.agents.map((pt) => {
          if (!pt.destPoint) return null;
          const isSelected = selectedAgent?._id === pt.boy._id;

          return (
            <div
              key={`dest-${pt.boy._id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleFocusAgent(pt.boy);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-25 cursor-pointer transition-all duration-500 flex flex-col items-center ${
                isSelected ? 'scale-120 z-35' : 'hover:scale-110'
              }`}
              style={{ left: `${pt.destPoint.x}%`, top: `${pt.destPoint.y}%` }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 border-2 border-emerald-300 flex items-center justify-center shadow-xl shadow-emerald-500/50 backdrop-blur-md text-white">
                  <Home className="w-5 h-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-neutral-950 shadow animate-ping" />
              </div>

              <div className="mt-1 px-2.5 py-0.5 rounded-xl bg-neutral-950/95 backdrop-blur-md text-[9px] font-bold text-emerald-300 border border-emerald-500/50 shadow-2xl whitespace-nowrap flex items-center gap-1">
                <MapPin size={9} className="text-emerald-400" />
                <span>Doorstep • #{pt.destPoint.orderNumber}</span>
              </div>
            </div>
          );
        })}

        {/* ======================================================================= */}
        {/* 7. MULTI-AGENT DYNAMIC COURIER PINS */}
        {/* ======================================================================= */}
        {projectedData.agents.map((pt) => {
          const isSelected = selectedAgent?._id === pt.boy._id;
          const isOnDelivery = pt.boy.status === 'on_delivery';
          const isAvailable = pt.boy.status === 'available';

          return (
            <div
              key={pt.boy._id}
              onClick={(e) => {
                e.stopPropagation();
                handleFocusAgent(pt.boy);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500 ease-out flex flex-col items-center ${
                isSelected ? 'scale-125 z-40' : 'hover:scale-115 z-30'
              }`}
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            >
              {/* Dynamic Aura Halo */}
              <div className="relative">
                {isOnDelivery ? (
                  <div className="absolute -inset-3.5 rounded-full bg-cyan-400/40 animate-ping opacity-80" />
                ) : isAvailable ? (
                  <div className="absolute -inset-2.5 rounded-full bg-emerald-400/35 animate-pulse opacity-60" />
                ) : null}

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-all ${
                    isOnDelivery
                      ? 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-cyan-400 text-white border-cyan-200 shadow-cyan-500/60 ring-4 ring-cyan-500/30'
                      : isAvailable
                      ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 text-white border-emerald-200 shadow-emerald-500/60 ring-4 ring-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 shadow-md'
                  }`}
                >
                  <VehicleIcon type={pt.boy.vehicleType} className="w-5 h-5" />

                  {/* Direction Heading Indicator */}
                  <div
                    className="absolute -top-1 w-2.5 h-2.5 bg-white rounded-full shadow-md"
                    style={{
                      transform: `rotate(${pt.heading}deg) translateY(-12px)`,
                    }}
                  />
                </div>
              </div>

              {/* Agent Callout Name Tag */}
              <div
                className={`mt-1.5 px-3 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap shadow-2xl flex items-center gap-1.5 backdrop-blur-md border transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-neutral-950 border-amber-300 ring-2 ring-amber-400/60 font-black'
                    : isOnDelivery
                    ? 'bg-neutral-950/95 text-cyan-200 border-cyan-400/70'
                    : isAvailable
                    ? 'bg-neutral-950/95 text-emerald-200 border-emerald-400/70'
                    : 'bg-neutral-900/90 text-neutral-400 border-neutral-800'
                }`}
              >
                <span>{pt.boy.name}</span>
                {isOnDelivery && pt.speed > 0 && (
                  <span className="font-mono text-[9px] bg-cyan-950/90 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                    {pt.speed} km/h
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 8. FLOATING TOP COMMAND HUD BAR */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Store Dispatch Command Center Banner */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 shadow-2xl text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-serif font-bold text-white tracking-wide">
            Fleet Dispatch Radar
          </span>
          <span className="text-neutral-500 text-[10px]">•</span>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-md border border-cyan-500/40 font-bold">
            {deliveryBoys.length} ACTIVE COURIERS
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <Radio size={10} className="animate-pulse" />
            <span>99% RTK FIX</span>
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Live Simulation Movement Pulse */}
          {onSimulateMovement && (
            <button
              type="button"
              onClick={onSimulateMovement}
              disabled={simulating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
              title="Simulate realistic movement pulse step across all couriers"
            >
              <RefreshCw size={12} className={simulating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Simulate Fleet Movement</span>
              <span className="sm:hidden">Move</span>
            </button>
          )}

          {/* Auto Radar Pulse Status */}
          {onToggleAutoRadar && (
            <button
              type="button"
              onClick={onToggleAutoRadar}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer shadow-xl ${
                autoRadar
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-950/90 text-neutral-400 border-neutral-800'
              }`}
              title="Toggle automatic live fleet radar refresh"
            >
              <Radio size={12} className={autoRadar ? 'text-emerald-400 animate-pulse' : ''} />
              <span className="hidden sm:inline">{autoRadar ? 'Auto Radar Live' : 'Radar Paused'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. SELECTED AGENT LIVE DOSSIER POPOVER (RIGHT SLIDE-OVER) */}
      {/* ========================================================================= */}
      {selectedAgent && activeAgentPoint && (
        <div className="interactive-dossier absolute top-16 right-3 z-40 w-72 sm:w-88 max-h-[80%] overflow-y-auto bg-neutral-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-4 shadow-2xl text-left animate-in fade-in slide-in-from-right-4 duration-200 space-y-3.5">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xl shadow-cyan-500/30 border border-cyan-300">
                {selectedAgent.name ? selectedAgent.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{selectedAgent.name}</h4>
                <p className="text-[10px] text-cyan-300 font-mono mt-0.5">
                  {selectedAgent.vehicleType} • {selectedAgent.vehicleNumber || 'No Plate'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectAgent?.(null)}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Status */}
            <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">
                Duty Status
              </span>
              <div className="mt-1">
                {selectedAgent.status === 'on_delivery' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>On Delivery</span>
                  </span>
                ) : selectedAgent.status === 'available' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Available</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400">Offline</span>
                )}
              </div>
            </div>

            {/* Velocity */}
            <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1">
                <Gauge size={10} className="text-cyan-400" />
                <span>Live Velocity</span>
              </span>
              <p className="font-mono text-sm font-bold text-white mt-1">
                {activeAgentPoint.speed} km/h
              </p>
            </div>

            {/* Battery */}
            <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1">
                <Battery size={10} className="text-emerald-400" />
                <span>Battery Level</span>
              </span>
              <p className="font-mono text-xs font-bold text-emerald-400 mt-1">
                {activeAgentPoint.battery}% RTK
              </p>
            </div>

            {/* Phone */}
            <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block flex items-center gap-1">
                <Phone size={10} className="text-amber-400" />
                <span>Phone Direct</span>
              </span>
              <a
                href={`tel:${selectedAgent.phone}`}
                className="font-mono text-[11px] text-amber-300 hover:underline mt-1 block truncate"
              >
                {selectedAgent.phone}
              </a>
            </div>
          </div>

          {/* Current Verified Landmark Address */}
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                <MapPin size={10} className="text-amber-400" />
                <span>Current GPS Landmark</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCoords(activeAgentPoint.lat, activeAgentPoint.lng)}
                className="text-[9px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedCoords ? <Check size={10} /> : <Copy size={10} />}
                <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-neutral-200 font-medium leading-snug">
              {activeAgentPoint.address}
            </p>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">
              Coords: {activeAgentPoint.lat?.toFixed(5)}, {activeAgentPoint.lng?.toFixed(5)}
            </p>
          </div>

          {/* Active Assigned Order Card with Customer Destination */}
          {activeAgentPoint.destPoint ? (
            <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Package size={13} className="text-cyan-400" />
                  <span>Order In Transit</span>
                </span>
                <span className="font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[10px]">
                  #{activeAgentPoint.destPoint.orderNumber}
                </span>
              </div>

              {/* Destination Details */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 text-xs space-y-1">
                <p className="font-bold text-white flex items-center gap-1">
                  <Home size={12} className="text-emerald-400" />
                  <span>{activeAgentPoint.destPoint.customerName}</span>
                </p>
                <p className="text-[11px] text-neutral-300">
                  {activeAgentPoint.destPoint.address}
                </p>
                <div className="flex items-center justify-between text-[10px] text-cyan-300 font-mono pt-1">
                  <span>Distance: {activeAgentPoint.destPoint.distanceKm} km</span>
                  <span>Est. ETA: ~{activeAgentPoint.destPoint.etaMins} mins</span>
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onCompleteOrder?.(selectedAgent.activeOrderId?._id || selectedAgent.activeOrderId)}
                  disabled={completingOrderId === (selectedAgent.activeOrderId?._id || selectedAgent.activeOrderId)}
                  className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  <span>{completingOrderId ? 'Marking...' : 'Mark Delivered'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUnassignOrder?.(selectedAgent.activeOrderId?._id || selectedAgent.activeOrderId)}
                  className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Unassign order and return to store queue"
                >
                  Unassign
                </button>
              </div>
            </div>
          ) : selectedAgent.status === 'available' ? (
            <button
              type="button"
              onClick={() => onOpenDispatchModal?.(selectedAgent)}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Package size={14} />
              <span>Dispatch Store Order</span>
            </button>
          ) : null}

          {/* Action Row */}
          <div className="pt-2 border-t border-neutral-800 flex items-center gap-2 text-xs font-semibold">
            <a
              href={`https://www.google.com/maps?q=${activeAgentPoint.lat},${activeAgentPoint.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={12} />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={() => onOpenEditModal?.(selectedAgent)}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Edit3 size={12} />
              <span>Edit Account</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. BOTTOM QUICK-FLEET DOCK TABS & CAROUSEL */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-950/95 backdrop-blur-md border border-neutral-800 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setDockFilter('all');
              handleResetView();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              dockFilter === 'all' && !selectedAgent
                ? 'bg-cyan-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            All ({deliveryBoys.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setDockFilter('on_delivery');
              const onDeliveryAgent = deliveryBoys.find((b) => b.status === 'on_delivery');
              if (onDeliveryAgent) handleFocusAgent(onDeliveryAgent);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              dockFilter === 'on_delivery'
                ? 'bg-blue-600 text-white font-bold shadow-md'
                : 'text-cyan-300 hover:bg-neutral-800'
            }`}
          >
            In Transit ({deliveryBoys.filter((b) => b.status === 'on_delivery').length})
          </button>

          <button
            type="button"
            onClick={() => {
              setDockFilter('available');
              const availAgent = deliveryBoys.find((b) => b.status === 'available');
              if (availAgent) handleFocusAgent(availAgent);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              dockFilter === 'available'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'text-emerald-300 hover:bg-neutral-800'
            }`}
          >
            Available ({deliveryBoys.filter((b) => b.status === 'available').length})
          </button>
        </div>

        {/* Courier Quick Selector Pill Carousel */}
        {filteredAgents.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 max-w-xl overflow-x-auto py-1 px-2 rounded-2xl bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 scrollbar-none">
            {filteredAgents.map((pt) => {
              const isSelected = selectedAgent?._id === pt.boy._id;
              const isOnDelivery = pt.boy.status === 'on_delivery';
              return (
                <button
                  key={pt.boy._id}
                  type="button"
                  onClick={() => handleFocusAgent(pt.boy)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 border-amber-300 font-bold shadow-lg'
                      : isOnDelivery
                      ? 'bg-cyan-950/60 text-cyan-200 border-cyan-500/30 hover:border-cyan-400'
                      : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:text-white'
                  }`}
                >
                  <VehicleIcon type={pt.boy.vehicleType} className="w-3.5 h-3.5" />
                  <span>{pt.boy.name}</span>
                  {isOnDelivery && pt.speed > 0 && (
                    <span className="font-mono text-[9px] text-cyan-300 bg-cyan-950 px-1 rounded">
                      {pt.speed}k
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 11. INTERACTIVE MAP CONTROLS & THEME TOGGLE (BOTTOM RIGHT) */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Map Theme Toggle */}
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

        {/* View Controls Stack */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 text-xs shadow-2xl">
          {/* Recenter View */}
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 text-neutral-400 hover:text-cyan-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Recenter Map View"
          >
            <Crosshair size={14} />
          </button>

          {/* Radar Sweep Toggle */}
          <button
            type="button"
            onClick={() => setIsRadarSweepActive((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isRadarSweepActive ? 'text-cyan-400 bg-cyan-950/60' : 'text-neutral-500'
            }`}
            title="Toggle radar sweep scanner cone"
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

      {/* ========================================================================= */}
      {/* 12. BOTTOM LEFT COMPASS WATERMARK */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-none hidden sm:flex items-center gap-2 bg-neutral-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-[10px] font-mono text-neutral-400">
        <Compass size={13} className="text-cyan-400 animate-[spin_24s_linear_infinite]" />
        <span>RTK FLEET RADAR • {deliveryBoys.length} COURIERS</span>
      </div>
    </div>
  );
}
