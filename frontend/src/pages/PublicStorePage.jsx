import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Store,
  MapPin,
  Mail,
  Phone,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  ArrowLeft,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Package
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { vendorService } from '../services/api';
import { formatImageUrl } from '../utils/imageUrl';

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function PublicStorePage() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchStore = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await vendorService.getPublicStore(slug);
        if (isMounted && response && response.store) {
          setStore(response.store);
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.response?.data?.message ||
            'This atelier is currently not publicly active or undergoing verification.';
          setError(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStore();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-offwhite flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
            Opening Atelier Dossier...
          </p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-brand-offwhite py-16 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-brand-surface border border-brand-border/80 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Store size={26} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-black mb-2">
            Atelier Unavailable
          </h2>
          <p className="text-xs text-brand-muted leading-relaxed mb-6">
            {error || 'This store profile could not be retrieved or is not published yet.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <Link to="/shop">
              <Button variant="primary" size="md" className="w-full justify-center text-xs">
                Browse Marketplace Collections
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="md" className="w-full justify-center text-xs">
                Return to Storefront
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openingHours = store.openingHours || {};
  const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todaySchedule = openingHours[todayKey];

  return (
    <div className="min-h-screen bg-brand-offwhite pb-16">
      {/* 1. Header Banner */}
      <div className="relative h-56 sm:h-72 w-full bg-brand-charcoal overflow-hidden">
        {store.bannerUrl ? (
          <img
            src={formatImageUrl(store.bannerUrl)}
            alt={`${store.name} Banner`}
            className="w-full h-full object-cover object-center brightness-90"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-brand-charcoal to-neutral-950 opacity-90 flex items-center justify-center">
            <span className="font-serif text-3xl sm:text-5xl tracking-widest text-white/10 uppercase select-none font-bold">
              {store.name}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Back navigation */}
        <div className="absolute top-6 left-6">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-brand-black text-xs font-semibold hover:bg-white transition-all shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Marketplace</span>
          </Link>
        </div>
      </div>

      <Container size="default">
        {/* 2. Brand Identity Header Card */}
        <div className="relative -mt-16 sm:-mt-20 mb-8 bg-brand-surface border border-brand-border/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Logo Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-brand-surface border-2 border-brand-border/80 p-1 shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                {store.logoUrl ? (
                  <img
                    src={formatImageUrl(store.logoUrl)}
                    alt={store.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-brand-cream flex items-center justify-center font-serif text-3xl font-bold text-brand-black">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black">
                    {store.name}
                  </h1>
                  <Badge variant="accent" size="sm" className="flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>Verified Atelier</span>
                  </Badge>
                  {store.isOpen ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Open Now</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                      <span>Closed for Orders</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-brand-muted flex items-center gap-2">
                  <span>Registered Atelier:</span>
                  <code className="bg-brand-cream/60 px-2 py-0.5 rounded font-mono text-brand-charcoal text-[11px]">
                    /store/{store.slug}
                  </code>
                </p>

                {store.businessAddress && (
                  <p className="text-xs text-brand-muted flex items-center gap-1.5 pt-0.5">
                    <MapPin size={13} className="text-brand-accent shrink-0" />
                    <span>{store.businessAddress}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              {store.supportEmail && (
                <a
                  href={`mailto:${store.supportEmail}`}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-surface border border-brand-border hover:bg-brand-cream/60 text-brand-charcoal flex items-center gap-1.5 transition-all"
                >
                  <Mail size={14} />
                  <span>Contact Concierge</span>
                </a>
              )}
              {store.supportPhone && (
                <a
                  href={`tel:${store.supportPhone}`}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-black text-white hover:bg-brand-charcoal flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Phone size={14} />
                  <span>Call Atelier</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 3. Main Dossier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Left 2 Cols: Bio, Delivery & Store Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Store Biography */}
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs">
              <h2 className="font-serif text-lg font-bold text-brand-black pb-3 border-b border-brand-border/60 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-brand-accent" />
                <span>About the Atelier</span>
              </h2>
              <p className="text-xs sm:text-sm text-brand-charcoal leading-relaxed whitespace-pre-wrap">
                {store.description}
              </p>
            </div>

            {/* Delivery & Logistics Information */}
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs">
              <h2 className="font-serif text-lg font-bold text-brand-black pb-3 border-b border-brand-border/60 mb-4 flex items-center gap-2">
                <Truck size={18} className="text-brand-accent" />
                <span>Fulfillment & Logistics Policy</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="font-bold text-brand-charcoal uppercase tracking-wider text-[10px] block">
                    White-Glove Delivery
                  </span>
                  <p className="font-semibold text-brand-black">
                    {store.deliveryAvailable ? 'Available Worldwide' : 'Direct Pickup Only'}
                  </p>
                  {store.deliveryNotes && (
                    <p className="text-brand-muted text-[11px] pt-1 leading-relaxed">
                      {store.deliveryNotes}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="font-bold text-brand-charcoal uppercase tracking-wider text-[10px] block">
                    Atelier Collection & Pickup
                  </span>
                  <p className="font-semibold text-brand-black">
                    {store.pickupAddress ? 'Private Collection Available' : 'No In-Person Pickup'}
                  </p>
                  {store.pickupAddress && (
                    <p className="text-brand-muted text-[11px] pt-1 leading-relaxed">
                      Pickup Address: {store.pickupAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Atelier Exclusive Products Catalog */}
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-brand-accent" />
                  <h3 className="font-serif text-base font-bold text-brand-black">
                    {store.name} Signature Catalog ({store.products?.length || 0})
                  </h3>
                </div>
                <Link to="/shop" className="text-xs text-brand-accent hover:underline font-semibold">
                  Full Catalog &rarr;
                </Link>
              </div>

              {store.products && store.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {store.products.map((product) => (
                    <Link
                      key={product._id || product.id}
                      to={`/product/${product._id || product.id}`}
                      className="group border border-brand-border/70 rounded-xl p-3 bg-brand-offwhite/50 hover:bg-brand-cream/40 transition-all text-left flex gap-3.5 items-center"
                    >
                      <div className="w-16 h-16 rounded-lg bg-brand-surface border border-brand-border/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={formatImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Package size={20} className="text-brand-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand-accent block truncate">
                          {product.category}
                        </span>
                        <h4 className="font-serif text-xs font-bold text-brand-black truncate group-hover:text-brand-accent transition-colors">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-serif text-xs font-bold text-brand-black">
                            ${typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
                          </span>
                          {product.stock > 0 ? (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                              In Stock
                            </span>
                          ) : (
                            <span className="text-[9px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-semibold">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-brand-muted">
                    This atelier is currently preparing bespoke pieces for their public collection.
                  </p>
                  <Link to="/shop">
                    <Button variant="outline" size="sm" className="text-xs mt-2">
                      Browse Marketplace Items
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Weekly Schedule & Concierge Coordinates */}
          <div className="space-y-6">
            {/* Weekly Business Hours Card */}
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs">
              <h2 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-brand-accent" />
                <span>Operating Hours</span>
              </h2>

              <div className="space-y-2 text-xs">
                {Object.keys(DAY_LABELS).map((dayKey) => {
                  const schedule = openingHours[dayKey] || { open: '09:00', close: '18:00', isClosed: false };
                  const isToday = dayKey === todayKey;

                  return (
                    <div
                      key={dayKey}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        isToday ? 'bg-brand-cream/60 font-semibold text-brand-black border border-brand-accent/40' : 'text-brand-charcoal'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 capitalize">
                        {DAY_LABELS[dayKey]}
                        {isToday && (
                          <span className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">
                            (Today)
                          </span>
                        )}
                      </span>
                      <span>
                        {schedule.isClosed ? (
                          <span className="text-neutral-400 font-medium">Closed</span>
                        ) : (
                          <span className="font-mono text-[11px]">
                            {schedule.open} – {schedule.close}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concierge Desk Coordinates */}
            <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-4 text-xs">
              <h3 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 flex items-center gap-2">
                <Building2 size={16} className="text-brand-accent" />
                <span>Merchant Coordinates</span>
              </h3>

              <div className="space-y-3">
                {store.supportEmail && (
                  <div>
                    <span className="font-bold text-brand-charcoal uppercase tracking-wider text-[10px] block mb-0.5">
                      Client Support Email
                    </span>
                    <a
                      href={`mailto:${store.supportEmail}`}
                      className="text-brand-black hover:text-brand-accent transition-colors font-medium break-all"
                    >
                      {store.supportEmail}
                    </a>
                  </div>
                )}

                {store.supportPhone && (
                  <div>
                    <span className="font-bold text-brand-charcoal uppercase tracking-wider text-[10px] block mb-0.5">
                      Direct Helpline
                    </span>
                    <a
                      href={`tel:${store.supportPhone}`}
                      className="text-brand-black hover:text-brand-accent transition-colors font-medium"
                    >
                      {store.supportPhone}
                    </a>
                  </div>
                )}

                {store.businessAddress && (
                  <div>
                    <span className="font-bold text-brand-charcoal uppercase tracking-wider text-[10px] block mb-0.5">
                      Registered Business Address
                    </span>
                    <p className="text-brand-muted leading-relaxed">
                      {store.businessAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
