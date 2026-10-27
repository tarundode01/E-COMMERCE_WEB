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

async function runTask7Tests() {
  console.log('\n=============================================================');
  console.log('--- TASK 7: VENDOR ORDER MANAGEMENT FULL-STACK TEST SUITE ---');
  console.log('=============================================================\n');

  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB for Task 7 test verification.\n');

  try {
    // -------------------------------------------------------------
    // PHASE 0: CLEANUP & SEEDING ENTITIES
    // -------------------------------------------------------------
    console.log('[Setup] Cleaning up previous Task 7 test artifacts...');
    await User.deleteMany({ email: { $regex: /^t7_/ } });
    await Store.deleteMany({ slug: { $regex: /^t7-/ } });
    await Product.deleteMany({ sku: { $regex: /^T7-/ } });
    await Category.deleteMany({ slug: { $regex: /^t7-/ } });

    // 1. Create Category
    const category = await Category.create({
      name: 'Task 7 Luxury Collection',
      slug: `t7-luxury-${Date.now()}`,
      description: 'Test category for multi-vendor order fulfillment',
      status: 'active',
      isActive: true,
    });

    // 2. Create Admin
    const adminUser = await User.create({
      name: 'Task 7 Administrator',
      email: `t7_admin_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543210',
      role: 'admin',
      status: 'active',
      isActive: true,
    });

    // 3. Create Vendor A & Store A
    const vendorA = await User.create({
      name: 'Vendor Atelier A',
      email: `t7_vendor_a_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543211',
      role: 'vendor',
      status: 'active',
      isActive: true,
    });

    const storeA = await Store.create({
      name: 'Maison Vance Atelier A',
      slug: `t7-store-a-${Date.now()}`,
      vendor: vendorA._id,
      description: 'Artisanal Italian leather goods and footwear',
      businessAddress: '12 Via Della Spiga, Milan',
      status: 'approved',
      isOpen: true,
      isPubliclyVisible: true,
    });

    // 4. Create Vendor B & Store B
    const vendorB = await User.create({
      name: 'Vendor Atelier B',
      email: `t7_vendor_b_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543212',
      role: 'vendor',
      status: 'active',
      isActive: true,
    });

    const storeB = await Store.create({
      name: 'Atelier Lugano B',
      slug: `t7-store-b-${Date.now()}`,
      vendor: vendorB._id,
      description: 'Swiss horology and fine bespoke jewelry',
      businessAddress: '48 Rue Du Rhone, Geneva',
      status: 'approved',
      isOpen: true,
      isPubliclyVisible: true,
    });

    // 5. Create Customer
    const customerUser = await User.create({
      name: 'Customer Client T7',
      email: `t7_customer_${Date.now()}@luxury.test`,
      password: 'Password123!',
      mobile: '9876543213',
      role: 'user',
      status: 'active',
      isActive: true,
    });

    // 6. Create Products
    const productA1 = await Product.create({
      name: 'Artisanal Oxford Shoes',
      slug: `t7-shoes-${Date.now()}`,
      sku: `T7-SHOE-${Date.now()}`,
      description: 'Handmade calfskin leather oxford shoes',
      price: 150,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600',
      store: storeA._id,
      vendor: vendorA._id,
      category: category._id,
      status: 'published',
    });

    const productA2 = await Product.create({
      name: 'Venetian Silk Scarf',
      slug: `t7-scarf-${Date.now()}`,
      sku: `T7-SCARF-${Date.now()}`,
      description: 'Pure Venetian mulberry silk scarf',
      price: 250,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&q=80&w=600',
      store: storeA._id,
      vendor: vendorA._id,
      category: category._id,
      status: 'published',
    });

    const productB1 = await Product.create({
      name: 'Chronograph Royal Watch',
      slug: `t7-watch-${Date.now()}`,
      sku: `T7-WATCH-${Date.now()}`,
      description: 'Automatic chronometer watch with sapphire glass',
      price: 300,
      stock: 30,
      image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600',
      store: storeB._id,
      vendor: vendorB._id,
      category: category._id,
      status: 'published',
    });

    // 7. Obtain auth tokens
    const loginAdminRes = await request('/auth/login', {
      method: 'POST',
      body: { email: adminUser.email, password: 'Password123!' },
    });
    const adminToken = loginAdminRes.data.token;

    const loginVendorARes = await request('/auth/login', {
      method: 'POST',
      body: { email: vendorA.email, password: 'Password123!' },
    });
    const vendorAToken = loginVendorARes.data.token;

    const loginVendorBRes = await request('/auth/login', {
      method: 'POST',
      body: { email: vendorB.email, password: 'Password123!' },
    });
    const vendorBToken = loginVendorBRes.data.token;

    const loginCustomerRes = await request('/auth/login', {
      method: 'POST',
      body: { email: customerUser.email, password: 'Password123!' },
    });
    const customerToken = loginCustomerRes.data.token;

    assert(adminToken && vendorAToken && vendorBToken && customerToken, 'All auth tokens successfully acquired');

    // -------------------------------------------------------------
    // PHASE 1: CREATE MULTI-VENDOR REAL ORDERS VIA CUSTOMER CHECKOUT
    // -------------------------------------------------------------
    console.log('\n[Phase 1] Creating orders with real MongoDB stock decrement...');

    // Order 1: Belongs strictly to Store A (Product A1 x 2, Product A2 x 1)
    const order1Payload = {
      products: [
        { productId: productA1._id, quantity: 2, selectedSize: '42' },
        { productId: productA2._id, quantity: 1, selectedSize: 'Standard' },
      ],
      deliveryAddress: {
        fullName: 'Lord Byron Vance',
        mobileNumber: '9876543210',
        email: 'byron@luxury.test',
        address: '77 Piccadilly Mansions',
        city: 'London',
        state: 'Greater London',
        pinCode: 'W1J 7NW',
      },
      paymentMethod: 'Credit Card',
    };

    const createOrder1Res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: order1Payload,
    });

    assert(createOrder1Res.status === 201, 'Customer successfully placed Order 1 (Store A only)');
    const order1 = createOrder1Res.data.order;
    assert(order1.stores.length === 1, 'Order 1 is linked to Store A');

    // Order 2: Multi-vendor order (Product A1 x 1 from Store A, Product B1 x 2 from Store B)
    const order2Payload = {
      products: [
        { productId: productA1._id, quantity: 1, selectedSize: '43' },
        { productId: productB1._id, quantity: 2, selectedSize: 'Standard' },
      ],
      deliveryAddress: {
        fullName: 'Duchess Eleanor Sterling',
        mobileNumber: '9123456789',
        email: 'eleanor@luxury.test',
        address: '10 Place Vendome',
        city: 'Paris',
        state: 'Ile-de-France',
        pinCode: '75001',
      },
      paymentMethod: 'Cash on Delivery',
    };

    const createOrder2Res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: order2Payload,
    });

    assert(createOrder2Res.status === 201, 'Customer successfully placed Order 2 (Multi-vendor: Store A & B)');
    const order2 = createOrder2Res.data.order;
    assert(order2.stores.length === 2, 'Order 2 is correctly associated with both stores');

    // Order 3: Belongs strictly to Store B (Product B1 x 1)
    const order3Payload = {
      products: [{ productId: productB1._id, quantity: 1 }],
      deliveryAddress: {
        fullName: 'Count Alexander Rossi',
        mobileNumber: '9988776655',
        email: 'rossi@luxury.test',
        address: '5 Via Montenapoleone',
        city: 'Milan',
        state: 'Lombardy',
        pinCode: '20121',
      },
      paymentMethod: 'Credit Card',
    };

    const createOrder3Res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: order3Payload,
    });

    assert(createOrder3Res.status === 201, 'Customer successfully placed Order 3 (Store B only)');
    const order3 = createOrder3Res.data.order;

    // Verify stock decrement occurred properly
    const updatedA1 = await Product.findById(productA1._id);
    const updatedB1 = await Product.findById(productB1._id);
    assert(updatedA1.stock === 17, 'Product A1 stock decremented correctly (20 - 2 - 1 = 17)');
    assert(updatedB1.stock === 27, 'Product B1 stock decremented correctly (30 - 2 - 1 = 27)');

    // -------------------------------------------------------------
    // PHASE 2: VENDOR STORE-LEVEL ISOLATION (LISTING & DETAILS)
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Verifying strict store-level order isolation...');

    // Vendor A lists orders
    const vendorAOrdersRes = await request('/vendor/orders', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });

    assert(vendorAOrdersRes.status === 200, 'Vendor A can list their store orders');
    const vendorAOrders = vendorAOrdersRes.data.orders;
    const vendorAOrderIds = vendorAOrders.map((o) => o._id.toString());

    assert(vendorAOrderIds.includes(order1._id.toString()), 'Vendor A sees Order 1 (Store A only)');
    assert(vendorAOrderIds.includes(order2._id.toString()), 'Vendor A sees Order 2 (contains Store A product)');
    assert(!vendorAOrderIds.includes(order3._id.toString()), 'Vendor A CANNOT see Order 3 (Store B only)');

    // Inspect Order 2 from Vendor A's view: must ONLY contain Store A's item
    const order2ForVendorA = vendorAOrders.find((o) => o._id.toString() === order2._id.toString());
    assert(order2ForVendorA.items.length === 1, 'In multi-vendor Order 2, Vendor A receives ONLY 1 item (their own)');
    assert(
      order2ForVendorA.items[0].product.toString() === productA1._id.toString(),
      'Vendor A sees only Product A1 in Order 2'
    );
    assert(order2ForVendorA.vendorSubtotal === 150, 'Vendor A subtotal for Order 2 is strictly $150 (not $750 total)');

    // Vendor B lists orders
    const vendorBOrdersRes = await request('/vendor/orders', {
      headers: { Authorization: `Bearer ${vendorBToken}` },
    });

    assert(vendorBOrdersRes.status === 200, 'Vendor B can list their store orders');
    const vendorBOrders = vendorBOrdersRes.data.orders;
    const vendorBOrderIds = vendorBOrders.map((o) => o._id.toString());

    assert(!vendorBOrderIds.includes(order1._id.toString()), 'Vendor B CANNOT see Order 1 (Store A only)');
    assert(vendorBOrderIds.includes(order2._id.toString()), 'Vendor B sees Order 2 (contains Store B product)');
    assert(vendorBOrderIds.includes(order3._id.toString()), 'Vendor B sees Order 3 (Store B only)');

    // Inspect Order 2 from Vendor B's view: must ONLY contain Store B's item
    const order2ForVendorB = vendorBOrders.find((o) => o._id.toString() === order2._id.toString());
    assert(order2ForVendorB.items.length === 1, 'In multi-vendor Order 2, Vendor B receives ONLY 1 item (their own)');
    assert(
      order2ForVendorB.items[0].product.toString() === productB1._id.toString(),
      'Vendor B sees only Product B1 in Order 2'
    );
    assert(order2ForVendorB.vendorSubtotal === 600, 'Vendor B subtotal for Order 2 is strictly $600 (2 x $300)');

    // -------------------------------------------------------------
    // PHASE 3: CROSS-VENDOR SNOOPING & DIRECT ID PROTECTION
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Testing cross-vendor snooping protections on GET /api/vendor/orders/:id...');

    // Vendor A tries to fetch Order 3 (Store B's order)
    const crossVendorRes = await request(`/vendor/orders/${order3._id}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });

    assert(
      crossVendorRes.status === 403 || crossVendorRes.status === 404,
      'Vendor A is FORBIDDEN from retrieving Vendor B\'s Order 3 by ID (403/404)'
    );

    // Vendor B tries to fetch Order 1 (Store A's order)
    const crossVendorRes2 = await request(`/vendor/orders/${order1._id}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
    });

    assert(
      crossVendorRes2.status === 403 || crossVendorRes2.status === 404,
      'Vendor B is FORBIDDEN from retrieving Vendor A\'s Order 1 by ID (403/404)'
    );

    // Vendor A fetches Order 1 (their own order) -> 200 OK
    const getOwnOrderRes = await request(`/vendor/orders/${order1._id}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(getOwnOrderRes.status === 200, 'Vendor A can retrieve their own Order 1 by ID');
    assert(getOwnOrderRes.data.order.items.length === 2, 'Vendor A Order 1 details contain both store items');
    assert(
      getOwnOrderRes.data.order.deliveryAddress?.city === 'London',
      'Vendor A receives permitted fulfillment delivery city'
    );

    // -------------------------------------------------------------
    // PHASE 4: AUTHENTICATION & ROLE-BASED ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n[Phase 4] Testing authentication and role-based access control...');

    // Unauthenticated access
    const noAuthListRes = await request('/vendor/orders');
    assert(noAuthListRes.status === 401, 'Unauthenticated GET /api/vendor/orders rejected with 401');

    const noAuthUpdateRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      body: { status: 'Confirmed' },
    });
    assert(noAuthUpdateRes.status === 401, 'Unauthenticated PATCH /api/vendor/orders/:id/status rejected with 401');

    // Customer role attempting vendor order endpoints
    const customerVendorRes = await request('/vendor/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerVendorRes.status === 403, 'Customer role accessing /api/vendor/orders rejected with 403');

    const customerUpdateRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { status: 'Confirmed' },
    });
    assert(customerUpdateRes.status === 403, 'Customer role attempting PATCH /api/vendor/orders/:id/status rejected with 403');

    // Vendor attempting admin-only endpoint
    const vendorAdminRes = await request('/admin/orders', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(vendorAdminRes.status === 403, 'Vendor attempting admin-only endpoint /api/admin/orders rejected with 403');

    // -------------------------------------------------------------
    // PHASE 5: VENDOR STATUS TRANSITION STATE MACHINE
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Testing valid and invalid vendor status transitions...');

    // 1. Invalid status name
    const invalidStatusRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'FlyingToMoon' },
    });
    assert(invalidStatusRes.status === 400, 'Invalid status string rejected with 400');

    // 2. Disallowed vendor transition: Vendors CANNOT set 'Delivered'
    const markDeliveredRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Delivered' },
    });
    assert(
      markDeliveredRes.status === 403,
      'Vendor marking order as Delivered is strictly FORBIDDEN with 403 (reserved for delivery/admin)'
    );

    // 3. Disallowed vendor transition: Vendors CANNOT set 'Shipped'
    const markShippedRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Shipped' },
    });
    assert(
      markShippedRes.status === 403,
      'Vendor marking order as Shipped is strictly FORBIDDEN with 403'
    );

    // 4. Invalid skip transition: Pending -> Packed directly
    const skipTransitionRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Packed' },
    });
    assert(skipTransitionRes.status === 400, 'Invalid status transition (Pending -> Packed) rejected with 400');

    // 5. Valid transition: Pending -> Confirmed (Accept Order)
    const acceptOrderRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Confirmed', note: 'Order accepted by master craftsman' },
    });

    assert(acceptOrderRes.status === 200, 'Vendor A successfully confirmed Order 1 (200 OK)');
    assert(acceptOrderRes.data.order.orderStatus === 'Confirmed', 'Order 1 status is now Confirmed');

    // 6. Conflicting/Redundant transition: Confirmed -> Confirmed
    const redundantRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Confirmed' },
    });
    assert(redundantRes.status === 400, 'Repeated update to same status rejected with 400 (already in status)');

    // 7. Valid transition: Confirmed -> Processing
    const processingRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Processing' },
    });
    assert(processingRes.status === 200, 'Vendor A moved Order 1 to Processing');
    assert(processingRes.data.order.orderStatus === 'Processing', 'Order status is now Processing');

    // 8. Valid transition: Processing -> Packed
    const packedRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Packed', note: 'Boxed in signature luxury presentation box' },
    });
    assert(packedRes.status === 200, 'Vendor A moved Order 1 to Packed');
    assert(packedRes.data.order.orderStatus === 'Packed', 'Order status is now Packed');

    // 9. Valid transition: Packed -> Ready for Pickup
    const readyRes = await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Ready for Pickup', note: 'Waiting for DHL Express collection' },
    });
    assert(readyRes.status === 200, 'Vendor A moved Order 1 to Ready for Pickup');
    assert(readyRes.data.order.orderStatus === 'Ready for Pickup', 'Order status is now Ready for Pickup');

    // 10. Audit history integrity check
    const auditOrder = await Order.findById(order1._id);
    assert(auditOrder.statusHistory.length >= 4, 'Status history audit trail records all transitions');
    const lastAudit = auditOrder.statusHistory[auditOrder.statusHistory.length - 1];
    assert(lastAudit.status === 'Ready for Pickup', 'Latest audit entry records Ready for Pickup');
    assert(lastAudit.previousStatus === 'Packed', 'Audit entry captures previousStatus: Packed');
    assert(lastAudit.changedBy.toString() === vendorA._id.toString(), 'Audit entry records vendor user ID');

    // -------------------------------------------------------------
    // PHASE 6: FINANCIAL INTEGRITY & PRICE IMMUTABILITY
    // -------------------------------------------------------------
    console.log('\n[Phase 6] Testing financial tampering protections...');

    // Vendor attempts to mark isPaid: true, override paymentStatus, or change total
    await request(`/vendor/orders/${order1._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: {
        status: 'Ready for Pickup', // Already in status, or attempt tamper
        isPaid: true,
        paymentStatus: 'paid',
        totalAmount: 1,
        itemsPrice: 1,
      },
    });

    const refreshedOrder1 = await Order.findById(order1._id);
    assert(refreshedOrder1.isPaid === false, 'Vendor CANNOT override isPaid to true');
    assert(refreshedOrder1.totalAmount > 500, 'Vendor CANNOT alter order total or item pricing snapshots');

    // -------------------------------------------------------------
    // PHASE 7: REJECTION / CANCELLATION & IDEMPOTENT STOCK RESTOCK
    // -------------------------------------------------------------
    console.log('\n[Phase 7] Testing rejection with reason and idempotent stock restoration...');

    // Check stock of Product A1 prior to rejection of Order 2
    const preRejectA1 = await Product.findById(productA1._id);
    const preStock = preRejectA1.stock; // Should be 17

    // 1. Attempt rejection without required reason
    const rejectNoReasonRes = await request(`/vendor/orders/${order2._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Cancelled' },
    });
    assert(rejectNoReasonRes.status === 400, 'Rejection without reason rejected with 400');

    // 2. Reject Order 2 with required reason
    const rejectSuccessRes = await request(`/vendor/orders/${order2._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Cancelled', reason: 'Atelier leather lot delayed by tannery' },
    });

    assert(rejectSuccessRes.status === 200, 'Vendor A successfully rejected Order 2 with reason');
    assert(rejectSuccessRes.data.order.orderStatus === 'Cancelled', 'Order 2 status is now Cancelled');

    // 3. Verify stock of Product A1 was restored by exactly 1 unit (17 + 1 = 18)
    const postRejectA1 = await Product.findById(productA1._id);
    assert(postRejectA1.stock === preStock + 1, `Product A1 stock was restored exactly once (${preStock} -> ${postRejectA1.stock})`);

    // 4. Verify idempotent stock restoration: retrying rejection or cancel cannot restore stock again
    const postRejectOrder2 = await Order.findById(order2._id);
    const vendorAItemInOrder2 = postRejectOrder2.products.find(
      (it) => it.product.toString() === productA1._id.toString()
    );
    assert(vendorAItemInOrder2.isRestocked === true, 'Vendor item in order marked isRestocked: true');

    // If an action is retried on cancelled order:
    const retryCancelRes = await request(`/vendor/orders/${order2._id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'Cancelled', reason: 'Retry attempt' },
    });
    assert(retryCancelRes.status === 400, 'Retry on already cancelled order rejected with 400');

    const stockAfterRetry = (await Product.findById(productA1._id)).stock;
    assert(stockAfterRetry === postRejectA1.stock, 'Stock is NOT restored again on repeated attempts (idempotency preserved)');

    // -------------------------------------------------------------
    // PHASE 8: CUSTOMER ORDER SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n[Phase 8] Testing customer order synchronization...');

    // Customer fetches their order history
    const customerOrdersRes = await request('/orders/my-orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerOrdersRes.status === 200, 'Customer successfully retrieved their orders');

    const customerOrder1 = customerOrdersRes.data.orders.find(
      (o) => o._id.toString() === order1._id.toString()
    );
    assert(
      customerOrder1.orderStatus === 'Ready for Pickup',
      'Customer sees updated fulfillment status "Ready for Pickup" for Order 1'
    );

    const customerOrder2 = customerOrdersRes.data.orders.find(
      (o) => o._id.toString() === order2._id.toString()
    );
    assert(
      customerOrder2.orderStatus === 'Cancelled',
      'Customer sees updated status "Cancelled" for Order 2'
    );

    // -------------------------------------------------------------
    // PHASE 9: SEARCH, FILTERS & SERVER-SIDE PAGINATION
    // -------------------------------------------------------------
    console.log('\n[Phase 9] Testing search, status filter, and pagination queries...');

    // 1. Status Filter: Ready for Pickup
    const filterReadyRes = await request('/vendor/orders?status=Ready for Pickup', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(filterReadyRes.status === 200, 'Vendor A can filter by status "Ready for Pickup"');
    assert(filterReadyRes.data.orders.length === 1, 'Filter returns exactly 1 order (Order 1)');
    assert(filterReadyRes.data.orders[0]._id.toString() === order1._id.toString(), 'Returned order is Order 1');

    // 2. Status Filter: Cancelled
    const filterCancelledRes = await request('/vendor/orders?status=Cancelled', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(filterCancelledRes.status === 200, 'Vendor A can filter by status "Cancelled"');
    assert(filterCancelledRes.data.orders.length === 1, 'Filter returns exactly 1 order (Order 2)');

    // 3. Search Filter by Order ID
    const searchIdRes = await request(`/vendor/orders?search=${order1._id}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(searchIdRes.data.orders.length === 1, 'Search by Order ID returns target order');

    // 4. Search Filter by Customer Name (Lord Byron)
    const searchNameRes = await request('/vendor/orders?search=Byron', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(searchNameRes.data.orders.length === 1, 'Search by customer name "Byron" returns Order 1');

    // 5. Pagination
    const page1Res = await request('/vendor/orders?page=1&limit=1', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(page1Res.data.orders.length === 1, 'Pagination returns limit of 1 order per page');
    assert(page1Res.data.currentPage === 1, 'Page metadata shows currentPage: 1');
    assert(page1Res.data.totalPages >= 2, 'Page metadata shows totalPages >= 2');
    assert(page1Res.data.summary.total === 2, 'Summary KPI card shows total: 2 store orders');

    console.log('\n=============================================================');
    console.log(`--- TASK 7 TEST SUITE RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED ---`);
    console.log('=============================================================\n');
  } finally {
    // Clean up test data
    console.log('[Cleanup] Cleaning up test users and orders...');
    await User.deleteMany({ email: { $regex: /^t7_/ } });
    await Store.deleteMany({ slug: { $regex: /^t7-/ } });
    await Product.deleteMany({ sku: { $regex: /^T7-/ } });
    await Category.deleteMany({ slug: { $regex: /^t7-/ } });
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected from MongoDB.');
  }
}

runTask7Tests().catch((err) => {
  console.error('\nTask 7 Test Suite Failed with Error:\n', err);
  process.exit(1);
});
