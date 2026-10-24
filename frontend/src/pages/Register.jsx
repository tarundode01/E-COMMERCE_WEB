import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Sparkles
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

/**
 * Premium Register Page Component
 * Connects to backend POST /api/auth/register via AuthContext
 */
export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    accountType: 'user', // 'user' (Customer) or 'admin' (Store Administrator)
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Validate form inputs before sending request
  const validateForm = () => {
    const newErrors = {};

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Full name must be at least 3 characters';
    }

    // Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Mobile Number (10 digits)
    const cleanPhone = formData.mobileNumber.replace(/\D/g, '');
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (cleanPhone.length < 10) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    // Password (min 6 chars)
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      const authResult = await register(
        formData.fullName.trim(),
        formData.email.trim(),
        formData.mobileNumber.trim(),
        formData.password,
        formData.accountType
      );
      const registeredUser = authResult?.user || authResult?.data?.user;

      setApiSuccess('Account created successfully! Welcome to Premium Store.');

      // Clear password field immediately
      setFormData((prev) => ({ ...prev, password: '' }));

      // Redirect admin to /admin/orders and customer to Home page /
      setTimeout(() => {
        if (registeredUser?.role === 'admin') {
          navigate('/admin/orders', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 900);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Registration could not be completed. Please check your information and try again.';
      setApiError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-offwhite py-12 sm:py-20 transition-colors flex items-center justify-center">
      <Container size="sm">
        {/* Top Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-brand-charcoal hover:text-brand-accent transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Home</span>
          </Link>
          <Badge variant="outline" size="sm">
            Membership
          </Badge>
        </div>

        {/* Register Card */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-7 sm:p-10 shadow-sm relative text-left">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 justify-center group mb-3">
              <span className="font-serif text-2xl font-bold tracking-tight text-brand-black group-hover:text-brand-accent transition-colors">
                Premium Store
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mb-1"></span>
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-black">
              Create Your Account
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted max-w-sm mx-auto leading-relaxed">
              Register as a privileged client to enjoy early access to rare editions and personalized horology curation.
            </p>
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

          {/* Register Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <Input
              label="Full Name"
              id="fullName"
              placeholder="e.g. Lady Genevieve Vance"
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
              placeholder="client@luxuryestate.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              icon={Mail}
              autoComplete="email"
              required
            />

            {/* Mobile Number */}
            <Input
              label="Mobile Number"
              id="mobileNumber"
              type="tel"
              placeholder="10-digit mobile number"
              value={formData.mobileNumber}
              onChange={(e) => handleChange('mobileNumber', e.target.value)}
              error={errors.mobileNumber}
              helperText="For VIP courier coordination & verification"
              icon={Phone}
              autoComplete="tel"
              required
            />

            {/* Password Field with Show/Hide toggle */}
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
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="new-password"
              required
            />

            {/* Account Role Selection */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('accountType', 'user')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    formData.accountType === 'user'
                      ? 'bg-brand-black text-white border-brand-black shadow-xs font-semibold'
                      : 'bg-brand-offwhite text-brand-charcoal border-brand-border/80 hover:border-brand-charcoal'
                  }`}
                >
                  <User size={14} />
                  <span>Customer Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('accountType', 'admin')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    formData.accountType === 'admin'
                      ? 'bg-brand-black text-white border-brand-black shadow-xs font-semibold'
                      : 'bg-brand-offwhite text-brand-charcoal border-brand-border/80 hover:border-brand-charcoal'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>Store Admin</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-md hover:shadow-lg rounded-lg font-semibold tracking-wider"
                icon={Sparkles}
              >
                {formData.accountType === 'admin' ? 'Create Admin Account' : 'Create Luxury Account'}
              </Button>
            </div>
          </form>

          {/* Switch to Login Link */}
          <div className="mt-8 pt-6 border-t border-brand-border/60 text-center">
            <p className="text-xs sm:text-sm text-brand-muted">
              Already have a client account?{' '}
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
            <span>Encrypted Privacy Protocol • No Unsolicited Solicitations</span>
          </div>
        </div>
      </Container>
    </div>
  );
}
