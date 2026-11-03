const BASE_URL = 'http://localhost:5000/api';

const results = [];
function testAssert(condition, testName, details = '') {
  if (condition) {
    results.push({ name: testName, status: 'PASS', details });
    console.log(`[PASS] ${testName}`);
  } else {
    results.push({ name: testName, status: 'FAIL', details });
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('STARTING MULTI-USER CONCURRENCY & SAAS SECURITY TESTS');
  console.log('=====================================================\n');

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // 0. Register Admin First to Approve Vendors
    // -------------------------------------------------------------------------
    const adminEmail = `admin_${timestamp}@luxury.com`;
    const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Platform Master Admin',
        email: adminEmail,
        mobile: '9876543999',
        password: 'password123',
        role: 'admin',
        adminSecret: 'luxury_admin_2026',
      }),
    });
    const adminRegData = await adminRegRes.json();
    const adminToken = adminRegData.token;
    testAssert(adminRegRes.status === 201 && adminToken, '0.1 Platform Master Admin Registered and Authenticated');

    // -------------------------------------------------------------------------
    // TEST 1: Register Two Distinct Customer Accounts (User 1 & User 2)
    // -------------------------------------------------------------------------
    const user1Email = `user1_${timestamp}@luxurystore.test`;
    const user2Email = `user2_${timestamp}@luxurystore.test`;

    const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User 1 Buyer',
        email: user1Email,
        mobile: '9876543210',
        password: 'password123',
      }),
    });
    const reg1Data = await reg1Res.json();
    testAssert(reg1Res.status === 201 && reg1Data.token, '1.1 Customer 1 Registered with Separate Account');

    const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User 2 Buyer',
        email: user2Email,
        mobile: '9876543211',
        password: 'password123',
      }),
    });
    const reg2Data = await reg2Res.json();
    testAssert(reg2Res.status === 201 && reg2Data.token, '1.2 Customer 2 Registered with Separate Account');

    const user1Token = reg1Data.token;
    const user2Token = reg2Data.token;
    const user1Id = reg1Data.user.id;
    const user2Id = reg2Data.user.id;
    testAssert(user1Id !== user2Id, '1.3 User 1 and User 2 Have Unique Identity IDs');

    // -------------------------------------------------------------------------
    // Register Vendor 1 & Store A, and Vendor 2 & Store B
    // -------------------------------------------------------------------------
    const vendor1Email = `vendor1_${timestamp}@luxurystore.test`;
    const vendor2Email = `vendor2_${timestamp}@luxurystore.test`;

    const v1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vendor One',
        email: vendor1Email,
        mobile: '9876543220',
        password: 'password123',
        role: 'vendor',
        storeName: `Atelier Alpha ${timestamp}`,
        storeDescription: 'Premier Horology and Jewels',
        businessAddress: '101 Boulevard Alpha',
      }),
    });
    const v1Data = await v1Res.json();
    const vendor1Token = v1Data.token;
    const store1Id = v1Data.store?.id || v1Data.store?._id;

    const v2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vendor Two',
        email: vendor2Email,
        mobile: '9876543221',
        password: 'password123',
        role: 'vendor',
        storeName: `Atelier Beta ${timestamp}`,
        storeDescription: 'Fine Optical and Leather Atelier',
        businessAddress: '202 Boulevard Beta',
      }),
    });
    const v2Data = await v2Res.json();
    const vendor2Token = v2Data.token;
    const store2Id = v2Data.store?.id || v2Data.store?._id;

    // Master Admin approves Store 1 and Store 2
    const app1Res = await fetch(`${BASE_URL}/admin/vendors/${store1Id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'approved' }),
    });
    const app2Res = await fetch(`${BASE_URL}/admin/vendors/${store2Id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'approved' }),
    });
    testAssert(app1Res.status === 200 && app2Res.status === 200, '1.4 Admin Successfully Approved Vendor 1 and Vendor 2 Stores');

    // -------------------------------------------------------------------------
    // Create Product in Store 1 with 100 Initial Stock (Price: $20)
    // -------------------------------------------------------------------------
    const prodRes = await fetch(`${BASE_URL}/vendor/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendor1Token}` },
      body: JSON.stringify({
        name: `Chronograph Luxury ${timestamp}`,
        description: 'Handcrafted Swiss automatic movement timepiece with sapphire crystal.',
        price: 20,
        category: 'Luxury Horology',
        stock: 100, // Stock sufficient for 14 + 25 = 39 purchases
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      }),
    });
    const prodData = await prodRes.json();
    const productId = prodData.product ? (prodData.product._id || prodData.product.id) : null;
    testAssert(prodRes.status === 201 && productId, '1.5 Vendor 1 Created Product with 100 Initial Stock');

    // -------------------------------------------------------------------------
    // TEST 2: Concurrent Purchases: User 1 Buys 14 Items & User 2 Buys 25 Items
    // -------------------------------------------------------------------------
    console.log('\n--- Simulating Concurrent Purchases: User 1 (14 items) & User 2 (25 items) ---');
    const user1Address = {
      fullName: 'User 1 Buyer',
      mobileNumber: '9876543210',
      email: user1Email,
      address: 'Suite 14, Royal Crescent',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pinCode: '452001',
      country: 'India',
    };
    const user2Address = {
      fullName: 'User 2 Buyer',
      mobileNumber: '9876543211',
      email: user2Email,
      address: 'Penthouse 25, Imperial Heights',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      pinCode: '462001',
      country: 'India',
    };

    const idempotencyUser1 = `order_u1_${timestamp}`;
    const idempotencyUser2 = `order_u2_${timestamp}`;

    const [order1Res, order2Res] = await Promise.all([
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
          'idempotency-key': idempotencyUser1,
        },
        body: JSON.stringify({
          orderItems: [{ product: productId, quantity: 14 }],
          deliveryAddress: user1Address,
          paymentMethod: 'cod',
        }),
      }),
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`,
          'idempotency-key': idempotencyUser2,
        },
        body: JSON.stringify({
          orderItems: [{ product: productId, quantity: 25 }],
          deliveryAddress: user2Address,
          paymentMethod: 'cod',
        }),
      }),
    ]);

    const order1Data = await order1Res.json();
    const order2Data = await order2Res.json();

    const order1 = order1Data.order;
    const order2 = order2Data.order;

    testAssert(
      order1Res.status === 201 && order1 && (order1.products?.[0]?.quantity === 14 || order1.orderItems?.[0]?.quantity === 14),
      '2.1 User 1 Successfully Purchased 14 Items in a Single Order',
      `Status: ${order1Res.status}, Message: ${order1Data.message}`
    );

    testAssert(
      order2Res.status === 201 && order2 && (order2.products?.[0]?.quantity === 25 || order2.orderItems?.[0]?.quantity === 25),
      '2.2 User 2 Successfully Purchased 25 Items in a Single Order',
      `Status: ${order2Res.status}, Message: ${order2Data.message}`
    );

    testAssert(
      order1 && order2 && (order1.customer?._id || order1.customer) !== (order2.customer?._id || order2.customer),
      '2.3 Orders are Explicitly Associated with Distinct Customer IDs'
    );

    // Verify Remaining Stock in MongoDB (100 - 14 - 25 = 61)
    const stockCheckRes = await fetch(`${BASE_URL}/products/${productId}`);
    const stockCheckData = await stockCheckRes.json();
    const updatedStock = stockCheckData.product?.stock;
    testAssert(
      updatedStock === 61,
      '2.4 MongoDB Atomic Decrement: Stock Perfectly Reduced from 100 to 61',
      `Actual Stock: ${updatedStock}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: IDOR Security Protection (Customer A cannot access Customer B's records)
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Customer IDOR Protection ---');
    const order1Id = order1?._id || order1?.id;
    const order2Id = order2?._id || order2?.id;

    // User 1 tries to access User 2's Order by changing ID in URL
    const idorOrderRes = await fetch(`${BASE_URL}/orders/${order2Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    testAssert(
      idorOrderRes.status === 403 || idorOrderRes.status === 404,
      '3.1 IDOR Prevented: User 1 CANNOT Read User 2 Order Details (403 Forbidden)',
      `Returned HTTP ${idorOrderRes.status}`
    );

    // User 1 tries to access User 2's Order Tracking & OTP
    const idorTrackRes = await fetch(`${BASE_URL}/orders/${order2Id}/track`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    testAssert(
      idorTrackRes.status === 403 || idorTrackRes.status === 404,
      '3.2 IDOR Prevented: User 1 CANNOT Access User 2 Live Tracking / OTP (403 Forbidden)',
      `Returned HTTP ${idorTrackRes.status}`
    );

    // User 2 verifies they CAN read their OWN tracking screen
    const validTrackRes = await fetch(`${BASE_URL}/orders/${order2Id}/track`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    testAssert(
      validTrackRes.status === 200,
      '3.3 Legitimate Access: User 2 CAN Track Their Own Order',
      `Returned HTTP ${validTrackRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: SaaS Multi-Vendor Tenant Isolation (Vendor A cannot access Vendor B)
    // -------------------------------------------------------------------------
    console.log('\n--- Testing SaaS Multi-Vendor Store Isolation ---');
    // Vendor 2 attempts to fetch Vendor 1's Order via Vendor Portal
    const vendorCrossRes = await fetch(`${BASE_URL}/vendor/orders/${order1Id}`, {
      headers: { Authorization: `Bearer ${vendor2Token}` },
    });
    testAssert(
      vendorCrossRes.status === 403 || vendorCrossRes.status === 404,
      '4.1 Multi-Vendor Isolation: Vendor 2 CANNOT Access Vendor 1 Store Orders (403/404)',
      `Returned HTTP ${vendorCrossRes.status}`
    );

    // Vendor 1 creates a delivery agent
    const riderEmail = `rider_${timestamp}@luxurystore.test`;
    const createRiderRes = await fetch(`${BASE_URL}/vendor/delivery-boys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendor1Token}` },
      body: JSON.stringify({
        name: 'Rider Arjun',
        email: riderEmail,
        phone: '9876543300',
        password: 'password123',
        vehicleType: 'Motorcycle',
        vehicleNumber: 'MP09-EX-1234',
      }),
    });
    const createRiderData = await createRiderRes.json();
    const riderId = createRiderData.deliveryBoy?._id || createRiderData.deliveryBoy?.id;
    testAssert(createRiderRes.status === 201 && riderId, '4.2 Vendor 1 Registered Dedicated Delivery Agent');

    // Vendor 2 tries to view Vendor 1's delivery boys
    const vendor2FleetRes = await fetch(`${BASE_URL}/vendor/delivery-boys`, {
      headers: { Authorization: `Bearer ${vendor2Token}` },
    });
    const vendor2FleetData = await vendor2FleetRes.json();
    const leakedBoys = (vendor2FleetData.deliveryBoys || []).filter((b) => (b._id || b.id) === riderId);
    testAssert(
      leakedBoys.length === 0,
      '4.3 Multi-Vendor Fleet Isolation: Vendor 2 Sees Zero Delivery Agents From Vendor 1'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Delivery Boy Security & Assignment Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Delivery Boy Role & Assignment Authorization ---');
    // Log in as rider
    const riderLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: riderEmail,
        password: 'password123',
      }),
    });
    const riderLoginData = await riderLoginRes.json();
    const riderToken = riderLoginData.token;
    testAssert(riderLoginRes.status === 200 && riderToken, '5.1 Delivery Agent Logged In Successfully');

    // Unassigned Rider attempts to mark Order 1 as Picked Up before assignment
    const unassignedPickupRes = await fetch(`${BASE_URL}/vendor/delivery-boys/pickup-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${riderToken}` },
      body: JSON.stringify({ orderId: order1Id }),
    });
    testAssert(
      unassignedPickupRes.status === 403,
      '5.2 Delivery Authorization: Unassigned Rider CANNOT Alter Order Status (403 Forbidden)',
      `Status: ${unassignedPickupRes.status}`
    );

    // Vendor 1 assigns Order 1 to Rider
    const assignRes = await fetch(`${BASE_URL}/vendor/delivery-boys/assign-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendor1Token}` },
      body: JSON.stringify({ orderId: order1Id, deliveryBoyId: riderId }),
    });
    testAssert(assignRes.status === 200, '5.3 Store Vendor Successfully Assigned Order 1 to Rider');

    // Now assigned Rider marks Order 1 as Picked Up
    const authorizedPickupRes = await fetch(`${BASE_URL}/vendor/delivery-boys/pickup-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${riderToken}` },
      body: JSON.stringify({ orderId: order1Id }),
    });
    testAssert(authorizedPickupRes.status === 200, '5.4 Assigned Rider Can Legally Pick Up Assigned Order');

    // -------------------------------------------------------------------------
    // TEST 6: Admin Role Privilege Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Admin Role Enforcement ---');
    // Customer (User 1) tries to access Admin Orders
    const adminOrdersRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    testAssert(
      adminOrdersRes.status === 403,
      '6.1 Customer Denied Access to Admin Orders (403 Forbidden)',
      `Status: ${adminOrdersRes.status}`
    );

    // Customer (User 1) tries to access Admin Vendors Review
    const adminVendorsRes = await fetch(`${BASE_URL}/admin/vendors`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    testAssert(
      adminVendorsRes.status === 403,
      '6.2 Customer Denied Access to Admin Vendors (403 Forbidden)',
      `Status: ${adminVendorsRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Concurrent Purchases: Oversell & Inventory Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Concurrent Race Condition / Overselling Protection ---');
    // Create product with only 5 units of stock (Price: $50)
    const scarceProdRes = await fetch(`${BASE_URL}/vendor/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendor1Token}` },
      body: JSON.stringify({
        name: `Limited Sapphire Ring ${timestamp}`,
        description: 'Rare gemstone ring with only 5 units in existence.',
        price: 50,
        category: 'Luxury Horology',
        stock: 5,
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
      }),
    });
    const scarceProdData = await scarceProdRes.json();
    const scarceId = scarceProdData.product ? (scarceProdData.product._id || scarceProdData.product.id) : null;

    // Both User 1 and User 2 try to purchase 4 units AT THE SAME INSTANT
    // (Total requested: 8 units, but only 5 in stock. Exactly one should succeed, one must fail)
    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({
          orderItems: [{ product: scarceId, quantity: 4 }],
          deliveryAddress: user1Address,
          paymentMethod: 'cod',
        }),
      }),
      fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
        body: JSON.stringify({
          orderItems: [{ product: scarceId, quantity: 4 }],
          deliveryAddress: user2Address,
          paymentMethod: 'cod',
        }),
      }),
    ]);

    const raceSuccessCount = (raceRes1.status === 201 ? 1 : 0) + (raceRes2.status === 201 ? 1 : 0);
    const raceFailCount = ([400, 409].includes(raceRes1.status) ? 1 : 0) + ([400, 409].includes(raceRes2.status) ? 1 : 0);

    testAssert(
      raceSuccessCount === 1 && raceFailCount === 1,
      '7.1 Race Condition Protected: Exactly 1 Order Succeeded, 1 Rejected Due to Insufficient Stock',
      `Success: ${raceSuccessCount}, Failed: ${raceFailCount}`
    );

    const scarceStockRes = await fetch(`${BASE_URL}/products/${scarceId}`);
    const scarceStockData = await scarceStockRes.json();
    const remainingStock = scarceStockData.product?.stock;
    testAssert(
      remainingStock === 1,
      '7.2 Stock Never Went Negative (5 - 4 = 1 Remaining Stock in MongoDB)',
      `Remaining Stock: ${remainingStock}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Order Idempotency (Prevent Duplicate Order on Repeated Submission)
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Checkout Idempotency ---');
    const repeatIdempotencyKey = `idem_repeat_${timestamp}`;
    const firstOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
        'idempotency-key': repeatIdempotencyKey,
      },
      body: JSON.stringify({
        orderItems: [{ product: productId, quantity: 1 }],
        deliveryAddress: user1Address,
        paymentMethod: 'cod',
      }),
    });
    const firstOrderData = await firstOrderRes.json();
    const firstId = firstOrderData.order?._id || firstOrderData.order?.id;

    // Send identical request again with same idempotency key
    const secondOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
        'idempotency-key': repeatIdempotencyKey,
      },
      body: JSON.stringify({
        orderItems: [{ product: productId, quantity: 1 }],
        deliveryAddress: user1Address,
        paymentMethod: 'cod',
      }),
    });
    const secondOrderData = await secondOrderRes.json();
    const secondId = secondOrderData.order?._id || secondOrderData.order?.id;

    testAssert(
      firstId && secondId && firstId.toString() === secondId.toString(),
      '8.1 Idempotency Enforced: Repeated Request Returned Existing Order Without Duplication'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Order Cancellation & Safe Inventory Restock Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Cancellation & Inventory Restock Protection ---');
    // Check stock before cancellation
    const preCancelStockRes = await fetch(`${BASE_URL}/products/${productId}`);
    const preCancelStockData = await preCancelStockRes.json();
    const preCancelStock = preCancelStockData.product?.stock;

    // Cancel firstOrder (quantity was 1)
    const cancel1Res = await fetch(`${BASE_URL}/orders/${firstId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ reason: 'Changed my mind' }),
    });
    testAssert(cancel1Res.status === 200, '9.1 Customer Successfully Cancelled Order');

    const postCancelStockRes = await fetch(`${BASE_URL}/products/${productId}`);
    const postCancelStockData = await postCancelStockRes.json();
    const postCancelStock = postCancelStockData.product?.stock;
    testAssert(
      postCancelStock === preCancelStock + 1,
      '9.2 Inventory Accurately Restored After First Cancellation (+1 unit)'
    );

    // Attempt second cancellation on already cancelled order
    const cancel2Res = await fetch(`${BASE_URL}/orders/${firstId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({ reason: 'Try cancelling again' }),
    });

    const postDoubleCancelStockRes = await fetch(`${BASE_URL}/products/${productId}`);
    const postDoubleCancelStockData = await postDoubleCancelStockRes.json();
    testAssert(
      postDoubleCancelStockData.product?.stock === postCancelStock,
      '9.3 Double Restock Prevented: Inventory Not Restored Twice'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Customer Orders List Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Customer Orders List Isolation ---');
    const u1OrdersRes = await fetch(`${BASE_URL}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const u1OrdersData = await u1OrdersRes.json();
    const u1List = u1OrdersData.orders || [];

    const hasUser2Order = u1List.some((o) => (o._id || o.id) === order2Id);
    testAssert(!hasUser2Order, '10.1 User 1 Orders List Contains ZERO Orders From User 2');

    const allOwnedByUser1 = u1List.every(
      (o) => (o.customer?._id || o.customer?.id || o.customer) === user1Id
    );
    testAssert(allOwnedByUser1, '10.2 All Orders in User 1 List Belong Exclusively to User 1');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n=====================================================');
    console.log('TEST SUMMARY RESULTS');
    console.log('=====================================================');
    const total = results.length;
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`TOTAL TESTS: ${total}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);

    if (failed === 0) {
      console.log('\nALL 20+ CONCURRENCY & MULTI-USER SECURITY REQUIREMENTS VERIFIED AND PASSED!');
    } else {
      console.error('\nSOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
    }
  } catch (err) {
    console.error('Unexpected error running integration test suite:', err);
  } finally {
    try {
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState === 0) {
        await mongoose.default.connect('mongodb://127.0.0.1:27017/premium-ecommerce');
      }
      const db = mongoose.default.connection.db;
      await db.collection('products').deleteMany({ name: new RegExp(timestamp) });
      await db.collection('stores').deleteMany({ name: new RegExp(timestamp) });
      await db.collection('users').deleteMany({ email: new RegExp(timestamp) });
      await db.collection('orders').deleteMany({ 'deliveryAddress.address': new RegExp(timestamp) });
      await db.collection('deliveryboys').deleteMany({ name: new RegExp(timestamp) });
      console.log('[CLEANUP] Automated test database artifacts cleaned up successfully.');
      await mongoose.default.disconnect();
    } catch (cleanErr) {
      // Ignore cleanup errors
    }
  }
}

runTests();
