import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Store,
  KeyRound,
  Building2,
  MapPin,
  FileCheck,
  Headphones,
  Check,
  HelpCircle
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import SocialAuthModal from '../components/SocialAuthModal';
import { useAuth } from '../context/AuthContext';

/**
 * SaaS Multi-Role Registration Component
 * Allows users to choose between:
 * 1. Privileged Client (Customer)
 * 2. Atelier Merchant (Vendor)
 * 3. Platform Administrator (Admin - secured with Master Passcode)
 * Fully responsive and optimized for mobile, tablet, and desktop viewports.
 */
export default function Register() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { register, registerVendor } = useAuth();

  // Role can be initialized from query param (e.g. /register?role=vendor)
  const initialRoleParam = searchParams.get('role');
  const validRoles = ['user', 'vendor', 'admin'];
  const defaultRole = validRoles.includes(initialRoleParam) ? initialRoleParam : 'user';

  const [selectedRole, setSelectedRole] = useState(defaultRole);

  const [formData, setFormData] = useState({
    // Common Credentials
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    // Admin Security Passcode
    adminSecret: '',
    // Vendor Store & Dossier
    storeName: '',
    storeDescription: '',
    businessAddress: '',
    taxId: '',
    supportPhone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialModalProvider, setSocialModalProvider] = useState(null);

  // Social Auth Success Handler (Google & Apple)
  const handleSocialSuccess = (loggedInUser, isNewUser) => {
    setApiError('');
    setApiSuccess(
      isNewUser
        ? 'Account registered successfully! Welcome to Premium Store.'
        : 'Welcome back! Signed in with social credentials.'
    );
    setTimeout(() => {
      if (loggedInUser?.role === 'admin') {
        navigate('/admin/orders', { replace: true });
      } else if (loggedInUser?.role === 'vendor') {
        navigate('/vendor/dashboard', { replace: true });
      } else if (loggedInUser?.role === 'delivery_boy') {
        navigate('/delivery/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }, 600);
  };

  // Sync role with query parameter
  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setSearchParams({ role: roleKey }, { replace: true });
    setErrors({});
    setApiError('');
  };

  // Field Change Handler
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (apiError) setApiError('');
  };

  // Validate form inputs based on the chosen role
  const validateForm = () => {
    const newErrors = {};

    // 1. Common Personal Credentials
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
    if (selectedRole === 'vendor' && !formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required for store coordination';
    } else if (formData.mobileNumber.trim() && cleanPhone.length < 10) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // 2. Role-Specific Validations
    if (selectedRole === 'admin') {
      if (!formData.adminSecret.trim()) {
        newErrors.adminSecret = 'Platform Admin Security Key is required to create an admin account';
      }
    } else if (selectedRole === 'vendor') {
      if (!formData.storeName.trim()) {
        newErrors.storeName = 'Store / Brand name is required';
      } else if (formData.storeName.trim().length < 2) {
        newErrors.storeName = 'Store name must be at least 2 characters';
      }

      if (!formData.storeDescription.trim()) {
        newErrors.storeDescription = 'Store description is required';
      } else if (formData.storeDescription.trim().length < 10) {
        newErrors.storeDescription = 'Please describe your store in at least 10 characters';
      }

      if (!formData.businessAddress.trim()) {
        newErrors.businessAddress = 'Physical business address is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit registration request to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (selectedRole === 'vendor') {
        // Vendor Onboarding Flow (Creates User + Store Application)
        const vendorPayload = {
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          mobile: formData.mobileNumber.trim(),
          password: formData.password,
          storeName: formData.storeName.trim(),
          storeDescription: formData.storeDescription.trim(),
          businessAddress: formData.businessAddress.trim(),
          taxId: formData.taxId.trim(),
          supportEmail: formData.email.trim(),
          supportPhone: formData.supportPhone.trim() || formData.mobileNumber.trim(),
        };

        const vendorRes = await registerVendor(vendorPayload);
        setApiSuccess('Atelier registered successfully! Redirecting to your Merchant Portal...');

        setTimeout(() => {
          navigate('/vendor/dashboard', { replace: true });
        }, 1100);
      } else {
        // Customer or Admin Flow
        const authResult = await register(
          formData.fullName.trim(),
          formData.email.trim(),
          formData.mobileNumber.trim(),
          formData.password,
          selectedRole,
          formData.adminSecret.trim()
        );

        const registeredUser = authResult?.user || authResult?.data?.user;

        if (selectedRole === 'admin') {
          setApiSuccess('Platform Administrator account initialized! Redirecting to Admin Suite...');
          setTimeout(() => {
            navigate('/admin/orders', { replace: true });
          }, 1100);
        } else {
          setApiSuccess('Welcome to Premium Store! Your privileged client account is ready.');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1100);
        }
      }

      // Clear sensitive fields
      setFormData((prev) => ({ ...prev, password: '', adminSecret: '' }));
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Registration could not be completed. Please check your information and try again.';
      setApiError(errMsg);
      if (err.response?.data?.errors) {
        setErrors((prev) => ({ ...prev, ...err.response.data.errors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // SaaS Persona definitions
  const personas = [
    {
      id: 'user',
      title: 'Privileged Client',
      badge: 'Shopper',
      icon: User,
      description: 'Shop rare timepiece editions, track bespoke deliveries & private curation.',
      highlight: 'Instant Access',
    },
    {
      id: 'vendor',
      title: 'Atelier Merchant',
      badge: 'Seller / Brand',
      icon: Store,
      description: 'Open your boutique, publish catalog, manage stock & fulfill store orders.',
      highlight: 'SaaS Storefront',
    },
    {
      id: 'admin',
      title: 'Platform Admin',
      badge: 'SaaS Ops',
      icon: ShieldCheck,
      description: 'Marketplace supervision, approve ateliers, manage categories & audit telemetry.',
      highlight: 'Security Key Required',
    },
  ];

  return (
    <div className="min-h-screen bg-brand-offwhite py-8 sm:py-16 transition-colors flex items-center justify-center px-4">
      <div className={`w-full transition-all duration-300 ${selectedRole === 'vendor' ? 'max-w-3xl' : 'max-w-xl'}`}>
        {/* Top Back Link & Badge */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-accent transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Storefront</span>
          </Link>
          <Badge variant="outline" size="sm">
            SaaS Multi-Role Onboarding
          </Badge>
        </div>

        {/* Main Register Card */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6 sm:p-10 shadow-sm relative text-left">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 justify-center group mb-2.5">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-black group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mb-1"></span>
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-black">
              Create Your SaaS Account
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
              Select your account type below to customize your onboarding experience.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 1. SAAS PERSONA / ROLE SELECTOR (Responsive 3-Column Grid) */}
          {/* ========================================================================= */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-3">
              Select Account Persona:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {personas.map((persona) => {
                const IconComponent = persona.icon;
                const isSelected = selectedRole === persona.id;

                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleRoleSelect(persona.id)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'border-brand-black bg-brand-offwhite shadow-sm ring-1 ring-brand-black'
                        : 'border-brand-border/80 bg-brand-surface hover:border-brand-charcoal hover:bg-brand-cream/30'
                    }`}
                  >
                    {/* Top Row: Icon & Check indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-brand-black text-brand-accent shadow-xs'
                            : 'bg-brand-cream/60 text-brand-charcoal group-hover:bg-brand-cream'
                        }`}
                      >
                        <IconComponent size={18} />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-brand-black border-brand-black text-white'
                            : 'border-brand-border bg-white text-transparent'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    </div>

                    {/* Titles */}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-brand-black block">
                          {persona.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-brand-accent tracking-wide uppercase mt-0.5 block">
                        {persona.badge}
                      </span>
                      <p className="text-[11px] text-brand-muted mt-2 leading-relaxed">
                        {persona.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persona Highlight Banner */}
          <div className="mb-6 p-3.5 rounded-xl bg-brand-cream/40 border border-brand-border/70 flex items-start gap-3">
            <div className="p-1 rounded-md bg-brand-surface border border-brand-border/60 text-brand-accent shrink-0 mt-0.5">
              <Sparkles size={14} />
            </div>
            <div className="text-xs leading-relaxed text-brand-charcoal">
              {selectedRole === 'user' && (
                <span>
                  <strong>Privileged Client Account:</strong> Grants instant access to browsing rare editions, private cart reservations, courier order tracking, and bespoke client concierge.
                </span>
              )}
              {selectedRole === 'vendor' && (
                <span>
                  <strong>Atelier Merchant Portal:</strong> Enables multi-vendor commerce capabilities. You can configure your boutique profile, upload products, manage inventory, and fulfill store customer orders upon review.
                </span>
              )}
              {selectedRole === 'admin' && (
                <span>
                  <strong>Platform Administrator Suite:</strong> Grants platform-wide governance. Requires the platform Master Security Key for initialization (Default: <code className="bg-brand-surface px-1.5 py-0.5 rounded font-mono text-brand-black border border-brand-border/60 font-bold">luxury_admin_2026</code>).
                </span>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {apiSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span className="font-medium">{apiSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {apiError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Registration Error:</strong>
                <span>{apiError}</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. REGISTRATION FORM */}
          {/* ========================================================================= */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Personal Credentials Header (for vendor) */}
            {selectedRole === 'vendor' && (
              <div className="pb-1 border-b border-brand-border/60 mb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand-black flex items-center gap-1.5">
                  <User size={14} className="text-brand-accent" />
                  <span>Merchant Owner Credentials</span>
                </h3>
              </div>
            )}

            <div className={`grid gap-4 ${selectedRole === 'vendor' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Full Name */}
              <Input
                label="Full Name"
                id="fullName"
                placeholder={selectedRole === 'vendor' ? 'e.g. Master Horologist Julien Vance' : 'e.g. Lady Genevieve Vance'}
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                error={errors.fullName}
                icon={User}
                autoComplete="name"
                required
              />

              {/* Email Address */}
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder={selectedRole === 'admin' ? 'admin@luxury.com' : 'merchant@haute-boutique.com'}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={errors.email}
                icon={Mail}
                autoComplete="email"
                required
              />
            </div>

            <div className={`grid gap-4 ${selectedRole === 'vendor' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Mobile Number */}
              <Input
                label={selectedRole === 'vendor' ? 'Mobile Helpline Number' : 'Mobile Number (Optional)'}
                id="mobileNumber"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.mobileNumber}
                onChange={(e) => handleChange('mobileNumber', e.target.value)}
                error={errors.mobileNumber}
                helperText={selectedRole === 'vendor' ? 'Required for merchant store operations' : 'Optional for customer order updates'}
                icon={Phone}
                autoComplete="tel"
                required={selectedRole === 'vendor'}
              />

              {/* Password */}
              <Input
                label="Create Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                error={errors.password}
                helperText="Must be at least 6 characters long"
                icon={Lock}
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-brand-muted hover:text-brand-black p-1 transition-colors cursor-pointer focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                autoComplete="new-password"
                required
              />
            </div>

            {/* ========================================================================= */}
            {/* 3. ADMIN SECURITY PASSCODE FIELD (When role === 'admin') */}
            {/* ========================================================================= */}
            {selectedRole === 'admin' && (
              <div className="pt-2">
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-amber-800" />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Platform Authorization Required
                    </span>
                  </div>

                  <Input
                    label="Platform Master Security Key"
                    id="adminSecret"
                    type={showAdminSecret ? 'text' : 'password'}
                    placeholder="Enter SaaS platform security key"
                    value={formData.adminSecret}
                    onChange={(e) => handleChange('adminSecret', e.target.value)}
                    error={errors.adminSecret}
                    helperText="Default system key: luxury_admin_2026 (or custom key configured in .env)"
                    icon={KeyRound}
                    rightAction={
                      <button
                        type="button"
                        onClick={() => setShowAdminSecret(!showAdminSecret)}
                        className="text-brand-muted hover:text-brand-black p-1 transition-colors cursor-pointer focus:outline-none"
                        aria-label={showAdminSecret ? 'Hide secret key' : 'Show secret key'}
                      >
                        {showAdminSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    required
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. ATELIER & STORE PROFILE FIELDS (When role === 'vendor') */}
            {/* ========================================================================= */}
            {selectedRole === 'vendor' && (
              <div className="pt-4 border-t border-brand-border/60 space-y-4">
                <div className="pb-1">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-brand-black flex items-center gap-1.5">
                    <Building2 size={14} className="text-brand-accent" />
                    <span>Atelier Brand & Storefront Profile</span>
                  </h3>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    Configure your public storefront coordinates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Store / Atelier Name"
                    id="storeName"
                    placeholder="e.g. Geneva Haute Horlogerie"
                    value={formData.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    error={errors.storeName}
                    icon={Store}
                    required
                  />

                  <Input
                    label="Support / Store Helpline"
                    id="supportPhone"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.supportPhone}
                    onChange={(e) => handleChange('supportPhone', e.target.value)}
                    helperText="Optional (defaults to mobile number)"
                    icon={Headphones}
                  />
                </div>

                <div>
                  <label htmlFor="storeDescription" className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5">
                    Atelier Heritage & Bio *
                  </label>
                  <textarea
                    id="storeDescription"
                    rows={2}
                    placeholder="Describe your heritage, artisanal craftsmanship, and timepiece collections (min 10 characters)..."
                    value={formData.storeDescription}
                    onChange={(e) => handleChange('storeDescription', e.target.value)}
                    className={`w-full px-4 py-2.5 text-xs bg-brand-surface rounded-xl border transition-colors text-brand-black focus:outline-none ${
                      errors.storeDescription
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-brand-border focus:border-brand-black'
                    }`}
                  />
                  {errors.storeDescription && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {errors.storeDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Registered Physical Address"
                    id="businessAddress"
                    placeholder="Suite 400, Luxury Promenade, City"
                    value={formData.businessAddress}
                    onChange={(e) => handleChange('businessAddress', e.target.value)}
                    error={errors.businessAddress}
                    icon={MapPin}
                    required
                  />

                  <Input
                    label="Tax ID / VAT / GSTIN"
                    id="taxId"
                    placeholder="Optional business identifier"
                    value={formData.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    helperText="Optional for initial registration"
                    icon={FileCheck}
                  />
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. SUBMIT ACTION BUTTON */}
            {/* ========================================================================= */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-md hover:shadow-lg rounded-xl font-bold tracking-wider text-xs uppercase"
                icon={
                  selectedRole === 'admin'
                    ? ShieldCheck
                    : selectedRole === 'vendor'
                    ? Store
                    : Sparkles
                }
              >
                <span>
                  {selectedRole === 'admin'
                    ? 'Authorize & Initialize Platform Admin'
                    : selectedRole === 'vendor'
                    ? 'Register Atelier & Open Store'
                    : 'Create Privileged Client Account'}
                </span>
              </Button>
            </div>

            {/* Modern Social Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border/60"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-brand-surface px-3 text-brand-muted font-bold">Or register with</span>
              </div>
            </div>

            {/* Social Logins (Google & Apple) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setApiError('');
                  setSocialModalProvider('google');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border/90 bg-brand-surface hover:bg-brand-offwhite text-xs font-semibold text-brand-charcoal hover:text-brand-black transition-all cursor-pointer shadow-2xs active:scale-95 hover:border-brand-charcoal/30"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setApiError('');
                  setSocialModalProvider('apple');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border/90 bg-brand-surface hover:bg-brand-offwhite text-xs font-semibold text-brand-charcoal hover:text-brand-black transition-all cursor-pointer shadow-2xs active:scale-95 hover:border-brand-charcoal/30"
              >
                <svg className="w-4 h-4 shrink-0 fill-current text-brand-black" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.02-.49 2.64-1.24z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </form>

          {/* Switch to Login Link */}
          <div className="mt-8 pt-6 border-t border-brand-border/60 text-center">
            <p className="text-xs sm:text-sm text-brand-muted">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-brand-black hover:text-brand-accent transition-colors underline underline-offset-4"
              >
                Sign In Instead
              </Link>
            </p>
          </div>

          {/* Privacy & Security Assurances */}
          <div className="mt-6 pt-4 border-t border-brand-border/40 flex items-center justify-center gap-2 text-[11px] text-brand-muted">
            <ShieldCheck size={14} className="text-brand-accent shrink-0" />
            <span>Encrypted Privacy Protocol • Enterprise Multi-Tenant Architecture</span>
          </div>
        </div>

        {/* Social Authentication Modal (Google & Apple) */}
        <SocialAuthModal
          isOpen={Boolean(socialModalProvider)}
          onClose={() => setSocialModalProvider(null)}
          provider={socialModalProvider || 'google'}
          role={selectedRole}
          onSuccess={handleSocialSuccess}
        />
      </div>
    </div>
  );
}
