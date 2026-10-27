import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Edit3,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Lock,
  RefreshCw,
  Save,
  X,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  LogOut,
  Info,
  Upload,
  Image as ImageIcon,
  Truck,
  Eye,
  EyeOff,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check
} from 'lucide-react';
import VendorLayout from '../components/VendorLayout';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { vendorService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatImageUrl } from '../utils/imageUrl';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_SCHEDULE = {
  monday: { open: '09:00', close: '18:00', isClosed: false },
  tuesday: { open: '09:00', close: '18:00', isClosed: false },
  wednesday: { open: '09:00', close: '18:00', isClosed: false },
  thursday: { open: '09:00', close: '18:00', isClosed: false },
  friday: { open: '09:00', close: '18:00', isClosed: false },
  saturday: { open: '10:00', close: '17:00', isClosed: false },
  sunday: { open: '10:00', close: '15:00', isClosed: true },
};

export default function VendorSettings() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateStoreInfo } = useAuth();

  const [store, setStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Active Sub-Tab: 'profile' | 'logistics' | 'hours'
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    businessAddress: '',
    taxId: '',
    supportEmail: '',
    supportPhone: '',
    logoUrl: '',
    bannerUrl: '',
    // Settings fields
    isOpen: true,
    isPubliclyVisible: true,
    pickupAddress: '',
    deliveryAvailable: true,
    deliveryNotes: '',
    openingHours: DEFAULT_SCHEDULE,
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Image Uploading States
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Copied slug state
  const [hasCopiedSlug, setHasCopiedSlug] = useState(false);

  // Populate state from retrieved store
  const populateFormData = useCallback((storeData) => {
    setFormData({
      name: storeData.name || '',
      slug: storeData.slug || '',
      description: storeData.description || '',
      businessAddress: storeData.businessAddress || '',
      taxId: storeData.taxId || '',
      supportEmail: storeData.supportEmail || '',
      supportPhone: storeData.supportPhone || '',
      logoUrl: storeData.logoUrl || '',
      bannerUrl: storeData.bannerUrl || '',
      isOpen: storeData.isOpen !== undefined ? Boolean(storeData.isOpen) : true,
      isPubliclyVisible: storeData.isPubliclyVisible !== undefined ? Boolean(storeData.isPubliclyVisible) : true,
      pickupAddress: storeData.pickupAddress || '',
      deliveryAvailable: storeData.deliveryAvailable !== undefined ? Boolean(storeData.deliveryAvailable) : true,
      deliveryNotes: storeData.deliveryNotes || '',
      openingHours: storeData.openingHours
        ? { ...DEFAULT_SCHEDULE, ...storeData.openingHours }
        : DEFAULT_SCHEDULE,
    });
  }, []);

  // Fetch Vendor Store Details
  const fetchStoreData = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const response = await vendorService.getStore();
      if (response && response.store) {
        setStore(response.store);
        populateFormData(response.store);
      }
    } catch (err) {
      console.error('Error fetching store:', err);
      if (err.response?.status === 404) {
        setFetchError('No registered store profile found for this account. Please register your store first.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setFetchError(err.response?.data?.message || 'Access denied.');
      } else {
        setFetchError(err.customMessage || 'Failed to load store data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [populateFormData]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/vendor/settings' } } });
      return;
    }
    fetchStoreData();
  }, [isAuthenticated, navigate, fetchStoreData]);

  // Handle Field Value Change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (saveError) setSaveError('');
  };

  // Handle Opening Hours Change
  const handleHoursChange = (day, field, value) => {
    setFormData((prev) => {
      const currentDay = prev.openingHours[day] || { open: '09:00', close: '18:00', isClosed: false };
      return {
        ...prev,
        openingHours: {
          ...prev.openingHours,
          [day]: {
            ...currentDay,
            [field]: value,
          },
        },
      };
    });
  };

  // Handle Image Uploads (Logo & Banner)
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setUploadError('');
    if (type === 'logo') setIsUploadingLogo(true);
    if (type === 'banner') setIsUploadingBanner(true);

    try {
      const uploadRes = await vendorService.uploadAsset(file);
      if (uploadRes && uploadRes.imageUrl) {
        const fieldName = type === 'logo' ? 'logoUrl' : 'bannerUrl';
        handleChange(fieldName, uploadRes.imageUrl);

        // Auto-persist uploaded asset to store
        const updatePayload = { [fieldName]: uploadRes.imageUrl };
        const updateRes = await vendorService.updateStore(updatePayload);
        if (updateRes?.store) {
          setStore((prev) => ({ ...prev, [fieldName]: uploadRes.imageUrl }));
          if (typeof updateStoreInfo === 'function') {
            updateStoreInfo({ [fieldName]: uploadRes.imageUrl });
          }
          setSaveSuccess(
            `${type === 'logo' ? 'Atelier logo' : 'Store banner'} uploaded and saved successfully.`
          );
          setTimeout(() => setSaveSuccess(''), 4000);
        }
      }
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      setUploadError(
        err.response?.data?.message || `Failed to upload ${type}. Ensure file size is under 5MB.`
      );
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'banner') setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  // Validate Profile Fields
  const validateProfileForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Store name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Store name must be at least 2 characters';
    }

    if (formData.slug.trim()) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.slug.trim().toLowerCase())) {
        errors.slug = 'Slug must only contain lowercase letters, numbers, and single hyphens';
      }
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.businessAddress.trim()) {
      errors.businessAddress = 'Business address is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.supportEmail.trim() && !emailRegex.test(formData.supportEmail.trim())) {
      errors.supportEmail = 'Please provide a valid support email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Store Profile or Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validateProfileForm()) {
      setActiveTab('profile');
      setSaveError('Please review and correct the highlighted fields in your profile.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const isResubmit = store?.status === 'rejected';
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase() || undefined,
        description: formData.description.trim(),
        businessAddress: formData.businessAddress.trim(),
        pickupAddress: formData.pickupAddress.trim(),
        taxId: formData.taxId.trim(),
        supportEmail: formData.supportEmail.trim(),
        supportPhone: formData.supportPhone.trim(),
        logoUrl: formData.logoUrl.trim(),
        bannerUrl: formData.bannerUrl.trim(),
        isOpen: formData.isOpen,
        isPubliclyVisible: formData.isPubliclyVisible,
        deliveryAvailable: formData.deliveryAvailable,
        deliveryNotes: formData.deliveryNotes.trim(),
        openingHours: formData.openingHours,
        resubmit: isResubmit,
      };

      const response = await vendorService.updateStore(payload);

      if (response && response.store) {
        setStore(response.store);
        populateFormData(response.store);
        if (typeof updateStoreInfo === 'function') {
          updateStoreInfo(response.store);
        }
        setSaveSuccess(response.message || 'Store details and settings saved successfully.');
        setTimeout(() => setSaveSuccess(''), 4500);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Failed to save store profile. Please check your inputs.';
      setSaveError(errMsg);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Copy Public Store URL
  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/store/${store?.slug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setHasCopiedSlug(true);
      setTimeout(() => setHasCopiedSlug(false), 2200);
    });
  };

  const isPending = store?.status === 'pending';
  const isApproved = store?.status === 'approved';
  const isRejected = store?.status === 'rejected';

  return (
    <VendorLayout
      activePage="settings"
      title="Store Settings & Atelier Profile"
      subtitle="Configure Your Brand Identity, Operating Hours, and Logistics Rules"
      store={store}
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Save}
            isLoading={isSaving}
            onClick={handleSave}
            className="text-xs"
          >
            <span>{isRejected ? 'Resubmit Application' : 'Save Changes'}</span>
          </Button>
          <button
            type="button"
            onClick={fetchStoreData}
            className="p-2 text-brand-charcoal hover:bg-brand-cream/60 rounded-lg transition-colors cursor-pointer border border-brand-border/70"
            title="Refresh Store Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      }
    >
      {/* Save Success / Error Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccess('')} className="p-1 text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button type="button" onClick={() => setSaveError('')} className="p-1 text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button type="button" onClick={() => setUploadError('')} className="p-1 text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Rejection Notice Banner */}
      {isRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-950 text-left space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert size={16} className="text-rose-600" />
            <span>Application Feedback from Compliance Audit</span>
          </div>
          <p className="text-xs sm:text-sm font-serif italic text-brand-charcoal p-3 bg-white rounded-xl border border-rose-200">
            &quot;{store?.rejectionReason || 'Please update your atelier profile and business coordinates.'}&quot;
          </p>
          <p className="text-xs text-rose-900/80">
            Update the editable coordinates below and click <strong>&quot;Resubmit Application&quot;</strong> to re-enter verification.
          </p>
        </div>
      )}

      {/* SUB-TABS: Profile | Hours & Logistics */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-1 overflow-x-auto text-left">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-brand-black text-brand-black font-bold'
              : 'border-transparent text-brand-muted hover:text-brand-charcoal'
          }`}
        >
          <Store size={15} />
          <span>Brand Identity & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logistics')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'logistics'
              ? 'border-brand-black text-brand-black font-bold'
              : 'border-transparent text-brand-muted hover:text-brand-charcoal'
          }`}
        >
          <Clock size={15} />
          <span>Operating Hours & Fulfillment</span>
        </button>
      </div>

      {/* TAB 1: BRAND PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-6 text-left">
          {/* Visual Media Section */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 flex items-center gap-2">
              <ImageIcon size={18} className="text-brand-accent" />
              <span>Visual Media & Atelier Branding</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Logo Box */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                  Atelier Logo (1:1 Ratio)
                </label>
                <div className="border border-brand-border rounded-xl p-4 bg-brand-offwhite text-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-white border border-brand-border/80 mx-auto overflow-hidden flex items-center justify-center p-1 shadow-xs">
                    {formData.logoUrl ? (
                      <img src={formatImageUrl(formData.logoUrl)} alt="Store Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Store size={32} className="text-neutral-300" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={(e) => handleFileUpload(e, 'logo')}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    isLoading={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full justify-center text-xs"
                  >
                    <span>Upload Logo</span>
                  </Button>
                  <p className="text-[10px] text-brand-muted">JPEG, PNG, WebP (Max 5MB)</p>
                </div>
              </div>

              {/* Banner Box */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider">
                  Storefront Banner (16:9 Ratio)
                </label>
                <div className="border border-brand-border rounded-xl p-4 bg-brand-offwhite text-center space-y-3">
                  <div className="w-full h-32 rounded-xl bg-neutral-900 border border-brand-border/80 overflow-hidden flex items-center justify-center relative">
                    {formData.bannerUrl ? (
                      <img src={formatImageUrl(formData.bannerUrl)} alt="Store Banner" className="w-full h-full object-cover brightness-90" />
                    ) : (
                      <span className="font-serif text-sm tracking-wider uppercase text-white/30 font-bold">
                        Storefront Banner Preview
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={(e) => handleFileUpload(e, 'banner')}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      isLoading={isUploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                      className="text-xs"
                    >
                      <span>Upload Banner Image</span>
                    </Button>
                    <span className="text-[10px] text-brand-muted">Recommended 1920x600 high resolution</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinates Section */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 flex items-center gap-2">
              <Building2 size={18} className="text-brand-accent" />
              <span>Business Coordinates & Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store / Business Name"
                id="storeName"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={formErrors.name}
                icon={Store}
                required
              />

              <div className="space-y-1">
                <Input
                  label="Store URL Slug"
                  id="storeSlug"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  error={formErrors.slug}
                  helperText="Lowercase letters, numbers, and hyphens (e.g. maison-vance)"
                  icon={Building2}
                  required
                />
                {store?.slug && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-brand-muted">Public link:</span>
                    <button
                      type="button"
                      onClick={copyPublicLink}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-charcoal hover:underline"
                    >
                      <span>/store/{store.slug}</span>
                      {hasCopiedSlug ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="storeDescription"
                className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5"
              >
                Atelier Heritage & Bio <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="storeDescription"
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={`w-full px-4 py-3 text-xs bg-brand-surface rounded-xl border transition-all text-brand-black ${
                  formErrors.description ? 'border-rose-400 focus:border-rose-500' : 'border-brand-border focus:border-brand-black'
                }`}
                placeholder="Describe your heritage, artisanal craftsmanship, and exclusive catalog..."
              />
              {formErrors.description && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">{formErrors.description}</p>
              )}
            </div>

            <div>
              <Input
                label="Registered Business Address"
                id="storeAddress"
                value={formData.businessAddress}
                onChange={(e) => handleChange('businessAddress', e.target.value)}
                error={formErrors.businessAddress}
                icon={MapPin}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Support Concierge Email"
                id="storeSupportEmail"
                type="email"
                value={formData.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                error={formErrors.supportEmail}
                icon={Mail}
              />

              <Input
                label="Support Helpline"
                id="storeSupportPhone"
                type="tel"
                value={formData.supportPhone}
                onChange={(e) => handleChange('supportPhone', e.target.value)}
                icon={Phone}
              />

              <Input
                label="Tax Identification / VAT / GSTIN"
                id="storeTaxId"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                icon={FileCheck}
              />
            </div>

            <div className="pt-4 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </span>
              ) : saveError ? (
                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </span>
              ) : (
                <span className="text-[11px] text-brand-muted">
                  All updates sync dynamically with live database and marketplace storefront.
                </span>
              )}
              <Button type="submit" variant="primary" size="md" icon={Save} isLoading={isSaving} className="text-xs">
                <span>{isRejected ? 'Save & Resubmit' : 'Save Profile Changes'}</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: HOURS & LOGISTICS */}
      {activeTab === 'logistics' && (
        <form onSubmit={handleSave} className="space-y-6 text-left">
          {/* Operational Switches */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 flex items-center gap-2">
              <Clock size={18} className="text-brand-accent" />
              <span>Operational Status & Marketplace Visibility</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Store Open/Closed Toggle */}
              <div className="p-5 rounded-xl border border-brand-border bg-brand-offwhite flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-xs uppercase tracking-wider text-brand-black flex items-center gap-1.5">
                    <span>Store Status</span>
                    {formData.isOpen ? (
                      <Badge variant="accent" size="sm">Open for Orders</Badge>
                    ) : (
                      <Badge variant="sale" size="sm">Temporarily Closed</Badge>
                    )}
                  </span>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    Toggle whether your atelier is currently accepting customer purchases.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('isOpen', !formData.isOpen)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.isOpen ? 'bg-emerald-600' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.isOpen ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Public Visibility Toggle */}
              <div className="p-5 rounded-xl border border-brand-border bg-brand-offwhite flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-xs uppercase tracking-wider text-brand-black flex items-center gap-1.5">
                    <span>Directory Visibility</span>
                    {formData.isPubliclyVisible ? (
                      <Badge variant="outline" size="sm">Visible</Badge>
                    ) : (
                      <Badge variant="sale" size="sm">Hidden</Badge>
                    )}
                  </span>
                  <p className="text-xs text-brand-muted leading-relaxed">
                    Show or hide your boutique from public marketplace searches and lists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('isPubliclyVisible', !formData.isPubliclyVisible)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.isPubliclyVisible ? 'bg-brand-black' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.isPubliclyVisible ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Logistics & Delivery Details */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="font-serif text-base font-bold text-brand-black pb-3 border-b border-brand-border/60 flex items-center gap-2">
              <Truck size={18} className="text-brand-accent" />
              <span>Concierge Delivery & Atelier Collection</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-brand-charcoal uppercase tracking-wider block">
                      White-Glove Delivery
                    </span>
                    <p className="text-xs text-brand-muted">Insured courier dispatch to client address</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('deliveryAvailable', !formData.deliveryAvailable)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.deliveryAvailable ? 'bg-emerald-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.deliveryAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label htmlFor="deliveryNotes" className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Delivery Guidelines & Timeline
                  </label>
                  <textarea
                    id="deliveryNotes"
                    rows={3}
                    value={formData.deliveryNotes}
                    onChange={(e) => handleChange('deliveryNotes', e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-brand-surface rounded-xl border border-brand-border focus:border-brand-black text-brand-black"
                    placeholder="e.g. Insured Express courier delivery within 2-4 business days."
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Private Atelier Pickup Address"
                  id="pickupAddress"
                  value={formData.pickupAddress}
                  onChange={(e) => handleChange('pickupAddress', e.target.value)}
                  helperText="Leave empty if your store exclusively ships via courier"
                  icon={MapPin}
                />
              </div>
            </div>
          </div>

          {/* Weekly Hours Schedule */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <h3 className="font-serif text-base font-bold text-brand-black flex items-center gap-2">
                <Calendar size={18} className="text-brand-accent" />
                <span>Weekly Operating Hours</span>
              </h3>
              <span className="text-[11px] text-brand-muted">Local time 24-hour format</span>
            </div>

            <div className="divide-y divide-brand-border/60">
              {DAYS.map((day) => {
                const dayData = formData.openingHours[day] || { open: '09:00', close: '18:00', isClosed: false };

                return (
                  <div key={day} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="w-36 font-semibold text-brand-charcoal capitalize">{DAY_LABELS[day]}</div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-brand-muted">
                        <input
                          type="checkbox"
                          checked={dayData.isClosed}
                          onChange={(e) => handleHoursChange(day, 'isClosed', e.target.checked)}
                          className="w-4 h-4 rounded text-brand-black border-brand-border focus:ring-brand-accent cursor-pointer"
                        />
                        <span>Closed</span>
                      </label>

                      {!dayData.isClosed ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={dayData.open}
                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-black font-mono text-xs focus:border-brand-black bg-brand-surface"
                          />
                          <span className="text-brand-muted">to</span>
                          <input
                            type="time"
                            value={dayData.close}
                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-brand-border text-brand-black font-mono text-xs focus:border-brand-black bg-brand-surface"
                          />
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic font-medium px-2 py-1">Atelier Closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </span>
              ) : saveError ? (
                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </span>
              ) : (
                <span className="text-[11px] text-brand-muted">
                  Operational hours and fulfillment rules update in real time.
                </span>
              )}
              <Button type="submit" variant="primary" size="md" icon={Save} isLoading={isSaving} className="text-xs">
                <span>Save Operational Settings</span>
              </Button>
            </div>
          </div>
        </form>
      )}
    </VendorLayout>
  );
}
