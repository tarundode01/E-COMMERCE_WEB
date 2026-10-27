import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  RefreshCw,
  X,
  FileCheck,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  ExternalLink,
  Ban,
  Check,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { adminVendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatImageUrl } from '../utils/imageUrl';

export default function AdminVendors() {
  const { user } = useAuth();

  // Application List State
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 });
  const [summary, setSummary] = useState({
    totalVendors: 0,
    pendingApprovals: 0,
    approvedVendors: 0,
    totalMarketplaceSales: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Filter & Search Controls
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Rejection Form State
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  // Search input debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Toast notification helper
  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch Vendor Applications from backend API
  const fetchApplications = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setErrorMsg('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await adminVendorService.getApplications(params);

      if (response && response.success) {
        setApplications(response.stores || []);
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            totalPages: response.pagination.totalPages,
            totalCount: response.pagination.totalCount,
          }));
        }
        if (response.counts) {
          setCounts(response.counts);
        }
        if (response.summary) {
          setSummary(response.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching vendor applications:', err);
      setErrorMsg(
        err.response?.data?.message ||
        err.customMessage ||
        'Failed to load vendor applications from database.'
      );
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchApplications(true);
  }, [fetchApplications]);

  // Open Detailed Dossier Modal
  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setIsModalOpen(true);
    setShowRejectForm(false);
    setRejectionReason('');
    setRejectionError('');
    setActionError('');
    setActionSuccess('');
  };

  // Close Dossier Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApp(null);
    setShowRejectForm(false);
    setRejectionReason('');
  };

  // Handle Quick Status Update (Approve, Reject, or Suspend)
  const handleUpdateStatus = async (appId, targetStatus, reason = '') => {
    if (!appId) return;

    if (targetStatus === 'rejected') {
      if (!reason || !reason.trim()) {
        setRejectionError('Please provide a reason explaining why the application is rejected.');
        return;
      }
      if (reason.trim().length < 5) {
        setRejectionError('Rejection reason must be at least 5 characters long.');
        return;
      }
    }

    setIsActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const payload = {
        status: targetStatus,
        rejectionReason: targetStatus === 'rejected' ? reason.trim() : '',
      };

      const response = await adminVendorService.updateStatus(appId, payload);

      if (response && response.success) {
        showToast(response.message || `Store status updated to ${targetStatus}.`, 'success');
        if (isModalOpen) {
          setActionSuccess(response.message || `Store application ${targetStatus} successfully.`);
          setTimeout(() => {
            handleCloseModal();
          }, 1200);
        }
        await fetchApplications(false);
      }
    } catch (err) {
      console.error('Update vendor status error:', err);
      const msg = err.response?.data?.message || 'Failed to update store status.';
      if (isModalOpen) {
        setActionError(msg);
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <AdminLayout
      activePage="vendors"
      title="Merchant Applications & Store Audits"
      subtitle="Review incoming vendor dossiers, approve onboarding requests, and monitor multi-vendor sales revenue."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={() => fetchApplications(true)}
          disabled={isLoading}
          className="text-xs bg-brand-surface border-brand-border text-brand-charcoal hover:bg-brand-cream/60"
        >
          {isLoading ? 'Syncing...' : 'Refresh Records'}
        </Button>
      }
    >
      <div className="space-y-6 text-left">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-in fade-in ${
              toastMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
              <span>{toastMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. EXECUTIVE KPI SUMMARY METRICS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Marketplace GMV */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Total Vendor Sales (GMV)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-serif font-black text-brand-black">
                ₹{Number(summary.totalMarketplaceSales || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Gross merchandise volume across all vendors</p>
          </div>

          {/* Pending Approval Requests */}
          <div
            onClick={() => setStatusFilter('pending')}
            className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400/80 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Pending Approvals
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock size={16} className={counts.pending > 0 ? 'animate-pulse' : ''} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-black text-amber-700">
                {counts.pending}
              </span>
              <span className="text-[11px] font-semibold text-amber-600">awaiting review</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Requires administrative activation</p>
          </div>

          {/* Approved Active Merchants */}
          <div
            onClick={() => setStatusFilter('approved')}
            className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-emerald-400/80 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Active Merchants
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-black text-emerald-700">
                {counts.approved}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">live stores</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Authorized to list products & fulfill orders</p>
          </div>

          {/* Total Registered Accounts */}
          <div
            onClick={() => setStatusFilter('all')}
            className="bg-brand-surface border border-brand-border/70 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-neutral-400 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Total Merchants
              </span>
              <div className="w-8 h-8 rounded-xl bg-neutral-200/60 text-neutral-600 flex items-center justify-center">
                <Store size={16} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-black text-brand-black">
                {counts.all}
              </span>
              <span className="text-[11px] font-medium text-neutral-400">total records</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Platform multi-tenant partner directory</p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. FILTER TABS & SEARCH BAR */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-brand-offwhite rounded-xl border border-brand-border/60 overflow-x-auto">
            {[
              { id: 'all', label: 'All Merchants', count: counts.all },
              { id: 'pending', label: 'Pending Review', count: counts.pending },
              { id: 'approved', label: 'Approved Live', count: counts.approved },
              { id: 'rejected', label: 'Rejected', count: counts.rejected },
              { id: 'suspended', label: 'Suspended', count: counts.suspended || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-brand-black text-white shadow-xs'
                    : 'text-brand-charcoal hover:bg-brand-cream/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-brand-border/60 text-brand-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-80">
            <Input
              id="vendorSearch"
              placeholder="Search store name, vendor, tax ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="text-xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. VENDOR DIRECTORY & SALES LEDGER TABLE */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-14 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto" />
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
                Accessing Merchant Registry...
              </p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-14 text-center space-y-2">
              <Store size={32} className="text-brand-muted mx-auto" />
              <h3 className="font-serif text-base font-bold text-brand-black">
                No Merchant Records Found
              </h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                No vendor store applications matched your current search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-offwhite text-brand-charcoal uppercase tracking-wider text-[10px] font-bold border-b border-brand-border/80">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Store & Atelier</th>
                    <th className="py-3.5 px-4">Merchant Patron</th>
                    <th className="py-3.5 px-4">Gross Sales (₹)</th>
                    <th className="py-3.5 px-4">Orders Count</th>
                    <th className="py-3.5 px-4">Products</th>
                    <th className="py-3.5 px-4">Approval Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {applications.map((app) => {
                    const isPending = app.status === 'pending';
                    const isApproved = app.status === 'approved';
                    const isRejected = app.status === 'rejected';
                    const isSuspended = app.status === 'suspended';

                    return (
                      <tr
                        key={app.id || app._id}
                        className="hover:bg-brand-offwhite/50 transition-colors"
                      >
                        {/* Store & Slug */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                              {app.name ? app.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div className="font-serif font-bold text-sm text-brand-black">
                                {app.name}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                /store/{app.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Merchant Contact */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-brand-black">
                            {app.vendor?.name || 'Artisanal Merchant'}
                          </div>
                          <div className="text-[11px] text-brand-muted">
                            {app.vendor?.email}
                          </div>
                          {app.vendor?.mobile && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              +91 {app.vendor?.mobile}
                            </div>
                          )}
                        </td>

                        {/* Gross Sales */}
                        <td className="py-4 px-4 font-mono font-bold text-sm text-brand-black whitespace-nowrap">
                          ₹{Number(app.totalSales || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Orders Count */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
                            <ShoppingBag size={11} className="text-neutral-500" />
                            <span>{app.totalOrders || 0} orders</span>
                          </span>
                        </td>

                        {/* Products Count */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Package size={11} />
                            <span>{app.productsCount || 0} items</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Approved Live</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {isSuspended && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Quick 1-Click Approve (if pending) */}
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(app.id || app._id, 'approved')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                title="Instantly approve and activate this store"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Review Dossier Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReview(app)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-charcoal hover:bg-brand-cream/60 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <Eye size={13} />
                              <span>Dossier</span>
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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total merchants)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-offwhite disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="p-1.5 rounded-lg border border-brand-border hover:bg-brand-offwhite disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. DETAILED APPLICATION REVIEW & SALES AUDIT MODAL */}
        {/* ========================================================================= */}
        {isModalOpen && selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-5 text-left">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-brand-border/70">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-bold text-base shrink-0">
                    {selectedApp.name ? selectedApp.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-black">
                      {selectedApp.name}
                    </h3>
                    <p className="text-xs text-brand-muted font-mono mt-0.5">
                      /store/{selectedApp.slug}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Alert in Modal */}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Commercial Sales Ledger Summary */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Gross Sales Revenue
                  </span>
                  <p className="font-serif text-lg font-bold text-amber-950 mt-1">
                    ₹{Number(selectedApp.totalSales || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-amber-700/80 mt-0.5">Completed orders</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Orders Fulfilled
                  </span>
                  <p className="font-serif text-lg font-bold text-brand-black mt-1">
                    {selectedApp.totalOrders || 0}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Customer orders</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Active Catalog
                  </span>
                  <p className="font-serif text-lg font-bold text-brand-black mt-1">
                    {selectedApp.productsCount || 0} items
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Listed in shop</p>
                </div>
              </div>

              {/* Business Dossier Details */}
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-brand-offwhite border border-brand-border/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Store Description
                  </span>
                  <p className="text-neutral-700 leading-relaxed font-medium">
                    {selectedApp.description || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                      Business Address
                    </span>
                    <p className="text-neutral-700 font-medium">
                      {selectedApp.businessAddress || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                      Tax ID / Registration
                    </span>
                    <p className="font-mono text-neutral-800 font-bold">
                      {selectedApp.taxId || 'Pending Verification'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                      Merchant Owner
                    </span>
                    <p className="text-brand-black font-bold">
                      {selectedApp.vendor?.name || 'Unknown'}
                    </p>
                    <p className="text-[11px] text-neutral-500">{selectedApp.vendor?.email}</p>
                    {selectedApp.vendor?.mobile && (
                      <p className="text-[11px] text-neutral-500 font-mono">
                        +91 {selectedApp.vendor?.mobile}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-brand-offwhite border border-brand-border/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                      Support Contact
                    </span>
                    <p className="text-neutral-700 font-medium">
                      {selectedApp.supportEmail || selectedApp.vendor?.email}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {selectedApp.supportPhone || selectedApp.vendor?.mobile || 'No phone'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rejection Form Input */}
              {showRejectForm && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800">
                      Specify Rejection Reason (sent to merchant):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="e.g. Business documentation incomplete, tax ID unverified, or address requires clarification..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-rose-300 bg-white text-rose-950 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                  />
                  {rejectionError && (
                    <p className="text-rose-700 font-bold text-[11px]">{rejectionError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectForm(false)}
                      className="text-xs"
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedApp.id || selectedApp._id, 'rejected', rejectionReason)
                      }
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                    >
                      {isActionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-brand-border/70 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={`/store/${selectedApp.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-brand-black font-semibold"
                >
                  <ExternalLink size={12} />
                  <span>View Public Atelier Page</span>
                </a>

                <div className="flex items-center gap-2">
                  {selectedApp.status === 'pending' && !showRejectForm && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRejectForm(true)}
                        className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                      >
                        Reject Application
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isActionLoading}
                        onClick={() =>
                          handleUpdateStatus(selectedApp.id || selectedApp._id, 'approved')
                        }
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        {isActionLoading ? 'Approving...' : 'Approve & Activate Store'}
                      </Button>
                    </>
                  )}

                  {selectedApp.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedApp.id || selectedApp._id, 'suspended')
                      }
                      className="text-xs text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                    >
                      Suspend Store
                    </Button>
                  )}

                  {selectedApp.status === 'suspended' && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedApp.id || selectedApp._id, 'approved')
                      }
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Reactivate Store
                    </Button>
                  )}

                  {selectedApp.status === 'rejected' && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isActionLoading}
                      onClick={() =>
                        handleUpdateStatus(selectedApp.id || selectedApp._id, 'approved')
                      }
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Reconsider & Approve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
