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
import Categories from './pages/Categories';
import Footer from './components/Footer';
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

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      {/* Premium Navbar with dynamic live cart count (hidden on admin layout) */}
      {!isAdminRoute && <Navbar />}

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
          {/* Admin Dashboard Routes */}
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />
          <Route
            path="/admin/products"
            element={<AdminProducts />}
          />
          <Route
            path="/admin/categories"
            element={<AdminCategories />}
          />
          <Route
            path="/admin/orders"
            element={<AdminOrders />}
          />
          <Route
            path="/admin/customers"
            element={<AdminCustomers />}
          />
          <Route
            path="/admin/analytics"
            element={<AdminAnalytics />}
          />
          <Route
            path="/admin/settings"
            element={<AdminSettings />}
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

      {/* Premium Footer (hidden on admin pages) */}
      {!isAdminRoute && <Footer />}
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
