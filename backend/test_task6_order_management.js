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

async function runTask6Tests() {
  console.log('\n=============================================================');
  console.log('--- TASK 6: CART, CHECKOUT & ORDER CREATION TEST SUITE ---');
  console.log('=============================================================\n');

  await mongoose.connect(DB_URI);
  console.log('MongoDB connection established for test setup & assertions.');

  try {
    // -------------------------------------------------------------
    // SETUP: Users, Stores, Categories & Products for Test Scenario
    // -------------------------------------------------------------
    console.log('\n[PHASE 0] Test Environment & Fixture Setup...');

    // 1. Customer User 1 (Alice)
    let customer1 = await User.findOne({ email: 'alice_task6@luxury.com' });
    if (!customer1) {
      customer1 = await User.create({
        name: 'Alice Sterling',
        email: 'alice_task6@luxury.com',
        password: 'Password123!',
        role: 'user',
        mobile: '9876543211',
      });
    }

    // 2. Customer User 2 (Bob - for cross-customer isolation testing)
    let customer2 = await User.findOne({ email: 'bob_task6@luxury.com' });
    if (!customer2) {
      customer2 = await User.create({
        name: 'Bob Vanderbilt',
        email: 'bob_task6@luxury.com',
        password: 'Password123!',
        role: 'user',
        mobile: '9876543212',
      });
    }

    // 3. Vendor User & Approved Store (Vendor 1)
    let vendor1 = await User.findOne({ email: 'vendor1_task6@luxury.com' });
    if (!vendor1) {
      vendor1 = await User.create({
        name: 'Vendor One Horology',
        email: 'vendor1_task6@luxury.com',
        password: 'Password123!',
        role: 'vendor',
        mobile: '9876543213',
      });
    }

    let store1 = await Store.findOne({ vendor: vendor1._id });
    if (!store1) {
      store1 = await Store.create({
        vendor: vendor1._id,
        name: 'Maison Geneve Horology',
        slug: 'maison-geneve-horology',
        description: 'Artisanal Swiss luxury timepieces and bespoke horological creations.',
        businessAddress: '12 Rue du Rhone, Geneva, Switzerland',
        status: 'approved',
        isOpen: true,
        isPubliclyVisible: true,
      });
    } else {
      store1.status = 'approved';
      store1.isOpen = true;
      store1.isPubliclyVisible = true;
      await store1.save();
    }

    // 4. Vendor User & Approved Store (Vendor 2 - for multi-vendor cart testing)
    let vendor2 = await User.findOne({ email: 'vendor2_task6@luxury.com' });
    if (!vendor2) {
      vendor2 = await User.create({
        name: 'Vendor Two Leathercraft',
        email: 'vendor2_task6@luxury.com',
        password: 'Password123!',
        role: 'vendor',
        mobile: '9876543214',
      });
    }

    let store2 = await Store.findOne({ vendor: vendor2._id });
    if (!store2) {
      store2 = await Store.create({
        vendor: vendor2._id,
        name: 'Atelier Firenze Leather',
        slug: 'atelier-firenze-leather',
        description: 'Handcrafted full-grain Italian leather bags and luggage.',
        businessAddress: '45 Via de Tornabuoni, Florence, Italy',
        status: 'approved',
        isOpen: true,
        isPubliclyVisible: true,
      });
    } else {
      store2.status = 'approved';
      store2.isOpen = true;
      store2.isPubliclyVisible = true;
      await store2.save();
    }

    // 5. Vendor User with INACTIVE / SUSPENDED Store
    let vendorInactive = await User.findOne({ email: 'vendor_inactive_task6@luxury.com' });
    if (!vendorInactive) {
      vendorInactive = await User.create({
        name: 'Vendor Inactive',
        email: 'vendor_inactive_task6@luxury.com',
        password: 'Password123!',
        role: 'vendor',
        mobile: '9876543215',
      });
    }

    let storeInactive = await Store.findOne({ vendor: vendorInactive._id });
    if (!storeInactive) {
      storeInactive = await Store.create({
        vendor: vendorInactive._id,
        name: 'Suspended Antiquities',
        slug: 'suspended-antiquities',
        description: 'Currently suspended boutique for non-compliance.',
        businessAddress: 'Unknown Alley, Nowhere',
        status: 'suspended',
        isOpen: false,
        isPubliclyVisible: false,
      });
    } else {
      storeInactive.status = 'suspended';
      storeInactive.isOpen = false;
      storeInactive.isPubliclyVisible = false;
      await storeInactive.save();
    }

    // 6. Test Products
    // Product 1: In stock, published, Store 1 ($1,200)
    let prod1 = await Product.findOne({ sku: 'TASK6-WATCH-01' });
    if (!prod1) {
      prod1 = await Product.create({
        name: 'Chronograph Tourbillon Elite',
        category: 'Watches',
        price: 1200,
        originalPrice: 1500,
        description: 'Exquisite 18k rose gold chronometer with flying tourbillon movement.',
        stock: 5,
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
        store: store1._id,
        vendor: vendor1._id,
        sku: 'TASK6-WATCH-01',
        slug: 'chronograph-tourbillon-elite',
        status: 'published',
      });
    } else {
      prod1.price = 1200;
      prod1.stock = 5;
      prod1.status = 'published';
      prod1.store = store1._id;
      prod1.vendor = vendor1._id;
      await prod1.save();
    }

    // Product 2: In stock, published, Store 2 ($450)
    let prod2 = await Product.findOne({ sku: 'TASK6-BAG-02' });
    if (!prod2) {
      prod2 = await Product.create({
        name: 'Florentine Leather Duffle',
        category: 'Bags',
        price: 450,
        originalPrice: 550,
        description: 'Vegetable-tanned calfskin weekender with brass hardware.',
        stock: 8,
        image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800',
        store: store2._id,
        vendor: vendor2._id,
        sku: 'TASK6-BAG-02',
        slug: 'florentine-leather-duffle',
        status: 'published',
      });
    } else {
      prod2.price = 450;
      prod2.stock = 8;
      prod2.status = 'published';
      prod2.store = store2._id;
      prod2.vendor = vendor2._id;
      await prod2.save();
    }

    // Product 3: Out of stock (stock: 0), published, Store 1 ($800)
    let prodOutOfStock = await Product.findOne({ sku: 'TASK6-OOS-03' });
    if (!prodOutOfStock) {
      prodOutOfStock = await Product.create({
        name: 'Perpetual Calendar Solitaire',
        category: 'Watches',
        price: 800,
        description: 'Rare limited edition solitaire timepiece.',
        stock: 0,
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
        store: store1._id,
        vendor: vendor1._id,
        sku: 'TASK6-OOS-03',
        slug: 'perpetual-calendar-solitaire',
        status: 'published',
      });
    } else {
      prodOutOfStock.stock = 0;
      prodOutOfStock.status = 'published';
      await prodOutOfStock.save();
    }

    // Product 4: Unpublished product (status: 'draft')
    let prodUnpublished = await Product.findOne({ sku: 'TASK6-DRAFT-04' });
    if (!prodUnpublished) {
      prodUnpublished = await Product.create({
        name: 'Concept Prototype Chrono',
        category: 'Watches',
        price: 2500,
        description: 'Unreleased concept prototype.',
        stock: 3,
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
        store: store1._id,
        vendor: vendor1._id,
        sku: 'TASK6-DRAFT-04',
        slug: 'concept-prototype-chrono',
        status: 'draft',
      });
    } else {
      prodUnpublished.status = 'draft';
      prodUnpublished.stock = 3;
      await prodUnpublished.save();
    }

    // Product 5: Product in suspended store
    let prodInactiveStore = await Product.findOne({ sku: 'TASK6-INACT-05' });
    if (!prodInactiveStore) {
      prodInactiveStore = await Product.create({
        name: 'Banned Relic Item',
        category: 'Antiquities',
        price: 999,
        description: 'Item from a suspended vendor store.',
        stock: 10,
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
        store: storeInactive._id,
        vendor: vendorInactive._id,
        sku: 'TASK6-INACT-05',
        slug: 'banned-relic-item',
        status: 'published',
      });
    } else {
      prodInactiveStore.store = storeInactive._id;
      prodInactiveStore.status = 'published';
      prodInactiveStore.stock = 10;
      await prodInactiveStore.save();
    }

    // Product 6: High-value piece for COD limit test ($3,500)
    let prodHighValue = await Product.findOne({ sku: 'TASK6-HIGHVAL-06' });
    if (!prodHighValue) {
      prodHighValue = await Product.create({
        name: 'Bespoke Haute Horlogerie Piece',
        category: 'Watches',
        price: 3500,
        description: 'Museum grade bespoke horological art.',
        stock: 2,
        image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
        store: store1._id,
        vendor: vendor1._id,
        sku: 'TASK6-HIGHVAL-06',
        slug: 'bespoke-haute-horlogerie-piece',
        status: 'published',
      });
    } else {
      prodHighValue.price = 3500;
      prodHighValue.stock = 2;
      prodHighValue.status = 'published';
      await prodHighValue.save();
    }

    // Authenticate Customer 1
    const login1 = await request('/auth/login', {
      method: 'POST',
      body: { email: 'alice_task6@luxury.com', password: 'Password123!' },
    });
    const token1 = login1.data.token;
    const authHeaders1 = { Authorization: `Bearer ${token1}` };

    // Authenticate Customer 2
    const login2 = await request('/auth/login', {
      method: 'POST',
      body: { email: 'bob_task6@luxury.com', password: 'Password123!' },
    });
    const token2 = login2.data.token;
    const authHeaders2 = { Authorization: `Bearer ${token2}` };

    // Authenticate Vendor 1
    const loginVendor1 = await request('/auth/login', {
      method: 'POST',
      body: { email: 'vendor1_task6@luxury.com', password: 'Password123!' },
    });
    const tokenVendor1 = loginVendor1.data.token;
    const authHeadersVendor1 = { Authorization: `Bearer ${tokenVendor1}` };

    console.log('Test fixtures, users, stores, and tokens ready.');

    // -------------------------------------------------------------
    // PHASE 1: CART REVALIDATION & PRICE AUTHORITY
    // -------------------------------------------------------------
    console.log('\n[PHASE 1] Testing Server Cart Revalidation (POST /api/orders/validate-cart)...');

    // 1.1 Valid cart with published, in-stock products
    const valRes1 = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [
          { productId: prod1._id.toString(), quantity: 2, selectedSize: '42mm' },
          { productId: prod2._id.toString(), quantity: 1, selectedSize: 'Standard' },
        ],
      },
    });
    assert(valRes1.status === 200, 'POST /api/orders/validate-cart returns 200 OK');
    assert(valRes1.data.isValid === true, 'Valid items return isValid: true');
    assert(valRes1.data.subtotal === 1200 * 2 + 450, 'Server subtotal matches trusted product prices (2400 + 450 = 2850)');
    assert(valRes1.data.isFreeShipping === true, 'Orders >= $500 qualify for free shipping');
    assert(valRes1.data.shippingFee === 0, 'Shipping fee is $0 on free shipping order');
    assert(valRes1.data.taxPrice === Math.round(2850 * 0.08 * 100) / 100, 'Tax price accurately computed at 8% server-side');

    // 1.2 Cart with out-of-stock item
    const valResOOS = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [
          { productId: prod1._id.toString(), quantity: 1 },
          { productId: prodOutOfStock._id.toString(), quantity: 1 },
        ],
      },
    });
    assert(valResOOS.data.isValid === false, 'Cart with out-of-stock item returns isValid: false');
    const oosItem = valResOOS.data.items.find((i) => i.productId === prodOutOfStock._id.toString());
    assert(oosItem && oosItem.issue === 'out_of_stock', 'Out of stock item flagged with issue: out_of_stock');
    assert(oosItem && oosItem.available === false, 'Out of stock item marked available: false');

    // 1.3 Cart with insufficient stock (requested 10, only 5 available)
    const valResInsuff = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [{ productId: prod1._id.toString(), quantity: 10 }],
      },
    });
    assert(valResInsuff.data.isValid === false, 'Cart with insufficient stock returns isValid: false');
    const insuffItem = valResInsuff.data.items.find((i) => i.productId === prod1._id.toString());
    assert(insuffItem && insuffItem.issue === 'insufficient_stock', 'Insufficient stock item flagged with issue: insufficient_stock');
    assert(insuffItem.availableQuantity === 5, 'Available stock correctly reported as 5');

    // 1.4 Cart with unpublished product (status: 'draft')
    const valResDraft = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [{ productId: prodUnpublished._id.toString(), quantity: 1 }],
      },
    });
    assert(valResDraft.data.isValid === false, 'Cart with draft item returns isValid: false');
    const draftItem = valResDraft.data.items.find((i) => i.productId === prodUnpublished._id.toString());
    assert(draftItem && draftItem.issue === 'unpublished', 'Unpublished item flagged with issue: unpublished');

    // 1.5 Cart with item from inactive/suspended store
    const valResInactiveStore = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [{ productId: prodInactiveStore._id.toString(), quantity: 1 }],
      },
    });
    assert(valResInactiveStore.data.isValid === false, 'Cart with suspended store item returns isValid: false');
    const inactItem = valResInactiveStore.data.items.find((i) => i.productId === prodInactiveStore._id.toString());
    assert(inactItem && inactItem.issue === 'store_inactive', 'Item from suspended store flagged with issue: store_inactive');

    // 1.6 Cart with non-existent / deleted product ID
    const fakeId = new mongoose.Types.ObjectId().toString();
    const valResDeleted = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [{ productId: fakeId, quantity: 1 }],
      },
    });
    assert(valResDeleted.data.isValid === false, 'Cart with deleted item returns isValid: false');
    const deletedItem = valResDeleted.data.items.find((i) => i.productId === fakeId);
    assert(deletedItem && deletedItem.issue === 'deleted', 'Deleted item flagged with issue: deleted');

    // 1.7 Client price tampering attempt ignored
    const valResTamper = await request('/orders/validate-cart', {
      method: 'POST',
      body: {
        items: [
          { productId: prod1._id.toString(), price: 0.01, subtotal: 0.01, quantity: 1 },
        ],
      },
    });
    assert(valResTamper.data.subtotal === 1200, 'Client price of 0.01 is ignored; trusted database price $1200 used');

    // -------------------------------------------------------------
    // PHASE 2 & 4: SECURE ORDER CREATION API & FINANCIALS
    // -------------------------------------------------------------
    console.log('\n[PHASE 2 & 4] Testing Secure Order Creation (POST /api/orders)...');

    // 2.1 Unauthorized request rejected
    const unauthRes = await request('/orders', {
      method: 'POST',
      body: {
        products: [{ productId: prod1._id.toString(), quantity: 1 }],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(unauthRes.status === 401, 'Unauthenticated order placement returns 401 Unauthorized');

    // 2.2 Missing required delivery address fields rejected
    const missingAddrRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prod1._id.toString(), quantity: 1 }],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          // Missing mobileNumber, address, city, state, pinCode
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(missingAddrRes.status === 400, 'Missing required delivery address fields rejected with 400 Bad Request');

    // 2.3 Invalid phone number rejected
    const badPhoneRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prod1._id.toString(), quantity: 1 }],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '123', // too short
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(badPhoneRes.status === 400, 'Invalid phone number format rejected with 400');

    // 2.4 Attempting to order an unpublished product rejected
    const orderDraftRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prodUnpublished._id.toString(), quantity: 1 }],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(orderDraftRes.status === 400, 'Ordering an unpublished product rejected with 400');

    // 2.5 Attempting to order from inactive/suspended store rejected
    const orderInactiveStoreRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prodInactiveStore._id.toString(), quantity: 1 }],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(orderInactiveStoreRes.status === 400, 'Ordering from an inactive store rejected with 400');

    // 2.6 Attempting to order more than available stock rejected
    const overStockRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prod1._id.toString(), quantity: 10 }], // only 5 in stock
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
      },
    });
    assert(overStockRes.status === 400, 'Ordering more than available stock rejected with 400');

    // 2.7 COD eligibility limit: High-value order > $3,000 rejected for Cash on Delivery
    const codLimitRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders1,
      body: {
        products: [{ productId: prodHighValue._id.toString(), quantity: 1 }], // $3,500
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Cash on Delivery (COD)',
      },
    });
    assert(codLimitRes.status === 400, 'Cash on Delivery for order > $3,000 rejected per COD business policy');

    // 2.8 Valid Order Creation (Multi-vendor cart: Prod 1 from Store 1 + Prod 2 from Store 2)
    const stockProd1Before = (await Product.findById(prod1._id)).stock;
    const stockProd2Before = (await Product.findById(prod2._id)).stock;

    const testIdempotencyKey = `test-idemp-${Date.now()}`;
    const createRes = await request('/orders', {
      method: 'POST',
      headers: {
        ...authHeaders1,
        'Idempotency-Key': testIdempotencyKey,
      },
      body: {
        products: [
          // Attempt client price tampering (send price: 10, totalAmount: 10)
          { productId: prod1._id.toString(), quantity: 1, price: 10, selectedSize: '42mm' },
          { productId: prod2._id.toString(), quantity: 2, price: 5, selectedSize: 'Standard' },
        ],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue, Penthouse B',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
        idempotencyKey: testIdempotencyKey,
      },
    });

    if (createRes.status !== 201) {
      console.log('DEBUG createRes:', createRes.status, createRes.data);
    }
    assert(createRes.status === 201, 'Valid order created with 201 Created');
    const createdOrder = createRes.data.order;
    assert(createdOrder && createdOrder._id, 'Created order has valid MongoDB ObjectId');
    assert(createdOrder.customer.toString() === customer1._id.toString(), 'Order correctly assigned to authenticated customer');

    // Check trusted prices stored in database
    const expectedSubtotal = 1200 * 1 + 450 * 2; // 1200 + 900 = 2100
    assert(createdOrder.itemsPrice === expectedSubtotal, `Trusted database prices used ($2,100), client price tampering ignored`);
    assert(createdOrder.taxPrice === Math.round(expectedSubtotal * 0.08 * 100) / 100, 'Server-calculated 8% tax price stored');
    assert(createdOrder.totalAmount === expectedSubtotal + createdOrder.shippingPrice + createdOrder.taxPrice, 'Total amount correctly computed from trusted values');

    // Check payment status
    assert(createdOrder.paymentStatus === 'pending', 'Online payment order marked paymentStatus: pending');
    assert(createdOrder.isPaid === false, 'Order isPaid is false (no false payment claim without live gateway)');

    // Check inventory decrement
    const stockProd1After = (await Product.findById(prod1._id)).stock;
    const stockProd2After = (await Product.findById(prod2._id)).stock;
    assert(stockProd1After === stockProd1Before - 1, `Prod 1 stock atomically decremented from ${stockProd1Before} to ${stockProd1After}`);
    assert(stockProd2After === stockProd2Before - 2, `Prod 2 stock atomically decremented from ${stockProd2Before} to ${stockProd2After}`);

    // 2.9 Idempotency check: Resending the exact same request with same idempotencyKey returns existing order
    const duplicateRes = await request('/orders', {
      method: 'POST',
      headers: {
        ...authHeaders1,
        'Idempotency-Key': testIdempotencyKey,
      },
      body: {
        products: [
          { productId: prod1._id.toString(), quantity: 1 },
          { productId: prod2._id.toString(), quantity: 2 },
        ],
        deliveryAddress: {
          fullName: 'Alice Sterling',
          mobileNumber: '9876543211',
          email: 'alice_task6@luxury.com',
          address: '42 Park Avenue, Penthouse B',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        paymentMethod: 'Online Payment',
        idempotencyKey: testIdempotencyKey,
      },
    });
    assert(duplicateRes.status === 200, 'Idempotent resubmission returns 200 OK');
    assert(duplicateRes.data.isDuplicate === true, 'Duplicate response flagged isDuplicate: true');
    assert(duplicateRes.data.order._id === createdOrder._id, 'Returned order ID matches previously created order');

    // Check stock was NOT decremented again on duplicate submission
    const stockProd1AfterDup = (await Product.findById(prod1._id)).stock;
    assert(stockProd1AfterDup === stockProd1After, 'Stock was not decremented again on idempotent duplicate request');

    // -------------------------------------------------------------
    // PHASE 3: MULTI-VENDOR SUPPORT & SNAPSHOTS
    // -------------------------------------------------------------
    console.log('\n[PHASE 3] Testing Multi-Vendor Order Snapshots & Isolation...');

    // 3.1 Order items snapshot check
    const dbOrder = await Order.findById(createdOrder._id);
    assert(dbOrder.products.length === 2, 'Order has 2 order items');

    const item1 = dbOrder.products[0];
    assert(item1.store.toString() === store1._id.toString(), 'Item 1 references Store 1');
    assert(item1.storeName === store1.name, 'Item 1 records historical snapshot of storeName');
    assert(item1.sku === prod1.sku, 'Item 1 records historical snapshot of SKU');
    assert(item1.price === 1200, 'Item 1 records historical snapshot of verified unit price');

    const item2 = dbOrder.products[1];
    assert(item2.store.toString() === store2._id.toString(), 'Item 2 references Store 2');
    assert(item2.storeName === store2.name, 'Item 2 records historical snapshot of storeName');

    // 3.2 Order level stores array
    assert(dbOrder.stores.length === 2, 'Order records distinct stores array [store1, store2]');
    assert(
      dbOrder.stores.map((s) => s.toString()).includes(store1._id.toString()),
      'Order stores includes Store 1'
    );
    assert(
      dbOrder.stores.map((s) => s.toString()).includes(store2._id.toString()),
      'Order stores includes Store 2'
    );

    // 3.3 Vendor order isolation: GET /api/vendor/orders
    const vendorOrdersRes = await request('/vendor/orders', {
      headers: authHeadersVendor1,
    });
    assert(vendorOrdersRes.status === 200, 'Vendor orders endpoint returns 200 OK');
    const matchedVendorOrder = vendorOrdersRes.data.orders.find((o) => o._id === createdOrder._id);
    assert(matchedVendorOrder !== undefined, 'Vendor 1 sees order containing their store items');
    assert(
      matchedVendorOrder.items.length === 1,
      'Vendor 1 only sees their own store items (1 item), Store 2 items are isolated'
    );
    assert(
      matchedVendorOrder.items[0].product.toString() === prod1._id.toString(),
      'Vendor 1 sees Product 1 item'
    );
    assert(
      matchedVendorOrder.vendorSubtotal === 1200,
      'Vendor 1 subtotal accurately reflects only their items ($1,200)'
    );

    // -------------------------------------------------------------
    // PHASE 5: CUSTOMER ORDER HISTORY & ORDER ISOLATION
    // -------------------------------------------------------------
    console.log('\n[PHASE 5] Testing Customer Order History & Security Isolation...');

    // 5.1 Alice retrieves her own orders: GET /api/orders/my-orders
    const myOrdersRes = await request('/orders/my-orders', {
      headers: authHeaders1,
    });
    assert(myOrdersRes.status === 200, 'Customer GET /api/orders/my-orders returns 200 OK');
    assert(Array.isArray(myOrdersRes.data.orders), 'Returns orders array');
    assert(
      myOrdersRes.data.orders.some((o) => o._id === createdOrder._id),
      'Created order is present in customer order history'
    );
    assert(myOrdersRes.data.totalOrders >= 1, 'Total orders count is populated');

    // 5.2 Alice retrieves single order details: GET /api/orders/:id
    const orderDetailsRes = await request(`/orders/${createdOrder._id}`, {
      headers: authHeaders1,
    });
    assert(orderDetailsRes.status === 200, 'Customer GET /api/orders/:id returns 200 OK');
    assert(orderDetailsRes.data.order._id === createdOrder._id, 'Order details match requested ID');

    // 5.3 Cross-customer isolation: Bob attempts to view Alice's order -> 403 Forbidden
    const crossViewRes = await request(`/orders/${createdOrder._id}`, {
      headers: authHeaders2,
    });
    assert(crossViewRes.status === 403, 'Customer Bob attempting to view Alice order rejected with 403 Forbidden');

    // 5.4 Cross-customer isolation: Bob attempts to cancel Alice's order -> 403 Forbidden
    const crossCancelRes = await request(`/orders/${createdOrder._id}/cancel`, {
      method: 'PATCH',
      headers: authHeaders2,
      body: { reason: 'Fraudulent cancel attempt by stranger' },
    });
    assert(crossCancelRes.status === 403, 'Customer Bob attempting to cancel Alice order rejected with 403 Forbidden');

    // 5.5 Order Cancellation by owner & Stock Restoration
    const stockProd1BeforeCancel = (await Product.findById(prod1._id)).stock;
    const stockProd2BeforeCancel = (await Product.findById(prod2._id)).stock;

    const cancelRes = await request(`/orders/${createdOrder._id}/cancel`, {
      method: 'PATCH',
      headers: authHeaders1,
      body: { reason: 'Customer changed mind on watch size' },
    });
    assert(cancelRes.status === 200, 'Owner cancelling Pending order returns 200 OK');
    assert(cancelRes.data.order.orderStatus === 'Cancelled', 'Order status updated to Cancelled');
    assert(cancelRes.data.order.cancellationReason === 'Customer changed mind on watch size', 'Cancellation reason saved');

    // Check stock was safely restored upon cancellation
    const stockProd1AfterCancel = (await Product.findById(prod1._id)).stock;
    const stockProd2AfterCancel = (await Product.findById(prod2._id)).stock;
    assert(
      stockProd1AfterCancel === stockProd1BeforeCancel + 1,
      `Prod 1 stock restored (+1) from ${stockProd1BeforeCancel} to ${stockProd1AfterCancel}`
    );
    assert(
      stockProd2AfterCancel === stockProd2BeforeCancel + 2,
      `Prod 2 stock restored (+2) from ${stockProd2BeforeCancel} to ${stockProd2AfterCancel}`
    );

    // 5.6 Cannot cancel already cancelled order
    const doubleCancelRes = await request(`/orders/${createdOrder._id}/cancel`, {
      method: 'PATCH',
      headers: authHeaders1,
      body: { reason: 'Try cancel again' },
    });
    assert(doubleCancelRes.status === 400, 'Cancelling an already cancelled order rejected with 400 Bad Request');

    // 5.7 Shipped orders cannot be cancelled
    const shippedOrder = await Order.create({
      customer: customer1._id,
      products: [
        {
          product: prod1._id,
          name: prod1.name,
          price: prod1.price,
          quantity: 1,
        },
      ],
      deliveryAddress: {
        fullName: 'Alice Sterling',
        mobileNumber: '9876543211',
        email: 'alice_task6@luxury.com',
        address: '42 Park Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
      },
      paymentMethod: 'Online Payment',
      paymentStatus: 'pending',
      itemsPrice: 1200,
      shippingPrice: 0,
      taxPrice: 96,
      totalAmount: 1296,
      orderStatus: 'Shipped',
    });

    const cancelShippedRes = await request(`/orders/${shippedOrder._id}/cancel`, {
      method: 'PATCH',
      headers: authHeaders1,
      body: { reason: 'Try cancel shipped' },
    });
    assert(cancelShippedRes.status === 400, 'Cancelling a Shipped order rejected with 400 Bad Request');

    console.log('\n=============================================================');
    console.log(`TASK 6 COMPLETE: All ${passedTests} / ${totalTests} assertions PASSED!`);
    console.log('=============================================================\n');
  } catch (error) {
    console.error('\nTest execution encountered error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTask6Tests();
