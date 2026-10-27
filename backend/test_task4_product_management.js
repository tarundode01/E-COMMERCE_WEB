/**
 * Task 4: Complete Vendor Product Management Automated Test Suite
 * Validates:
 * 1. Product Model schema, validation, slug generation, SKU uniqueness.
 * 2. Vendor Authentication and requireApprovedVendor enforcement.
 * 3. Product Creation with server-side store & vendor binding (anti-tampering).
 * 4. List, search, category/status filters, and server-side pagination.
 * 5. Single product retrieval and cross-vendor read protection (Tenant Isolation).
 * 6. Product update and cross-vendor update protection.
 * 7. Live status toggle (published <-> draft) and stock updates.
 * 8. Safe product deletion and cross-vendor deletion protection.
 * 9. Public catalog gating: drafts and unapproved/hidden store products are excluded.
 * 10. Regression check on customer catalog and categories.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Store from './models/Store.js';
import Product from './models/Product.js';
import Category from './models/Category.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };
  const config = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = options.isFormData ? options.body : JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTask4TestSuite() {
  console.log('======================================================================');
  console.log('  TASK 4: VENDOR PRODUCT MANAGEMENT E2E & SECURITY AUTOMATED SUITE   ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const vendorAEmail = `task4_vance_${timestamp}@atelier.com`;
  const vendorAPassword = 'VanceAtelier123!';
  const vendorBEmail = `task4_ross_${timestamp}@horology.com`;
  const vendorBPassword = 'RossHorology456!';
  const vendorCEmail = `task4_pending_${timestamp}@unapproved.com`;
  const vendorCPassword = 'PendingVendor789!';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
  const adminPassword = 'password123';

  let adminToken = null;
  let vendorAToken = null;
  let vendorAStoreId = null;
  let vendorBToken = null;
  let vendorBStoreId = null;
  let vendorCToken = null;
  let testCategoryId = null;
  let createdProductAId = null;
  let createdProductBId = null;

  try {
    // -------------------------------------------------------------
    // PHASE 0: SETUP TEST DATA, CATEGORIES, ACCOUNTS
    // -------------------------------------------------------------
    console.log('--- 0. Setup: Health Check, Category & Accounts ---');
    const health = await request('/api/health');
    assert(health.status === 200 && (health.data?.status === 'ok' || health.data?.success), 'Backend health endpoint is responsive');

    // Admin login or setup
    let adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.status !== 200) {
      await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Admin', email: adminEmail, mobile: '9999999999', password: adminPassword },
      });
      await User.updateOne({ email: adminEmail }, { role: 'admin', isApproved: true, status: 'approved' });
      adminLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword },
      });
    }
    adminToken = adminLogin.data?.token;
    assert(!!adminToken, 'Admin authenticated and token acquired');

    // Ensure valid Category exists for product assignment
    let sampleCategory = await Category.findOne({ isDeleted: { $ne: true } });
    if (!sampleCategory) {
      sampleCategory = await Category.create({
        name: `Haute Horlogerie ${timestamp}`,
        slug: `haute-horlogerie-${timestamp}`,
        description: 'Exquisite luxury timepieces',
      });
    }
    testCategoryId = sampleCategory._id.toString();
    assert(!!testCategoryId, `Valid category verified for testing: ${sampleCategory.name} (${testCategoryId})`);

    // Register Vendor A (Approved)
    const regA = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Vance Leatherworks',
        email: vendorAEmail,
        mobile: '9876543210',
        password: vendorAPassword,
        storeName: `Vance Atelier ${timestamp}`,
        storeDescription: 'Handcrafted luxury leather goods and luggage',
        businessAddress: '100 Faubourg Saint-Honoré, Paris',
        taxId: `FR-TAX-${timestamp}`,
      },
    });
    assert(regA.status === 201, 'Vendor A registered successfully');
    vendorAStoreId = regA.data?.store?.id || regA.data?.store?._id;

    // Approve Vendor A
    const appA = await request(`/api/admin/vendors/${vendorAStoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(appA.status === 200, 'Admin approves Vendor A store');

    // Login Vendor A
    const loginA = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendorAEmail, password: vendorAPassword },
    });
    vendorAToken = loginA.data?.token;
    assert(!!vendorAToken, 'Vendor A logged in and token acquired');

    // Register Vendor B (Approved)
    const regB = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Ross Chronographs',
        email: vendorBEmail,
        mobile: '9876543211',
        password: vendorBPassword,
        storeName: `Ross Chronographs ${timestamp}`,
        storeDescription: 'Master watchmaking and bespoke complications',
        businessAddress: '15 Rue du Rhône, Geneva',
        taxId: `CH-TAX-${timestamp}`,
      },
    });
    assert(regB.status === 201, 'Vendor B registered successfully');
    vendorBStoreId = regB.data?.store?.id || regB.data?.store?._id;

    // Approve Vendor B
    await request(`/api/admin/vendors/${vendorBStoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });

    // Login Vendor B
    const loginB = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendorBEmail, password: vendorBPassword },
    });
    vendorBToken = loginB.data?.token;
    assert(!!vendorBToken, 'Vendor B logged in and token acquired');

    // Register Vendor C (Pending / Unapproved)
    const regC = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Pending Merchant',
        email: vendorCEmail,
        mobile: '9876543212',
        password: vendorCPassword,
        storeName: `Pending Atelier ${timestamp}`,
        storeDescription: 'Unverified provisional storefront',
        businessAddress: '12 Unknown Ave',
        taxId: `UN-TAX-${timestamp}`,
      },
    });
    assert(regC.status === 201, 'Vendor C registered (unapproved)');
    const loginC = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendorCEmail, password: vendorCPassword },
    });
    vendorCToken = loginC.data?.token;

    // -------------------------------------------------------------
    // PHASE 1: AUTHENTICATION & APPROVAL ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n--- 1. Authentication & Approval Access Control ---');

    // Unauthenticated requests rejected
    const unauthList = await request('/api/vendor/products');
    assert(unauthList.status === 401, 'Unauthenticated GET /api/vendor/products rejected with 401');

    const unauthCreate = await request('/api/vendor/products', {
      method: 'POST',
      body: { name: 'Unauthorized Watch', price: 500, category: testCategoryId },
    });
    assert(unauthCreate.status === 401, 'Unauthenticated POST /api/vendor/products rejected with 401');

    // Unapproved vendor C cannot create products
    const unapprovedCreate = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorCToken}` },
      body: { name: 'Provisional Watch', price: 900, category: testCategoryId },
    });
    assert(unapprovedCreate.status === 403, 'Unapproved Vendor C rejected from creating products with 403 Forbidden');

    // Unapproved vendor C cannot list products
    const unapprovedList = await request('/api/vendor/products', {
      headers: { Authorization: `Bearer ${vendorCToken}` },
    });
    assert(unapprovedList.status === 403, 'Unapproved Vendor C rejected from listing products with 403 Forbidden');

    // -------------------------------------------------------------
    // PHASE 2: PRODUCT CREATION, VALIDATION & INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- 2. Product Creation, Validation & Integrity ---');

    // Missing required fields validation
    const missingName = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { price: 1200, category: testCategoryId },
    });
    assert(missingName.status === 400, 'Product creation fails when name is missing (400)');

    const missingCategory = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { name: 'Monogram Briefcase', price: 1200 },
    });
    assert(missingCategory.status === 400, 'Product creation fails when category is missing (400)');

    const negativePrice = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { name: 'Monogram Briefcase', price: -50, category: testCategoryId },
    });
    assert(negativePrice.status === 400, 'Product creation fails with negative price (400)');

    const invalidDiscount = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { name: 'Monogram Briefcase', price: 1000, discount: 150, category: testCategoryId },
    });
    assert(invalidDiscount.status === 400, 'Product creation fails with discount > 100% (400)');

    const invalidCatId = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { name: 'Monogram Briefcase', price: 1000, category: '507f1f77bcf86cd799439011' }, // non-existent Mongo ID
    });
    assert(invalidCatId.status === 400, 'Product creation fails when category does not exist in database (400)');

    // Successful product creation by Vendor A
    const skuA = `VAN-${timestamp}`;
    const createResA = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: {
        name: `Alligator Leather Weekend Holdall ${timestamp}`,
        description: 'Exquisitely hand-stitched Mississippiensis alligator leather holdall with brass hardware.',
        sku: skuA,
        price: 4800,
        discount: 10,
        stock: 12,
        category: testCategoryId,
        images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa'],
        status: 'published',
        tags: ['leather', 'travel', 'luxury'],
        // Attempt privilege tampering: try injecting another store and user
        store: vendorBStoreId,
        vendor: '507f1f77bcf86cd799439011',
      },
    });
    assert(createResA.status === 201 && createResA.data?.success, 'Vendor A successfully creates luxury product (201)');
    createdProductAId = createResA.data?.product?._id || createResA.data?.product?.id;
    assert(!!createdProductAId, `Product created with ID: ${createdProductAId}`);

    // Verify DB association: Server-side binding must have ignored injected store/vendor
    const dbProductA = await Product.findById(createdProductAId);
    assert(dbProductA.store.toString() === vendorAStoreId.toString(), 'Product is strictly bound to Vendor A store (injected store ignored)');
    assert(dbProductA.sku === skuA.toUpperCase(), 'Product SKU stored in uppercase');
    assert(dbProductA.slug.includes('alligator-leather-weekend-holdall'), 'Product slug generated automatically');
    assert(dbProductA.status === 'published', 'Product status correctly set to published');
    assert(dbProductA.stock === 12, 'Product stock correctly set to 12');

    // Duplicate SKU collision test
    const dupSkuRes = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: {
        name: 'Another Holdall',
        price: 3200,
        sku: skuA, // Duplicate SKU
        category: testCategoryId,
      },
    });
    assert(dupSkuRes.status === 400, 'Duplicate SKU rejected with 400 Bad Request');

    // Slug collision auto-resolution test
    const sameNameRes = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: {
        name: `Alligator Leather Weekend Holdall ${timestamp}`, // exact same name
        description: 'Second edition alligator holdall with silver finishings.',
        sku: `VAN-SEC-${timestamp}`,
        price: 5200,
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
        category: testCategoryId,
      },
    });
    assert(sameNameRes.status === 201, 'Product with same name created with auto-incremented slug');
    const dbSecond = await Product.findById(sameNameRes.data?.product?._id);
    assert(dbSecond.slug !== dbProductA.slug && (dbSecond.slug.endsWith('-1') || dbSecond.slug.includes('-2')), `Unique slug resolved correctly: ${dbSecond?.slug}`);
    // Clean up second product
    if (dbSecond) await Product.findByIdAndDelete(dbSecond._id);

    // Vendor B creates a product for cross-tenant testing
    const skuB = `ROS-${timestamp}`;
    const createResB = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorBToken}` },
      body: {
        name: `Tourbillon Grand Complication ${timestamp}`,
        description: 'Hand-wound mechanical tourbillon in 18k rose gold.',
        sku: skuB,
        price: 85000,
        stock: 3,
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
        category: testCategoryId,
        status: 'published',
      },
    });
    assert(createResB.status === 201, 'Vendor B successfully creates their own luxury product (201)');
    createdProductBId = createResB.data?.product?._id || createResB.data?.product?.id;

    // -------------------------------------------------------------
    // PHASE 3: LISTING, SEARCH, FILTERS & PAGINATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Listing, Search, Filters & Pagination ---');

    // Vendor A lists products
    const listA = await request('/api/vendor/products', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(listA.status === 200, 'Vendor A retrieves product list (200)');
    assert(Array.isArray(listA.data?.products), 'Response returns array of products');
    assert(listA.data?.totalProducts >= 1, `Total products count accurate (${listA.data?.totalProducts})`);

    // Verify tenant isolation in listing: Vendor B's product does not appear in Vendor A's list
    const containsVendorBProduct = listA.data?.products?.some((p) => p._id === createdProductBId);
    assert(!containsVendorBProduct, 'Vendor A list does NOT contain Vendor B products (Multi-tenant isolation confirmed)');

    // Search filter test
    const searchRes = await request(`/api/vendor/products?search=Alligator`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(searchRes.status === 200 && searchRes.data?.products?.length >= 1, 'Search by keyword returns matching product');

    const searchMiss = await request(`/api/vendor/products?search=NonExistentZebraWoodItem12345`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(searchMiss.status === 200 && searchMiss.data?.products?.length === 0, 'Search by non-matching query returns empty array');

    // Category filter test
    const catFilter = await request(`/api/vendor/products?category=${testCategoryId}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(catFilter.status === 200 && catFilter.data?.products?.length >= 1, 'Filtering by valid category returns products');

    // Status filter test
    const statusFilterPub = await request(`/api/vendor/products?status=published`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(statusFilterPub.status === 200 && statusFilterPub.data?.products?.length >= 1, 'Filtering by published status works');

    const statusFilterDraft = await request(`/api/vendor/products?status=draft`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(statusFilterDraft.status === 200 && statusFilterDraft.data?.products?.length === 0, 'Filtering by draft status shows 0 draft products initially');

    // Pagination test
    const pageRes = await request('/api/vendor/products?page=1&limit=1', {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(pageRes.status === 200 && pageRes.data?.products?.length <= 1, 'Pagination limit parameter respected');
    assert(pageRes.data?.page === 1, 'Current page returned as 1');

    // -------------------------------------------------------------
    // PHASE 4: RETRIEVAL & CROSS-TENANT READ ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 4. Retrieval & Cross-Tenant Read Isolation ---');

    // Vendor A reads own product
    const getOwn = await request(`/api/vendor/products/${createdProductAId}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(getOwn.status === 200 && getOwn.data?.product?._id === createdProductAId, 'Vendor A reads their own product (200)');

    // Vendor B attempts to read Vendor A product (Cross-tenant attack)
    const crossRead = await request(`/api/vendor/products/${createdProductAId}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
    });
    assert(crossRead.status === 403 || crossRead.status === 404, 'Vendor B CANNOT read Vendor A product (403/404 tenant isolation enforced)');

    // -------------------------------------------------------------
    // PHASE 5: UPDATE & PRIVILEGE TAMPERING DEFENSE
    // -------------------------------------------------------------
    console.log('\n--- 5. Update & Privilege Tampering Defense ---');

    // Vendor A updates price, stock, and description
    const updateRes = await request(`/api/vendor/products/${createdProductAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: {
        price: 5200,
        stock: 18,
        description: 'Updated mastercrafted alligator travel bag.',
        discount: 15,
        // Attempt tampering: try to transfer product to Vendor B's store
        store: vendorBStoreId,
      },
    });
    assert(updateRes.status === 200 && updateRes.data?.success, 'Vendor A updates price and stock on own product (200)');
    assert(updateRes.data?.product?.price === 5200, 'Price updated to 5200');
    assert(updateRes.data?.product?.stock === 18, 'Stock updated to 18');

    // Verify tampering was blocked in DB
    const refreshedA = await Product.findById(createdProductAId);
    assert(refreshedA.store.toString() === vendorAStoreId.toString(), 'Store ownership remains bound to Vendor A (Transfer attempt blocked)');

    // Cross-tenant update attack: Vendor B tries to update Vendor A product
    const crossUpdate = await request(`/api/vendor/products/${createdProductAId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendorBToken}` },
      body: { price: 10, stock: 999 },
    });
    assert(crossUpdate.status === 403 || crossUpdate.status === 404, 'Vendor B CANNOT update Vendor A product (403/404 forbidden)');

    // Verify Vendor A's product was not mutated by the cross-tenant attempt
    const verifyUnchanged = await Product.findById(createdProductAId);
    assert(verifyUnchanged.price === 5200, 'Product price remained untouched after cross-tenant attack');

    // -------------------------------------------------------------
    // PHASE 6: STATUS & STOCK ATOMIC TOGGLES
    // -------------------------------------------------------------
    console.log('\n--- 6. Status & Stock Atomic Updates ---');

    // Switch status to draft
    const draftToggle = await request(`/api/vendor/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'draft' },
    });
    assert(draftToggle.status === 200 && draftToggle.data?.product?.status === 'draft', 'Vendor A sets product status to draft');

    // Invalid status rejected
    const badStatus = await request(`/api/vendor/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'invalid_status_xyz' },
    });
    assert(badStatus.status === 400, 'Invalid status rejected with 400 Bad Request');

    // Cross-tenant status toggle attack: Vendor B tries to alter status of Vendor A product
    const crossStatus = await request(`/api/vendor/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorBToken}` },
      body: { status: 'published' },
    });
    assert(crossStatus.status === 403 || crossStatus.status === 404, 'Vendor B CANNOT alter Vendor A product status (403/404)');

    // Update stock via patch
    const stockPatch = await request(`/api/vendor/products/${createdProductAId}/stock`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { stock: 25 },
    });
    assert(stockPatch.status === 200 && stockPatch.data?.product?.stock === 25, 'Vendor A updates stock quantity to 25');

    // Negative stock rejected
    const badStock = await request(`/api/vendor/products/${createdProductAId}/stock`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { stock: -10 },
    });
    assert(badStock.status === 400, 'Negative stock rejected with 400 Bad Request');

    // Cross-tenant stock update attack
    const crossStock = await request(`/api/vendor/products/${createdProductAId}/stock`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorBToken}` },
      body: { stock: 0 },
    });
    assert(crossStock.status === 403 || crossStock.status === 404, 'Vendor B CANNOT alter Vendor A product stock (403/404)');

    // -------------------------------------------------------------
    // PHASE 7: PUBLIC CATALOG GATING & DRAFT PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- 7. Public Catalog Gating & Draft Protection ---');

    // Currently product A is 'draft' -> it must NOT appear in public catalog
    const publicCatalog1 = await request('/api/products');
    assert(publicCatalog1.status === 200, 'Public catalog GET /api/products returns 200');
    const isProductAInPublic1 = publicCatalog1.data?.products?.some((p) => p._id === createdProductAId);
    assert(!isProductAInPublic1, 'Draft product does NOT appear in public catalog list');

    // Direct public get of draft product should return 404
    const directDraftGet = await request(`/api/products/${createdProductAId}`);
    assert(directDraftGet.status === 404, 'Direct GET /api/products/:id for draft product returns 404 Not Found');

    // Publish Product A
    await request(`/api/vendor/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorAToken}` },
      body: { status: 'published' },
    });

    // Now published -> Product A MUST appear in public catalog
    const publicCatalog2 = await request('/api/products');
    const isProductAInPublic2 = publicCatalog2.data?.products?.some((p) => p._id === createdProductAId);
    assert(isProductAInPublic2, 'Published product from approved active store appears in public catalog');

    // Direct public get of published product returns 200
    const directPubGet = await request(`/api/products/${createdProductAId}`);
    assert(directPubGet.status === 200 && directPubGet.data?.product?.name, 'Direct GET /api/products/:id for published product returns 200');

    // Test Store Inactivity Protection: Temporarily hide Vendor A store (isPubliclyVisible: false)
    await Store.findByIdAndUpdate(vendorAStoreId, { isPubliclyVisible: false });

    // Public catalog should now exclude Product A even though it is published
    const publicCatalogHidden = await request('/api/products');
    const isProductAInHidden = publicCatalogHidden.data?.products?.some((p) => p._id === createdProductAId);
    assert(!isProductAInHidden, 'Product from hidden store (isPubliclyVisible: false) is excluded from public catalog');

    const directHiddenGet = await request(`/api/products/${createdProductAId}`);
    assert(directHiddenGet.status === 404, 'Direct GET /api/products/:id for product of hidden store returns 404 Not Found');

    // Restore store visibility
    await Store.findByIdAndUpdate(vendorAStoreId, { isPubliclyVisible: true });

    // -------------------------------------------------------------
    // PHASE 8: SAFE PRODUCT DELETION & CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- 8. Safe Product Deletion & Cleanup ---');

    // Cross-tenant delete attack: Vendor B tries to delete Vendor A product
    const crossDelete = await request(`/api/vendor/products/${createdProductAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vendorBToken}` },
    });
    assert(crossDelete.status === 403 || crossDelete.status === 404, 'Vendor B CANNOT delete Vendor A product (403/404 forbidden)');

    // Vendor A deletes their own product
    const deleteOwn = await request(`/api/vendor/products/${createdProductAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(deleteOwn.status === 200 && deleteOwn.data?.success, 'Vendor A safely deletes their own product (200)');

    // Verify deleted product is gone from vendor retrieval
    const getDeleted = await request(`/api/vendor/products/${createdProductAId}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    assert(getDeleted.status === 404, 'Deleted product is no longer found in vendor endpoint (404)');

    // Verify deleted product is gone from public retrieval
    const getDeletedPublic = await request(`/api/products/${createdProductAId}`);
    assert(getDeletedPublic.status === 404, 'Deleted product is no longer found in public catalog (404)');

    // Clean up Vendor B's product
    await request(`/api/vendor/products/${createdProductBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vendorBToken}` },
    });

    // -------------------------------------------------------------
    // PHASE 9: CUSTOMER CATALOG & CATEGORIES REGRESSION CHECK
    // -------------------------------------------------------------
    console.log('\n--- 9. Customer Catalog & Categories Regression Check ---');
    const categoriesRes = await request('/api/categories');
    assert(categoriesRes.status === 200 && Array.isArray(categoriesRes.data?.categories), 'Categories endpoint /api/categories returns 200');

    const finalCatalog = await request('/api/products');
    assert(finalCatalog.status === 200 && Array.isArray(finalCatalog.data?.products), 'Customer public shop /api/products returns valid product array');

  } catch (err) {
    console.error('Unexpected error in test suite execution:', err);
    failed++;
  } finally {
    // Teardown test accounts and stores created in this run
    try {
      if (vendorAStoreId) await Store.findByIdAndDelete(vendorAStoreId);
      if (vendorBStoreId) await Store.findByIdAndDelete(vendorBStoreId);
      await User.deleteMany({ email: { $in: [vendorAEmail, vendorBEmail, vendorCEmail] } });
      await Product.deleteMany({ store: { $in: [vendorAStoreId, vendorBStoreId] } });
      await mongoose.disconnect();
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  console.log('\n======================================================================');
  console.log(`  TASK 4 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTask4TestSuite();
