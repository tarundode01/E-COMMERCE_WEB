import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Edit3,
  ExternalLink,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { vendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * World-Class Vendor Approval Status Page
 *
 * Dedicated onboarding guard:
 * - If store is PENDING: shows real-time status tracker, store dossier, and auto-refreshes every 7s.
 * - If store is APPROVED: displays celebratory banner with 1-click launch into Vendor Suite.
 * - If store is REJECTED: presents admin rejection reason and an interactive resubmission form.
 */
export default function VendorApprovalStatus() {
  const navigate = useNavigate();
  const { user, store: authStore, logout, login } = useAuth();

  const [store, setStore] = useState(authStore || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Resubmission Form State (for rejected stores)
  const [isEditing, setIsEditing] = useState(false);
  const [resubmitData, setResubmitData] = useState({
    storeName: '',
    storeDescription: '',
    businessAddress: '',
    taxId: '',
    supportEmail: '',
    supportPhone: '',
  });
  const [resubmitting, setResubmitting] = useState(false);

  // Fetch fresh store profile from backend
  const fetchStoreStatus = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    setErrorMsg('');
    try {
      const res = await vendorService.getStore();
      if (res && res.store) {
        setStore(res.store);

        // Prepopulate resubmission data
        setResubmitData({
          storeName: res.store.name || '',
          storeDescription: res.store.description || '',
          businessAddress: res.store.businessAddress || '',
          taxId: res.store.taxId || '',
          supportEmail: res.store.supportEmail || '',
          supportPhone: res.store.supportPhone || '',
        });

        // If newly approved, automatically route to vendor dashboard after 1.8s celebration
        if (res.store.status === 'approved') {
          setSuccessMsg('Your store application has been approved! Redirecting to Vendor Suite...');
          setTimeout(() => {
            navigate('/vendor/dashboard', { replace: true });
          }, 1800);
        }
      }
    } catch (err) {
      console.error('Error checking store status:', err);
      setErrorMsg(err.response?.data?.message || 'Unable to load store status.');
    } finally {
      setLoading(false);
      if (showIndicator) setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStoreStatus(false);
  }, [fetchStoreStatus]);

  // Live polling every 7 seconds while status is 'pending'
  useEffect(() => {
    if (store?.status !== 'pending') return;

    const intervalId = setInterval(() => {
      fetchStoreStatus(false);
    }, 7000);

    return () => clearInterval(intervalId);
  }, [store?.status, fetchStoreStatus]);

  // Handle Resubmit after Rejection
  const handleResubmit = async (e) => {
    e.preventDefault();
    setResubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        name: resubmitData.storeName.trim(),
        description: resubmitData.storeDescription.trim(),
        businessAddress: resubmitData.businessAddress.trim(),
        taxId: resubmitData.taxId.trim(),
        supportEmail: resubmitData.supportEmail.trim(),
        supportPhone: resubmitData.supportPhone.trim(),
        resubmit: true,
      };

      const res = await vendorService.updateStore(payload);
      if (res && res.success) {
        setStore(res.store);
        setIsEditing(false);
        setSuccessMsg(
          'Store dossier updated and successfully re-submitted for administrator review!'
        );
      }
    } catch (err) {
      console.error('Resubmit error:', err);
      setErrorMsg(
        err.response?.data?.message || 'Failed to re-submit store application. Please review details.'
      );
    } finally {
      setResubmitting(false);
    }
  };

  const isApproved = store?.status === 'approved';
  const isPending = store?.status === 'pending';
  const isRejected = store?.status === 'rejected';
  const isSuspended = store?.status === 'suspended';

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black py-10 sm:py-16 transition-colors">
      <Container size="default">
        {/* Navigation Bar */}
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-brand-black transition-colors">
            <Store size={15} />
            <span>Marketplace Home</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-surface border border-brand-border text-neutral-600 hover:text-brand-black hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Notification Alerts */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 1. STATUS HERO CARD */}
          {/* ======================================================================= */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-4 relative overflow-hidden">
            {/* Top Status Icon */}
            <div className="flex justify-center">
              {isApproved ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 size={32} />
                </div>
              ) : isRejected ? (
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/10">
                  <XCircle size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10 relative">
                  <Clock size={32} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white animate-ping" />
                </div>
              )}
            </div>

            {/* Title & Status Tag */}
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20'
                    : isRejected
                    ? 'bg-rose-500/10 text-rose-800 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isApproved
                      ? 'bg-emerald-500'
                      : isRejected
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span>
                  {isApproved
                    ? 'Store Approved & Verified'
                    : isRejected
                    ? 'Application Rejected'
                    : 'Pending Administrative Approval'}
                </span>
              </span>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black tracking-tight mt-1">
                {isApproved
                  ? 'Your Merchant Atelier is Activated!'
                  : isRejected
                  ? 'Application Requires Revision'
                  : 'Your Store Registration is Under Review'}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto mt-2 leading-relaxed">
                {isApproved
                  ? 'Congratulations! The administration team has approved your merchant application. You now have full access to manage your catalog, process orders, and dispatch couriers.'
                  : isRejected
                  ? 'Your application was not approved during administrative verification. Please review the feedback below, make the necessary updates, and resubmit for reconsideration.'
                  : 'Your store credentials and business details have been securely submitted to the marketplace administrator. Once reviewed and verified, your vendor suite will unlock automatically.'}
              </p>
            </div>

            {/* Live Progress Stepper */}
            <div className="pt-4 border-t border-brand-border/60 max-w-xl mx-auto">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Step 1 */}
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mx-auto text-xs shadow-xs">
                    ✓
                  </div>
                  <p className="font-bold text-brand-black text-[11px]">Application Sent</p>
                  <p className="text-[10px] text-neutral-400">Credentials saved</p>
                </div>

                {/* Step 2 */}
                <div className="space-y-1">
                  <div
                    className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto text-xs shadow-xs ${
                      isApproved
                        ? 'bg-emerald-500 text-white'
                        : isRejected
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-500/20'
                    }`}
                  >
                    {isApproved ? '✓' : isRejected ? '✕' : '2'}
                  </div>
                  <p className="font-bold text-brand-black text-[11px]">Admin Review</p>
                  <p className="text-[10px] text-neutral-400">
                    {isApproved ? 'Verified' : isRejected ? 'Action needed' : 'In verification'}
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-1">
                  <div
                    className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto text-xs ${
                      isApproved
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    {isApproved ? '✓' : '3'}
                  </div>
                  <p className="font-bold text-brand-black text-[11px]">Atelier Live</p>
                  <p className="text-[10px] text-neutral-400">
                    {isApproved ? 'Ready to sell' : 'Locked'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              {isApproved ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={ArrowRight}
                  onClick={() => navigate('/vendor/dashboard')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Enter Vendor Dashboard Now
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RefreshCw}
                    disabled={refreshing}
                    onClick={() => fetchStoreStatus(true)}
                    className="text-xs text-brand-charcoal hover:bg-brand-cream/60"
                  >
                    {refreshing ? 'Checking Status...' : 'Check Status Now'}
                  </Button>

                  {isRejected && !isEditing && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Edit3}
                      onClick={() => setIsEditing(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs"
                    >
                      Update & Resubmit
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* 2. REJECTION NOTICE (IF REJECTED) */}
          {/* ======================================================================= */}
          {isRejected && (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 sm:p-6 text-left space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle size={18} className="text-rose-600 shrink-0" />
                <span>Administrative Review Feedback:</span>
              </div>
              <p className="text-xs text-rose-900 bg-white/70 p-3.5 rounded-2xl border border-rose-200 font-medium leading-relaxed">
                {store?.rejectionReason ||
                  'Your application details require revision before activation. Please update your business documentation and address.'}
              </p>
              <p className="text-[11px] text-rose-700">
                You can correct your store information and resubmit below. The administrator will re-evaluate your updated dossier.
              </p>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 3. RESUBMISSION FORM (TOGGLED ON EDIT) */}
          {/* ======================================================================= */}
          {isEditing && (
            <form
              onSubmit={handleResubmit}
              className="bg-brand-surface border border-brand-border/80 rounded-3xl p-6 sm:p-8 shadow-xs text-left space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Update Store Application Dossier
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Store / Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={resubmitData.storeName}
                  onChange={(e) =>
                    setResubmitData((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Store Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={resubmitData.storeDescription}
                  onChange={(e) =>
                    setResubmitData((prev) => ({ ...prev, storeDescription: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                  Physical Business Address
                </label>
                <input
                  type="text"
                  required
                  value={resubmitData.businessAddress}
                  onChange={(e) =>
                    setResubmitData((prev) => ({ ...prev, businessAddress: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Tax ID / GSTIN
                  </label>
                  <input
                    type="text"
                    value={resubmitData.taxId}
                    onChange={(e) =>
                      setResubmitData((prev) => ({ ...prev, taxId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Support Phone
                  </label>
                  <input
                    type="text"
                    value={resubmitData.supportPhone}
                    onChange={(e) =>
                      setResubmitData((prev) => ({ ...prev, supportPhone: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 text-xs bg-brand-offwhite border border-brand-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-brand-black"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={resubmitting}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold"
                >
                  {resubmitting ? 'Submitting...' : 'Re-submit Application'}
                </Button>
              </div>
            </form>
          )}

          {/* ======================================================================= */}
          {/* 4. APPLICATION DOSSIER SUMMARY CARD */}
          {/* ======================================================================= */}
          {store && (
            <div className="bg-brand-surface border border-brand-border/80 rounded-3xl p-6 sm:p-7 shadow-xs text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-black">
                    Submitted Store Dossier
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Details currently registered under your merchant account
                  </p>
                </div>
                <span className="font-mono text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
                  ID: {(store._id || store.id || '').toString().slice(-8).toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Store Brand Name
                  </span>
                  <p className="font-bold text-brand-black text-sm">{store.name}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">/store/{store.slug}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Merchant Owner
                  </span>
                  <p className="font-bold text-brand-black text-sm">{user?.name || 'Store Merchant'}</p>
                  <p className="text-[11px] text-neutral-500">{user?.email}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-1 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Business Address
                  </span>
                  <p className="text-neutral-700 font-medium">
                    {store.businessAddress || 'Not specified'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Tax ID / Registration
                  </span>
                  <p className="font-mono text-neutral-700 font-bold">
                    {store.taxId || 'Pending Verification'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Customer Support Contact
                  </span>
                  <p className="text-neutral-700 font-medium">
                    {store.supportEmail || user?.email} • {store.supportPhone || user?.mobile || 'No phone'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* 5. HELPFUL FAQ / NEXT STEPS */}
          {/* ======================================================================= */}
          <div className="p-5 rounded-2xl bg-brand-offwhite border border-brand-border/60 text-left text-xs space-y-2 text-neutral-600">
            <div className="flex items-center gap-1.5 font-bold text-brand-black">
              <HelpCircle size={14} className="text-amber-500" />
              <span>What happens next?</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Platform administrators review applications to verify merchant business details. Most store applications are evaluated within <strong>2 to 24 hours</strong>. Once approved, this page will automatically unlock, allowing you to list products and start receiving customer orders.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
