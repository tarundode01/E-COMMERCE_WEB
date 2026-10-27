import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ArrowUpDown,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Store,
  ShoppingBag,
  RefreshCw,
  Copy,
  Check,
  Tag,
  Layers,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import Container from '../components/Container';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { vendorService, categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatImageUrl } from '../utils/imageUrl';

export default function VendorProducts() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || 'all';

  // Pagination & Filtering state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Modal State: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    originalPrice: '',
    discount: '',
    stock: '1',
    description: '',
    image: '',
    images: [],
    status: 'published',
  });

  // Image Uploading State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Delete Confirmation State
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Product Preview Modal State
  const [previewProduct, setPreviewProduct] = useState(null);

  // Debounced search for ultra-smooth typing
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Copied SKU toast
  const [copiedSku, setCopiedSku] = useState(null);

  // Category name resolution helper
  const getCategoryName = (catValue) => {
    if (!catValue) return 'Uncategorized';
    const found = categories.find(
      (c) =>
        c._id === catValue ||
        c.id === catValue ||
        c.slug === catValue ||
        c.name?.toLowerCase() === String(catValue).toLowerCase()
    );
    return found?.name || catValue;
  };

  // Debounce search effect (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Store Details
  const fetchStore = useCallback(async () => {
    try {
      const response = await vendorService.getStore();
      if (response?.store) {
        setStore(response.store);
      }
    } catch (err) {
      console.error('Failed to retrieve vendor store:', err);
    }
  }, []);

  // Fetch Categories Taxonomy
  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getCategories();
      if (Array.isArray(response)) {
        setCategories(response);
      } else if (response?.categories) {
        setCategories(response.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  // Fetch Products with Server-Driven Pagination & Filters
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const params = {
        page: currentPage,
        limit: 10,
        sort: sortOption,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await vendorService.getProducts(params);
      if (response && response.products) {
        setProducts(response.products);
        setTotalPages(response.totalPages || 1);
        setTotalProducts(response.totalProducts || response.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch vendor products:', err);
      if (err.response?.status === 403) {
        setFetchError(err.response?.data?.message || 'Access restricted. Store approval required.');
      } else {
        setFetchError('Failed to load products from atelier catalog.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory, selectedStatus, sortOption]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/products' } } });
      return;
    }
    fetchStore();
    fetchCategories();
  }, [isAuthenticated, navigate, fetchStore, fetchCategories]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated, fetchProducts]);

  // Handle Form Change
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (submitError) setSubmitError('');
  };

  // Handle Image Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Please select JPEG, PNG, or WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      return;
    }

    setUploadError('');
    setIsUploadingImage(true);

    try {
      const uploadRes = await vendorService.uploadAsset(file);
      if (uploadRes && uploadRes.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          image: uploadRes.imageUrl,
          images: [uploadRes.imageUrl, ...prev.images.filter((img) => img !== uploadRes.imageUrl)],
        }));
      }
    } catch (err) {
      console.error('Error uploading product image:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Open Create Modal
  const openCreateModal = (presetCategory = '') => {
    setModalMode('add');
    setEditingProductId(null);
    setSubmitError('');
    setFormErrors({});
    setFormData({
      name: '',
      sku: '',
      category: presetCategory || (categories.length > 0 ? categories[0].name : 'Gourmet Food'),
      price: '',
      originalPrice: '',
      discount: '',
      stock: '10',
      description: '',
      image: '',
      images: [],
      status: 'published',
    });
  };

  // Sync URL search parameters (category filter and open create modal)
  useEffect(() => {
    const urlCat = searchParams.get('category');
    if (urlCat) {
      setSelectedCategory(urlCat);
    }
    const action = searchParams.get('action');
    if (action === 'new' || action === 'add') {
      openCreateModal(urlCat || '');
    }
  }, [searchParams, categories]);

  // Open Edit Modal with Prefilled Data
  const openEditModal = async (product) => {
    setModalMode('edit');
    setEditingProductId(product._id || product.id);
    setSubmitError('');
    setFormErrors({});
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      originalPrice: product.originalPrice ? product.originalPrice.toString() : '',
      discount: product.discount !== undefined ? product.discount.toString() : '',
      stock: product.stock !== undefined ? product.stock.toString() : '0',
      description: product.description || '',
      image: product.image || '',
      images: Array.isArray(product.images) ? product.images : [product.image].filter(Boolean),
      status: product.status || 'published',
    });
  };

  // Validate Product Form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const priceNum = Number(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price must be a positive number';
    }

    if (formData.originalPrice) {
      const origNum = Number(formData.originalPrice);
      if (isNaN(origNum) || origNum < 0) {
        errors.originalPrice = 'Original price cannot be negative';
      }
    }

    if (formData.discount) {
      const discNum = Number(formData.discount);
      if (isNaN(discNum) || discNum < 0 || discNum > 100) {
        errors.discount = 'Discount must be between 0% and 100%';
      }
    }

    const stockNum = Number(formData.stock);
    if (formData.stock === '' || isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      errors.stock = 'Stock must be an integer (0 or greater)';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 5) {
      errors.description = 'Description must be at least 5 characters';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (!formData.image.trim()) {
      errors.image = 'At least one product image is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add or Edit Form
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || undefined,
      category: formData.category.trim(),
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
      discount: formData.discount ? Number(formData.discount) : 0,
      stock: Number(formData.stock),
      description: formData.description.trim(),
      image: formData.image.trim(),
      images: formData.images.length > 0 ? formData.images : [formData.image.trim()],
      status: formData.status,
    };

    try {
      if (modalMode === 'add') {
        const response = await vendorService.createProduct(payload);
        if (response && response.product) {
          setSubmitSuccess(`Creation "${response.product.name}" published successfully.`);
          setModalMode(null);
          fetchProducts();
          setTimeout(() => setSubmitSuccess(''), 4000);
        }
      } else if (modalMode === 'edit') {
        const response = await vendorService.updateProduct(editingProductId, payload);
        if (response && response.product) {
          setSubmitSuccess(`Product "${response.product.name}" updated successfully.`);
          setModalMode(null);
          fetchProducts();
          setTimeout(() => setSubmitSuccess(''), 4000);
        }
      }
    } catch (err) {
      console.error('Error saving product:', err);
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Failed to save product. Please verify inputs.';
      setSubmitError(errMsg);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Publication Status (Draft vs Published)
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      await vendorService.updateProductStatus(product._id || product.id, newStatus);
      setProducts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === (product._id || product.id) ? { ...p, status: newStatus } : p
        )
      );
      setSubmitSuccess(`Status updated to "${newStatus}".`);
      setTimeout(() => setSubmitSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert(err.response?.data?.message || 'Failed to update publication status.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await vendorService.deleteProduct(deletingProduct._id || deletingProduct.id);
      setProducts((prev) =>
        prev.filter((p) => (p._id || p.id) !== (deletingProduct._id || deletingProduct.id))
      );
      setTotalProducts((prev) => Math.max(0, prev - 1));
      setDeletingProduct(null);
      setSubmitSuccess('Product deleted successfully from your atelier.');
      setTimeout(() => setSubmitSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy SKU
  const copySkuToClipboard = (sku) => {
    if (!sku) return;
    navigator.clipboard.writeText(sku).then(() => {
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    });
  };

  const isApproved = store?.status === 'approved';

  const pageActions = (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={fetchProducts}
        className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-xl transition-colors cursor-pointer border border-brand-border/70 shadow-xs"
        title="Refresh Products"
      >
        <RefreshCw size={15} />
      </button>

      <Button
        type="button"
        variant="primary"
        size="sm"
        icon={Plus}
        disabled={!isApproved}
        onClick={openCreateModal}
        className="text-xs shadow-xs"
      >
        <span>Add New Creation</span>
      </Button>
    </div>
  );

  return (
    <VendorLayout
      activePage="products"
      title="Atelier Product Catalog"
      subtitle="Manage product listings, SKU codes, pricing, stock inventory, and publication status."
      actions={pageActions}
      store={store}
    >

        {/* Global Notifications */}
        {submitSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{submitSuccess}</span>
          </div>
        )}

        {/* Approval Lock Alert */}
        {!isApproved && (
          <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-amber-950 text-left">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800 mb-1">
              <Lock size={15} />
              <span>Catalog Management Restricted</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              Product creation and catalog publishing require an approved store application. Your store is currently{' '}
              <strong className="capitalize font-bold">{store?.status || 'under review'}</strong>.
              Review application details on the{' '}
              <Link to="/vendor/dashboard" className="underline font-bold text-amber-950">
                Atelier Dashboard
              </Link>.
            </p>
          </div>
        )}

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-left">
          <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
              Total Creations
            </span>
            <p className="font-serif text-2xl font-bold text-brand-black">{totalProducts}</p>
          </div>

          <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
              Published in Shop
            </span>
            <p className="font-serif text-2xl font-bold text-emerald-700">
              {products.filter((p) => p.status === 'published').length}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
              Draft Creations
            </span>
            <p className="font-serif text-2xl font-bold text-amber-700">
              {products.filter((p) => p.status === 'draft').length}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-brand-surface border border-brand-border/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block mb-1">
              Low Stock Alert (≤ 5)
            </span>
            <p className="font-serif text-2xl font-bold text-rose-700">
              {products.filter((p) => p.stock <= 5).length}
            </p>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SEARCH, FILTER & SORT TOOLBAR */}
        {/* ===================================================================== */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, SKU, or keyword..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-brand-border text-brand-black focus:border-brand-black bg-brand-offwhite text-xs transition-all"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-brand-black focus:border-brand-black bg-brand-offwhite text-xs transition-all cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-brand-black focus:border-brand-black bg-brand-offwhite text-xs transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft (Unpublished)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-brand-black focus:border-brand-black bg-brand-offwhite text-xs transition-all cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock-asc">Stock: Low to High</option>
                <option value="stock-desc">Stock: High to Low</option>
                <option value="name-asc">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* PRODUCT INVENTORY TABLE */}
        {/* ===================================================================== */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl shadow-xs overflow-hidden text-left">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-9 h-9 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                Loading Atelier Inventory...
              </p>
            </div>
          ) : fetchError ? (
            <div className="py-16 text-center space-y-3 p-6">
              <AlertCircle size={28} className="text-rose-500 mx-auto" />
              <p className="text-xs text-rose-800 font-semibold">{fetchError}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center space-y-4 p-6">
              <div className="w-14 h-14 rounded-full bg-brand-offwhite border border-brand-border text-brand-muted flex items-center justify-center mx-auto">
                <Package size={26} />
              </div>
              <h3 className="font-serif text-lg font-bold text-brand-black">No Products Found</h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                {search || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No products matched your search or filters. Try adjusting your query.'
                  : 'Your atelier does not have any active product listings yet. Create your first product creation.'}
              </p>
              {isApproved && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={Plus}
                  onClick={openCreateModal}
                  className="text-xs"
                >
                  Create First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-brand-offwhite/80 border-b border-brand-border text-[11px] font-bold uppercase tracking-wider text-brand-charcoal">
                    <th className="py-3.5 px-4">Creation</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {products.map((product) => {
                    const productId = product._id || product.id;
                    const isDraft = product.status === 'draft';
                    const hasDiscount = product.originalPrice && product.originalPrice > product.price;

                    return (
                      <tr key={productId} className="hover:bg-brand-cream/30 transition-colors">
                        {/* 1. Thumbnail & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-brand-border/80 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image ? (
                                <img
                                  src={formatImageUrl(product.image)}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package size={18} className="text-neutral-400" />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-semibold text-brand-black line-clamp-1">{product.name}</p>
                              {product.slug && (
                                <p className="text-[10px] text-brand-muted font-mono">
                                  /{product.slug}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. SKU with copy */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => copySkuToClipboard(product.sku)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-brand-offwhite border border-brand-border hover:bg-brand-cream/50 cursor-pointer"
                            title="Click to copy SKU"
                          >
                            <span>{product.sku || 'N/A'}</span>
                            {copiedSku === product.sku ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} className="text-brand-muted" />
                            )}
                          </button>
                        </td>

                        {/* 3. Category */}
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" size="sm">
                            {getCategoryName(product.category)}
                          </Badge>
                        </td>

                        {/* 4. Price & Discount */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-brand-black">
                              ${product.price.toFixed(2)}
                            </p>
                            {hasDiscount && (
                              <p className="text-[10px] text-neutral-400 line-through">
                                ${product.originalPrice.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 5. Stock Quantity */}
                        <td className="py-3.5 px-4">
                          {product.stock === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : product.stock < 3 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Low: {product.stock} left
                            </span>
                          ) : (
                            <span className="font-medium text-brand-charcoal">
                              {product.stock} units
                            </span>
                          )}
                        </td>

                        {/* 6. Publication Status Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            className="cursor-pointer"
                            title={`Click to switch to ${isDraft ? 'published' : 'draft'}`}
                          >
                            {isDraft ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300 hover:bg-neutral-200 transition-colors">
                                <EyeOff size={11} />
                                <span>Draft</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors">
                                <Eye size={11} />
                                <span>Published</span>
                              </span>
                            )}
                          </button>
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewProduct(product)}
                              className="p-1.5 text-brand-muted hover:text-brand-black transition-colors rounded-lg hover:bg-brand-cream/60 cursor-pointer"
                              title="Preview Creation Dossier"
                            >
                              <Eye size={14} />
                            </button>
                            {!isDraft && (
                              <Link
                                to={`/product/${productId}`}
                                target="_blank"
                                className="p-1.5 text-brand-muted hover:text-brand-accent transition-colors rounded-lg hover:bg-brand-offwhite"
                                title="Open in Public Storefront"
                              >
                                <ExternalLink size={14} />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="p-1.5 text-brand-muted hover:text-brand-black transition-colors rounded-lg hover:bg-brand-offwhite cursor-pointer"
                              title="Edit Creation"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(product)}
                              className="p-1.5 text-brand-muted hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Delete Creation"
                            >
                              <Trash2 size={14} />
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
          {totalPages > 1 && (
            <div className="p-4 border-t border-brand-border flex items-center justify-between text-xs bg-brand-offwhite/40">
              <span className="text-brand-muted">
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalProducts} products)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* ADD / EDIT PRODUCT MODAL */}
        {/* ===================================================================== */}
        {modalMode && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl text-left my-8 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-6">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-black">
                    {modalMode === 'add' ? 'Publish New Atelier Creation' : 'Edit Atelier Creation'}
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {modalMode === 'add'
                      ? 'Add fine craftsmanship details, pricing, stock and high-resolution visuals.'
                      : 'Modify pricing, description, inventory allocation and publication state.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="p-1.5 text-brand-muted hover:text-brand-black rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitProduct} className="space-y-5">
                {/* Product Name */}
                <Input
                  label="Product Name"
                  id="prodName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={formErrors.name}
                  placeholder="e.g. Master Chronograph Titanium 42mm"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SKU */}
                  <Input
                    label="SKU Code"
                    id="prodSku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    error={formErrors.sku}
                    helperText="Leave empty to auto-generate unique SKU"
                    placeholder="e.g. VNC-WATCH-001"
                  />

                  {/* Category Selector */}
                  <div>
                    <label
                      htmlFor="prodCategory"
                      className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5"
                    >
                      Taxonomy Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="prodCategory"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs bg-brand-surface text-brand-black transition-all ${
                        formErrors.category ? 'border-rose-400' : 'border-brand-border focus:border-brand-black'
                      }`}
                    >
                      {categories.map((c) => (
                        <option key={c._id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.category}</p>
                    )}
                  </div>
                </div>

                {/* Pricing & Stock Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Selling Price ($)"
                    id="prodPrice"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    error={formErrors.price}
                    placeholder="1200.00"
                    required
                  />

                  <Input
                    label="Original / Compare Price ($)"
                    id="prodOrigPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                    error={formErrors.originalPrice}
                    helperText="Optional for promotional sale"
                    placeholder="1450.00"
                  />

                  <Input
                    label="Inventory Stock Quantity"
                    id="prodStock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    error={formErrors.stock}
                    placeholder="10"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="prodDesc"
                    className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5"
                  >
                    Product Description & Provenance <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="prodDesc"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs bg-brand-surface rounded-xl border transition-all text-brand-black ${
                      formErrors.description ? 'border-rose-400' : 'border-brand-border focus:border-brand-black'
                    }`}
                    placeholder="Describe material provenance, case dimensions, craftsmanship, and warranty..."
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.description}</p>
                  )}
                </div>

                {/* Image Upload Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                    Primary Product Visual <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-brand-border bg-brand-offwhite">
                    <div className="w-20 h-20 rounded-xl bg-white border border-brand-border overflow-hidden shrink-0 flex items-center justify-center">
                      {formData.image ? (
                        <img
                          src={formatImageUrl(formData.image)}
                          alt="Product Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={28} className="text-neutral-300" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Upload}
                        isLoading={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs"
                      >
                        <span>Upload Visual Image</span>
                      </Button>
                      <p className="text-[10px] text-brand-muted">
                        JPEG, PNG, WebP up to 5MB. Stored securely on server.
                      </p>
                      {uploadError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{uploadError}</p>
                      )}
                    </div>
                  </div>

                  {/* Direct Image URL input */}
                  <div className="pt-1.5">
                    <Input
                      label="Or Direct Image URL"
                      id="prodImageUrl"
                      value={formData.image}
                      onChange={(e) => handleInputChange('image', e.target.value)}
                      placeholder="https://... or /uploads/..."
                      helperText="Optional: Provide direct HTTPS image link or use the file upload above"
                    />
                  </div>

                  {formErrors.image && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.image}</p>
                  )}
                </div>

                {/* Status Switch (Published vs Draft) */}
                <div className="p-4 rounded-xl border border-brand-border bg-brand-offwhite flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider text-brand-black block">
                      Initial Publication State
                    </span>
                    <p className="text-xs text-brand-muted">
                      {formData.status === 'published'
                        ? 'Live immediately in store and marketplace search'
                        : 'Draft creation (hidden from customer search until published)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleInputChange('status', formData.status === 'published' ? 'draft' : 'published')
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.status === 'published' ? 'bg-emerald-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.status === 'published' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-brand-border flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setModalMode(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    className="text-xs"
                  >
                    {modalMode === 'add' ? 'Publish Creation' : 'Update Creation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* DELETE CONFIRMATION MODAL */}
        {/* ===================================================================== */}
        {deletingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">Delete Product?</h3>
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                  Are you sure you wish to delete "<strong>{deletingProduct.name}</strong>"? This action permanently removes the creation from your atelier catalog.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setDeletingProduct(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isDeleting}
                  onClick={handleDeleteProduct}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* PRODUCT PREVIEW DOSSIER MODAL */}
        {/* ===================================================================== */}
        {previewProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-lg w-full p-6 text-left space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between pb-3 border-b border-brand-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" size="sm">{getCategoryName(previewProduct.category)}</Badge>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        previewProduct.status === 'published'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {previewProduct.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-brand-black">
                    {previewProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProduct(null)}
                  className="p-1.5 text-brand-muted hover:text-brand-black rounded-lg cursor-pointer"
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="aspect-square rounded-xl bg-neutral-100 border border-brand-border overflow-hidden flex items-center justify-center">
                  {previewProduct.image ? (
                    <img
                      src={formatImageUrl(previewProduct.image)}
                      alt={previewProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={36} className="text-neutral-400" />
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">SKU Code</span>
                    <span className="font-mono font-bold text-brand-black">{previewProduct.sku || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">Pricing</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-brand-black">
                        ${Number(previewProduct.price).toFixed(2)}
                      </span>
                      {previewProduct.originalPrice && previewProduct.originalPrice > previewProduct.price && (
                        <span className="text-xs text-neutral-400 line-through">
                          ${Number(previewProduct.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted block">Inventory Allocation</span>
                    <span className={`font-semibold ${previewProduct.stock <= 5 ? 'text-amber-700 font-bold' : 'text-brand-black'}`}>
                      {previewProduct.stock} units available
                    </span>
                  </div>

                  {previewProduct.slug && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-brand-muted block">Slug / URL</span>
                      <span className="text-[11px] font-mono text-brand-muted truncate block">
                        /{previewProduct.slug}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-brand-muted block mb-1">Description</span>
                <p className="text-xs text-brand-charcoal bg-brand-offwhite p-3 rounded-xl border border-brand-border/60 max-h-32 overflow-y-auto leading-relaxed">
                  {previewProduct.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-brand-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewProduct(null)}
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Edit}
                    onClick={() => {
                      const prod = previewProduct;
                      setPreviewProduct(null);
                      openEditModal(prod);
                    }}
                  >
                    Edit
                  </Button>
                  {previewProduct.status === 'published' && (
                    <Link
                      to={`/product/${previewProduct._id || previewProduct.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-black hover:bg-brand-charcoal rounded-xl transition-colors shadow-xs"
                    >
                      <span>View in Store</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </VendorLayout>
  );
}
