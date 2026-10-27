import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Eye,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShoppingBag,
  RefreshCw,
  Loader2,
  ShieldAlert,
  LogIn,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ExternalLink,
  PackageCheck,
  Copy,
  Check,
  ArrowUpRight
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { customerService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Format mobile phone to avoid duplicate country code prefix (+91+91...)
 */
const formatMobile = (phone) => {
  if (!phone) return null;
  const str = String(phone).trim();
  const cleaned = str.replace(/^(\+91\s*)+/, '');
  if (str.startsWith('+') && !str.startsWith('+91')) {
    return str;
  }
  return `+91 ${cleaned}`;
};

/**
 * Format currency with 2 decimal precision
 */
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Format order count with proper pluralization
 */
const formatOrderCount = (count) => {
  if (count === undefined || count === null) return 'Member';
  const num = Number(count) || 0;
  return `${num} ${num === 1 ? 'order' : 'orders'}`;
};

/**
 * Order Status Pills configuration
 */
const ORDER_STATUS_CONFIG = {
  Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  Confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
};

/**
 * Status Badge for Customer Account Status
 */
function CustomerStatusBadge({ role = 'user' }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
        <Sparkles size={11} className="text-amber-600" />
        <span>Store Administrator</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
      <span>Active & Verified</span>
    </span>
  );
}

/**
 * Premium Admin Customer Management Page Component
 * Direct backend integration:
 * - GET /api/admin/customers (list, search, filter, pagination)
 * - GET /api/admin/customers/:id (individual profile & acquisition order history)
 */
