import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Mail,
  Phone,
  Truck,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  XCircle,
  ShieldAlert,
  LogIn,
  DollarSign,
  Sparkles,
  Undo2,
  Loader2,
  RefreshCw,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { settingsService, productService } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Supported Order Statuses across backend database schema
 */
const SUPPORTED_ORDER_STATUSES = [
  {
    status: 'Pending',
    label: 'Pending Review',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
    description: 'New acquisition created by client; awaiting fraud check & payment settlement.',
    cancellable: true,
  },
  {
    status: 'Confirmed',
    label: 'Confirmed',
    color: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: CheckCircle2,
    description: 'Payment authorized; order transmitted to logistics fulfillment center.',
    cancellable: false,
  },
  {
    status: 'Shipped',
    label: 'In Transit',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: Truck,
    description: 'Dispatched with white-glove luxury courier; airway tracking active.',
    cancellable: false,
  },
  {
    status: 'Delivered',
    label: 'Delivered',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCheck,
    description: 'Package successfully received by client; acquisition lifecycle complete.',
    cancellable: false,
  },
  {
    status: 'Cancelled',
    label: 'Cancelled',
    color: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: XCircle,
    description: 'Order terminated prior to dispatch; inventory returned to reserve stock.',
    cancellable: false,
  },
];

/**
 * Standard default boutique configuration fallback
 */
