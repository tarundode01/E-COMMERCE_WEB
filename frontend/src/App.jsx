import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProductSection from './components/ProductSection';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Orders from './pages/Orders';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminCategories from './pages/AdminCategories';
import AdminOrders from './pages/AdminOrders';
import AdminCustomers from './pages/AdminCustomers';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminSettings from './pages/AdminSettings';
import AdminVendors from './pages/AdminVendors';
import VendorRegister from './pages/VendorRegister';
import VendorDashboard from './pages/VendorDashboard';
import VendorProducts from './pages/VendorProducts';
import VendorOrders from './pages/VendorOrders';
import VendorCategories from './pages/VendorCategories';
import VendorAnalytics from './pages/VendorAnalytics';
import VendorSettings from './pages/VendorSettings';
import VendorDeliveryFleet from './pages/VendorDeliveryFleet';
import VendorApprovalStatus from './pages/VendorApprovalStatus';
import DeliveryBoyDashboard from './pages/DeliveryBoyDashboard';
import OrderTracking from './pages/OrderTracking';
import PublicStorePage from './pages/PublicStorePage';
import Categories from './pages/Categories';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-offwhite flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-brand-surface border border-brand-border/80 rounded-2xl p-8 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-brand-black mb-2">Something went wrong</h2>
            <p className="text-xs text-brand-muted mb-6 leading-relaxed">
              We encountered an unexpected display issue. Please refresh the page to continue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 bg-brand-black text-white text-xs font-semibold rounded-lg hover:bg-brand-charcoal cursor-pointer"
            >
              Return to Store
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { addToCart } = useCart();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isVendorDashboardRoute =
    location.pathname.startsWith('/vendor') &&
    location.pathname !== '/vendor/register' &&
    location.pathname !== '/vendor/approval-status';
  const isDeliveryRoute = location.pathname.startsWith('/delivery');
  const isTrackingRoute = location.pathname.includes('/track');
  const isDedicatedSaaSRoute = isAdminRoute || isVendorDashboardRoute || isDeliveryRoute || isTrackingRoute;

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      {/* Premium Consumer Navbar (hidden on dedicated admin & vendor dashboard SaaS suites) */}
      {!isDedicatedSaaSRoute && <Navbar />}

      {/* Page Routing */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <HeroSection />
                <ProductSection onAddToCart={addToCart} />
              </>
            }
          />
          <Route
            path="/shop"
            element={<Shop onAddToCart={addToCart} />}
          />
          <Route
            path="/categories"
            element={<Categories />}
          />
          <Route
            path="/product/:id"
            element={<ProductDetails onAddToCart={addToCart} />}
          />
          <Route
            path="/cart"
            element={<Cart />}
          />
          <Route
            path="/wishlist"
            element={<Wishlist />}
          />
          <Route
            path="/checkout"
            element={<Checkout />}
          />
          <Route
            path="/login"
            element={<Login />}
          />
          <Route
            path="/register"
            element={<Register />}
          />
          <Route
            path="/account"
            element={<Account />}
          />
          <Route
            path="/profile"
            element={<Account />}
          />
          <Route
            path="/orders"
            element={<Orders />}
          />
          <Route
            path="/my-orders"
            element={<Orders />}
          />
          <Route
            path="/orders/:id/track"
            element={<OrderTracking />}
          />
          <Route
            path="/track/:id"
            element={<OrderTracking />}
          />
          {/* Vendor SaaS Store Routes */}
          <Route
            path="/vendor/register"
            element={<VendorRegister />}
          />
          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/products"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/orders"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/categories"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/analytics"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/settings"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/delivery-boys"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorDeliveryFleet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/delivery"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorDeliveryFleet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/profile"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/approval-status"
            element={
              <ProtectedRoute allowedRoles={['vendor', 'admin']}>
                <VendorApprovalStatus />
              </ProtectedRoute>
            }
          />
          {/* Delivery Boy Mobile & Web Portal Route */}
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy', 'vendor', 'admin']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy', 'vendor', 'admin']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-boy/dashboard"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy', 'vendor', 'admin']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-boy"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy', 'vendor', 'admin']}>
                <DeliveryBoyDashboard />
              </ProtectedRoute>
            }
          />
          {/* Public Storefront Atelier Profile Route */}
          <Route
            path="/store/:slug"
            element={<PublicStorePage />}
          />
          {/* Admin Dashboard Routes (Strictly Admin Role Only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCustomers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vendors"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminVendors />
              </ProtectedRoute>
            }
          />
          {/* Fallback to Home */}
          <Route
            path="*"
            element={
              <>
                <HeroSection />
                <ProductSection onAddToCart={addToCart} />
              </>
            }
          />
        </Routes>
      </main>

      {/* Premium Footer (hidden on dedicated admin & vendor dashboard SaaS suites) */}
      {!isDedicatedSaaSRoute && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
