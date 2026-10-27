import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Store from './models/Store.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Order from './models/Order.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function runTask8Tests() {
  console.log('\n========================================================================');
  console.log('--- TASK 8: SAAS VENDOR DASHBOARD — UI & BACKEND INTEGRATION SUITE ---');
  console.log('========================================================================\n');

  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB for Task 8 test verification.\n');

  try {
    // -------------------------------------------------------------
    // SETUP: CLEANUP & SEEDING TEST FIXTURES
    // -------------------------------------------------------------
    console.log('[Setup] Cleaning up previous Task 8 test artifacts...');
    await User.deleteMany({ email: { $regex: /^t8_/ } });
    await Store.deleteMany({ slug: { $regex: /^t8-/ } });
    await Product.deleteMany({ sku: { $regex: /^T8-/ } });
    await Category.deleteMany({ slug: { $regex: /^t8-/ } });

    // 1. Create Category
    const category = await Category.create({
      name: 'Task 8 Haute Horlogerie',
      slug: `t8-horology-${Date.now()}`,
      description: 'Test category for multi-vendor SaaS dashboard verification',
      status: 'active',
      isActive: true,
    });

    // 2. Create Admin
    const adminUser = await User.create({
      name: 'Task 8 Administrator',
      email: `t8_admin_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543210',
      role: 'admin',
      status: 'active',
      isActive: true,
    });

    // 3. Create Approved Vendor A & Store A
    const vendorA = await User.create({
      name: 'Vendor Atelier Alpha',
      email: `t8_vendor_a_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543211',
      role: 'vendor',
      status: 'active',
      isActive: true,
    });

    const storeA = await Store.create({
      vendor: vendorA._id,
      name: 'Atelier Alpha Luxury',
      slug: `t8-store-a-${Date.now()}`,
      description: 'Bespoke timepieces and horology',
      businessAddress: '100 Regent Street, London',
      taxId: 'GB123456789',
      supportEmail: 'contact@atelier-alpha.test',
      supportPhone: '+44 20 7946 0991',
      status: 'approved',
      isOpen: true,
      isPubliclyVisible: true,
      deliveryAvailable: true,
    });

    // 4. Create Approved Vendor B & Store B (for data isolation testing)
    const vendorB = await User.create({
      name: 'Vendor Atelier Beta',
      email: `t8_vendor_b_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543212',
      role: 'vendor',
      status: 'active',
      isActive: true,
    });

    const storeB = await Store.create({
      vendor: vendorB._id,
      name: 'Atelier Beta Leathercraft',
      slug: `t8-store-b-${Date.now()}`,
      description: 'Tuscan full-grain leather goods',
      businessAddress: '45 Via Tornabuoni, Florence',
      taxId: 'IT987654321',
      supportEmail: 'service@atelier-beta.test',
      supportPhone: '+39 055 123456',
      status: 'approved',
      isOpen: true,
      isPubliclyVisible: true,
      deliveryAvailable: true,
    });

    // 5. Create Pending Vendor C & Store C (for permission testing)
    const vendorC = await User.create({
      name: 'Vendor Atelier Gamma (Pending)',
      email: `t8_vendor_c_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543213',
      role: 'vendor',
      status: 'active',
      isActive: true,
    });

    const storeC = await Store.create({
      vendor: vendorC._id,
      name: 'Atelier Gamma Pending',
      slug: `t8-store-c-${Date.now()}`,
      description: 'Under review store',
      businessAddress: '12 Boulevard Haussmann, Paris',
      status: 'pending',
    });

    // 6. Create Customer
    const customer = await User.create({
      name: 'Task 8 Patron Customer',
      email: `t8_customer_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543214',
      role: 'user',
      status: 'active',
      isActive: true,
    });

    // 7. Create Products for Vendor A
    const productA1 = await Product.create({
      name: 'Alpha Chronometer Rose Gold',
      slug: `t8-alpha-chrono-${Date.now()}`,
      sku: `T8-A-001-${Date.now()}`,
      category: category._id,
      store: storeA._id,
      price: 1500,
      stock: 20,
      status: 'published',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      description: 'Exquisite 18k rose gold chronometer',
    });

    // Low stock product for Vendor A (stock = 3 <= 5)
    const productA2_lowStock = await Product.create({
      name: 'Alpha Limited Tourbillon',
      slug: `t8-alpha-tourbillon-${Date.now()}`,
      sku: `T8-A-002-${Date.now()}`,
      category: category._id,
      store: storeA._id,
      price: 4500,
      stock: 3,
      status: 'published',
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d',
      description: 'Limited edition sapphire tourbillon',
    });

    // Draft product for Vendor A
    const productA3_draft = await Product.create({
      name: 'Alpha Concept Prototype',
      slug: `t8-alpha-prototype-${Date.now()}`,
      sku: `T8-A-003-${Date.now()}`,
      category: category._id,
      store: storeA._id,
      price: 8000,
      stock: 1,
      status: 'draft',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
      description: 'Experimental titanium prototype',
    });

    // Product for Vendor B
    const productB1 = await Product.create({
      name: 'Beta Tuscan Briefcase',
      slug: `t8-beta-briefcase-${Date.now()}`,
      sku: `T8-B-001-${Date.now()}`,
      category: category._id,
      store: storeB._id,
      price: 850,
      stock: 15,
      status: 'published',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
      description: 'Vegetable tanned full-grain leather briefcase',
    });

    console.log('[Setup] Seeded test category, stores, products, and users.\n');

    // -------------------------------------------------------------
    // PHASE 1: AUTHENTICATION TOKENS
    // -------------------------------------------------------------
    console.log('--- Phase 1: Authentication & Token Issuance ---');

    const loginResA = await request('/auth/login', {
      method: 'POST',
      body: { email: vendorA.email, password: 'Password123!' },
    });
    assert(loginResA.status === 200 && loginResA.data?.token, 'Vendor A logs in successfully and receives JWT token');
    const tokenA = loginResA.data.token;

    const loginResB = await request('/auth/login', {
      method: 'POST',
      body: { email: vendorB.email, password: 'Password123!' },
    });
    assert(loginResB.status === 200 && loginResB.data?.token, 'Vendor B logs in successfully and receives JWT token');
    const tokenB = loginResB.data.token;

    const loginResC = await request('/auth/login', {
      method: 'POST',
      body: { email: vendorC.email, password: 'Password123!' },
    });
    assert(loginResC.status === 200 && loginResC.data?.token, 'Pending Vendor C logs in successfully and receives JWT token');
    const tokenC = loginResC.data.token;

    const loginResCust = await request('/auth/login', {
      method: 'POST',
      body: { email: customer.email, password: 'Password123!' },
    });
    assert(loginResCust.status === 200 && loginResCust.data?.token, 'Customer logs in successfully and receives JWT token');
    const tokenCust = loginResCust.data.token;

    const loginResAdmin = await request('/auth/login', {
      method: 'POST',
      body: { email: adminUser.email, password: 'Password123!' },
    });
    assert(loginResAdmin.status === 200 && loginResAdmin.data?.token, 'Admin logs in successfully and receives JWT token');
    const tokenAdmin = loginResAdmin.data.token;

    // -------------------------------------------------------------
    // PHASE 2: STORE PROFILE & SETTINGS APIs
    // -------------------------------------------------------------
    console.log('\n--- Phase 2: Store Profile & Settings Management ---');

    // Vendor A views own store
    const storeResA = await request('/vendor/store', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(storeResA.status === 200, 'Vendor A retrieves store settings');
    assert(storeResA.data?.store?.name === 'Atelier Alpha Luxury', 'Store name matches Vendor A');
    assert(storeResA.data?.store?.isOpen === true, 'Store open status is boolean true');

    // Vendor A updates store profile and schedule
    const updateStoreRes = await request('/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        description: 'Updated prestigious atelier description',
        supportPhone: '+44 20 7000 8888',
        deliveryAvailable: true,
        deliveryNotes: 'White-glove courier delivery only',
        openingHours: {
          monday: { open: '10:00', close: '19:00', isClosed: false },
          sunday: { open: '12:00', close: '17:00', isClosed: true },
        },
      },
    });
    assert(updateStoreRes.status === 200, 'Vendor A successfully updates store profile and operating hours');
    assert(
      updateStoreRes.data?.store?.supportPhone === '+44 20 7000 8888',
      'Updated support phone persisted'
    );
    assert(
      updateStoreRes.data?.store?.deliveryNotes === 'White-glove courier delivery only',
      'Updated delivery notes persisted'
    );

    // Cross-vendor isolation: Vendor B cannot access Vendor A's store dossier by ID
    const crossStoreRes = await request(`/vendor/store/${storeA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      crossStoreRes.status === 403,
      'Cross-vendor isolation: Vendor B is forbidden (403) from accessing Vendor A store dossier'
    );

    // -------------------------------------------------------------
    // PHASE 3: PRODUCT MANAGEMENT & ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Product Management & Data Isolation ---');

    // Vendor A creates a new product
    const createProdRes = await request('/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Alpha Skeleton Tourbillon',
        sku: `T8-A-004-${Date.now()}`,
        category: category._id,
        price: 3200,
        stock: 5,
        description: 'Exquisite skeletonized luxury automatic movement',
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d',
        status: 'published',
      },
    });
    assert(createProdRes.status === 201, 'Vendor A creates new product successfully (201)');
    const createdProdId = createProdRes.data?.product?._id || createProdRes.data?.product?.id;
    assert(Boolean(createdProdId), 'Product ID returned from creation');

    // Vendor A toggles status of product
    const toggleStatusRes = await request(`/vendor/products/${createdProdId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'draft' },
    });
    assert(toggleStatusRes.status === 200, 'Vendor A toggles product status to draft');

    // Cross-vendor isolation: Vendor B cannot modify Vendor A's product
    const crossProdRes = await request(`/vendor/products/${createdProdId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { price: 100 },
    });
    assert(
      crossProdRes.status === 403 || crossProdRes.status === 404,
      'Cross-vendor isolation: Vendor B cannot update Vendor A product (403/404)'
    );

    // Unapproved Vendor C cannot create products
    const unapprovedProdRes = await request('/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
      body: {
        name: 'Unauthorized Product',
        sku: `T8-C-001-${Date.now()}`,
        category: category._id,
        price: 500,
        stock: 10,
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d',
      },
    });
    assert(
      unapprovedProdRes.status === 403,
      'Security enforcement: Pending Vendor C is rejected with 403 Forbidden from creating products'
    );

    // -------------------------------------------------------------
    // PHASE 4: MULTI-VENDOR ORDER CREATION & FULFILLMENT
    // -------------------------------------------------------------
    console.log('\n--- Phase 4: Order Creation & Vendor Order Fulfillment ---');

    // Customer places multi-vendor order (Product A1 + Product A2 + Product B1)
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCust}` },
      body: {
        products: [
          { productId: productA1._id, quantity: 2, selectedSize: 'Standard' }, // $1500 * 2 = $3000
          { productId: productA2_lowStock._id, quantity: 1, selectedSize: 'Standard' }, // $4500 * 1 = $4500
          { productId: productB1._id, quantity: 1, selectedSize: 'Standard' }, // $850 * 1 = $850
        ],
        deliveryAddress: {
          fullName: 'Task 8 Patron Customer',
          mobileNumber: '9876543210',
          email: 'patron@luxury.test',
          address: '742 Evergreen Terrace',
          city: 'London',
          state: 'Greater London',
          pinCode: 'W1B 5AH',
        },
        paymentMethod: 'Credit Card',
      },
    });
    assert(orderRes.status === 201, 'Customer successfully places multi-vendor order (201)');
    const placedOrder = orderRes.data?.order;
    assert(Boolean(placedOrder?._id), 'Order ID present in creation response');
    const orderId = placedOrder._id;

    // Vendor A queries vendor orders: should see order with ONLY Store A's items
    const vendorOrdersA = await request('/vendor/orders', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(vendorOrdersA.status === 200, 'Vendor A retrieves vendor orders list');
    const orderFoundA = vendorOrdersA.data?.orders?.find((o) => (o._id || o.id) === orderId);
    assert(Boolean(orderFoundA), 'Placed order appears in Vendor A orders list');
    assert(orderFoundA?.items?.length === 2, 'Vendor A order view contains strictly 2 items belonging to Store A');
    assert(
      (orderFoundA?.vendorSubtotal || orderFoundA?.storeSubtotal) === 7500,
      `Vendor A storeSubtotal is correctly calculated as $7500 ($3000 + $4500), received: ${orderFoundA?.vendorSubtotal}`
    );

    // Vendor B queries vendor orders: should see order with ONLY Store B's items
    const vendorOrdersB = await request('/vendor/orders', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(vendorOrdersB.status === 200, 'Vendor B retrieves vendor orders list');
    const orderFoundB = vendorOrdersB.data?.orders?.find((o) => (o._id || o.id) === orderId);
    assert(Boolean(orderFoundB), 'Placed order appears in Vendor B orders list');
    assert(orderFoundB?.items?.length === 1, 'Vendor B order view contains strictly 1 item belonging to Store B');
    assert(
      (orderFoundB?.vendorSubtotal || orderFoundB?.storeSubtotal) === 850,
      `Vendor B storeSubtotal is correctly calculated as $850, received: ${orderFoundB?.vendorSubtotal}`
    );

    // Vendor A updates order status through valid transitions
    // 1. Pending -> Confirmed
    const confirmRes = await request(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Confirmed' },
    });
    assert(confirmRes.status === 200, 'Vendor A updates order status to Confirmed');

    // 2. Confirmed -> Processing
    const processRes = await request(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Processing' },
    });
    assert(processRes.status === 200, 'Vendor A updates order status to Processing');

    // 3. Processing -> Packed
    const packRes = await request(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Packed' },
    });
    assert(packRes.status === 200, 'Vendor A updates order status to Packed');

    // 4. Packed -> Ready for Pickup
    const readyRes = await request(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Ready for Pickup' },
    });
    assert(readyRes.status === 200, 'Vendor A updates order status to Ready for Pickup');

    // 5. Invalid transition: cannot jump backwards to 'Pending'
    const invalidRes = await request(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'Pending' },
    });
    assert(
      invalidRes.status === 400,
      'State machine enforcement: Backward transition to Pending is rejected with 400 Bad Request'
    );

    // -------------------------------------------------------------
    // PHASE 5: VENDOR ANALYTICS & DASHBOARD TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- Phase 5: Real-Time Vendor Analytics & Telemetry ---');

    // Vendor A retrieves analytics
    const analyticsResA = await request('/vendor/analytics?timeframe=all', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(analyticsResA.status === 200, 'Vendor A retrieves analytics telemetry (200)');
    const aData = analyticsResA.data;
    assert(aData?.success === true, 'Analytics response has success: true');

    // Validate summary metrics
    const sumA = aData?.summary;
    assert(Boolean(sumA), 'Summary object present in telemetry response');
    assert(sumA?.totalOrders >= 1, `Total orders correctly aggregated (got: ${sumA?.totalOrders})`);
    assert(sumA?.totalRevenue >= 7500, `Total revenue matches Store A gross ($7500, got: ${sumA?.totalRevenue})`);
    assert(sumA?.totalUnitsSold >= 3, `Total units sold is 3 (2 of A1, 1 of A2, got: ${sumA?.totalUnitsSold})`);
    assert(sumA?.averageOrderValue >= 7500, `Average order value calculated accurately (got: ${sumA?.averageOrderValue})`);
    assert(sumA?.readyForPickupOrders >= 1, 'Status counter for Ready for Pickup incremented');

    // Validate low-stock detection (productA2 has stock 2 after 1 sold, createdProdId has stock 5, both <= 5)
    assert(sumA?.lowStockCount >= 1, `Low stock count identified accurately (got: ${sumA?.lowStockCount})`);
    const lowStockItems = aData?.lowStockProducts || [];
    assert(
      lowStockItems.some((p) => p.name.includes('Tourbillon')),
      'Low stock products list includes items with stock <= 5'
    );

    // Validate top-selling products
    const topProds = aData?.topSellingProducts || [];
    assert(topProds.length >= 1, 'Top selling products array populated from real order lines');
    assert(
      topProds[0]?.unitsSold >= 1,
      `Top product records units sold (${topProds[0]?.unitsSold}) and revenue (${topProds[0]?.revenue})`
    );

    // Validate daily sales timeline
    const timeline = aData?.salesTimeline || [];
    assert(timeline.length >= 1, 'Sales timeline points recorded for chart rendering');
    assert(timeline[0]?.sales >= 7500, `Timeline sales matches order total (${timeline[0]?.sales})`);

    // Test timeframe filtering: 7d, 30d, 1y
    const analytics7d = await request('/vendor/analytics?timeframe=7d', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(analytics7d.status === 200, 'Analytics supports ?timeframe=7d filter');

    const analytics30d = await request('/vendor/analytics?timeframe=30d', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(analytics30d.status === 200, 'Analytics supports ?timeframe=30d filter');

    // Test endpoint alias: /vendor/overview
    const overviewRes = await request('/vendor/overview', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(overviewRes.status === 200, 'Vendor overview endpoint alias (/vendor/overview) returns 200');

    // Data Isolation on Analytics: Vendor B's revenue must reflect ONLY Store B ($850), never Store A ($7500)
    const analyticsResB = await request('/vendor/analytics?timeframe=all', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(analyticsResB.status === 200, 'Vendor B retrieves analytics telemetry');
    const sumB = analyticsResB.data?.summary;
    assert(
      sumB?.totalRevenue === 850,
      `Store Isolation: Vendor B total revenue is strictly $850 (never contaminated by Vendor A $7500), got: ${sumB?.totalRevenue}`
    );
    assert(
      sumB?.totalUnitsSold === 1,
      `Store Isolation: Vendor B units sold is strictly 1 (got: ${sumB?.totalUnitsSold})`
    );

    // Security: Unapproved Vendor C cannot access analytics
    const unapprovedAnalytics = await request('/vendor/analytics', {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    assert(
      unapprovedAnalytics.status === 403,
      'Security: Pending Vendor C is rejected with 403 Forbidden from accessing analytics telemetry'
    );

    // Security: Unauthenticated request cannot access analytics
    const unauthAnalytics = await request('/vendor/analytics');
    assert(
      unauthAnalytics.status === 401,
      'Security: Unauthenticated request without JWT is rejected with 401 Unauthorized'
    );

    // -------------------------------------------------------------
    // PHASE 6: CATEGORIES ACCESS & RBAC ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- Phase 6: Category Management & Permission Enforcement ---');

    // Vendor retrieves platform categories
    const vendorCatRes = await request('/categories', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(vendorCatRes.status === 200, 'Vendor retrieves active platform categories list');

    // Vendor cannot create platform-wide category without admin role
    const vendorCreateCatRes = await request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'Unauthorized Category',
        description: 'Vendor should not be able to modify platform taxonomy',
      },
    });
    assert(
      vendorCreateCatRes.status === 403,
      'Security: Vendor is forbidden (403) from creating platform-wide categories'
    );

    // -------------------------------------------------------------
    // PHASE 7: REGRESSION VERIFICATION (ADMIN & CUSTOMER)
    // -------------------------------------------------------------
    console.log('\n--- Phase 7: Regression Checks for Admin and Customer ---');

    // Admin can view applications
    const adminAppsRes = await request('/admin/vendors', {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(adminAppsRes.status === 200, 'Admin can view vendor applications dossier');

    // Customer can view public store page
    const publicStoreRes = await request(`/vendor/public/${storeA.slug}`);
    assert(publicStoreRes.status === 200, 'Customer can view verified public atelier storefront');
    assert(
      publicStoreRes.data?.store?.name === 'Atelier Alpha Luxury',
      'Public store contains store name'
    );

    // Customer can view product list
    const customerProdsRes = await request('/products');
    assert(customerProdsRes.status === 200, 'Customer can query public shop catalog');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[Teardown] Cleaning up Task 8 test fixtures...');
    await User.deleteMany({ email: { $regex: /^t8_/ } });
    await Store.deleteMany({ slug: { $regex: /^t8-/ } });
    await Product.deleteMany({ sku: { $regex: /^T8-/ } });
    await Category.deleteMany({ slug: { $regex: /^t8-/ } });
    await Order.deleteMany({ _id: orderId });

    console.log('\n========================================================================');
    console.log(`--- TASK 8 ALL ASSERTIONS PASSED: ${passedTests} / ${totalTests} ---`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\nTask 8 Test Suite failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTask8Tests();