const DEFAULT_SETTINGS = {
  // Store Information
  storeName: 'Luxe Horizon Maison',
  logoUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=240&auto=format&fit=crop&q=80',
  description:
    'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',
  storeDescription:
    'Purveyors of exceptional horology, artisanal leathercraft, and refined fragrances for discerning clientele worldwide.',

  // Contact Details
  supportEmail: 'concierge@luxury.com',
  phoneNumber: '+1 (800) 845-9876',
  supportPhone: '+1 (800) 845-9876',

  // Shipping Settings
  shippingFee: 25,
  freeShippingThreshold: 500,

  // Order Settings
  cancellationPolicy:
    "Clients may cancel acquisitions self-service only while in 'Pending' status prior to warehouse allocation and courier dispatch. Once an order is updated to 'Confirmed' or 'Shipped', cancellation is locked to safeguard logistics and stock reservations. For special handling, contact concierge.",
};

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  // Form State
  const [formData, setFormData] = useState(DEFAULT_SETTINGS);
  const [initialSavedData, setInitialSavedData] = useState(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState({});

  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(() => Boolean(isAuthenticated && user?.role === 'admin'));
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', message: string }
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Logo Upload State
  const logoFileInputRef = useRef(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoUploadError, setLogoUploadError] = useState(null);

  const handleReload = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Logo file upload handler
  const handleLogoFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    // Validate image format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Invalid format. Please select a PNG, JPG, WebP, or SVG emblem file.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('File size exceeds 5MB limit. Please select a smaller emblem file.');
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);
    setLogoUploadProgress(0);

    try {
      const uploadRes = await productService.uploadImage(file, (progress) => {
        setLogoUploadProgress(progress);
      });

      if (uploadRes && uploadRes.imageUrl) {
        handleChange('logoUrl', uploadRes.imageUrl);
        setLogoPreviewError(false);
        setFeedback({
          type: 'info',
          message: 'New brand emblem uploaded! Click "Save Changes" to save permanently.',
        });
      } else {
        throw new Error('Upload response did not return a valid image URL.');
      }
    } catch (uploadErr) {
      console.error('Logo upload error:', uploadErr);
      setLogoUploadError(
        uploadErr.response?.data?.message ||
          uploadErr.customMessage ||
          uploadErr.message ||
          'Failed to upload emblem file. Please try again.'
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Load Settings directly from backend GET /api/admin/settings
  useEffect(() => {
    let active = true;

    if (!isAdmin) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const res = await settingsService.getSettings();
        if (!active) return;

        if (res && res.success && res.settings) {
          const loaded = {
            storeName: res.settings.storeName || '',
            logoUrl: res.settings.logoUrl || '',
            description: res.settings.description || res.settings.storeDescription || '',
            storeDescription: res.settings.storeDescription || res.settings.description || '',
            supportEmail: res.settings.supportEmail || '',
            phoneNumber: res.settings.phoneNumber || res.settings.supportPhone || '',
            supportPhone: res.settings.supportPhone || res.settings.phoneNumber || '',
            shippingFee: res.settings.shippingFee ?? 25,
            freeShippingThreshold: res.settings.freeShippingThreshold ?? 500,
            cancellationPolicy: res.settings.cancellationPolicy || '',
          };
          setFormData(loaded);
          setInitialSavedData(loaded);
        } else {
          setFetchError('Unexpected response format received from the store settings server.');
        }
      } catch (err) {
        if (!active) return;
        console.error('Failed to retrieve store settings from backend:', err);
        const statusCode = err.response?.status;
        if (statusCode === 401) {
          logout();
          navigate('/login', { state: { from: { pathname: '/admin/settings' } } });
          return;
        }

        if (statusCode === 403) {
          setFetchError('Access forbidden. Administrative privileges are required to configure store settings.');
          return;
        }

        setFetchError(
          err.response?.data?.message ||
            err.message ||
            'Failed to retrieve store settings from the server. Please verify backend service.'
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAdmin, refreshKey, logout, navigate]);

  // Track if form has unsaved modifications
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialSavedData);
  }, [formData, initialSavedData]);

  // Field change handler
  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      // Keep alias fields in sync
      if (field === 'storeDescription') updated.description = value;
      if (field === 'description') updated.storeDescription = value;
      if (field === 'phoneNumber') updated.supportPhone = value;
      if (field === 'supportPhone') updated.phoneNumber = value;

      return updated;
    });

    if (field === 'logoUrl') {
      setLogoPreviewError(false);
    }

    // Clear error for that field on change
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }

    // Dismiss previous feedback banner if editing
    if (feedback) {
      setFeedback(null);
    }
  };

  // Client-side form validation before submitting
  const validateForm = () => {
    const newErrors = {};

    // 1. Store Information
    if (!formData.storeName || !formData.storeName.trim()) {
      newErrors.storeName = 'Store name is required.';
    } else if (formData.storeName.trim().length < 2) {
      newErrors.storeName = 'Store name must be at least 2 characters long.';
    }

    if (!formData.logoUrl || !formData.logoUrl.trim()) {
      newErrors.logoUrl = 'Logo URL is required.';
    } else {
      const urlPattern = /^(https?:\/\/|\/|\.\/)/i;
      if (!urlPattern.test(formData.logoUrl.trim())) {
        newErrors.logoUrl = 'Please provide a valid web URL (http/https) or relative asset path.';
      }
    }

    const desc = formData.storeDescription || formData.description;
    if (!desc || !desc.trim()) {
      newErrors.storeDescription = 'Store description is required.';
    } else if (desc.trim().length < 10) {
      newErrors.storeDescription = 'Description should be at least 10 characters long.';
    }

    // 2. Contact Details
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.supportEmail || !formData.supportEmail.trim()) {
      newErrors.supportEmail = 'Support concierge email is required.';
    } else if (!emailRegex.test(formData.supportEmail.trim())) {
      newErrors.supportEmail = 'Please provide a valid email address.';
    }

    const phone = formData.phoneNumber || formData.supportPhone;
    if (!phone || !phone.trim()) {
      newErrors.phoneNumber = 'Concierge telephone number is required.';
    } else if (phone.trim().length < 6) {
      newErrors.phoneNumber = 'Please provide a valid contact number (min 6 characters).';
    }

    // 3. Shipping Settings
    const shippingFeeNum = Number(formData.shippingFee);
    if (formData.shippingFee === '' || isNaN(shippingFeeNum) || shippingFeeNum < 0) {
      newErrors.shippingFee = 'Shipping fee must be a non-negative number ($0 or greater).';
    }

    const freeShippingNum = Number(formData.freeShippingThreshold);
    if (formData.freeShippingThreshold === '' || isNaN(freeShippingNum) || freeShippingNum < 0) {
      newErrors.freeShippingThreshold = 'Free shipping threshold must be a non-negative number.';
    } else if (freeShippingNum > 0 && freeShippingNum < shippingFeeNum) {
      newErrors.freeShippingThreshold = 'Free shipping threshold cannot be less than standard shipping fee.';
    }

    // 4. Order Settings
    if (!formData.cancellationPolicy || !formData.cancellationPolicy.trim()) {
      newErrors.cancellationPolicy = 'Cancellation policy description is required.';
    } else if (formData.cancellationPolicy.trim().length < 20) {
      newErrors.cancellationPolicy = 'Cancellation terms must be comprehensive (min 20 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler: Saves changes using PUT /api/admin/settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      setFeedback({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = {
        storeName: formData.storeName.trim(),
        logoUrl: formData.logoUrl.trim(),
        description: (formData.storeDescription || formData.description || '').trim(),
        storeDescription: (formData.storeDescription || formData.description || '').trim(),
        supportEmail: formData.supportEmail.trim(),
        supportPhone: (formData.phoneNumber || formData.supportPhone || '').trim(),
        phoneNumber: (formData.phoneNumber || formData.supportPhone || '').trim(),
        shippingFee: Number(formData.shippingFee),
        freeShippingThreshold: Number(formData.freeShippingThreshold),
        cancellationPolicy: formData.cancellationPolicy.trim(),
      };

      const res = await settingsService.updateSettings(payload);

      // Only show success message if backend explicitly confirms save
      if (res && res.success && res.settings) {
        const merged = {
          storeName: res.settings.storeName ?? payload.storeName,
          logoUrl: res.settings.logoUrl ?? payload.logoUrl,
          description: res.settings.description || res.settings.storeDescription || payload.description,
          storeDescription: res.settings.storeDescription || res.settings.description || payload.storeDescription,
          supportEmail: res.settings.supportEmail ?? payload.supportEmail,
          supportPhone: res.settings.supportPhone || res.settings.phoneNumber || payload.supportPhone,
          phoneNumber: res.settings.phoneNumber || res.settings.supportPhone || payload.phoneNumber,
          shippingFee: res.settings.shippingFee ?? payload.shippingFee,
          freeShippingThreshold: res.settings.freeShippingThreshold ?? payload.freeShippingThreshold,
          cancellationPolicy: res.settings.cancellationPolicy ?? payload.cancellationPolicy,
        };
        setInitialSavedData(merged);
        setFormData(merged);
        setFeedback({
          type: 'success',
          message: res.message || 'Store settings saved successfully to the database!',
        });
      } else {
        // Backend did not confirm save
        setFeedback({
          type: 'error',
          message: 'The server did not confirm saving settings. Form values remain unchanged.',
        });
      }
    } catch (err) {
      console.error('Failed to update store settings on backend:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401) {
        logout();
        navigate('/login', { state: { from: { pathname: '/admin/settings' } } });
        return;
      }

      if (statusCode === 403) {
        setFeedback({
          type: 'error',
          message: 'Access forbidden. Administrator clearance required to modify store settings.',
        });
        return;
      }

      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        err.message ||
        'Failed to save settings to the backend database.';

      // Keep form values unchanged if saving fails
      setFeedback({
        type: 'error',
        message: apiMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes back to last saved state confirmed by database
  const handleDiscard = () => {
    setFormData(initialSavedData);
    setErrors({});
    setFeedback({
      type: 'info',
      message: 'Unsaved edits discarded. Reverted to last saved settings from database.',
    });
  };

  // Reset to initial luxury default configuration in form
  const handleResetToDefaults = () => {
    setFormData(DEFAULT_SETTINGS);
    setErrors({});
    setShowResetConfirm(false);
    setFeedback({
      type: 'info',
      message: 'Restored standard boutique defaults in form. Click "Save Changes" to save to the database.',
    });
  };

  return (
    <AdminLayout
      activePage="settings"
      title="Store Settings & Governance"
      subtitle="Configure luxury brand profile, concierge channels, logistics rates, and order lifecycle rules"
      actions={
        <div className="flex items-center gap-2">
          {/* Unsaved Edits Badge */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Unsaved Edits</span>
            </span>
          )}

          {/* Refresh from Database */}
          <button
            type="button"
            onClick={handleReload}
            disabled={isLoading || isSaving}
            className="p-2 text-brand-charcoal hover:text-brand-black hover:bg-brand-cream/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Reload from Database"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-brand-accent' : ''} />
          </button>

          {/* Discard Edits Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
            icon={Undo2}
            className="border-brand-border hover:bg-brand-cream/80 text-xs"
          >
            Discard
          </Button>

          {/* Save Changes Button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            icon={Save}
            className="text-xs"
          >
            Save Changes
          </Button>
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
            Store configuration parameters, courier rates, and order governance rules are reserved exclusively for authorized system administrators.
          </p>
          <Link to="/login">
            <Button variant="primary" size="md" icon={LogIn}>
              Sign In as Administrator
            </Button>
          </Link>
        </div>
      ) : isLoading ? (
        /* Loading Indicator */
        <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-16 text-center my-6 shadow-xs animate-in fade-in duration-200">
          <Loader2 size={36} className="text-brand-accent animate-spin mx-auto mb-4" />
          <h3 className="font-serif text-lg font-bold text-brand-black mb-1">
            Loading Store Governance...
          </h3>
          <p className="text-xs text-brand-muted max-w-sm mx-auto">
            Retrieving saved brand configuration and order policies from database.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 text-left">
          {/* Connection Telemetry Banner */}
          <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              <span className="font-medium">
                Connected to Store Settings API (<code className="font-mono">/api/admin/settings</code>)
              </span>
            </div>
            <Badge variant="accent" size="sm" className="bg-emerald-100 text-emerald-900 border-emerald-300">
              Database Synchronized
            </Badge>
          </div>

          {/* Database Fetch Error Alert with Retry */}
          {fetchError && (
            <div className="p-4 rounded-xl border bg-rose-50 text-rose-900 border-rose-200 flex items-start justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5 font-bold">API Retrieval Error:</strong>
                  <p className="leading-relaxed">{fetchError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleReload}
                icon={RotateCcw}
                className="border-rose-300 hover:bg-rose-100 shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* User Feedback Alerts (Success, Error, Info) */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs animate-in fade-in duration-200 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : feedback.type === 'error' ? (
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles size={18} className="text-blue-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block mb-0.5 font-bold">
                    {feedback.type === 'success'
                      ? 'Saved Successfully'
                      : feedback.type === 'error'
                      ? 'Update Failed'
                      : 'Notice'}
                  </strong>
                  <p className="leading-relaxed">{feedback.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-neutral-500 hover:text-neutral-800 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: STORE INFORMATION */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-brand-border/60 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <Store size={19} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Store Information
                </h3>
                <p className="text-xs text-brand-muted">
                  Boutique brand identity, crest emblem, and public metadata
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Store Name (Cols 1-7) */}
              <div className="md:col-span-7 space-y-5">
                <Input
                  label="Store Name"
                  id="storeName"
                  placeholder="e.g. Luxe Horizon Maison"
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  error={errors.storeName}
                  helperText="Displayed in browser titlebars, email receipts, and header branding."
                  required
                />

                <div>
                  <Input
                    label="Logo Image URL"
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    error={errors.logoUrl}
                    helperText="Direct HTTP/HTTPS link or local asset path to store brand emblem."
                    required
                  />

                  {/* Quick File Upload Option */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      onChange={handleLogoFileSelect}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      icon={isUploadingLogo ? Loader2 : Upload}
                      disabled={isUploadingLogo}
                      onClick={() => logoFileInputRef.current?.click()}
                      className={`text-xs border-brand-border ${
                        isUploadingLogo ? 'animate-pulse' : 'hover:bg-brand-cream/80'
                      }`}
                    >
                      {isUploadingLogo ? `Uploading (${logoUploadProgress}%)...` : 'Upload Emblem File'}
                    </Button>
                    <span className="text-[11px] text-brand-muted">
                      PNG, JPG, WebP, SVG (Max 5MB)
                    </span>
                  </div>

                  {logoUploadError && (
                    <p className="mt-1.5 text-xs text-rose-500 font-medium">
                      {logoUploadError}
                    </p>
                  )}
                </div>
              </div>

              {/* Logo Preview Card (Cols 8-12) */}
              <div className="md:col-span-5 flex flex-col">
                <span className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5">
                  Brand Logo Preview
                </span>
                <div
                  onClick={() => !isUploadingLogo && logoFileInputRef.current?.click()}
                  className="flex-1 bg-brand-offwhite border border-dashed border-brand-border rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[140px] cursor-pointer hover:border-brand-accent/80 hover:bg-brand-cream/30 transition-all group relative"
                  title="Click to choose a new emblem file"
                >
                  {isUploadingLogo ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <Loader2 size={24} className="text-brand-accent animate-spin" />
                      <span className="text-xs font-semibold text-brand-charcoal">
                        Uploading emblem... {logoUploadProgress}%
                      </span>
                      <div className="w-28 bg-brand-border/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-accent h-full transition-all duration-300"
                          style={{ width: `${logoUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : formData.logoUrl && !logoPreviewError ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <img
                        src={formData.logoUrl}
                        alt="Store Logo Preview"
                        className="max-h-20 max-w-full object-contain rounded-md shadow-2xs group-hover:scale-105 transition-transform"
                        onError={() => setLogoPreviewError(true)}
                      />
                      <span className="text-[10px] text-brand-muted font-mono truncate max-w-[200px]">
                        {formData.storeName || 'Emblem Preview'}
                      </span>
                      <span className="text-[10px] text-brand-accent font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to change image
                      </span>
                    </div>
                  ) : (
                    <div className="text-brand-muted space-y-1">
                      <Store size={28} className="mx-auto text-neutral-300 group-hover:text-brand-accent transition-colors" />
                      <p className="text-[11px] font-medium text-brand-subtle">
                        {logoPreviewError ? 'Invalid image link - Click to upload' : 'No logo preview - Click to upload'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Store Description (Full width) */}
              <div className="md:col-span-12">
                <label
                  htmlFor="storeDescription"
                  className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
                >
                  Store Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="storeDescription"
                  rows={3}
                  value={formData.storeDescription || formData.description || ''}
                  onChange={(e) => handleChange('storeDescription', e.target.value)}
                  placeholder="Summarize the heritage, curation focus, and standard of luxury products..."
                  className={`w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-sm p-3.5 border transition-colors duration-150 focus:outline-none ${
                    errors.storeDescription
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black'
                  }`}
                />
                {errors.storeDescription ? (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.storeDescription}</p>
                ) : (
                  <div className="flex items-center justify-between mt-1.5 text-xs text-brand-muted">
                    <span>Public boutique synopsis shown in client footers and search indexes.</span>
                    <span className="font-mono text-[11px]">
                      {(formData.storeDescription || formData.description || '')?.length} characters
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: CONTACT DETAILS */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-brand-border/60 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                <Mail size={19} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Contact Details
                </h3>
                <p className="text-xs text-brand-muted">
                  Client assistance channels, concierge inbox, and telephone dispatch
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Support Email */}
              <Input
                label="Support Concierge Email"
                id="supportEmail"
                type="email"
                placeholder="concierge@luxury.com"
                value={formData.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                icon={Mail}
                error={errors.supportEmail}
                helperText="Inquiries and order confirmation notices route from this address."
                required
              />

              {/* Phone Number */}
              <Input
                label="Concierge Phone Line"
                id="phoneNumber"
                type="tel"
                placeholder="+1 (800) 845-9876"
                value={formData.phoneNumber || formData.supportPhone || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                icon={Phone}
                error={errors.phoneNumber}
                helperText="VIP customer support helpline for private client services."
                required
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: SHIPPING SETTINGS */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-brand-border/60 mb-6">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                <Truck size={19} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Shipping & Logistics Settings
                </h3>
                <p className="text-xs text-brand-muted">
                  Standard courier rates and automated complimentary delivery thresholds
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Standard Shipping Fee */}
              <Input
                label="Standard Courier Fee ($ USD)"
                id="shippingFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="25.00"
                value={formData.shippingFee}
                onChange={(e) => handleChange('shippingFee', e.target.value)}
                icon={DollarSign}
                error={errors.shippingFee}
                helperText="Flat-rate insured shipping charged on acquisitions below the complimentary tier."
                required
              />

              {/* Free-Shipping Threshold */}
              <Input
                label="Free-Shipping Threshold ($ USD)"
                id="freeShippingThreshold"
                type="number"
                min="0"
                step="0.01"
                placeholder="500.00"
                value={formData.freeShippingThreshold}
                onChange={(e) => handleChange('freeShippingThreshold', e.target.value)}
                icon={Sparkles}
                error={errors.freeShippingThreshold}
                helperText="Orders with item subtotal exceeding this amount receive complimentary white-glove delivery."
                required
              />
            </div>

            <div className="mt-5 p-3.5 rounded-xl bg-brand-offwhite border border-brand-border/60 flex items-center gap-3 text-xs text-brand-muted">
              <Sparkles size={16} className="text-brand-accent shrink-0" />
              <span>
                Active calculation rule: Orders under{' '}
                <strong className="text-brand-black font-semibold">
                  ${Number(formData.freeShippingThreshold || 0).toFixed(2)}
                </strong>{' '}
                incur a{' '}
                <strong className="text-brand-black font-semibold">
                  ${Number(formData.shippingFee || 0).toFixed(2)}
                </strong>{' '}
                courier surcharge. Orders equal to or above{' '}
                <strong className="text-brand-black font-semibold">
                  ${Number(formData.freeShippingThreshold || 0).toFixed(2)}
                </strong>{' '}
                qualify for free shipping.
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: ORDER SETTINGS & LIFECYCLE */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-brand-border/60 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-black">
                  Order Settings & Governance
                </h3>
                <p className="text-xs text-brand-muted">
                  System order statuses and legal acquisition cancellation policies
                </p>
              </div>
            </div>

            {/* Supported Order Statuses Display */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
                  Supported System Order Statuses (5 Lifecycle Stages)
                </span>
                <span className="text-[11px] text-brand-muted">
                  Synchronized with MongoDB database schema
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SUPPORTED_ORDER_STATUSES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.status}
                      className="p-3.5 rounded-xl bg-brand-offwhite border border-brand-border/70 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${item.color}`}
                        >
                          <Icon size={13} />
                          <span>{item.label}</span>
                        </span>
                        {item.cancellable ? (
                          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider bg-amber-100/60 px-1.5 py-0.5 rounded">
                            Cancellable
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancellation Policy Text */}
            <div>
              <label
                htmlFor="cancellationPolicy"
                className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
              >
                Cancellation Policy Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="cancellationPolicy"
                rows={4}
                value={formData.cancellationPolicy}
                onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
                placeholder="State the terms under which customer orders can be cancelled or returned..."
                className={`w-full bg-brand-surface text-brand-black placeholder:text-brand-subtle text-sm p-3.5 border transition-colors duration-150 focus:outline-none ${
                  errors.cancellationPolicy
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-brand-border focus:border-brand-black focus:ring-1 focus:ring-brand-black'
                }`}
              />
              {errors.cancellationPolicy ? (
                <p className="mt-1.5 text-xs text-rose-500">{errors.cancellationPolicy}</p>
              ) : (
                <div className="flex items-center justify-between mt-1.5 text-xs text-brand-muted">
                  <span>Presented to clients upon checkout review and inside order history.</span>
                  <span className="font-mono text-[11px]">
                    {formData.cancellationPolicy?.length || 0} characters
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. BOTTOM ACTIONS BAR */}
          {/* ========================================================================= */}
          <div className="bg-brand-surface border border-brand-border/70 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                icon={RotateCcw}
                className="border-brand-border hover:bg-brand-cream/80 text-xs"
              >
                Reset Defaults
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleDiscard}
                disabled={!isDirty || isSaving}
                icon={Undo2}
                className="border-brand-border hover:bg-brand-cream/80 text-xs"
              >
                Discard Edits
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                disabled={isSaving}
                icon={Save}
                className="text-xs min-w-[150px]"
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-left">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-4 border border-amber-200">
                  <RotateCcw size={22} />
                </div>
                <h4 className="font-serif text-xl font-bold text-brand-black mb-2">
                  Reset Form to Defaults?
                </h4>
                <p className="text-xs text-brand-muted leading-relaxed mb-6">
                  This will populate the form with factory luxury store values. To commit these defaults to the database, you will still need to click "Save Changes".
                </p>
                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    className="border-brand-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleResetToDefaults}
                    className="bg-brand-black text-white hover:bg-brand-charcoal"
                  >
                    Confirm Reset
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </AdminLayout>
  );
}
