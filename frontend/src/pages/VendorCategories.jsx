import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Search,
  Package,
  Plus,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Tag,
  Store,
  ChevronRight,
  Filter,
  Eye,
  Trash2,
  ArrowUpDown,
  X,
  Check,
  ShoppingBag
} from 'lucide-react';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { categoryService, vendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VendorCategories() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [store, setStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'with-products' | 'empty'
  const [sortBy, setSortBy] = useState('creations-desc'); // 'creations-desc' | 'creations-asc' | 'name-asc' | 'name-desc'

  // Proposal modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestCategoryName, setRequestCategoryName] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [deletingRequestId, setDeletingRequestId] = useState(null);

  // Category Atelier Showcase Modal (Quick View)
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);

  // Debounce search effect (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const [catRes, prodRes, storeRes, reqRes] = await Promise.allSettled([
        categoryService.getCategories(),
        vendorService.getProducts({ limit: 200 }),
        vendorService.getStore(),
        categoryService.getCategoryRequests(),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value) {
        const catList = Array.isArray(catRes.value)
          ? catRes.value
          : Array.isArray(catRes.value?.categories)
          ? catRes.value.categories
          : [];
        setCategories(catList);
      } else {
        setFetchError('Failed to load marketplace categories.');
      }

      if (prodRes.status === 'fulfilled' && prodRes.value) {
        const prodList = Array.isArray(prodRes.value?.products)
          ? prodRes.value.products
          : Array.isArray(prodRes.value)
          ? prodRes.value
          : [];
        setProducts(prodList);
      }

      if (storeRes.status === 'fulfilled' && storeRes.value?.store) {
        setStore(storeRes.value.store);
      }

      if (reqRes.status === 'fulfilled' && Array.isArray(reqRes.value?.requests)) {
        setMyRequests(reqRes.value.requests);
      }
    } catch (err) {
      console.error('Error fetching categories for vendor:', err);
      setFetchError('Failed to synchronize marketplace categories.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/categories' } } });
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, fetchData]);

  // Compute product counts and analytics per category for this vendor
  const categoryAnalytics = useMemo(() => {
    const stats = {};
    products.forEach((p) => {
      const catKey = p.category?._id || p.category?.name || p.category;
      if (catKey) {
        if (!stats[catKey]) {
          stats[catKey] = {
            count: 0,
            products: [],
            totalStock: 0,
            totalValue: 0,
          };
        }
        stats[catKey].count += 1;
        stats[catKey].products.push(p);
        stats[catKey].totalStock += Number(p.stock) || 0;
        stats[catKey].totalValue += (Number(p.price) || 0) * (Number(p.stock) || 0);
      }
    });
    return stats;
  }, [products]);

  // Helper to get stats for a category
  const getCatStats = useCallback(
    (cat) => {
      const byId = categoryAnalytics[cat._id] || categoryAnalytics[cat.id];
      const byName = categoryAnalytics[cat.name];
      const count = (byId?.count || 0) + (byName?.count || 0);
      const items = [...(byId?.products || []), ...(byName?.products || [])];
      const totalStock = (byId?.totalStock || 0) + (byName?.totalStock || 0);
      const totalVal = (byId?.totalValue || 0) + (byName?.totalValue || 0);
      const avgPrice = count > 0 && totalStock > 0 ? Math.round(totalVal / totalStock) : 0;
      return { count, items, totalStock, avgPrice };
    },
    [categoryAnalytics]
  );

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let result = categories.filter((cat) => {
      const { count } = getCatStats(cat);
      const catName = cat.name || '';
      const catDesc = cat.description || '';

      // Search match (debounced)
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        catName.toLowerCase().includes(q) ||
        catDesc.toLowerCase().includes(q) ||
        (cat.slug || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterMode === 'with-products') {
        return count > 0;
      }
      if (filterMode === 'empty') {
        return count === 0;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const statsA = getCatStats(a);
      const statsB = getCatStats(b);

      if (sortBy === 'creations-desc') {
        return statsB.count - statsA.count;
      }
      if (sortBy === 'creations-asc') {
        return statsA.count - statsB.count;
      }
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      return 0;
    });

    return result;
  }, [categories, getCatStats, debouncedSearch, filterMode, sortBy]);

  // Metrics
  const totalCategories = categories.length;
  const categoriesWithProducts = categories.filter((c) => getCatStats(c).count > 0).length;
  const coveragePercent =
    totalCategories > 0 ? Math.round((categoriesWithProducts / totalCategories) * 100) : 0;

  // Real MongoDB Category Proposal Submission
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestCategoryName.trim()) return;

    setIsSubmittingRequest(true);
    setRequestError('');
    try {
      const res = await categoryService.requestCategory({
        name: requestCategoryName.trim(),
        reason: requestReason.trim(),
      });

      if (res && res.success) {
        setRequestSent(true);
        if (res.request) {
          setMyRequests((prev) => [res.request, ...prev]);
        }
        setTimeout(() => {
          setRequestSent(false);
          setIsRequestModalOpen(false);
          setRequestCategoryName('');
          setRequestReason('');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to submit category proposal:', err);
      setRequestError(
        err.response?.data?.message || 'Failed to submit category proposal. Please check inputs.'
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Withdraw/Delete proposal from MongoDB
  const handleWithdrawRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to withdraw this category proposal?')) {
      return;
    }

    setDeletingRequestId(requestId);
    try {
      const res = await categoryService.deleteCategoryRequest(requestId);
      if (res && res.success) {
        setMyRequests((prev) => prev.filter((r) => (r._id || r.id) !== requestId));
      }
    } catch (err) {
      console.error('Failed to withdraw category request:', err);
      alert(err.response?.data?.message || 'Failed to withdraw proposal.');
    } finally {
      setDeletingRequestId(null);
    }
  };

  const isApproved = store?.status === 'approved';

  const pageActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={fetchData}
        className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-xl transition-colors cursor-pointer border border-brand-border/70 shadow-xs"
        title="Refresh Categories"
      >
        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
      </button>

      <Link to="/vendor/products">
        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={Package}
          className="text-xs shadow-xs"
        >
          <span>Catalog Products</span>
        </Button>
      </Link>
    </div>
  );

  return (
    <VendorLayout
      activePage="categories"
      title="Marketplace Categories"
      subtitle="Platform-wide taxonomy available for categorizing your atelier creations"
      actions={pageActions}
      store={store}
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              Platform Categories
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-black">
            {totalCategories}
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5">Approved taxonomies</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">
              Atelier Coverage
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-accent/20 text-brand-charcoal flex items-center justify-center">
              <Sparkles size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-black">
            {categoriesWithProducts}{' '}
            <span className="text-sm font-sans font-normal text-brand-muted">
              / {totalCategories}
            </span>
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5">Active categories represented</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Coverage Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700">
            {coveragePercent}%
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Catalog distribution</p>
        </div>

        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              Total Creations
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-offwhite text-brand-black flex items-center justify-center">
              <Package size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-black">
            {products.length}
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5">Active items in catalog</p>
        </div>
      </div>

      {/* Platform Taxonomy Architecture Policy */}
      <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-9 h-9 rounded-xl bg-brand-offwhite text-brand-charcoal flex items-center justify-center shrink-0 mt-0.5 border border-brand-border/70">
            <HelpCircle size={18} />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-brand-black">
              Platform-Curated Taxonomy System
            </h3>
            <p className="text-xs text-brand-muted mt-1 leading-relaxed">
              To preserve luxury presentation standards and guarantee a seamless purchasing
              experience across the marketplace, categories are maintained centrally by platform
              administrators. When publishing your products, select any approved category below.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsRequestModalOpen(true)}
          className="text-xs shrink-0 whitespace-nowrap"
        >
          <span>Request New Category</span>
        </Button>
      </div>

      {/* Search, Filter Pills & Sorting Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-left">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name, slug or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-brand-surface border border-brand-border/80 rounded-xl text-xs text-brand-black placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-black"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-brand-surface border border-brand-border/80 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-brand-black text-white shadow-xs'
                  : 'text-brand-muted hover:text-brand-black'
              }`}
            >
              All ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('with-products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'with-products'
                  ? 'bg-brand-black text-white shadow-xs'
                  : 'text-brand-muted hover:text-brand-black'
              }`}
            >
              In My Atelier ({categoriesWithProducts})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('empty')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'empty'
                  ? 'bg-brand-black text-white shadow-xs'
                  : 'text-brand-muted hover:text-brand-black'
              }`}
            >
              Unrepresented ({categories.length - categoriesWithProducts})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border/80 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown size={13} className="text-brand-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-brand-charcoal font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="creations-desc">Most Atelier Works</option>
              <option value="creations-asc">Fewest Atelier Works</option>
              <option value="name-asc">Name (A to Z)</option>
              <option value="name-desc">Name (Z to A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-brand-muted">Synchronizing marketplace categories...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && fetchError && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-center">
          <AlertCircle size={24} className="mx-auto text-rose-600 mb-2" />
          <p className="text-xs font-semibold">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-3 text-xs">
            Retry Loading
          </Button>
        </div>
      )}

      {/* Categories Grid */}
      {!isLoading && !fetchError && filteredAndSortedCategories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {filteredAndSortedCategories.map((cat) => {
            const catId = cat._id || cat.id;
            const stats = getCatStats(cat);
            const myProductCount = stats.count;
            const isActive = cat.status === 'active' || cat.status === undefined;

            return (
              <div
                key={catId || cat.slug}
                className="bg-brand-surface border border-brand-border/80 rounded-2xl p-5 shadow-xs hover:border-brand-black/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-offwhite border border-brand-border/70 overflow-hidden flex items-center justify-center shrink-0">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Layers size={20} className="text-brand-muted" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {isActive ? 'Available' : 'Archived'}
                      </span>

                      {/* External storefront link */}
                      <Link
                        to={`/products?category=${encodeURIComponent(cat.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-brand-muted hover:text-brand-black transition-colors rounded-lg hover:bg-brand-offwhite"
                        title="View Category in Customer Storefront"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      onClick={() => setSelectedCategoryModal(cat)}
                      className="font-serif text-base font-bold text-brand-black group-hover:text-brand-accent transition-colors cursor-pointer"
                    >
                      {cat.name}
                    </h3>
                  </div>

                  <p className="text-[11px] font-mono text-brand-muted mt-0.5">
                    slug: /{cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}
                  </p>

                  <p className="text-xs text-brand-muted mt-2 line-clamp-2 leading-relaxed">
                    {cat.description ||
                      'Curated luxury department for artisanal creations and designer works.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-brand-border/60 flex items-center justify-between gap-2">
                  <div
                    onClick={() => setSelectedCategoryModal(cat)}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to inspect creations in this category"
                  >
                    <Tag size={13} className="text-brand-muted" />
                    <span className="text-xs font-semibold text-brand-charcoal">
                      {myProductCount} {myProductCount === 1 ? 'creation' : 'creations'}
                    </span>
                    <span className="text-[10px] text-brand-muted">in your atelier</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryModal(cat)}
                      className="p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-offwhite rounded-lg transition-colors cursor-pointer"
                      title="Inspect Atelier Works in this category"
                    >
                      <Eye size={14} />
                    </button>

                    {myProductCount > 0 ? (
                      <Link
                        to={`/vendor/products?category=${encodeURIComponent(cat.name)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-black hover:text-brand-accent transition-colors"
                        title={`Manage products in ${cat.name}`}
                      >
                        <span>Manage ({myProductCount})</span>
                        <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <Link
                        to={`/vendor/products?action=add&category=${encodeURIComponent(cat.name)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline transition-colors"
                        title={`Add product in ${cat.name}`}
                      >
                        <Plus size={12} />
                        <span>Add First Piece</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !fetchError && filteredAndSortedCategories.length === 0 && (
        <div className="py-16 bg-brand-surface border border-brand-border/80 rounded-2xl text-center p-8">
          <Layers size={36} className="text-brand-muted mx-auto mb-3 opacity-60" />
          <h3 className="font-serif text-base font-bold text-brand-black mb-1">
            No matching categories found
          </h3>
          <p className="text-xs text-brand-muted max-w-md mx-auto mb-4">
            Try adjusting your search criteria or resetting filters to view all platform
            categories.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setFilterMode('all');
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Category Atelier Showcase Modal */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-xl w-full p-6 text-left space-y-5 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-brand-border/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-offwhite border border-brand-border overflow-hidden flex items-center justify-center shrink-0">
                  {selectedCategoryModal.image ? (
                    <img
                      src={selectedCategoryModal.image}
                      alt={selectedCategoryModal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Layers size={22} className="text-brand-muted" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-black">
                    {selectedCategoryModal.name}
                  </h3>
                  <p className="text-[11px] font-mono text-brand-muted">
                    /{selectedCategoryModal.slug || selectedCategoryModal.name.toLowerCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategoryModal(null)}
                className="text-brand-muted hover:text-brand-black p-1 cursor-pointer rounded-lg hover:bg-brand-offwhite"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              {selectedCategoryModal.description ||
                'Curated luxury marketplace category for designer creations.'}
            </p>

            {/* Category Atelier Metrics */}
            {(() => {
              const stats = getCatStats(selectedCategoryModal);
              return (
                <div className="grid grid-cols-3 gap-3 bg-brand-offwhite/50 p-3.5 rounded-xl border border-brand-border/70 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">
                      Creations
                    </span>
                    <span className="text-lg font-bold text-brand-black font-serif">
                      {stats.count}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">
                      Units In Stock
                    </span>
                    <span className="text-lg font-bold text-emerald-700 font-serif">
                      {stats.totalStock}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">
                      Avg. Price
                    </span>
                    <span className="text-lg font-bold text-brand-charcoal font-serif">
                      ${stats.avgPrice}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Creations Listed in this Category */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-brand-black">
                  Your Atelier Creations in this Taxonomy
                </span>
                <Link
                  to={`/vendor/products?action=add&category=${encodeURIComponent(
                    selectedCategoryModal.name
                  )}`}
                  className="text-[11px] font-semibold text-brand-accent hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add Product</span>
                </Link>
              </div>

              {(() => {
                const stats = getCatStats(selectedCategoryModal);
                if (stats.items.length === 0) {
                  return (
                    <div className="p-6 text-center border border-dashed border-brand-border rounded-xl bg-brand-offwhite/30 space-y-2">
                      <ShoppingBag size={24} className="text-brand-muted mx-auto opacity-50" />
                      <p className="text-xs text-brand-muted">
                        No creations currently published in this category.
                      </p>
                      <Link
                        to={`/vendor/products?action=add&category=${encodeURIComponent(
                          selectedCategoryModal.name
                        )}`}
                      >
                        <Button variant="primary" size="sm" className="text-xs mt-1">
                          + Publish First Piece
                        </Button>
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {stats.items.map((prod) => (
                      <div
                        key={prod._id || prod.id}
                        className="flex items-center justify-between p-2.5 bg-brand-surface border border-brand-border/70 rounded-xl hover:border-brand-black/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg bg-brand-offwhite border border-brand-border/60 overflow-hidden shrink-0">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={16} className="text-brand-muted m-auto mt-2" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-brand-black line-clamp-1">
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-brand-muted font-mono">
                              SKU: {prod.sku || 'N/A'} • ${prod.price}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              (Number(prod.stock) || 0) <= 5
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {prod.stock} in stock
                          </span>

                          <Link
                            to={`/vendor/products?category=${encodeURIComponent(
                              selectedCategoryModal.name
                            )}`}
                            className="p-1 text-brand-muted hover:text-brand-black transition-colors"
                            title="Manage in Catalog"
                          >
                            <ChevronRight size={15} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-brand-border/70">
              <Link
                to={`/products?category=${encodeURIComponent(selectedCategoryModal.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-charcoal hover:text-brand-black font-semibold"
              >
                <ExternalLink size={13} />
                <span>Customer Storefront</span>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryModal(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Link
                  to={`/vendor/products?category=${encodeURIComponent(
                    selectedCategoryModal.name
                  )}`}
                >
                  <Button variant="primary" size="sm" className="text-xs">
                    View in Catalog Products
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request New Category Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-md w-full p-6 text-left space-y-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/70">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-brand-accent" />
                <h3 className="font-serif text-base font-bold text-brand-black">
                  Request New Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-brand-muted hover:text-brand-black p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {requestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {requestSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-center space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                <p className="text-xs font-bold">Category Proposal Persisted to Database</p>
                <p className="text-[11px] text-emerald-800">
                  Platform curators will review your taxonomy proposal for luxury standards
                  compliance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                    Proposed Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={requestCategoryName}
                    onChange={(e) => setRequestCategoryName(e.target.value)}
                    placeholder="e.g. Fine Porcelain & Ceramics"
                    className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border/80 rounded-lg text-xs text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-charcoal mb-1">
                    Atelier Proposal & Justification
                  </label>
                  <textarea
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Explain the artisan creations you plan to list in this category and target clientele..."
                    className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border/80 rounded-lg text-xs text-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setRequestError('');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingRequest}
                    className="text-xs"
                  >
                    Submit Proposal
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Submitted Category Proposals History */}
      {myRequests.length > 0 && (
        <div className="mt-8 bg-brand-surface border border-brand-border/80 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60 mb-4">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-brand-accent" />
              <h3 className="font-serif text-sm font-bold text-brand-black">
                Your Submitted Taxonomy Proposals ({myRequests.length})
              </h3>
            </div>
            <span className="text-[11px] text-brand-muted">Recorded in MongoDB</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myRequests.map((req) => (
              <div
                key={req._id || req.id}
                className="p-3.5 rounded-xl border border-brand-border/70 bg-brand-offwhite/50 space-y-2 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-brand-black">{req.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                      }`}
                    >
                      {req.status === 'approved'
                        ? 'Approved'
                        : req.status === 'rejected'
                        ? 'Declined'
                        : 'Under Review'}
                    </span>

                    {/* Delete/Withdraw Proposal button for pending requests */}
                    {req.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawRequest(req._id || req.id)}
                        disabled={deletingRequestId === (req._id || req.id)}
                        className="text-brand-muted hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Withdraw Proposal"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {req.reason && (
                  <p className="text-[11px] text-brand-muted line-clamp-2">{req.reason}</p>
                )}
                <p className="text-[10px] text-brand-muted/70 font-mono">
                  Submitted: {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
