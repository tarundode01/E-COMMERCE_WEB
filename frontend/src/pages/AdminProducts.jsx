import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  Info,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  RefreshCw,
  ShieldAlert,
  LogIn,
  UploadCloud
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { productService, categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { products as sampleSeedProducts, categories as initialCategories } from '../data/products';
import watchImg from '../assets/luxury_watch.jpg';
import bagImg from '../assets/luxury_bag.jpg';
import coatImg from '../assets/hero_lifestyle.jpg';
import perfumeImg from '../assets/luxury_perfume.jpg';
import sunglassesImg from '../assets/luxury_sunglasses.jpg';
import smartphoneImg from '../assets/luxury_smartphone_titanium.jpg';

// Preset luxury image choices for quick selection in add/edit form
const PRESET_IMAGES = [
  { label: 'Smartphone', value: smartphoneImg },
  { label: 'Timepiece', value: watchImg },
  { label: 'Leather Goods', value: bagImg },
  { label: 'Couture Coat', value: coatImg },
  { label: 'Parfum', value: perfumeImg },
  { label: 'Eyewear', value: sunglassesImg }
];

/**
 * Resolves reliable fallback image for admin thumbnails
 */
const resolveAdminThumbnail = (product) => {
  if (product?.image && typeof product.image === 'string' && product.image.trim() !== '' && !product.image.includes('undefined')) {
    return product.image;
  }
  const text = `${product?.category || ''} ${product?.name || ''}`.toLowerCase();
  if (text.includes('mobile') || text.includes('phone') || text.includes('smartphone')) return smartphoneImg;
  if (text.includes('bag') || text.includes('leather') || text.includes('satchel') || text.includes('handbag') || text.includes('handcrafted')) return bagImg;
  if (text.includes('perfume') || text.includes('fragrance') || text.includes('parfum') || text.includes('nectar')) return perfumeImg;
  if (text.includes('sunglass') || text.includes('eyewear') || text.includes('aviator') || text.includes('optics')) return sunglassesImg;
  if (text.includes('couture') || text.includes('apparel') || text.includes('overcoat') || text.includes('trench') || text.includes('cashmere')) return coatImg;
  return watchImg;
};

export default function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Backend Products List State
  const [productsList, setProductsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = Add mode, object = Edit mode

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Luxury Horology',
    price: '',
    originalPrice: '',
    stock: '',
    description: '',
    image: watchImg
  });
  const [formErrors, setFormErrors] = useState({});
  const [formApiError, setFormApiError] = useState(null);

  // Image File Upload State
  const fileInputRef = useRef(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState(null);

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    product: null
  });

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Live Categories State (including any newly created custom categories)
  const [liveCategories, setLiveCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    categoryService
      .getCategories()
      .then((res) => {
        if (isMounted && res && res.success && Array.isArray(res.categories)) {
          const fetchedNames = res.categories
            .map((c) => (typeof c === 'string' ? c : c.name))
            .filter(Boolean);
          const combined = Array.from(
            new Set([...fetchedNames, ...initialCategories.filter((c) => c !== 'All')])
          ).sort();
          setLiveCategories(combined);
        }
      })
      .catch((err) => {
        console.warn('Could not load live categories in AdminProducts:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Available Categories (excluding 'All')
  const availableCategories = useMemo(() => {
    return liveCategories.length > 0
      ? liveCategories
      : initialCategories.filter((c) => c !== 'All');
  }, [liveCategories]);

  // Fetch Products from Backend API (GET /api/products)
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await productService.getProducts();
      if (data && data.success && Array.isArray(data.products)) {
        setProductsList(data.products);
      } else {
        setProductsList([]);
      }
    } catch (err) {
      console.error('Failed to fetch products from API:', err);
      setApiError(
        err.customMessage ||
          `Unable to connect to backend product APIs at ${
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
    productService
      .getProducts()
      .then((data) => {
        if (!isMounted) return;
        if (data && data.success && Array.isArray(data.products)) {
          setProductsList(data.products);
        } else {
          setProductsList([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to fetch products from API:', err);
        setApiError(
          err.customMessage ||
            `Unable to connect to backend product APIs at ${
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

  // Filtered Products (Search + Category + Stock)
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      // 1. Search Query (name or description or ID)
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.id && product.id.toLowerCase().includes(q)) ||
        (product._id && product._id.toLowerCase().includes(q));

      // 2. Category Filter
      const matchesCategory =
        selectedCategory === 'All' || product.category === selectedCategory;

      // 3. Stock Filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = product.stock > 5;
      else if (stockFilter === 'low_stock') matchesStock = product.stock > 0 && product.stock <= 5;
      else if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [productsList, searchQuery, selectedCategory, stockFilter]);

  // Clear selected image file and preview state
  const handleClearSelectedImage = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setIsUploadingImage(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle image file selection with validation
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccessMessage(null);

    // Validate image format: JPEG, PNG, WebP only
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    const isValidMime = allowedMimeTypes.includes(file.type.toLowerCase());
    const isValidExt = allowedExtensions.includes(ext);

    if (!isValidMime && !isValidExt) {
      setUploadError('Invalid file format. Please upload a JPEG, PNG, or WebP image only.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size limit: max 5MB
    const maxSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setUploadError(
        `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous blob URL if any
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    // Generate local preview URL
    const objectUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreviewUrl(objectUrl);
    setUploadProgress(0);

    // Clear validation error on image
    setFormErrors((prev) => ({ ...prev, image: undefined }));
  };

  // Explicit upload action to upload file prior to saving product
  const handleExplicitUpload = async () => {
    if (!selectedImageFile) return;

    setIsUploadingImage(true);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadProgress(0);

    try {
      const res = await productService.uploadImage(selectedImageFile, (progress) => {
        setUploadProgress(progress);
      });

      if (res && res.imageUrl) {
        setFormData((prev) => ({ ...prev, image: res.imageUrl }));
        setUploadSuccessMessage('Image uploaded successfully to secure storage.');
      } else {
        throw new Error('Upload server did not return a valid image URL.');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      const errMsg =
        err.response?.data?.message || err.customMessage || err.message || 'Image upload failed. Please try again.';
      setUploadError(errMsg);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Open Modal for "Add Product"
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    handleClearSelectedImage();
    setFormData({
      name: '',
      category: availableCategories[0] || 'Luxury Horology',
      price: '',
      originalPrice: '',
      stock: '10',
      description: '',
      image: watchImg
    });
    setFormErrors({});
    setFormApiError(null);
    setIsFormModalOpen(true);
  };

  // Open Modal for "Edit Product"
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    handleClearSelectedImage();
    setFormData({
      name: product.name || '',
      category: product.category || availableCategories[0] || 'Luxury Horology',
      price: product.price !== undefined ? String(product.price) : '',
      originalPrice:
        product.originalPrice !== null && product.originalPrice !== undefined
          ? String(product.originalPrice)
          : '',
      stock: product.stock !== undefined ? String(product.stock) : '0',
      description: product.description || '',
      image: product.image || watchImg
    });
    setFormErrors({});
    setFormApiError(null);
    setIsFormModalOpen(true);
  };

  // Validate Form Inputs before API Submission
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters.';
    }

    if (!formData.category) {
      errors.category = 'Please select a product category.';
    }

    const parsedPrice = parseFloat(formData.price);
    if (!formData.price || isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.price = 'Please enter a valid price greater than $0.';
    }

    if (formData.originalPrice) {
      const parsedOriginal = parseFloat(formData.originalPrice);
      if (isNaN(parsedOriginal) || parsedOriginal < 0) {
        errors.originalPrice = 'Original price must be a valid non-negative number.';
      }
    }

    const parsedStock = parseInt(formData.stock, 10);
    if (formData.stock === '' || isNaN(parsedStock) || parsedStock < 0) {
      errors.stock = 'Stock must be a non-negative integer (0 or higher).';
    }

    if (!formData.description.trim()) {
      errors.description = 'Product description is required.';
    } else if (formData.description.trim().length < 5) {
      errors.description = 'Description should be at least 5 characters long.';
    }

    if (!formData.image.trim()) {
      errors.image = 'Product image is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit (POST /api/products or PUT /api/products/:id)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormApiError(null);

    // If an image file was selected and not yet uploaded, upload it first
    let finalImageUrl = formData.image.trim();

    if (selectedImageFile && !uploadSuccessMessage) {
      setIsUploadingImage(true);
      setUploadError(null);
      setUploadProgress(0);

      try {
        const uploadRes = await productService.uploadImage(selectedImageFile, (progress) => {
          setUploadProgress(progress);
        });

        if (uploadRes && uploadRes.imageUrl) {
          finalImageUrl = uploadRes.imageUrl;
          setFormData((prev) => ({ ...prev, image: uploadRes.imageUrl }));
          setUploadSuccessMessage('Image uploaded successfully to secure storage.');
        } else {
          throw new Error('Image upload did not return a valid URL.');
        }
      } catch (uploadErr) {
        console.error('Failed to upload product image:', uploadErr);
        const errMsg =
          uploadErr.response?.data?.message ||
          uploadErr.customMessage ||
          uploadErr.message ||
          'Failed to upload image. Product was not saved.';
        setUploadError(errMsg);
        setFormApiError(errMsg);
        setIsSubmitting(false);
        setIsUploadingImage(false);
        return; // Abort saving! Do not claim image was uploaded!
      } finally {
        setIsUploadingImage(false);
      }
    }

    const parsedPrice = parseFloat(formData.price);
    const parsedOriginalPrice = formData.originalPrice ? parseFloat(formData.originalPrice) : null;
    const parsedStock = parseInt(formData.stock, 10);

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      price: parsedPrice,
      originalPrice: parsedOriginalPrice,
      stock: parsedStock,
      description: formData.description.trim(),
      image: finalImageUrl
    };

    try {
      if (editingProduct) {
        // PUT /api/products/:id
        const targetId = editingProduct.id || editingProduct._id;
        const res = await productService.updateProduct(targetId, payload);
        showToast(`Updated "${res.product?.name || payload.name}" successfully.`);
      } else {
        // POST /api/products
        const res = await productService.createProduct(payload);
        showToast(`Created "${res.product?.name || payload.name}" in live catalog.`);
      }

      setIsFormModalOpen(false);
      handleClearSelectedImage();
      await fetchProducts(); // Refresh live catalog
    } catch (err) {
      console.error('Error submitting product form:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setFormApiError(
          'Admin Permission Denied: You must be logged in as an administrator (e.g. admin@luxury.com) to create or update catalog products.'
        );
      } else {
        const errorMsg =
          err.response?.data?.message || err.customMessage || 'Failed to save product to database.';
        setFormApiError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prompt Confirmation Dialog for Delete
  const handlePromptDelete = (product) => {
    setDeleteConfirmation({
      isOpen: true,
      product
    });
  };

  // Confirm Product Deletion (DELETE /api/products/:id)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.product) return;

    const prodToDelete = deleteConfirmation.product;
    const targetId = prodToDelete.id || prodToDelete._id;

    setIsDeleting(true);
    try {
      await productService.deleteProduct(targetId);
      showToast(`Deleted "${prodToDelete.name}" from live catalog.`, 'info');
      setDeleteConfirmation({ isOpen: false, product: null });
      await fetchProducts(); // Refresh list after deletion
    } catch (err) {
      console.error('Error deleting product:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        showToast(
          'Admin Permission Denied: Only authenticated administrators can delete products from the database.',
          'error'
        );
      } else {
        showToast(
          err.response?.data?.message || err.customMessage || 'Failed to delete product from database.',
          'error'
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed sample products into MongoDB if database is empty
  const handleSeedProducts = async () => {
    if (!isAdmin) {
      showToast('Please sign in as an administrator to seed live products.', 'error');
      return;
    }

    setIsSeeding(true);
    try {
      let count = 0;
      for (const item of sampleSeedProducts) {
        await productService.createProduct({
          name: item.name,
          category: item.category,
          price: item.price,
          originalPrice: item.originalPrice || null,
          description: item.description,
          stock: item.inStock ? 15 : 0,
          image: typeof item.image === 'string' ? item.image : watchImg
        });
        count++;
      }
      showToast(`Successfully seeded ${count} luxury products into MongoDB!`);
      await fetchProducts();
    } catch (err) {
      console.error('Error seeding products:', err);
      showToast(
        err.response?.data?.message || 'Error occurred while seeding sample products.',
        'error'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <AdminLayout
      activePage="products"
      title="Product Catalog Management"
      subtitle="Connected to live MongoDB backend via /api/products"
      actions={
        <div className="flex items-center gap-2">
          {/* Refresh Live Data Button */}
          <button
            type="button"
            onClick={fetchProducts}
            disabled={isLoading}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh from MongoDB"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>

          {/* Add Product Button */}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="text-xs !bg-brand-accent hover:!bg-brand-accent-hover text-brand-black font-bold shadow-xs cursor-pointer"
          >
            Add Product
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
              <span className="font-semibold">{user.email}</span>. You have full create, edit,
              and delete privileges connected to the live database.
            </span>
          </div>
          <Badge variant="default" size="sm" className="hidden md:inline-flex !bg-emerald-100 text-emerald-800">
            Admin Privileges Active
          </Badge>
        </div>
      ) : (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 text-left">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Admin Mode Required for Changes:</strong> You are currently viewing live catalog
              products in read-only mode. Adding, editing, or deleting items requires an administrator account.
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
      {/* 3. API CONNECTION ERROR NOTICE */}
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
            onClick={fetchProducts}
            icon={RefreshCw}
            className="text-xs shrink-0 border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIVE CATALOG STATS SUMMARY STRIP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Total Live Products
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-brand-black">
              {isLoading ? '...' : productsList.length}
            </h4>
            <span className="text-xs text-brand-muted">MongoDB items</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Active Categories
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-brand-black">
              {isLoading
                ? '...'
                : new Set(productsList.map((p) => p.category)).size}
            </h4>
            <span className="text-xs text-brand-muted">Segments</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Low Stock Alerts
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-amber-700">
              {isLoading
                ? '...'
                : productsList.filter((p) => p.stock > 0 && p.stock <= 5).length}
            </h4>
            <span className="text-xs text-brand-muted">Items &le; 5</span>
          </div>
        </div>

        <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Out of Stock
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="font-serif text-2xl font-bold text-rose-700">
              {isLoading
                ? '...'
                : productsList.filter((p) => p.stock === 0).length}
            </h4>
            <span className="text-xs text-brand-muted">Depleted</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTROLS, SEARCH & FILTERS BAR */}
      {/* ========================================================================= */}
      <div className="bg-brand-surface border border-brand-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4 text-left">
        {/* Left: Search input */}
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Search live products by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="!py-2 text-xs bg-brand-offwhite"
          />
        </div>

        {/* Right: Category, Stock Filter & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="categoryFilter" className="text-xs text-brand-muted font-medium shrink-0">
              Category:
            </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-brand-offwhite border border-brand-border text-xs px-2.5 py-2 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories ({productsList.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="stockFilter" className="text-xs text-brand-muted font-medium shrink-0">
              Stock:
            </label>
            <select
              id="stockFilter"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-brand-offwhite border border-brand-border text-xs px-2.5 py-2 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="All">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; 5)</option>
              <option value="low_stock">Low Stock (1-5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setStockFilter('All');
              }}
              className="flex items-center gap-1 px-2.5 py-2 text-xs text-brand-muted hover:text-brand-black transition-colors rounded-md bg-brand-offwhite border border-brand-border cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Add Product Button */}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
            className="text-xs !bg-brand-black hover:!bg-brand-charcoal text-white cursor-pointer ml-auto sm:ml-0"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. PRODUCTS TABLE */}
      {/* ========================================================================= */}
      <div className="bg-brand-surface border border-brand-border/70 rounded-xl shadow-xs overflow-hidden text-left">
        {/* Table Readout Header */}
        <div className="p-4 sm:px-6 py-3.5 border-b border-brand-border/60 flex items-center justify-between text-xs text-brand-muted">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-brand-black font-semibold">{filteredProducts.length}</strong> of{' '}
              <strong className="text-brand-black font-semibold">{productsList.length}</strong> products
            </span>
            {isLoading && (
              <span className="flex items-center gap-1 text-brand-accent">
                <Loader2 size={13} className="animate-spin" />
                <span>Loading...</span>
              </span>
            )}
          </div>

          {/* Empty Database Seed Action */}
          {productsList.length === 0 && !isLoading && !apiError && (
            <button
              type="button"
              onClick={handleSeedProducts}
              disabled={isSeeding || !isAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline disabled:opacity-50 cursor-pointer"
              title={isAdmin ? 'Populate database with sample luxury products' : 'Admin login required to seed'}
            >
              {isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
              <span>{isSeeding ? 'Seeding MongoDB...' : 'Seed Catalog with Sample Products'}</span>
            </button>
          )}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-brand-offwhite/80 border-b border-brand-border/60 text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
              <tr>
                <th scope="col" className="py-3 px-5">Product</th>
                <th scope="col" className="py-3 px-5">Category</th>
                <th scope="col" className="py-3 px-5">Price</th>
                <th scope="col" className="py-3 px-5">Stock Status</th>
                <th scope="col" className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {isLoading && productsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-brand-muted space-y-2">
                    <Loader2 size={36} className="mx-auto text-brand-accent animate-spin" />
                    <p className="text-sm font-semibold text-brand-charcoal">
                      Loading products from database...
                    </p>
                    <p className="text-xs">Fetching live inventory via GET /api/products</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-brand-muted space-y-3">
                    <Package size={38} className="mx-auto text-brand-border stroke-[1.5]" />
                    <p className="text-sm font-semibold text-brand-charcoal">
                      {productsList.length === 0
                        ? 'No products found in the database.'
                        : 'No products match your search or filter criteria.'}
                    </p>
                    <p className="text-xs max-w-sm mx-auto">
                      {productsList.length === 0
                        ? 'Click "Add Product" to create your first luxury item, or use the sample seed button above.'
                        : 'Try resetting your search query or category filters.'}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      {productsList.length === 0 ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Plus}
                            onClick={handleOpenAddModal}
                            className="text-xs !bg-brand-black text-white"
                          >
                            Add First Product
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Package}
                              onClick={handleSeedProducts}
                              disabled={isSeeding}
                              className="text-xs"
                            >
                              {isSeeding ? 'Seeding...' : 'Load Sample Catalog'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('All');
                            setStockFilter('All');
                          }}
                          className="text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const targetId = product.id || product._id;
                  const isOutOfStock = product.stock === 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <tr
                      key={targetId}
                      className="hover:bg-brand-offwhite/40 transition-colors group"
                    >
                      {/* Product Thumbnail + Name + ID */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-brand-border/70 bg-brand-cream/50 shrink-0">
                            <img
                              src={resolveAdminThumbnail(product)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.src = watchImg;
                              }}
                            />
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <p className="font-semibold text-brand-black truncate text-sm">
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-brand-muted mt-0.5">
                              <span className="font-mono truncate max-w-[150px]">
                                ID: {targetId}
                              </span>
                              {product.createdAt && (
                                <span>
                                  Added: {new Date(product.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-brand-cream/70 text-brand-charcoal border border-brand-border/60">
                          {product.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif font-bold text-brand-black text-sm">
                            ${Number(product.price).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                          {product.originalPrice && (
                            <span className="text-[11px] text-brand-muted line-through font-serif">
                              ${Number(product.originalPrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Level & Badge */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isOutOfStock
                              ? 'Out of Stock'
                              : isLowStock
                              ? 'Low Stock'
                              : 'In Stock'}
                          </span>
                          <span className="text-xs text-brand-charcoal font-medium">
                            ({product.stock} units)
                          </span>
                        </div>
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1.5 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-md transition-colors cursor-pointer"
                            title={isAdmin ? 'Edit product' : 'Edit (Admin Login Required)'}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handlePromptDelete(product)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title={isAdmin ? 'Delete product' : 'Delete (Admin Login Required)'}
                            aria-label={`Delete ${product.name}`}
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
          <span>Live Mongoose Product Collection</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. ADD / EDIT PRODUCT MODAL DIALOG */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-left my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-brand-surface border-b border-brand-border/70 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-brand-muted">
                  {editingProduct
                    ? `Updating database record for ${editingProduct.id || editingProduct._id}`
                    : 'Submit specifications, pricing, and stock to MongoDB'}
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
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Form API Error Banner */}
              {formApiError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold mb-0.5">Operation Failed:</strong>
                    <span>{formApiError}</span>
                  </div>
                </div>
              )}

              {/* Product Name */}
              <Input
                label="Product Title"
                placeholder="e.g. Royal Heritage Chronograph Watch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
              />

              {/* Category & Stock Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label
                    htmlFor="productCategory"
                    className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
                  >
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="productCategory"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full bg-brand-surface text-brand-black text-sm px-3.5 py-2.5 transition-colors border focus:outline-none rounded-none ${
                      formErrors.category
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-brand-border focus:border-brand-black'
                    }`}
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1.5 text-xs text-rose-500">{formErrors.category}</p>
                  )}
                </div>

                {/* Stock Quantity */}
                <Input
                  label="Available Stock Units"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 25"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  error={formErrors.stock}
                  required
                />
              </div>

              {/* Price & Original Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Selling Price ($ USD)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 850.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  error={formErrors.price}
                  required
                />

                <Input
                  label="Original / Compare-At Price ($ USD)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Optional (e.g. 1100.00)"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  error={formErrors.originalPrice}
                  helperText="Leave blank if product is not on sale"
                />
              </div>

              {/* Product Image Selection, Upload & Live Preview */}
              <div className="space-y-3 p-4 bg-brand-surface rounded-xl border border-brand-border/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
                    Product Image <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-brand-muted">JPEG, PNG, WebP (Max 5MB)</span>
                </div>

                {/* File Picker Drag & Drop / Browse Button */}
                <div className="space-y-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                      selectedImageFile
                        ? 'border-brand-accent bg-brand-cream/40'
                        : 'border-brand-border hover:border-brand-charcoal bg-brand-offwhite/60 hover:bg-brand-cream/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center text-brand-accent">
                        {isUploadingImage ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <UploadCloud size={20} />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-brand-black">
                        {selectedImageFile ? 'Change Selected Image File' : 'Click to Upload Local Product Image'}
                      </p>
                      <p className="text-[11px] text-brand-muted">
                        Accepts high-resolution JPG, PNG, or WebP up to 5MB
                      </p>
                    </div>
                  </div>

                  {/* Selected File Details & Upload Action */}
                  {selectedImageFile && (
                    <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/70 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon size={16} className="text-brand-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-black truncate">{selectedImageFile.name}</p>
                          <p className="text-[11px] text-brand-muted">
                            {(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!uploadSuccessMessage && !isUploadingImage && (
                          <button
                            type="button"
                            onClick={handleExplicitUpload}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-black text-white hover:bg-brand-charcoal transition-colors cursor-pointer"
                          >
                            Upload Now
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleClearSelectedImage}
                          disabled={isUploadingImage}
                          className="p-1 text-brand-muted hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove selected file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress Bar */}
                  {isUploadingImage && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-brand-charcoal">
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin text-brand-accent" />
                          Uploading to secure storage...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-brand-offwhite rounded-full overflow-hidden border border-brand-border/50">
                        <div
                          className="h-full bg-brand-accent transition-all duration-200 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Success Message */}
                  {uploadSuccessMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-medium">{uploadSuccessMessage}</span>
                    </div>
                  )}

                  {/* Upload Error Banner */}
                  {uploadError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-rose-600 hover:text-rose-900"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preset Assets & URL Fallback */}
                <div className="pt-2 border-t border-brand-border/60 space-y-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-semibold text-brand-muted uppercase shrink-0">
                      Or Preset Assets:
                    </span>
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          handleClearSelectedImage();
                          setFormData({ ...formData, image: preset.value });
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer shrink-0 ${
                          formData.image === preset.value && !selectedImageFile
                            ? 'bg-brand-black text-white border-brand-black font-semibold'
                            : 'bg-brand-offwhite text-brand-charcoal border-brand-border hover:bg-brand-cream'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <Input
                    type="text"
                    label="Image URL (Auto-populated on upload or enter URL)"
                    placeholder="https://... or /api/uploads/..."
                    value={formData.image}
                    onChange={(e) => {
                      setFormData({ ...formData, image: e.target.value });
                      if (selectedImageFile) {
                        handleClearSelectedImage();
                      }
                    }}
                    icon={ImageIcon}
                    error={formErrors.image}
                  />
                </div>

                {/* Active Image Preview Thumbnail */}
                {(imagePreviewUrl || formData.image) && (
                  <div className="flex items-center gap-3.5 p-3 bg-brand-offwhite/90 rounded-xl border border-brand-border/70">
                    <img
                      src={imagePreviewUrl || formData.image}
                      alt="Product preview"
                      className="w-16 h-16 object-cover rounded-lg border border-brand-border/80 shadow-2xs shrink-0"
                      onError={(e) => {
                        e.target.src = watchImg;
                      }}
                    />
                    <div className="text-xs text-brand-muted min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-brand-black">
                          {imagePreviewUrl
                            ? 'Selected New Image Preview'
                            : editingProduct
                            ? 'Current Product Image'
                            : 'Image Preview'}
                        </span>
                        {imagePreviewUrl && (
                          <Badge variant="accent" size="sm" className="text-[10px] !py-0">
                            Pending Save
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-charcoal truncate max-w-sm">
                        {selectedImageFile ? selectedImageFile.name : formData.image}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="productDescription"
                  className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
                >
                  Product Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="productDescription"
                  rows={4}
                  placeholder="Craftsmanship details, materials, specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-sm px-3.5 py-2.5 transition-colors duration-150 border focus:outline-none rounded-none ${
                    formErrors.description
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-brand-border focus:border-brand-black'
                  }`}
                />
                {formErrors.description && (
                  <p className="mt-1.5 text-xs text-rose-500">{formErrors.description}</p>
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
                    : editingProduct
                    ? 'Update Product'
                    : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. DELETE CONFIRMATION DIALOG MODAL */}
      {/* ========================================================================= */}
      {deleteConfirmation.isOpen && deleteConfirmation.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-md p-6 shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Icon & Header */}
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-brand-black">
                Confirm Product Deletion
              </h3>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-brand-black font-semibold">
                  "{deleteConfirmation.product.name}"
                </strong>{' '}
                (ID: {deleteConfirmation.product.id || deleteConfirmation.product._id}) from MongoDB? This operation cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-brand-offwhite rounded-lg border border-brand-border/60 text-xs text-brand-muted flex items-center gap-2">
              <Info size={14} className="text-brand-muted shrink-0" />
              <span>Will send DELETE /api/products/:id to backend.</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmation({ isOpen: false, product: null })}
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
                {isDeleting ? 'Deleting...' : 'Yes, Delete from Database'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
