import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  LogOut,
  User,
  PackageCheck,
  Home
} from 'lucide-react';
import Container from '../components/Container';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';

/**
 * Premium Login Page Component
 * Connects to backend POST /api/auth/login via AuthContext
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Validate form inputs before sending request
  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit login request to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const authResult = await login(email.trim(), password);
      const loggedInUser = authResult?.user || authResult?.data?.user;

      setApiSuccess('Login successful! Welcome back.');
      // Never store or log password
      setPassword('');

      // Redirect admin directly to Admin Orders ledger, customer to Home page /
      setTimeout(() => {
        if (loggedInUser?.role === 'admin') {
          navigate('/admin/orders', { replace: true });
        } else {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      }, 700);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.customMessage ||
        'Authentication failed. Please verify your email and password.';
      setApiError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot password handler (UI placeholder)
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      alert('Please enter a valid email address for recovery.');
    } else {
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setShowForgotModal(false);
        setForgotEmail('');
      }, 2800);
    }
  };

  // If user is already authenticated, show personalized account status card
  if (isAuthenticated && user) {
    const isAdmin = user.role === 'admin';

    return (
      <div className="min-h-screen bg-brand-offwhite py-12 sm:py-20 transition-colors flex items-center justify-center">
        <Container size="sm">
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-brand-cream border border-brand-border text-brand-black flex items-center justify-center mx-auto mb-4 font-serif text-2xl font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <Badge variant="accent" size="sm" className="mb-2">
              {isAdmin ? 'Store Administrator' : 'Privileged Client'}
            </Badge>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-brand-black mb-1">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-brand-muted mb-1">{user.email}</p>
            {user.mobile && (
              <p className="text-xs text-brand-muted mb-6">Contact: +91 {user.mobile}</p>
            )}

            <div className="p-4 bg-brand-cream/40 rounded-xl border border-brand-border/60 max-w-sm mx-auto mb-6 text-xs text-brand-charcoal text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Account Status:</span>
                <span className="font-semibold text-emerald-800">Active & Verified ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Role:</span>
                <span className="font-semibold capitalize">{user.role || 'Client'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Session:</span>
                <span className="font-semibold">256-Bit JWT Secured</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAdmin ? (
                <>
                  <Link to="/admin/orders">
                    <Button variant="primary" size="md" icon={PackageCheck}>
                      Admin Orders Ledger
                    </Button>
                  </Link>
                  <Link to="/admin">
                    <Button variant="outline" size="md" icon={ShieldCheck}>
                      Admin Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/">
                    <Button variant="primary" size="md" icon={Home}>
                      Home Store
                    </Button>
                  </Link>
                  <Link to="/account">
                    <Button variant="outline" size="md" icon={User}>
                      My Account
                    </Button>
                  </Link>
                </>
              )}
              <Button
                variant="ghost"
                size="md"
                onClick={logout}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                icon={LogOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

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
            Client Portal
          </Badge>
        </div>

        {/* Login Card */}
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
              Sign In to Your Account
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-brand-muted max-w-sm mx-auto leading-relaxed">
              Access your bespoke acquisitions, order archives, and private client privileges.
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
                <strong className="font-semibold block mb-0.5">Authentication Failed:</strong>
                <span>{apiError}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email Field */}
            <Input
              label="Email Address"
              id="email"
              type="email"
              placeholder="client@luxuryestate.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                if (apiError) setApiError('');
              }}
              error={errors.email}
              icon={Mail}
              autoComplete="email"
              required
            />

            {/* Password Field with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-brand-accent hover:text-brand-accent-hover font-semibold transition-colors cursor-pointer focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>

              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your confidential password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  if (apiError) setApiError('');
                }}
                error={errors.password}
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
                autoComplete="current-password"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-md hover:shadow-lg rounded-lg font-semibold tracking-wider"
                icon={Lock}
              >
                Sign In to Account
              </Button>
            </div>

            {/* Quick Demo Credentials 1-Click Fill */}
            <div className="pt-2">
              <div className="p-3 bg-brand-cream/50 rounded-xl border border-brand-border/70 space-y-2">
                <p className="text-[10px] font-bold tracking-widest uppercase text-brand-muted text-center">
                  Quick Demo Credentials (1-Click Fill)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('customer_test@luxury.com');
                      setPassword('password123');
                      setErrors({});
                      setApiError('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded bg-brand-surface border border-brand-border hover:border-brand-black transition-colors text-brand-charcoal hover:text-brand-black flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <User size={13} className="text-brand-accent" />
                    <span>Customer Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@luxury.com');
                      setPassword('admin123');
                      setErrors({});
                      setApiError('');
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded bg-brand-black text-white hover:bg-brand-charcoal transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ShieldCheck size={13} className="text-amber-400" />
                    <span>Admin Demo</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Switch to Register Link */}
          <div className="mt-8 pt-6 border-t border-brand-border/60 text-center">
            <p className="text-xs sm:text-sm text-brand-muted">
              Don&apos;t have an account yet?{' '}
              <Link
                to="/register"
                className="font-bold text-brand-black hover:text-brand-accent transition-colors underline underline-offset-4"
              >
                Create an Account
              </Link>
            </p>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-6 pt-4 border-t border-brand-border/40 flex items-center justify-center gap-2 text-[11px] text-brand-muted">
            <ShieldCheck size={14} className="text-brand-accent shrink-0" />
            <span>256-Bit SSL Encrypted Client Authentication</span>
          </div>
        </div>

        {/* "Forgot Password?" Modal Placeholder */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-left">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-brand-accent mb-2">
                <Sparkles size={14} />
                <span>Account Recovery</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-brand-black mb-2">
                Reset Your Password
              </h3>
              <p className="text-xs text-brand-muted mb-6 leading-relaxed">
                Enter your registered client email address. An encrypted password reset dossier simulation will be dispatched.
              </p>

              {forgotSent ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-4">
                  ✓ Reset instructions dispatched to <strong>{forgotEmail}</strong>. (UI Placeholder)
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <Input
                    label="Registered Email"
                    id="forgotEmail"
                    type="email"
                    placeholder="client@luxuryestate.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    icon={Mail}
                    required
                  />

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="rounded-lg shadow-sm"
                    >
                      Send Reset Instructions
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