export default function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Customer List State (from backend API)
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(isAuthenticated && user?.role === 'admin'));
  const [apiError, setApiError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All'); // 'All' | 'user' | 'admin'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'

  // Server-side Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Customer Details Modal State (from GET /api/admin/customers/:id)
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Manual Refresh Trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // One-click clipboard copy feedback state
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, fieldId) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fetch registered customers from GET /api/admin/customers
  useEffect(() => {
    let active = true;
    if (!isAdmin) {
      return;
    }

    const timer = setTimeout(
      async () => {
        setIsLoading(true);
        setApiError(null);

        try {
          const params = {
            page: currentPage,
            limit: pageSize,
            sortBy,
          };
          if (searchQuery.trim()) {
            params.search = searchQuery.trim();
          }
          if (roleFilter !== 'All') {
            params.role = roleFilter;
          }

          const res = await customerService.getCustomers(params);

          if (!active) return;

          if (res && res.success) {
            const list = res.customers || res.data || [];
            setCustomers(list);
            const total = res.totalCustomers ?? list.length;
            setTotalCustomers(total);
            setTotalPages(res.totalPages ?? Math.max(1, Math.ceil(total / pageSize)));
          } else if (Array.isArray(res)) {
            setCustomers(res);
            setTotalCustomers(res.length);
            setTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
          } else {
            setCustomers([]);
            setTotalCustomers(0);
            setTotalPages(1);
          }
        } catch (err) {
          if (!active) return;
          console.error('Failed to retrieve customers from backend:', err);
          const statusCode = err.response?.status;
          if (statusCode === 401) {
            logout();
            navigate('/login', { state: { from: { pathname: '/admin/customers' } } });
            return;
          }

          if (statusCode === 403) {
            setApiError('Access forbidden. Administrative privileges are required to view customer records.');
            setCustomers([]);
            setTotalCustomers(0);
            setTotalPages(1);
            return;
          }

          setApiError(
            err.response?.data?.message ||
              err.customMessage ||
              'Unable to retrieve customer records from the database. Please verify backend is running.'
          );
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      },
      searchQuery ? 300 : 0
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAdmin, currentPage, pageSize, roleFilter, sortBy, searchQuery, refreshKey, logout, navigate]);

  // Fetch individual customer details via GET /api/admin/customers/:id
  const handleOpenCustomerModal = async (cust) => {
    const customerId = cust.id || cust._id;
    if (!customerId) return;

    // Show instant preview while full dossier is fetched from backend
    setSelectedCustomer(cust);
    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const res = await customerService.getCustomerById(customerId);
      if (res && res.success && res.customer) {
        setSelectedCustomer(res.customer);
      }
    } catch (err) {
      console.error('Failed to fetch individual customer profile:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401) {
        logout();
        navigate('/login', { state: { from: { pathname: '/admin/customers' } } });
        return;
      }
      setDetailError(
        err.response?.data?.message ||
          err.customMessage ||
          'Failed to retrieve complete profile and order history from the server.'
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCustomer(null);
    setIsDetailLoading(false);
    setDetailError(null);
  };

  // Filter & Search Handlers (resets pagination to page 1)
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleRoleChange = (val) => {
    setRoleFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('All');
    setCurrentPage(1);
  };

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setApiError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Role Counts for tabs
  const roleCounts = useMemo(() => {
    const counts = { All: totalCustomers, user: 0, admin: 0 };
    customers.forEach((c) => {
      const r = c.role === 'admin' ? 'admin' : 'user';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [customers, totalCustomers]);

  return (
    <AdminLayout
      activePage="customers"
      title="Clientele & Customer Directory"
      subtitle="Executive registry of verified luxury patrons, account coordinates, and lifetime acquisition value"
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Directory"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>
        </div>
      }
    >
      {/* ========================================================================= */}
      {/* 1. ACCESS RESTRICTION FOR NON-ADMINS */}
      {/* ========================================================================= */}
      {!isAdmin ? (
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-12 text-center shadow-xs my-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldAlert size={32} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-brand-black mb-2">
            Administrator Clearance Required
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto mb-6 leading-relaxed">
            The clientele directory contains private client coordinates and confidential acquisition history.
            Please sign in with authorized store administrator credentials to view this directory.
          </p>
          <Link to="/login">
            <Button variant="primary" size="md" icon={LogIn}>
              Sign In as Administrator
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Database API Error Alert */}
          {apiError && (
            <div className="p-4 rounded-xl border bg-rose-50 text-rose-900 border-rose-200 flex items-start justify-between gap-3 text-xs text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={17} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 font-semibold">Registry Error:</strong>
                  <span>{apiError}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleRefresh}
                icon={RefreshCw}
                className="border-rose-300 hover:bg-rose-100 shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. SEARCH, SORT & ROLE FILTER CONTROLS */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search by Customer Name, Email, or Mobile Phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon={Search}
                  className="!py-2 text-xs sm:text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-black cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Sort & Page Size Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-brand-muted font-medium">
                  <SlidersHorizontal size={14} className="text-brand-accent" />
                  <span>Sort:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-brand-offwhite border border-brand-border text-xs font-semibold text-brand-black px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-black cursor-pointer"
                >
                  <option value="newest">Newest Patrons First</option>
                  <option value="oldest">Oldest Patrons First</option>
                  <option value="name">Alphabetical (A-Z)</option>
                </select>

                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-brand-offwhite border border-brand-border text-xs font-semibold text-brand-black px-2.5 py-2 rounded-lg focus:outline-none cursor-pointer"
                  title="Items per page"
                >
                  <option value={5}>5 / page</option>
                  <option value={8}>8 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                </select>
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-brand-border/50 text-xs">
              {[
                { id: 'All', label: 'All Accounts', count: roleCounts.All },
                { id: 'user', label: 'Clients / Shoppers', count: roleCounts.user },
                { id: 'admin', label: 'Administrators', count: roleCounts.admin },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRoleChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    roleFilter === tab.id
                      ? 'bg-brand-black text-white shadow-xs'
                      : 'bg-brand-offwhite text-brand-charcoal border border-brand-border hover:bg-brand-cream/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      roleFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-border text-brand-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. RESPONSIVE CUSTOMERS TABLE */}
          {/* ========================================================================= */}
          {isLoading ? (
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <Loader2 size={36} className="text-brand-accent animate-spin mx-auto mb-4" />
              <h3 className="font-serif text-lg font-bold text-brand-black mb-1">
                Accessing Clientele Registry...
              </h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Retrieving real-time verified customer accounts from database.
              </p>
            </div>
          ) : customers.length === 0 ? (
            /* Clean Empty State (Zero Fake/Mock Customers Displayed) */
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-12 sm:p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-brand-cream/80 text-brand-accent flex items-center justify-center mx-auto mb-4">
                <Users size={28} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-black mb-2">
                No Customer Records Found
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto mb-6 leading-relaxed">
                {totalCustomers === 0 && !searchQuery && roleFilter === 'All'
                  ? 'There are currently no registered customer accounts in the database. When shoppers sign up or place orders, their verified profiles will populate here automatically.'
                  : `No customer records matched your query ("${searchQuery}").`}
              </p>
              {(searchQuery || roleFilter !== 'All') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  icon={RotateCcw}
                >
                  Reset Search Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-brand-surface border border-brand-border/70 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-brand-offwhite/80 border-b border-brand-border/70 text-[11px] uppercase tracking-wider font-semibold text-brand-muted">
                      <th className="py-3.5 px-4 sm:px-6">Customer / Client</th>
                      <th className="py-3.5 px-4">Contact Information</th>
                      <th className="py-3.5 px-4">Registration Date</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Total Acquisitions</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/50">
                    {customers.map((cust) => {
                      const regDate = cust.createdAt
                        ? new Date(cust.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Verified Member';

                      const initials = cust.name
                        ? cust.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'U';

                      return (
                        <tr
                          key={cust.id || cust._id || cust.email}
                          className="hover:bg-brand-offwhite/40 transition-colors group"
                        >
                          {/* Customer Name & Avatar */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-cream border border-brand-border text-brand-black flex items-center justify-center font-serif text-sm font-bold shrink-0">
                                {initials}
                              </div>
                              <div>
                                <span className="font-bold text-brand-black block">
                                  {cust.name}
                                </span>
                                <span className="text-[11px] text-brand-muted font-mono">
                                  ID: #{String(cust.id || cust._id || '').slice(-6) || 'CL-USER'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 text-brand-charcoal text-xs group/email">
                              <Mail size={12} className="text-brand-muted shrink-0" />
                              <span className="truncate max-w-xs">{cust.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(cust.email, `email-${cust.id || cust._id}`)}
                                className="opacity-0 group-hover/email:opacity-100 transition-opacity p-0.5 text-brand-muted hover:text-brand-black cursor-pointer"
                                title="Copy Email"
                              >
                                {copiedField === `email-${cust.id || cust._id}` ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                            {cust.mobile && (
                              <div className="flex items-center gap-1.5 text-brand-muted text-[11px] mt-0.5 group/phone">
                                <Phone size={11} className="shrink-0" />
                                <span>{formatMobile(cust.mobile)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(cust.mobile, `phone-${cust.id || cust._id}`)}
                                  className="opacity-0 group-hover/phone:opacity-100 transition-opacity p-0.5 text-brand-muted hover:text-brand-black cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedField === `phone-${cust.id || cust._id}` ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Registration Date */}
                          <td className="py-4 px-4 whitespace-nowrap text-brand-charcoal">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar size={12} className="text-brand-accent shrink-0" />
                              <span>{regDate}</span>
                            </div>
                          </td>

                          {/* Account Status Badge */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <CustomerStatusBadge role={cust.role} />
                          </td>

                          {/* Total Acquisitions */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-semibold text-brand-black">
                              {formatOrderCount(cust.orderCount)}
                            </div>
                            {cust.totalSpend > 0 && (
                              <div className="text-[11px] text-brand-muted font-serif">
                                Value: {formatCurrency(cust.totalSpend)}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenCustomerModal(cust)}
                              icon={Eye}
                              className="hover:border-brand-black"
                            >
                              View Dossier
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Server-Side Pagination Controls */}
              <div className="p-4 bg-brand-offwhite/40 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-muted">
                <div>
                  Showing{' '}
                  <strong>
                    {totalCustomers === 0
                      ? 0
                      : (currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {Math.min(currentPage * pageSize, totalCustomers)}
                  </strong>{' '}
                  of <strong>{totalCustomers}</strong> registered patrons
                </div>

                {/* Pagination Buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md border border-brand-border bg-brand-surface text-brand-charcoal hover:bg-brand-cream/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setCurrentPage(pg)}
                        className={`w-7 h-7 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                          currentPage === pg
                            ? 'bg-brand-black text-white'
                            : 'border border-brand-border bg-brand-surface text-brand-charcoal hover:bg-brand-cream/80'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-md border border-brand-border bg-brand-surface text-brand-charcoal hover:bg-brand-cream/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. CUSTOMER DETAILS & ORDER HISTORY MODAL (GET /api/admin/customers/:id) */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-brand-surface/95 backdrop-blur-md p-5 sm:p-6 border-b border-brand-border/60 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-accent">
                    Clientele Dossier
                  </span>
                  <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                  <span className="font-mono text-xs font-bold text-brand-black">
                    #{String(selectedCustomer.id || selectedCustomer._id || '').slice(-8)}
                  </span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-black">
                  {selectedCustomer.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-brand-muted hover:text-brand-black rounded-full hover:bg-brand-cream/60 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Detail In-Flight Loading Status */}
              {isDetailLoading && (
                <div className="p-3 bg-brand-cream/70 border border-brand-border rounded-xl flex items-center gap-2.5 text-xs text-brand-charcoal animate-pulse">
                  <Loader2 size={16} className="animate-spin text-brand-accent shrink-0" />
                  <span>Fetching verified client profile and acquisition history from database...</span>
                </div>
              )}

              {/* Detail Fetch Error */}
              {detailError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-rose-600 shrink-0" />
                    <span>{detailError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleOpenCustomerModal(selectedCustomer)}
                    icon={RefreshCw}
                    className="border-rose-300 hover:bg-rose-100 shrink-0"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Profile Coordinates Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted">
                      <Mail size={13} className="text-brand-accent" />
                      <span>Verified Email Address</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedCustomer.email, 'modal-email')}
                      className="p-1 text-brand-muted hover:text-brand-black cursor-pointer rounded"
                      title="Copy Email"
                    >
                      {copiedField === 'modal-email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="font-bold text-brand-black text-sm break-all">
                    {selectedCustomer.email}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">✓ Primary Communications Channel</p>
                </div>

                {/* Mobile Phone */}
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/70 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted">
                      <Phone size={13} className="text-brand-accent" />
                      <span>Mobile Phone Number</span>
                    </div>
                    {selectedCustomer.mobile && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedCustomer.mobile, 'modal-phone')}
                        className="p-1 text-brand-muted hover:text-brand-black cursor-pointer rounded"
                        title="Copy Phone"
                      >
                        {copiedField === 'modal-phone' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                  <p className="font-bold text-brand-black text-sm">
                    {formatMobile(selectedCustomer.mobile) || 'Not provided on file'}
                  </p>
                  <p className="text-[11px] text-brand-muted">Used for courier SMS updates</p>
                </div>

                {/* Registration Timestamp */}
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/70 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-1">
                    <Calendar size={13} className="text-brand-accent" />
                    <span>Registration Date</span>
                  </div>
                  <p className="font-bold text-brand-black text-sm">
                    {selectedCustomer.createdAt
                      ? new Date(selectedCustomer.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Lifetime Member'}
                  </p>
                  <p className="text-[11px] text-brand-muted">Registered in database</p>
                </div>

                {/* Clearance & Account Status */}
                <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/70 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 uppercase tracking-wider font-semibold text-brand-muted mb-1">
                    <ShieldCheck size={13} className="text-brand-accent" />
                    <span>Clearance & Status</span>
                  </div>
                  <div className="pt-0.5">
                    <CustomerStatusBadge role={selectedCustomer.role} />
                  </div>
                  <p className="text-[11px] text-brand-muted pt-1">256-Bit SSL JWT Secured</p>
                </div>
              </div>

              {/* Acquisition Metrics */}
              <div className="p-4 rounded-xl bg-brand-cream/40 border border-brand-border/70 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                    Total Acquisitions
                  </p>
                  <p className="font-serif text-xl font-bold text-brand-black mt-1">
                    {selectedCustomer.orderCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                    Lifetime Spend
                  </p>
                  <p className="font-serif text-xl font-bold text-brand-black mt-1">
                    {formatCurrency(selectedCustomer.totalSpend)}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[11px] uppercase tracking-wider text-brand-muted font-medium">
                    Average Order Value
                  </p>
                  <p className="font-serif text-xl font-bold text-brand-black mt-1">
                    {formatCurrency(
                      selectedCustomer.orderCount > 0
                        ? selectedCustomer.totalSpend / selectedCustomer.orderCount
                        : 0
                    )}
                  </p>
                </div>
              </div>

              {/* Order History Section (Displayed only when returned by API) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-brand-charcoal flex items-center gap-1.5">
                    <PackageCheck size={14} className="text-brand-accent" />
                    <span>Acquisition History</span>
                  </h4>
                  <Link
                    to="/admin/orders"
                    className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1"
                  >
                    <span>View Orders Ledger</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>

                {Array.isArray(selectedCustomer.orders) && selectedCustomer.orders.length > 0 ? (
                  <div className="border border-brand-border/70 rounded-xl overflow-hidden divide-y divide-brand-border/60">
                    {selectedCustomer.orders.map((ord, i) => {
                      const orderRef = String(ord.orderNumber || ord.id || ord._id).slice(-8);
                      const status = ord.orderStatus || ord.status || 'Confirmed';
                      const statusStyle = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.Confirmed;

                      return (
                        <div
                          key={ord._id || ord.id || i}
                          className="p-3.5 flex items-center justify-between gap-3 text-xs bg-brand-surface hover:bg-brand-offwhite/40 transition-colors"
                        >
                          <div>
                            <Link
                              to="/admin/orders"
                              className="font-mono font-bold text-brand-black hover:text-brand-accent transition-colors flex items-center gap-1"
                              title="Inspect order in ledger"
                            >
                              <span>#{orderRef}</span>
                              <ArrowUpRight size={11} className="opacity-60" />
                            </Link>
                            <p className="text-[11px] text-brand-muted">
                              {ord.createdAt || ord.date
                                ? new Date(ord.createdAt || ord.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Recent'}{' '}
                              • {ord.itemsCount || ord.products?.length || 1}{' '}
                              {(ord.itemsCount || ord.products?.length || 1) === 1 ? 'item' : 'items'}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            <p className="font-serif font-bold text-brand-black">
                              {formatCurrency(ord.totalAmount || ord.total || 0)}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isDetailLoading ? (
                  <div className="p-6 text-center rounded-xl bg-brand-offwhite border border-brand-border/60 text-xs text-brand-muted flex flex-col items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin text-brand-accent" />
                    <span>Retrieving verified acquisition history...</span>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-brand-offwhite border border-brand-border/60 text-xs text-brand-muted">
                    <ShoppingBag size={20} className="mx-auto mb-2 text-brand-muted opacity-50" />
                    <span>No verified acquisition orders recorded for this customer account yet.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-brand-offwhite/60 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
              <span>
                Customer Reference: #{String(selectedCustomer.id || selectedCustomer._id || '').slice(-8)}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={handleCloseModal}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
