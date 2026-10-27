import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Info,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Power,
  Globe,
  Tag,
  PackageCheck
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import watchImg from '../assets/luxury_watch.jpg';
import bagImg from '../assets/luxury_bag.jpg';
import coatImg from '../assets/hero_lifestyle.jpg';
import perfumeImg from '../assets/luxury_perfume.jpg';
import sunglassesImg from '../assets/luxury_sunglasses.jpg';

// Preset luxury image choices for quick selection in add/edit category form
const PRESET_IMAGES = [
  { label: 'Timepiece (Horology)', value: watchImg },
  { label: 'Leather Goods', value: bagImg },
  { label: 'Couture Apparel', value: coatImg },
  { label: 'Fragrance', value: perfumeImg },
  { label: 'Eyewear', value: sunglassesImg }
];

// Initial luxury category defaults for one-click seed if database is empty
const INITIAL_LUXURY_CATEGORIES = [
  {
    name: 'Luxury Horology',
    slug: 'luxury-horology',
    description: 'Masterpiece Swiss mechanical watches, chronometers, and heirloom timepieces.',
    image: watchImg,
    status: 'active'
  },
  {
    name: 'Handcrafted Goods',
    slug: 'handcrafted-goods',
    description: 'Full-grain Tuscan leather satchels, bespoke luggage, and artisan accessories.',
    image: bagImg,
    status: 'active'
  },
  {
    name: 'Fine Fragrance',
    slug: 'fine-fragrance',
    description: 'Extrait de parfum distilled from rare botanical essences and royal oud resins.',
    image: perfumeImg,
    status: 'active'
  },
  {
    name: 'Designer Eyewear',
    slug: 'designer-eyewear',
    description: 'Titanium and gold-plated aviator frames fitted with polarized Carl Zeiss lenses.',
    image: sunglassesImg,
    status: 'active'
  },
  {
    name: 'Haute Couture',
    slug: 'haute-couture',
    description: 'Pure cashmere trench coats, Italian silk tailoring, and runway eveningwear.',
    image: coatImg,
    status: 'active'
  }
];

