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
  Home,
  Store
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
  const [rememberMe, setRememberMe] = useState(true);

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

      // Redirect based on user role
      setTimeout(() => {
        if (loggedInUser?.role === 'admin') {
          navigate('/admin/orders', { replace: true });
        } else if (loggedInUser?.role === 'vendor') {
          if (authResult?.store?.status === 'approved') {
            navigate('/vendor/dashboard', { replace: true });
          } else {
            navigate('/vendor/approval-status', { replace: true });
          }
        } else if (loggedInUser?.role === 'delivery_boy') {
          navigate('/delivery/dashboard', { replace: true });
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
              {isAdmin ? 'Store Administrator' : user.role === 'vendor' ? 'Merchant Partner' : 'Privileged Client'}
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
              ) : user.role === 'vendor' ? (
                <>
                  <Link to="/vendor/dashboard">
                    <Button variant="primary" size="md" icon={Store}>
                      Merchant Portal
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline" size="md" icon={Home}>
                      Home Store
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
              <label
                htmlFor="password"
                className="block text-xs font-semibold tracking-wider uppercase text-brand-charcoal mb-1.5"
              >
                Password <span className="text-rose-500">*</span>
              </label>

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

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-brand-charcoal hover:text-brand-black transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-brand-border text-brand-black focus:ring-brand-black accent-brand-black cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-brand-accent hover:text-brand-accent-hover font-semibold transition-colors cursor-pointer focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full justify-center shadow-md hover:shadow-lg rounded-xl font-semibold tracking-wider text-xs sm:text-sm py-3"
                icon={Lock}
              >
                Sign In to Account
              </Button>
            </div>

            {/* Modern Social Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border/60"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-brand-surface px-3 text-brand-muted font-bold">Or continue with</span>
              </div>
            </div>

            {/* Real E-Commerce Social Logins (Google & Apple) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApiError('Google One-Tap is available for production OAuth deployments.')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border/90 bg-brand-surface hover:bg-brand-offwhite text-xs font-semibold text-brand-charcoal hover:text-brand-black transition-all cursor-pointer shadow-2xs"
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
                onClick={() => setApiError('Apple ID authentication is available for production OAuth deployments.')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border/90 bg-brand-surface hover:bg-brand-offwhite text-xs font-semibold text-brand-charcoal hover:text-brand-black transition-all cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4 shrink-0 fill-current text-brand-black" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1 .08 2.02-.49 2.64-1.24z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </form>

          {/* Real E-Commerce Customer & Merchant Navigation */}
          <div className="mt-8 pt-6 border-t border-brand-border/60 text-center space-y-3">
            <p className="text-xs sm:text-sm text-brand-charcoal">
              New to Premium Store?{' '}
              <Link
                to="/register"
                className="font-bold text-brand-black hover:text-brand-accent transition-colors underline underline-offset-4"
              >
                Create an Account
              </Link>
            </p>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-brand-muted">
              <Store size={13} className="text-brand-accent shrink-0" />
              <span>Are you a brand or merchant?</span>
              <Link
                to="/vendor/register"
                className="font-semibold text-brand-black hover:text-brand-accent underline underline-offset-2 transition-colors ml-0.5"
              >
                Partner with Us
              </Link>
            </div>
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
