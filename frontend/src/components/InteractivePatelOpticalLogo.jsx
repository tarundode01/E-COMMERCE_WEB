import React, { useState, useRef } from 'react';
import { Sparkles, Eye, Copy, Check, ShieldCheck, ZoomIn, Sun, Moon } from 'lucide-react';

/**
 * Highly Interactive Luxury Logo Component for 'Patel Optical'
 * Features:
 * - 3D Perspective Parallax on Mouse Move
 * - Dynamic Optical Lens Glare reflection sweep
 * - Focus Aperture Ring pulse on click
 * - Light / Dark luxury theme switcher
 * - One-click Image URL Copy
 */
export default function InteractivePatelOpticalLogo({ className = '' }) {
  const containerRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle 3D tilt (max 12 deg)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setRotate({ x: rotateX, y: rotateY });
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('/patel_optical_logo.jpg');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      {/* Interactive Controls Bar */}
      <div className="flex items-center justify-between w-full max-w-sm mb-4 px-2 text-xs">
        <span className="font-semibold text-brand-charcoal uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-600" />
          <span>Interactive 3D Crest</span>
        </span>
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
            className="p-1.5 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-cream/80 text-brand-charcoal transition-colors cursor-pointer"
            title="Toggle Light/Dark Showcase"
          >
            {isDarkTheme ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} />}
          </button>

          {/* Copy URL Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-cream/80 text-brand-charcoal transition-colors cursor-pointer text-[11px] font-medium"
            title="Copy logo file address"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3D Perspective Card Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsFocused(!isFocused)}
        style={{
          perspective: 1000,
        }}
        className="w-full max-w-sm cursor-pointer select-none"
      >
        <div
          style={{
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.03 : 1})`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
          }}
          className={`relative rounded-3xl p-6 sm:p-8 transition-colors duration-300 shadow-xl overflow-hidden border ${
            isDarkTheme
              ? 'bg-neutral-950 border-amber-500/30 text-white shadow-amber-950/20'
              : 'bg-gradient-to-b from-[#FAF7F2] to-[#F3EDE2] border-[#E8DFD0] text-brand-black shadow-amber-900/10'
          }`}
        >
          {/* Dynamic Optical Glare Spotlight */}
          {isHovered && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle 180px at ${glarePos.x}% ${glarePos.y}%, rgba(212, 175, 55, 0.25), transparent 70%)`,
              }}
            />
          )}

          {/* Optical Reticle / Crosshair Guide Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-500/40" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-amber-500/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-dashed border-amber-600/30" />
          </div>

          {/* Logo Artwork Image */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative group">
              <img
                src="/patel_optical_logo.jpg"
                alt="Patel Optical - Precision Optometry & Luxury Eyewear"
                className={`w-64 h-64 object-contain rounded-2xl drop-shadow-md transition-all duration-300 ${
                  isFocused ? 'scale-105 filter drop-shadow-2xl' : ''
                }`}
              />

              {/* Optical Focus Ring Effect */}
              {isFocused && (
                <div className="absolute -inset-2 rounded-2xl border-2 border-amber-500 animate-pulse pointer-events-none" />
              )}
            </div>

            {/* Interactive Badge Indicator */}
            <div className="mt-4 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${
                  isDarkTheme
                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                    : 'bg-white/80 text-amber-900 border-amber-200 shadow-2xs'
                }`}
              >
                <Eye size={12} className="text-amber-600" />
                <span>Precision Eyewear & Horology</span>
              </span>
            </div>

            <p className="mt-2 text-[11px] text-neutral-400 text-center font-medium">
              Hover to tilt in 3D • Click for optical focus
            </p>
          </div>
        </div>
      </div>

      {/* Copy-Paste Helper Footer */}
      <div className="mt-4 p-3 rounded-xl bg-brand-surface border border-brand-border/70 text-xs text-brand-muted max-w-sm w-full text-center">
        <span>Image path: </span>
        <code className="font-mono text-brand-black bg-brand-cream/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">
          /patel_optical_logo.jpg
        </code>
      </div>
    </div>
  );
}
