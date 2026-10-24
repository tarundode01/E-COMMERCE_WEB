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
  LogIn
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
    description: 'Masterpiece Swiss mechanical watches, chronometers, and heirloom timepieces.',
    image: watchImg
  },
  {
    name: 'Handcrafted Goods',
    description: 'Full-grain Tuscan leather satchels, bespoke luggage, and artisan accessories.',
    image: bagImg
  },
  {
    name: 'Fine Fragrance',
    description: 'Extrait de parfum distilled from rare botanical essences and royal oud resins.',
    image: perfumeImg
  },
  {
    name: 'Designer Eyewear',
    description: 'Titanium and gold-plated aviator frames fitted with polarized Carl Zeiss lenses.',
    image: sunglassesImg
  },
  {
    name: 'Haute Couture',
    description: 'Pure cashmere trench coats, Italian silk tailoring, and runway eveningwear.',
    image: coatImg
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

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add, object = Edit

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: watchImg
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

  // Fetch Categories from Backend API (GET /api/categories)
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await categoryService.getCategories();
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
    let isMounted = true;
    categoryService
      .getCategories()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success && Array.isArray(data.categories)) {
          setCategoriesList(data.categories);
        } else {
          setCategoriesList([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch categories from API:', err);
        setApiError(
          err.customMessage ||
            `Unable to connect to backend category APIs at ${
              import.meta.env.VITE_API_URL || 'http://localhost:5000'
            }. Please ensure the backend server is running.`
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Categories by Search Query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categoriesList;

    return categoriesList.filter((category) => {
      return (
        category.name.toLowerCase().includes(q) ||
        (category.description && category.description.toLowerCase().includes(q)) ||
        (category.id && category.id.toLowerCase().includes(q)) ||
        (category._id && category._id.toLowerCase().includes(q))
      );
    });
  }, [categoriesList, searchQuery]);

  // Open Modal for "Add Category"
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image: watchImg
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
      description: category.description || '',
      image: category.image || watchImg
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
      description: formData.description.trim(),
      image: formData.image.trim()
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
          'Admin Permission Denied: You must be logged in as an administrator (e.g. admin@luxury.com) to save categories to the database.'
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
        // E.g. Blocked because products are assigned to this category
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
      title="Category Taxonomy Management"
      subtitle="Connected to live MongoDB backend via /api/categories"
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchCategories}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh from MongoDB"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>

          {/* Add Category Button */}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="text-xs !bg-brand-accent hover:!bg-brand-accent-hover text-brand-black font-bold shadow-xs cursor-pointer"
          >
            Add Category
          </Button>
        </div>
      }
    >
      {/* ========================================================================= */}
      {/* 1. TOAST NOTIFICATION BANNER */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-500'
              : toastMessage.type === 'info'
              ? 'bg-brand-charcoal text-white border-brand-border'
              : 'bg-brand-black text-white border-brand-accent/40'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-brand-accent shrink-0" />
          )}
          <span>{toastMessage.message}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADMIN AUTHENTICATION STATUS BANNER */}
      {/* ========================================================================= */}
      {isAdmin ? (
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 text-left">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={17} className="text-emerald-700 shrink-0" />
            <span>
              <strong>Authenticated Administrator:</strong> Signed in as{' '}
              <span className="font-semibold">{user.email}</span>. You can create, update,
              and safely delete categories directly in MongoDB.
            </span>
          </div>
          <Badge variant="default" size="sm" className="hidden md:inline-flex !bg-emerald-100 text-emerald-800">
            Admin Active
          </Badge>
        </div>
      ) : (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 text-left">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Admin Mode Required for Changes:</strong> You are currently viewing categories
              in read-only mode. Adding, editing, or deleting categories requires an administrator account.
            </span>
          </div>
          <Link to="/login" className="shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={LogIn}
              className="text-xs !py-1 !px-3 border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              Sign In as Admin
            </Button>
          </Link>
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
            Retry Connection
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
              {isLoading ? '...' : categoriesList.length}
            </h4>
            <span className="text-xs text-brand-muted">Taxonomies</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            With Hero Imagery
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-brand-black">
              {isLoading
                ? '...'
                : categoriesList.filter((c) => Boolean(c.image && c.image.trim())).length}
            </h4>
            <span className="text-xs text-brand-muted">Illustrated</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Database Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-emerald-700">
              Live
            </h4>
            <span className="text-xs text-brand-muted">MongoDB Sync</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Safety Guard
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-blue-700">
              Active
            </h4>
            <span className="text-xs text-brand-muted">Product lock on delete</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SEARCH & CONTROLS BAR */}
      {/* ========================================================================= */}
      <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4 text-left">
        {/* Search input */}
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="!py-2 text-xs bg-brand-offwhite"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-brand-muted hover:text-brand-black transition-colors rounded-md bg-brand-offwhite border border-brand-border cursor-pointer"
              title="Reset search"
            >
              <RotateCcw size={13} />
              <span>Clear</span>
            </button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="text-xs !bg-brand-black hover:!bg-brand-charcoal text-white cursor-pointer ml-auto sm:ml-0"
          >
            Add Category
          </Button>
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
                <th scope="col" className="py-3 px-5">Description</th>
                <th scope="col" className="py-3 px-5">Database ID</th>
                <th scope="col" className="py-3 px-5">Created Date</th>
                <th scope="col" className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {isLoading && categoriesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-brand-muted space-y-2">
                    <Loader2 size={36} className="mx-auto text-brand-accent animate-spin" />
                    <p className="text-sm font-semibold text-brand-charcoal">
                      Loading categories from database...
                    </p>
                    <p className="text-xs">Fetching live records via GET /api/categories</p>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-brand-muted space-y-3">
                    <Layers size={38} className="mx-auto text-brand-border stroke-[1.5]" />
                    <p className="text-sm font-semibold text-brand-charcoal">
                      {categoriesList.length === 0
                        ? 'No categories found in MongoDB.'
                        : 'No categories match your search.'}
                    </p>
                    <p className="text-xs max-w-sm mx-auto">
                      {categoriesList.length === 0
                        ? 'Click "Add Category" or use the one-click seed button to populate standard luxury taxonomies.'
                        : 'Try searching with another keyword.'}
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
                          onClick={() => setSearchQuery('')}
                          className="text-xs"
                        >
                          Clear Search
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => {
                  const targetId = category.id || category._id;

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
                            <span className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">
                              Taxonomy
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-5 max-w-xs truncate text-brand-charcoal">
                        {category.description ? (
                          <span title={category.description}>{category.description}</span>
                        ) : (
                          <span className="text-brand-subtle italic">No description</span>
                        )}
                      </td>

                      {/* Database ID */}
                      <td className="py-3.5 px-5 font-mono text-[11px] text-brand-muted">
                        {targetId}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-5 text-brand-muted text-[11px]">
                        {category.createdAt
                          ? new Date(category.createdAt).toLocaleDateString()
                          : '—'}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(category)}
                            className="p-1.5 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-md transition-colors cursor-pointer"
                            title={isAdmin ? 'Edit category' : 'Edit (Admin Login Required)'}
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handlePromptDelete(category)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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

        {/* Table Footer */}
        <div className="p-4 bg-brand-offwhite/40 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
          <span>Backend Connected: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</span>
          <span>Live Mongoose Category Collection</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. ADD / EDIT CATEGORY MODAL DIALOG */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl text-left my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-brand-surface border-b border-brand-border/70 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
                <p className="text-xs text-brand-muted">
                  {editingCategory
                    ? `Updating category record for ${editingCategory.name}`
                    : 'Add a new product taxonomy to the catalog'}
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
                label="Category Name"
                placeholder="e.g. Fine Fragrance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />

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
                  Category Image Header
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
                Are you sure you want to delete category{' '}
                <strong className="text-brand-black font-semibold">
                  "{deleteConfirmation.category.name}"
                </strong>{' '}
                (ID: {deleteConfirmation.category.id || deleteConfirmation.category._id})?
              </p>
            </div>

            {/* Error Message Alert (e.g. Products assigned safeguard) */}
            {deleteConfirmation.errorMessage ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-semibold">Deletion Blocked:</strong>
                  <span>{deleteConfirmation.errorMessage}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60 text-xs text-brand-muted flex items-center gap-2">
                <Info size={14} className="text-brand-muted shrink-0" />
                <span>The system checks for assigned products before permitting deletion.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmation({ isOpen: false, category: null, errorMessage: null })}
                disabled={isDeleting}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
                className="text-xs !bg-rose-600 hover:!bg-rose-700 text-white cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Category'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
