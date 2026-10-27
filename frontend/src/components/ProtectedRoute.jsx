import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Guards client-side routes based on authentication status and user roles.
 * - Redirects unauthenticated visitors to /login preserving the intended location.
 * - Restricts access if allowedRoles is specified (e.g., ['vendor', 'admin'] or ['admin']).
 * - Shows smooth loading state while auth session is being restored/verified.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, store, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // If session is currently being verified on initial page refresh
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-offwhite flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold tracking-wider uppercase text-brand-charcoal">
            Verifying Secure Session...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If an admin tries to access vendor routes, allow
    if (user.role === 'admin') {
      return children;
    }
    // If a vendor tries to access admin routes, redirect to vendor suite
    if (user.role === 'vendor') {
      return <Navigate to="/vendor/dashboard" replace />;
    }
    // Regular customer trying to access vendor or admin routes -> redirect to vendor register
    if (allowedRoles.includes('vendor')) {
      return <Navigate to="/vendor/register" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Vendor Approval Guard: If vendor store is not approved yet, redirect to approval status page
  if (user.role === 'vendor') {
    const isApproved = store?.status === 'approved';
    const isApprovalStatusPage = location.pathname === '/vendor/approval-status';

    if (!isApproved && !isApprovalStatusPage && location.pathname.startsWith('/vendor')) {
      return <Navigate to="/vendor/approval-status" replace />;
    }

    if (isApproved && isApprovalStatusPage) {
      return <Navigate to="/vendor/dashboard" replace />;
    }
  }

  return children;
}