export default function AdminCategories() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Categories State from Backend
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState(null);

  // Search & Status Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add, object = Edit

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: watchImg,
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formApiError, setFormApiError] = useState(null);

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    category: null,
    errorMessage: null
  });

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch Categories from Backend API (GET /api/categories?status=all)
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await categoryService.getCategories({ status: 'all' });
      if (data && data.success && Array.isArray(data.categories)) {
        setCategoriesList(data.categories);
      } else {
        setCategoriesList([]);
      }
    } catch (err) {
      console.error('Failed to fetch categories from API:', err);
      setApiError(
        err.customMessage ||
          `Unable to connect to backend category APIs at ${
            import.meta.env.VITE_API_URL || 'http://localhost:5000'
          }. Please ensure the backend server is running.`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filtered Categories by Search Query & Status Filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return categoriesList.filter((category) => {
      // Status check
      const catStatus = category.status || (category.isActive !== false ? 'active' : 'inactive');
      if (statusFilter !== 'all' && catStatus !== statusFilter) {
        return false;
      }

      // Search match
      if (!q) return true;
      return (
        category.name.toLowerCase().includes(q) ||
        (category.slug && category.slug.toLowerCase().includes(q)) ||
        (category.description && category.description.toLowerCase().includes(q)) ||
        (category.id && category.id.toLowerCase().includes(q)) ||
        (category._id && category._id.toLowerCase().includes(q))
      );
    });
  }, [categoriesList, searchQuery, statusFilter]);

  // Computed summary counts
  const summaryCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let totalAssignedProducts = 0;

    categoriesList.forEach((c) => {
      const isAct = c.status === 'active' || (c.status !== 'inactive' && c.isActive !== false);
      if (isAct) active++;
      else inactive++;
      totalAssignedProducts += c.productCount || 0;
    });

    return {
      total: categoriesList.length,
      active,
      inactive,
      totalAssignedProducts
    };
  }, [categoriesList]);

  // Open Modal for "Add Category"
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: watchImg,
      status: 'active'
    });
    setFormErrors({});
    setFormApiError(null);
    setIsFormModalOpen(true);
  };

  // Open Modal for "Edit Category"
  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || watchImg,
      status: category.status || (category.isActive !== false ? 'active' : 'inactive')
    });
    setFormErrors({});
    setFormApiError(null);
    setIsFormModalOpen(true);
  };

  // Validate Form Inputs before API Submission
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Category name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters.';
    }

    if (formData.slug.trim()) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.slug.trim().toLowerCase())) {
        errors.slug = 'Slug must only contain lowercase letters, numbers, and hyphens.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit (POST /api/categories or PUT /api/categories/:id)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormApiError(null);

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() ? formData.slug.trim().toLowerCase() : undefined,
      description: formData.description.trim(),
      image: formData.image.trim(),
      status: formData.status
    };

    try {
      if (editingCategory) {
        // PUT /api/categories/:id
        const targetId = editingCategory.id || editingCategory._id;
        const res = await categoryService.updateCategory(targetId, payload);
        showToast(`Category "${res.category?.name || payload.name}" updated successfully.`);
      } else {
        // POST /api/categories
        const res = await categoryService.createCategory(payload);
        showToast(`Category "${res.category?.name || payload.name}" created successfully.`);
      }

      setIsFormModalOpen(false);
      await fetchCategories(); // Refresh list after change
    } catch (err) {
      console.error('Error submitting category form:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setFormApiError(
          'Admin Permission Denied: You must be logged in as an administrator (e.g. admin@luxury.com) to manage categories.'
        );
      } else {
        const errorMsg =
          err.response?.data?.message ||
          err.customMessage ||
          'Failed to save category to database.';
        setFormApiError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Category Status (Active <-> Inactive)
  const handleToggleStatus = async (category) => {
    const targetId = category.id || category._id;
    const currentStatus = category.status || (category.isActive !== false ? 'active' : 'inactive');
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';

    setTogglingCategoryId(targetId);
    try {
      const res = await categoryService.updateCategoryStatus(targetId, { status: nextStatus });
      showToast(`Category "${category.name}" is now ${nextStatus}.`);
      await fetchCategories();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast(err.response?.data?.message || 'Failed to update category status.', 'error');
    } finally {
      setTogglingCategoryId(null);
    }
  };

  // Prompt Confirmation Dialog for Delete
  const handlePromptDelete = (category) => {
    setDeleteConfirmation({
      isOpen: true,
      category,
      errorMessage: null
    });
  };

  // Confirm Category Deletion (DELETE /api/categories/:id)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.category) return;

    const catToDelete = deleteConfirmation.category;
    const targetId = catToDelete.id || catToDelete._id;

    setIsDeleting(true);
    setDeleteConfirmation((prev) => ({ ...prev, errorMessage: null }));

    try {
      await categoryService.deleteCategory(targetId);
      showToast(`Category "${catToDelete.name}" deleted successfully.`, 'info');
      setDeleteConfirmation({ isOpen: false, category: null, errorMessage: null });
      await fetchCategories(); // Refresh list after deletion
    } catch (err) {
      console.error('Error deleting category:', err);
      const statusCode = err.response?.status;
      const errorMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Failed to delete category from database.';

      if (statusCode === 401 || statusCode === 403) {
        setDeleteConfirmation((prev) => ({
          ...prev,
          errorMessage:
            'Admin Permission Denied: Only authenticated administrators can delete categories from the database.'
        }));
      } else {
        // Handled safety block: products assigned
        setDeleteConfirmation((prev) => ({
          ...prev,
          errorMessage: errorMsg
        }));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed sample categories into MongoDB if database is empty
  const handleSeedCategories = async () => {
    if (!isAdmin) {
      showToast('Please sign in as an administrator to seed live categories.', 'error');
      return;
    }

    setIsSeeding(true);
    try {
      let count = 0;
      for (const item of INITIAL_LUXURY_CATEGORIES) {
        await categoryService.createCategory(item);
        count++;
      }
      showToast(`Successfully seeded ${count} luxury categories into MongoDB!`);
      await fetchCategories();
    } catch (err) {
      console.error('Error seeding categories:', err);
      showToast(
        err.response?.data?.message || 'Error occurred while seeding sample categories.',
        'error'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <AdminLayout
      activePage="categories"
      title="Catalog Categories & Taxonomies"
      subtitle="Manage product departments, curated collections, and catalog taxonomy"
    >
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & TOAST */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border/70 pb-5 text-left">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-muted">
                Platform Taxonomies
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-cream/80 text-brand-charcoal border border-brand-border">
                <Globe size={11} className="text-brand-accent" />
                <span>Global Catalog</span>
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-brand-black tracking-tight">
              Category Management
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              Centrally manage luxury catalog taxonomies, slugs, publication status, and product bindings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchCategories}
              disabled={isLoading}
              className="text-xs"
            >
              Sync
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenAddModal}
              className="text-xs !bg-brand-black hover:!bg-brand-charcoal text-white cursor-pointer"
            >
              Add Category
            </Button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="font-semibold">{toastMessage.message}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ADMIN PERMISSION NOTICE */}
        {/* ========================================================================= */}
        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 text-left">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block mb-0.5">Administrator Authentication Required:</strong>
              <p className="text-amber-800 leading-relaxed mb-2">
                You are currently previewing categories in read-only mode. Administrator credentials (e.g. admin@luxury.com) are required to create, update, deactivate, or delete taxonomies.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-bold text-brand-black underline hover:text-brand-charcoal"
              >
                <LogIn size={13} />
                <span>Sign in as Administrator</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. API ERROR BANNER */}
        {/* ========================================================================= */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-rose-900 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Backend API Connection Error:</strong>
                <p>{apiError}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCategories}
              icon={RefreshCw}
              className="text-xs shrink-0 border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              Retry
            </Button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. STATS SUMMARY STRIP */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Total Categories
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="font-serif text-2xl font-bold text-brand-black">
                {isLoading ? '...' : summaryCounts.total}
              </h4>
              <span className="text-xs text-brand-muted">Taxonomies</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Active Taxonomies
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="font-serif text-2xl font-bold text-emerald-700">
                {isLoading ? '...' : summaryCounts.active}
              </h4>
              <span className="text-xs text-emerald-600 font-semibold">Live in Shop</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Inactive Categories
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="font-serif text-2xl font-bold text-neutral-600">
                {isLoading ? '...' : summaryCounts.inactive}
              </h4>
              <span className="text-xs text-brand-muted">Hidden from public</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Bound Products
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="font-serif text-2xl font-bold text-brand-charcoal">
                {isLoading ? '...' : summaryCounts.totalAssignedProducts}
              </h4>
              <span className="text-xs text-brand-muted">Catalog items</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. SEARCH & STATUS FILTER BAR */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4 text-left">
          {/* Search input */}
          <div className="flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Search by name, slug, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="!py-2 text-xs bg-brand-offwhite"
            />
          </div>

          {/* Status Filter Tabs & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-brand-border/80 p-0.5 bg-brand-offwhite">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-brand-black text-white'
                    : 'text-brand-muted hover:text-brand-black'
                }`}
              >
                All ({summaryCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-700 text-white'
                    : 'text-brand-muted hover:text-emerald-700'
                }`}
              >
                Active ({summaryCounts.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'inactive'
                    ? 'bg-neutral-800 text-white'
                    : 'text-brand-muted hover:text-brand-black'
                }`}
              >
                Inactive ({summaryCounts.inactive})
              </button>
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-brand-muted hover:text-brand-black transition-colors rounded-md bg-brand-offwhite border border-brand-border cursor-pointer"
                title="Reset search"
              >
                <RotateCcw size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. CATEGORIES TABLE */}
        {/* ========================================================================= */}
        <div className="bg-brand-surface border border-brand-border/70 rounded-xl shadow-xs overflow-hidden text-left">
          {/* Readout Header */}
          <div className="p-4 sm:px-6 py-3.5 border-b border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-brand-black font-semibold">{filteredCategories.length}</strong> of{' '}
                <strong className="text-brand-black font-semibold">{categoriesList.length}</strong> categories
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-brand-accent">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Loading...</span>
                </span>
              )}
            </div>

            {/* Quick Seed Action if Database Empty */}
            {categoriesList.length === 0 && !isLoading && !apiError && (
              <button
                type="button"
                onClick={handleSeedCategories}
                disabled={isSeeding || !isAdmin}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50 cursor-pointer"
                title={isAdmin ? 'Load initial luxury categories' : 'Admin login required to seed'}
              >
                {isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                <span>{isSeeding ? 'Seeding Categories...' : 'Seed Initial Luxury Categories'}</span>
              </button>
            )}
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-brand-offwhite/80 border-b border-brand-border/60 text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-5">Category Image & Name</th>
                  <th scope="col" className="py-3 px-5">URL Slug</th>
                  <th scope="col" className="py-3 px-5">Status</th>
                  <th scope="col" className="py-3 px-5 text-center">Bound Products</th>
                  <th scope="col" className="py-3 px-5">Description</th>
                  <th scope="col" className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {isLoading && categoriesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-brand-muted space-y-2">
                      <Loader2 size={36} className="mx-auto text-brand-accent animate-spin" />
                      <p className="text-sm font-semibold text-brand-charcoal">
                        Loading categories from database...
                      </p>
                      <p className="text-xs">Fetching live records via GET /api/categories</p>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-brand-muted space-y-3">
                      <Layers size={38} className="mx-auto text-brand-border stroke-[1.5]" />
                      <p className="text-sm font-semibold text-brand-charcoal">
                        {categoriesList.length === 0
                          ? 'No categories found in MongoDB.'
                          : 'No categories match your search or filter.'}
                      </p>
                      <p className="text-xs max-w-sm mx-auto">
                        {categoriesList.length === 0
                          ? 'Click "Add Category" or use the one-click seed button to populate standard luxury taxonomies.'
                          : 'Try adjusting your search query or filter tab.'}
                      </p>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        {categoriesList.length === 0 ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Plus}
                              onClick={handleOpenAddModal}
                              className="text-xs !bg-brand-black text-white"
                            >
                              Add Category
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Layers}
                                onClick={handleSeedCategories}
                                disabled={isSeeding}
                                className="text-xs"
                              >
                                {isSeeding ? 'Seeding...' : 'Load 5 Luxury Categories'}
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                            }}
                            className="text-xs"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => {
                    const targetId = category.id || category._id;
                    const isCategoryActive =
                      category.status === 'active' ||
                      (category.status !== 'inactive' && category.isActive !== false);
                    const isToggling = togglingCategoryId === targetId;

                    return (
                      <tr
                        key={targetId}
                        className="hover:bg-brand-offwhite/40 transition-colors group"
                      >
                        {/* Image Thumbnail + Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-brand-border/70 bg-brand-cream/50 shrink-0">
                              {category.image ? (
                                <img
                                  src={category.image}
                                  alt={category.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.src = watchImg;
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-brand-muted bg-brand-offwhite">
                                  <ImageIcon size={18} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-serif font-bold text-brand-black text-sm">
                                {category.name}
                              </p>
                              <span className="font-mono text-[10px] text-brand-muted">
                                ID: {targetId.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* URL Slug */}
                        <td className="py-3.5 px-5 font-mono text-xs text-brand-charcoal">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-cream/60 border border-brand-border/60 text-[11px]">
                            <Tag size={10} className="text-brand-muted" />
                            <span>{category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-5">
                          {isCategoryActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>

                        {/* Product Count */}
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              category.productCount > 0
                                ? 'bg-brand-cream/80 text-brand-black border border-brand-border'
                                : 'bg-neutral-50 text-neutral-400 border border-neutral-200'
                            }`}
                          >
                            <PackageCheck size={12} className={category.productCount > 0 ? 'text-brand-accent' : 'text-neutral-400'} />
                            <span>{category.productCount || 0}</span>
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-5 max-w-xs truncate text-brand-charcoal">
                          {category.description ? (
                            <span title={category.description}>{category.description}</span>
                          ) : (
                            <span className="text-brand-subtle italic">No description</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Status Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(category)}
                              disabled={isToggling || !isAdmin}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                isCategoryActive
                                  ? 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                                  : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                              } disabled:opacity-50`}
                              title={
                                !isAdmin
                                  ? 'Admin login required'
                                  : isCategoryActive
                                  ? 'Deactivate category'
                                  : 'Reactivate category'
                              }
                              aria-label={`Toggle status for ${category.name}`}
                            >
                              {isToggling ? (
                                <Loader2 size={15} className="animate-spin text-brand-accent" />
                              ) : (
                                <Power size={15} />
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(category)}
                              disabled={!isAdmin}
                              className="p-1.5 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title={isAdmin ? 'Edit category' : 'Edit (Admin Login Required)'}
                              aria-label={`Edit ${category.name}`}
                            >
                              <Pencil size={15} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(category)}
                              disabled={!isAdmin}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                              title={isAdmin ? 'Delete category' : 'Delete (Admin Login Required)'}
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. ADD / EDIT CATEGORY MODAL */}
        {/* ========================================================================= */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-brand-border/60 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-brand-black">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {editingCategory
                      ? `Updating taxonomy settings for "${editingCategory.name}"`
                      : 'Define a new platform-wide taxonomy and publication state.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-1.5 text-brand-muted hover:text-brand-black hover:bg-brand-cream/60 rounded-full transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {/* Form API Error Banner */}
                {formApiError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-semibold mb-0.5">Save Failed:</strong>
                      <span>{formApiError}</span>
                    </div>
                  </div>
                )}

                {/* Category Name */}
                <Input
                  label="Category Name *"
                  placeholder="e.g. Fine Fragrance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={formErrors.name}
                  required
                />

                {/* Category Slug & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="URL Slug (Optional)"
                      placeholder="e.g. fine-fragrance"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      error={formErrors.slug}
                      helper="Auto-generated if left blank"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5">
                      Publication Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-brand-surface text-brand-black text-sm px-3.5 py-2.5 border border-brand-border focus:border-brand-black focus:outline-none rounded-none cursor-pointer"
                    >
                      <option value="active">Active (Visible in Shop)</option>
                      <option value="inactive">Inactive (Hidden from public)</option>
                    </select>
                  </div>
                </div>

                {/* Category Description */}
                <div>
                  <label
                    htmlFor="categoryDescription"
                    className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="categoryDescription"
                    rows={3}
                    placeholder="Overview of this collection segment, materials, craftsmanship..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-sm px-3.5 py-2.5 transition-colors border border-brand-border focus:border-brand-black focus:outline-none rounded-none"
                  />
                </div>

                {/* Category Image */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
                    Category Hero Image
                  </label>

                  {/* Preset image buttons */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs text-brand-muted shrink-0">Presets:</span>
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, image: preset.value })}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer shrink-0 ${
                          formData.image === preset.value
                            ? 'bg-brand-black text-white border-brand-black font-semibold'
                            : 'bg-brand-offwhite text-brand-charcoal border-brand-border hover:bg-brand-cream'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Image URL input */}
                  <Input
                    type="text"
                    placeholder="Or enter image URL (https://...)"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    icon={ImageIcon}
                  />

                  {/* Image Preview */}
                  {formData.image && (
                    <div className="flex items-center gap-3 p-3 bg-brand-offwhite rounded-lg border border-brand-border/60">
                      <img
                        src={formData.image}
                        alt="Category preview"
                        className="w-14 h-14 object-cover rounded-md border border-brand-border"
                        onError={(e) => {
                          e.target.src = watchImg;
                        }}
                      />
                      <div className="text-xs text-brand-muted">
                        <p className="font-semibold text-brand-charcoal">Image Preview</p>
                        <p className="text-[11px] truncate max-w-xs">{formData.image}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-brand-border/60 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="text-xs cursor-pointer !bg-brand-black hover:!bg-brand-charcoal text-white"
                  >
                    {isSubmitting
                      ? 'Saving to MongoDB...'
                      : editingCategory
                      ? 'Update Category'
                      : 'Create Category'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. DELETE CONFIRMATION DIALOG MODAL */}
        {/* ========================================================================= */}
        {deleteConfirmation.isOpen && deleteConfirmation.category && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-md p-6 shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Warning Icon & Header */}
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle size={24} />
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Confirm Category Deletion
                </h3>
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                  Are you sure you want to permanently delete category{' '}
                  <strong className="text-brand-black font-semibold">
                    "{deleteConfirmation.category.name}"
                  </strong>{' '}
                  from MongoDB?
                </p>
              </div>

              {/* Product Safety Warning */}
              {deleteConfirmation.category.productCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Safety Lock Active:</strong>
                    <span>
                      {deleteConfirmation.category.productCount} product(s) currently reference this category. Deletion will be rejected by the server to prevent orphaned products. Please reassign those products or deactivate this category instead.
                    </span>
                  </div>
                </div>
              )}

              {/* Backend Error Banner if deletion failed */}
              {deleteConfirmation.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Deletion Blocked:</strong>
                    <span>{deleteConfirmation.errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Dialog Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDeleteConfirmation({ isOpen: false, category: null, errorMessage: null })
                  }
                  disabled={isDeleting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Trash2}
                  onClick={handleConfirmDelete}
                  isLoading={isDeleting}
                  disabled={isDeleting}
                  className="text-xs !bg-rose-600 hover:!bg-rose-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Category'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
