import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Store,
  FileText,
  MapPin,
  FileCheck,
  Headphones,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Clock
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

/**
 * Premium Vendor Registration Page
 * Complete SaaS onboarding: Account creation + Store creation + Pending Approval submission
 */
export default function VendorRegister() {
  const navigate = useNavigate();
  const { registerVendor } = useAuth();

  const [formData, setFormData] = useState({
    // Vendor Personal Credentials
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    // Store & Business Dossier
    storeName: '',
    storeDescription: '',
    businessAddress: '',
    taxId: '',
    supportEmail: '',
    supportPhone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field change handler with instant validation clear
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

  // Comprehensive client-side form validation
  const validateForm = () => {
    const newErrors = {};

    // 1. Personal Details
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Personal email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (cleanPhone.length < 10) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // 2. Business & Store Details
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

    if (formData.supportEmail.trim() && !emailRegex.test(formData.supportEmail.trim())) {
      newErrors.supportEmail = 'Please enter a valid support email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Vendor Registration Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');

    if (!validateForm()) {
      // Smooth scroll to top of form to reveal errors
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobileNumber.trim(),
        password: formData.password,
        storeName: formData.storeName.trim(),
        storeDescription: formData.storeDescription.trim(),
        businessAddress: formData.businessAddress.trim(),
        taxId: formData.taxId.trim(),
        supportEmail: formData.supportEmail.trim() || formData.email.trim(),
        supportPhone: formData.supportPhone.trim() || formData.mobileNumber.trim(),
      };

      await registerVendor(payload);

      setApiSuccess(
        'Store application registered successfully! Your merchant dossier is now pending administrative review.'
      );

      // Clean password
      setFormData((prev) => ({ ...prev, password: '' }));

      // Redirect vendor to Vendor Approval Status review page
      setTimeout(() => {
        navigate('/vendor/approval-status', { replace: true });
      }, 1200);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Vendor registration could not be completed. Please review your details and try again.';
      setApiError(errMsg);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-offwhite py-10 sm:py-16 transition-colors">
      <Container size="default">
        {/* Navigation & Header Breadcrumb */}
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-accent transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Regular Account</span>
          </Link>
          <Badge variant="accent" size="sm">
            Merchant Partner Program
          </Badge>
        </div>

        {/* Main Card Container */}
        <div className="max-w-3xl mx-auto bg-brand-surface border border-brand-border/80 rounded-2xl p-6 sm:p-10 shadow-sm relative text-left">
          {/* Header Banner */}
          <div className="text-center mb-8 pb-6 border-b border-brand-border/60">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-accent/15 text-brand-black mb-3">
              <Store size={24} />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-black">
              Register as a Vendor & Open Your Store
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted max-w-xl mx-auto leading-relaxed">
              Join the curated luxury marketplace. Submit your store profile and business credentials for administrative verification. Once approved, you gain full access to storefront selling.
            </p>
          </div>

          {/* Pending Approval Notice Callout */}
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-semibold block mb-0.5">Application Review Notice:</strong>
              All vendor accounts start with a <strong>Pending Approval</strong> status. An administrator reviews your business details before activating store publication and selling capabilities.
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* ============================================================== */}
            {/* Section 1: Merchant Account Information */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-brand-border/40">
                <User size={16} className="text-brand-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  1. Merchant Account Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Merchant Full Name"
                  id="fullName"
                  placeholder="e.g. Marcus Aurelius Sterling"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  error={errors.fullName}
                  icon={User}
                  autoComplete="name"
                  required
                />

                <Input
                  label="Personal / Login Email"
                  id="email"
                  type="email"
                  placeholder="merchant@boutique.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  icon={Mail}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Direct Mobile Number"
                  id="mobileNumber"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  error={errors.mobileNumber}
                  helperText="Used for merchant identity verification"
                  icon={Phone}
                  autoComplete="tel"
                  required
                />

                <Input
                  label="Create Secure Password"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={errors.password}
                  helperText="At least 6 characters required"
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
            </div>

            {/* ============================================================== */}
            {/* Section 2: Store & Business Profile */}
            {/* ============================================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-brand-border/40">
                <Store size={16} className="text-brand-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-black">
                  2. Store & Business Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Store / Business Name"
                  id="storeName"
                  placeholder="e.g. Kensington Horology Atelier"
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  error={errors.storeName}
                  helperText="A clean, unique URL slug will be automatically created"
                  icon={Store}
                  required
                />

                <Input
                  label="Business Tax ID / GST / Registration Number"
                  id="taxId"
                  placeholder="e.g. VAT-GB9920192 or GSTIN"
                  value={formData.taxId}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  error={errors.taxId}
                  helperText="Optional but prioritizes verification approval"
                  icon={FileCheck}
                />
              </div>

              {/* Store Description */}
              <div>
                <label
                  htmlFor="storeDescription"
                  className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5"
                >
                  Store Bio & Brand Heritage <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    id="storeDescription"
                    rows={3}
                    placeholder="Describe your brand, craft specialty, curation standards, and warranty policies (minimum 10 characters)..."
                    value={formData.storeDescription}
                    onChange={(e) => handleChange('storeDescription', e.target.value)}
                    className={`w-full px-4 py-3 text-xs bg-brand-surface rounded-xl border transition-all text-brand-black placeholder:text-brand-muted/70 focus:outline-none focus:ring-1 ${
                      errors.storeDescription
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-brand-border/80 focus:border-brand-black focus:ring-brand-black'
                    }`}
                  />
                </div>
                {errors.storeDescription && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{errors.storeDescription}</p>
                )}
              </div>

              {/* Business Address */}
              <div>
                <Input
                  label="Official Business / Warehouse Address"
                  id="businessAddress"
                  placeholder="Suite 400, 15 Old Bond Street, Mayfair, London W1S 4PP"
                  value={formData.businessAddress}
                  onChange={(e) => handleChange('businessAddress', e.target.value)}
                  error={errors.businessAddress}
                  helperText="Required for merchant compliance and audit records"
                  icon={MapPin}
                  required
                />
              </div>

              {/* Support Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Public Customer Support Email"
                  id="supportEmail"
                  type="email"
                  placeholder="concierge@atelier.com"
                  value={formData.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  error={errors.supportEmail}
                  helperText="Defaults to your personal email if left blank"
                  icon={Mail}
                />

                <Input
                  label="Customer Support Helpline"
                  id="supportPhone"
                  type="tel"
                  placeholder="+44 20 7946 0912"
                  value={formData.supportPhone}
                  onChange={(e) => handleChange('supportPhone', e.target.value)}
                  error={errors.supportPhone}
                  helperText="Defaults to your mobile number if left blank"
                  icon={Headphones}
                />
              </div>
            </div>

            {/* Terms & Conditions Acceptance */}
            <div className="p-4 rounded-xl bg-brand-offwhite border border-brand-border/70 flex items-start gap-3">
              <ShieldCheck size={18} className="text-brand-accent shrink-0 mt-0.5" />
              <div className="text-[11px] text-brand-muted leading-relaxed">
                By submitting this merchant application, you verify that all supplied business credentials are genuine and agree to adhere to our Luxury Marketplace Standards, fair fulfillment terms, and authenticate product guarantees.
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-md hover:shadow-lg rounded-xl font-semibold tracking-wider text-xs uppercase"
                icon={Sparkles}
              >
                Submit Store Application for Review
              </Button>
            </div>
          </form>

          {/* Links back to Login */}
          <div className="mt-8 pt-6 border-t border-brand-border/60 text-center">
            <p className="text-xs sm:text-sm text-brand-muted">
              Already registered as a merchant or client?{' '}
              <Link
                to="/login"
                className="font-bold text-brand-black hover:text-brand-accent transition-colors underline underline-offset-4"
              >
                Sign In to Your Dashboard
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
