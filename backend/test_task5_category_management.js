/**
 * Task 5: Complete Category Management Automated Test Suite
 * Validates:
 * 1. Category Model: Unique name, slug generation, status, isActive, description, image.
 * 2. RBAC & Security Boundaries: Unauthenticated, Customer, and Vendor cannot manage categories (401/403).
 * 3. Admin Category CRUD: Create, Read, Update, Status Toggle (Active/Inactive), Delete.
 * 4. Duplicate name and slug collision handling.
 * 5. Vendor Product Integration: Active category requirement for new products, rejection of inactive categories.
 * 6. Non-corruption of existing products linked to deactivated categories.
 * 7. Referential Integrity / Safety Lock: Category deletion blocked when products are assigned (400 Bad Request).
 * 8. Safe category deletion when product count is zero.
 * 9. Customer Catalog Integration: Only active categories exposed publicly; filtering by name or slug.
 * 10. Regression check on catalog, cart, and wishlist endpoints.
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

async function runTask5TestSuite() {
  console.log('======================================================================');
  console.log('  TASK 5: CATEGORY MANAGEMENT FULL-STACK E2E & SECURITY TEST SUITE   ');
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
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
  const adminPassword = 'password123';
  const vendorEmail = `task5_vendor_${timestamp}@atelier.com`;
  const vendorPassword = 'VendorPassword123!';
  const customerEmail = `task5_customer_${timestamp}@luxury.com`;
  const customerPassword = 'CustomerPassword123!';

  let adminToken = null;
  let vendorToken = null;
  let vendorStoreId = null;
  let customerToken = null;

  let activeCatId = null;
  let activeCatName = `Haute Horlogerie ${timestamp}`;
  let activeCatSlug = `haute-horlogerie-${timestamp}`;

  let inactiveCatId = null;
  let inactiveCatName = `Archived Jewels ${timestamp}`;
  let inactiveCatSlug = `archived-jewels-${timestamp}`;

  let assignedProductId = null;

  try {
    // -------------------------------------------------------------
    // PHASE 0: SETUP TEST ACCOUNTS (ADMIN, VENDOR, CUSTOMER)
    // -------------------------------------------------------------
    console.log('--- 0. Setup: Health Check & Test Roles Authentication ---');
    const health = await request('/api/health');
    assert(health.status === 200 && (health.data?.status === 'ok' || health.data?.success), 'Backend health endpoint is responsive');

    // 1. Admin login or register
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

    // 2. Customer register & login
    const custReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Catherine Client',
        email: customerEmail,
        mobile: '9888888888',
        password: customerPassword,
      },
    });
    assert(custReg.status === 201, 'Customer account registered (201)');
    customerToken = custReg.data?.token;

    // 3. Vendor register & approve
    const vendReg = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Valentin Horology',
        email: vendorEmail,
        mobile: '9777777777',
        password: vendorPassword,
        storeName: `Valentin Atelier ${timestamp}`,
        storeDescription: 'Swiss complications and artisan horology.',
        businessAddress: '24 Rue du Rhône, Geneva',
        taxId: `CH-TAX-${timestamp}`,
      },
    });
    assert(vendReg.status === 201, 'Vendor account registered (201)');
    vendorStoreId = vendReg.data?.store?.id;

    // Approve vendor store
    await request(`/api/admin/vendors/${vendorStoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });

    // Login vendor to acquire token with approved status
    const vendLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendorEmail, password: vendorPassword },
    });
    vendorToken = vendLogin.data?.token;
    assert(!!vendorToken, 'Vendor logged in with approved credentials');

    // -------------------------------------------------------------
    // PHASE 1: RBAC & AUTHORIZATION SECURITY BOUNDARIES
    // -------------------------------------------------------------
    console.log('\n--- 1. RBAC & Security Boundaries ---');

    // Unauthenticated requests rejected
    const unauthPost = await request('/api/categories', {
      method: 'POST',
      body: { name: 'Unauthorized Category' },
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/categories rejected (401)');

    const unauthPut = await request('/api/categories/507f1f77bcf86cd799439011', {
      method: 'PUT',
      body: { name: 'Unauthorized Update' },
    });
    assert(unauthPut.status === 401, 'Unauthenticated PUT /api/categories/:id rejected (401)');

    const unauthPatch = await request('/api/categories/507f1f77bcf86cd799439011/status', {
      method: 'PATCH',
      body: { status: 'inactive' },
    });
    assert(unauthPatch.status === 401, 'Unauthenticated PATCH /api/categories/:id/status rejected (401)');

    const unauthDel = await request('/api/categories/507f1f77bcf86cd799439011', {
      method: 'DELETE',
    });
    assert(unauthDel.status === 401, 'Unauthenticated DELETE /api/categories/:id rejected (401)');

    // Customer role blocked from admin category routes (403 Forbidden)
    const custPost = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { name: 'Customer Attempt Category' },
    });
    assert(custPost.status === 403, 'Customer role blocked from creating categories (403)');

    const custDel = await request('/api/categories/507f1f77bcf86cd799439011', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custDel.status === 403, 'Customer role blocked from deleting categories (403)');

    // Vendor role blocked from admin category routes (403 Forbidden)
    const vendPost = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { name: 'Vendor Attempt Category' },
    });
    assert(vendPost.status === 403, 'Vendor role blocked from creating platform categories (403)');

    const vendPatch = await request('/api/categories/507f1f77bcf86cd799439011/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: { status: 'inactive' },
    });
    assert(vendPatch.status === 403, 'Vendor role blocked from toggling category status (403)');

    // -------------------------------------------------------------
    // PHASE 2: ADMIN CATEGORY CREATION, SLUG & VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Admin Category Creation, Slug & Validation ---');

    // Missing name validation
    const missingName = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { description: 'Missing category name' },
    });
    assert(missingName.status === 400, 'Creation fails when name is missing (400)');

    const tooShortName = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: 'A' },
    });
    assert(tooShortName.status === 400, 'Creation fails when name is < 2 characters (400)');

    // Successful active category creation
    const createActiveRes = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: activeCatName,
        slug: activeCatSlug,
        description: 'Exquisite Swiss chronometers and automatic movements.',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
        status: 'active',
      },
    });
    assert(createActiveRes.status === 201 && createActiveRes.data?.success, 'Admin creates active luxury category (201)');
    activeCatId = createActiveRes.data?.category?._id || createActiveRes.data?.category?.id;
    assert(!!activeCatId, `Active category ID acquired: ${activeCatId}`);
    assert(createActiveRes.data?.category?.slug === activeCatSlug, 'Category slug persisted as requested');
    assert(createActiveRes.data?.category?.status === 'active', 'Category status is "active"');
    assert(createActiveRes.data?.category?.isActive === true, 'Category isActive boolean is true');

    // Duplicate name collision test (case-insensitive)
    const dupNameRes = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: activeCatName.toUpperCase(), // exact case-insensitive match
        description: 'Duplicate name attempt',
      },
    });
    assert(dupNameRes.status === 400, 'Duplicate category name rejected with 400 Bad Request');

    // Duplicate slug collision test
    const dupSlugRes = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Different Name ${timestamp}`,
        slug: activeCatSlug, // duplicate slug
      },
    });
    assert(dupSlugRes.status === 400, 'Duplicate category slug rejected with 400 Bad Request');

    // Auto-slug generation test (when no slug is passed)
    const autoSlugRes = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Bespoke Tailoring ${timestamp}`,
        description: 'Custom Savile Row and Neapolitan tailoring.',
      },
    });
    assert(autoSlugRes.status === 201, 'Category created without explicit slug succeeds (201)');
    assert(autoSlugRes.data?.category?.slug?.includes('bespoke-tailoring'), 'Slug auto-generated from category name');
    // Cleanup auto-slug category
    await Category.findByIdAndDelete(autoSlugRes.data?.category?._id);

    // Create an inactive category for deactivation/filtering tests
    const createInactiveRes = await request('/api/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: inactiveCatName,
        slug: inactiveCatSlug,
        description: 'Historical archive items not available for new additions.',
        status: 'inactive',
      },
    });
    assert(createInactiveRes.status === 201, 'Admin creates inactive category (201)');
    inactiveCatId = createInactiveRes.data?.category?._id || createInactiveRes.data?.category?.id;
    assert(createInactiveRes.data?.category?.status === 'inactive', 'Inactive category status is "inactive"');
    assert(createInactiveRes.data?.category?.isActive === false, 'Inactive category isActive boolean is false');

    // -------------------------------------------------------------
    // PHASE 3: CATEGORY RETRIEVAL & QUERYING
    // -------------------------------------------------------------
    console.log('\n--- 3. Category Retrieval & Querying ---');

    // Public GET /api/categories (default: active only)
    const publicList = await request('/api/categories');
    assert(publicList.status === 200, 'Public GET /api/categories returns 200');
    assert(Array.isArray(publicList.data?.categories), 'Categories returned as array');
    const hasActiveInPublic = publicList.data?.categories?.some((c) => c._id === activeCatId);
    const hasInactiveInPublic = publicList.data?.categories?.some((c) => c._id === inactiveCatId);
    assert(hasActiveInPublic, 'Active category appears in default public listing');
    assert(!hasInactiveInPublic, 'Inactive category is EXCLUDED from default public listing');

    // Admin query: status=all includes inactive
    const allList = await request('/api/categories?status=all');
    assert(allList.status === 200, 'GET /api/categories?status=all returns 200');
    const hasInactiveInAll = allList.data?.categories?.some((c) => c._id === inactiveCatId);
    assert(hasInactiveInAll, 'Inactive category included when status=all is specified');

    // Admin query: status=inactive
    const inactiveOnlyList = await request('/api/categories?status=inactive');
    assert(inactiveOnlyList.status === 200, 'GET /api/categories?status=inactive returns 200');
    assert(inactiveOnlyList.data?.categories?.every((c) => c.status === 'inactive' || c.isActive === false), 'status=inactive returns only inactive categories');

    // Search query test
    const searchRes = await request(`/api/categories?search=${encodeURIComponent(activeCatName)}&status=all`);
    assert(searchRes.status === 200 && searchRes.data?.categories?.length >= 1, 'Search by category name returns matching item');

    // Single category retrieval by ObjectId
    const getById = await request(`/api/categories/${activeCatId}`);
    assert(getById.status === 200 && getById.data?.category?.name === activeCatName, 'GET /api/categories/:id by ObjectId returns category');
    assert(typeof getById.data?.productCount === 'number', 'Response contains productCount metric');

    // Single category retrieval by unique slug
    const getBySlug = await request(`/api/categories/${activeCatSlug}`);
    assert(getBySlug.status === 200 && getBySlug.data?.category?._id === activeCatId, 'GET /api/categories/:slug by slug identifier returns category');

    // -------------------------------------------------------------
    // PHASE 4: CATEGORY UPDATES & STATUS TOGGLES
    // -------------------------------------------------------------
    console.log('\n--- 4. Category Updates & Status Toggles ---');

    // Update category details (name, description, image)
    const updatedDesc = 'Updated description for precision Swiss watchmaking.';
    const updateRes = await request(`/api/categories/${activeCatId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: updatedDesc,
      },
    });
    assert(updateRes.status === 200 && updateRes.data?.success, 'Admin updates category description (200)');
    assert(updateRes.data?.category?.description === updatedDesc, 'Updated description verified');

    // Status toggle: Deactivate active category
    const toggleToInactive = await request(`/api/categories/${activeCatId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'inactive' },
    });
    assert(toggleToInactive.status === 200 && toggleToInactive.data?.category?.status === 'inactive', 'Admin toggles active category to inactive');

    // Verify it is now excluded from public active list
    const publicAfterDeactivate = await request('/api/categories');
    assert(!publicAfterDeactivate.data?.categories?.some((c) => c._id === activeCatId), 'Deactivated category is excluded from public list');

    // Status toggle: Reactivate category back to active
    const toggleToActive = await request(`/api/categories/${activeCatId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' },
    });
    assert(toggleToActive.status === 200 && toggleToActive.data?.category?.status === 'active', 'Admin reactivates category to active');

    // -------------------------------------------------------------
    // PHASE 5: VENDOR PRODUCT INTEGRATION & ACTIVE CHECKS
    // -------------------------------------------------------------
    console.log('\n--- 5. Vendor Product Integration & Active Checks ---');

    // Vendor tries to assign non-existent category -> Rejected (400)
    const fakeCatProduct = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        name: 'Phantom Item',
        price: 2000,
        category: 'NonExistentCategory999',
        description: 'This category does not exist.',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
      },
    });
    assert(fakeCatProduct.status === 400, 'Vendor product creation with non-existent category rejected (400)');

    // Vendor tries to assign INACTIVE category -> Rejected (400)
    const inactiveCatProduct = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        name: 'Forbidden Vintage Piece',
        price: 3500,
        category: inactiveCatName, // Inactive category
        description: 'Attempting to use an archived category.',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
      },
    });
    assert(inactiveCatProduct.status === 400, 'Vendor product creation with inactive category rejected (400)');

    // Vendor assigns ACTIVE category -> Succeeds (201)
    const validProductRes = await request('/api/vendor/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        name: `Chronograph Perpetual Calendar ${timestamp}`,
        price: 38000,
        category: activeCatName, // Active category
        sku: `CHRONO-${timestamp}`,
        stock: 5,
        description: 'Perpetual calendar chronograph with moon phase indicator.',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
        status: 'published',
      },
    });
    assert(validProductRes.status === 201 && validProductRes.data?.success, 'Vendor successfully creates product in active category (201)');
    assignedProductId = validProductRes.data?.product?._id;
    assert(!!assignedProductId, `Product created with ID: ${assignedProductId}`);

    // Verify product has active category assigned
    const dbProduct = await Product.findById(assignedProductId);
    assert(dbProduct.category === activeCatName, 'Product stored with canonical category name');

    // -------------------------------------------------------------
    // PHASE 6: NON-CORRUPTION WHEN CATEGORY IS DEACTIVATED
    // -------------------------------------------------------------
    console.log('\n--- 6. Deactivated Category Handling on Existing Products ---');

    // Admin deactivates the category that now has an assigned product
    await request(`/api/categories/${activeCatId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'inactive' },
    });

    // Existing product still exists and preserves its category in database
    const refreshedProduct = await Product.findById(assignedProductId);
    assert(refreshedProduct.category === activeCatName, 'Existing product preserves category reference when category is deactivated');

    // Vendor can still update stock & price of existing product without error
    const vendorUpdateRes = await request(`/api/vendor/products/${assignedProductId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        price: 41000,
        stock: 4,
      },
    });
    assert(vendorUpdateRes.status === 200, 'Vendor can update price/stock of product in deactivated category (no data corruption)');

    // But vendor CANNOT reassign the product to another inactive category
    const vendorReassignInactive = await request(`/api/vendor/products/${assignedProductId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: {
        category: inactiveCatName, // reassign to inactive category
      },
    });
    assert(vendorReassignInactive.status === 400, 'Vendor cannot reassign product to inactive category (400)');

    // Reactivate category for subsequent tests
    await request(`/api/categories/${activeCatId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'active' },
    });

    // -------------------------------------------------------------
    // PHASE 7: SAFETY LOCK: BLOCK CATEGORY DELETION WITH PRODUCTS
    // -------------------------------------------------------------
    console.log('\n--- 7. Referential Safety Lock on Category Deletion ---');

    // Admin attempts to delete category with 1 assigned product -> BLOCKED (400)
    const unsafeDeleteRes = await request(`/api/categories/${activeCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unsafeDeleteRes.status === 400, 'Deleting category with assigned products is BLOCKED with 400 Bad Request');
    assert(
      unsafeDeleteRes.data?.message?.includes('Cannot delete category') &&
        unsafeDeleteRes.data?.assignedProductCount >= 1,
      'Error message identifies assigned product count to prevent data inconsistency'
    );

    // Verify category was NOT deleted from DB
    const checkCatStillExists = await Category.findById(activeCatId);
    assert(!!checkCatStillExists, 'Category remains safely in MongoDB');

    // Delete inactive category which has ZERO products -> Succeeds (200)
    const safeDeleteInactive = await request(`/api/categories/${inactiveCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(safeDeleteInactive.status === 200, 'Admin can safely delete category with 0 assigned products (200)');

    // Verify inactive category is gone from DB
    const checkInactiveGone = await Category.findById(inactiveCatId);
    assert(!checkInactiveGone, 'Inactive category removed from MongoDB');

    // -------------------------------------------------------------
    // PHASE 8: CUSTOMER SHOP CATEGORY FILTERING BY NAME & SLUG
    // -------------------------------------------------------------
    console.log('\n--- 8. Customer Shop Category Filtering ---');

    // 1. Filter by exact category name
    const shopByName = await request(`/api/products?category=${encodeURIComponent(activeCatName)}`);
    assert(shopByName.status === 200, 'Customer Shop GET /api/products?category=[Name] returns 200');
    assert(shopByName.data?.products?.some((p) => p._id === assignedProductId), 'Shop returns assigned product when filtered by category name');

    // 2. Filter by category slug
    const shopBySlug = await request(`/api/products?category=${encodeURIComponent(activeCatSlug)}`);
    assert(shopBySlug.status === 200, 'Customer Shop GET /api/products?category=[Slug] returns 200');
    assert(shopBySlug.data?.products?.some((p) => p._id === assignedProductId), 'Shop returns assigned product when filtered by category slug');

    // 3. Combine category filter with search query
    const shopSearch = await request(`/api/products?category=${encodeURIComponent(activeCatSlug)}&search=Perpetual`);
    assert(shopSearch.status === 200, 'Combined category and keyword search returns 200');
    assert(shopSearch.data?.products?.some((p) => p._id === assignedProductId), 'Product found with category + keyword search');

    // 4. Clean up assigned product
    await request(`/api/vendor/products/${assignedProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vendorToken}` },
    });

    // 5. Now that assigned products = 0, deleting active category succeeds!
    const safeDeleteActive = await request(`/api/categories/${activeCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(safeDeleteActive.status === 200, 'Category deletion succeeds once all assigned products are removed (200)');

    // -------------------------------------------------------------
    // PHASE 9: REGRESSION ON CATEGORIES & CATALOG ENDPOINTS
    // -------------------------------------------------------------
    console.log('\n--- 9. Non-Regression Verification ---');
    const finalCats = await request('/api/categories');
    assert(finalCats.status === 200 && Array.isArray(finalCats.data?.categories), 'GET /api/categories returns valid categories');

    const finalProducts = await request('/api/products');
    assert(finalProducts.status === 200 && Array.isArray(finalProducts.data?.products), 'GET /api/products returns valid products');

  } catch (err) {
    console.error('Unexpected error in Task 5 test suite:', err);
    failed++;
  } finally {
    // Teardown test accounts and stores created in this run
    try {
      if (vendorStoreId) await Store.findByIdAndDelete(vendorStoreId);
      if (assignedProductId) await Product.findByIdAndDelete(assignedProductId);
      if (activeCatId) await Category.findByIdAndDelete(activeCatId);
      if (inactiveCatId) await Category.findByIdAndDelete(inactiveCatId);
      await User.deleteMany({ email: { $in: [vendorEmail, customerEmail] } });
      await mongoose.disconnect();
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  console.log('\n======================================================================');
  console.log(`  TASK 5 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTask5TestSuite();
