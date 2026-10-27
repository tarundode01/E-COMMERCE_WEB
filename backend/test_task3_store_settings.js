/**
 * Comprehensive Task 3 Automated Test Suite
 * Tests Vendor Store Profile, Store Settings, Image Uploads, Custom Slugs,
 * Public Storefront Profiles, Privilege Field Tampering Defenses, and Security Boundaries
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Store from './models/Store.js';
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

async function runTask3TestSuite() {
  console.log('================================================================');
  console.log('  TASK 3: VENDOR STORE PROFILE & SETTINGS AUTOMATED TEST SUITE  ');
  console.log('================================================================\n');

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

  // Connect to MongoDB directly for safe test teardown
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const vendor1Email = `task3_vance_${timestamp}@atelier.com`;
  const vendor1Password = 'AtelierPass123!';
  const vendor2Email = `task3_ross_${timestamp}@horology.com`;
  const vendor2Password = 'HorologyPass456!';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
  const adminPassword = 'password123';

  let vendor1Token = null;
  let vendor1StoreId = null;
  let vendor2Token = null;
  let vendor2StoreId = null;
  let adminToken = null;

  try {
    // -------------------------------------------------------------
    // 1. HEALTH & ADMIN AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- 1. Health & Admin Authentication ---');
    const health = await request('/api/health');
    assert(health.status === 200 && (health.data?.status === 'ok' || health.data?.success), 'Backend server is running');

    let adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    if (adminLogin.status !== 200) {
      await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Admin', email: adminEmail, mobile: '9999999999', password: adminPassword },
      });
      adminLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword },
      });
    }
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin authenticated');
    adminToken = adminLogin.data?.token;

    // -------------------------------------------------------------
    // 2. VENDOR 1 REGISTRATION & DEFAULT SETTINGS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Vendor Registration & Default Store Settings ---');
    const regRes1 = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Lord Horatio Vance',
        email: vendor1Email,
        mobile: '9876543210',
        password: vendor1Password,
        storeName: `Vance Leather Atelier ${timestamp}`,
        storeDescription: 'Master leather artisans crafting bespoke Florentine luggage.',
        businessAddress: 'Via de Tornabuoni 12, Florence, Italy',
        taxId: 'IT-VAT-992019',
        supportEmail: 'concierge@vanceleather.it',
        supportPhone: '+39 055 219 440',
      },
    });

    assert(regRes1.status === 201, 'Vendor 1 registered successfully');
    vendor1Token = regRes1.data?.token;
    vendor1StoreId = regRes1.data?.store?.id;

    // Fetch initial store settings
    const initialStore = await request('/api/vendor/store', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(initialStore.status === 200, 'Vendor 1 can fetch store profile');
    assert(initialStore.data?.store?.isOpen === true, 'Default store isOpen is true');
    assert(initialStore.data?.store?.isPubliclyVisible === true, 'Default isPubliclyVisible is true');
    assert(initialStore.data?.store?.deliveryAvailable === true, 'Default deliveryAvailable is true');
    assert(Boolean(initialStore.data?.store?.openingHours?.monday), 'Default openingHours schedule populated');

    // -------------------------------------------------------------
    // 3. VENDOR STORE PROFILE UPDATES (NAME, BIO, CONTACT, TAX)
    // -------------------------------------------------------------
    console.log('\n--- 3. Permitted Store Profile Updates ---');
    const updateProfileRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: {
        name: `Maison Vance Atelier ${timestamp}`,
        description: 'Exquisite Florentine leather goods, handcrafted trunks, and equestrian accessories.',
        businessAddress: 'Piazza della Signoria 8, Florence, Italy',
        supportEmail: 'support@maisonvance.it',
        supportPhone: '+39 055 889 000',
        taxId: 'IT-VAT-992019-REV',
        logoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
        bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
      },
    });

    assert(updateProfileRes.status === 200, 'Profile fields updated successfully (HTTP 200)');
    assert(updateProfileRes.data?.store?.name === `Maison Vance Atelier ${timestamp}`, 'Store name updated in response');
    assert(updateProfileRes.data?.store?.taxId === 'IT-VAT-992019-REV', 'Tax ID updated in response');
    assert(Boolean(updateProfileRes.data?.store?.logoUrl), 'Logo URL updated in response');
    assert(Boolean(updateProfileRes.data?.store?.bannerUrl), 'Banner URL updated in response');

    // -------------------------------------------------------------
    // 4. VENDOR STORE SETTINGS UPDATES (HOURS, PICKUP, DELIVERY, VISIBILITY)
    // -------------------------------------------------------------
    console.log('\n--- 4. Store Settings Updates (Hours, Logistics, Switches) ---');
    const customHours = {
      monday: { open: '10:00', close: '19:00', isClosed: false },
      tuesday: { open: '10:00', close: '19:00', isClosed: false },
      wednesday: { open: '10:00', close: '19:00', isClosed: false },
      thursday: { open: '10:00', close: '20:00', isClosed: false },
      friday: { open: '10:00', close: '20:00', isClosed: false },
      saturday: { open: '11:00', close: '18:00', isClosed: false },
      sunday: { open: '12:00', close: '17:00', isClosed: true },
    };

    const updateSettingsRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: {
        isOpen: false, // Temporarily closed for seasonal collection change
        isPubliclyVisible: true,
        pickupAddress: 'Private Salon, Floor 2, Piazza della Signoria 8, Florence',
        deliveryAvailable: true,
        deliveryNotes: 'White-glove courier shipping across Europe within 2 business days.',
        openingHours: customHours,
      },
    });

    assert(updateSettingsRes.status === 200, 'Settings updated successfully (HTTP 200)');
    assert(updateSettingsRes.data?.store?.isOpen === false, 'isOpen toggled to false');
    assert(
      updateSettingsRes.data?.store?.pickupAddress === 'Private Salon, Floor 2, Piazza della Signoria 8, Florence',
      'pickupAddress persisted'
    );
    assert(
      updateSettingsRes.data?.store?.deliveryNotes.includes('White-glove'),
      'deliveryNotes persisted'
    );
    assert(
      updateSettingsRes.data?.store?.openingHours?.sunday?.isClosed === true,
      'Opening hours Sunday isClosed persisted'
    );

    // Verify persistence directly from MongoDB
    const dbStore = await Store.findById(vendor1StoreId);
    assert(dbStore.isOpen === false, 'MongoDB record reflects updated isOpen');
    assert(dbStore.pickupAddress.includes('Private Salon'), 'MongoDB record reflects updated pickupAddress');
    assert(dbStore.openingHours.monday.open === '10:00', 'MongoDB record reflects updated opening hours');

    // -------------------------------------------------------------
    // 5. CUSTOM URL SLUG VALIDATION & DUPLICATE CHECKS
    // -------------------------------------------------------------
    console.log('\n--- 5. Custom URL Slug Validation ---');
    const validSlug = `vance-florence-${timestamp}`;
    const slugUpdateRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { slug: validSlug },
    });
    assert(slugUpdateRes.status === 200, 'Valid custom slug accepted (HTTP 200)');
    assert(slugUpdateRes.data?.store?.slug === validSlug, 'Store slug updated to custom value');

    // Invalid slug format (spaces or uppercase or invalid chars)
    const badSlugRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { slug: 'Invalid Slug With Spaces!' },
    });
    assert(badSlugRes.status === 400, 'Invalid slug format rejected with 400 Bad Request');
    assert(Boolean(badSlugRes.data?.errors?.slug), 'Error specifies invalid slug format');

    // -------------------------------------------------------------
    // 6. REGISTER VENDOR 2 & PREVENT DUPLICATE SLUG CLAIM
    // -------------------------------------------------------------
    console.log('\n--- 6. Duplicate Slug Collision Prevention ---');
    const regRes2 = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Julian Ross',
        email: vendor2Email,
        mobile: '9123456789',
        password: vendor2Password,
        storeName: `Ross Heritage Horology ${timestamp}`,
        storeDescription: 'Swiss mechanical chronographs and complications.',
        businessAddress: 'Rue du Rhône 42, Geneva, Switzerland',
        taxId: 'CH-CHE-109',
        supportEmail: 'contact@rosshorology.ch',
        supportPhone: '+41 22 819 2000',
      },
    });
    assert(regRes2.status === 201, 'Vendor 2 registered successfully');
    vendor2Token = regRes2.data?.token;
    vendor2StoreId = regRes2.data?.store?.id;

    // Vendor 2 attempts to claim Vendor 1's slug
    const duplicateSlugRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor2Token}` },
      body: { slug: validSlug },
    });
    assert(duplicateSlugRes.status === 400, 'Claiming already taken slug returns 400 Bad Request');
    assert(
      duplicateSlugRes.data?.errors?.slug?.includes('already claimed') ||
      duplicateSlugRes.data?.message?.includes('Validation failed'),
      'Collision error message identifies slug collision'
    );

    // -------------------------------------------------------------
    // 7. CROSS-VENDOR ISOLATION: CANNOT READ OR MODIFY OTHER STORE
    // -------------------------------------------------------------
    console.log('\n--- 7. Cross-Vendor Isolation ---');
    // Vendor 2 tries to access Vendor 1's store by ID
    const crossVendorRead = await request(`/api/vendor/store/${vendor1StoreId}`, {
      headers: { Authorization: `Bearer ${vendor2Token}` },
    });
    assert(crossVendorRead.status === 403, 'Vendor 2 cannot read Vendor 1\'s store dossier (403 Forbidden)');

    // Vendor 2 passes an update with Vendor 1's store ID in body
    // The server must derive store strictly from req.user._id and ignore any client store ID
    await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor2Token}` },
      body: {
        _id: vendor1StoreId,
        storeId: vendor1StoreId,
        name: 'Hacked Store Name',
      },
    });
    const vendor1Check = await Store.findById(vendor1StoreId);
    assert(
      vendor1Check.name !== 'Hacked Store Name',
      'Server strictly derives ownership from authenticated user; client-supplied store ID ignored'
    );

    // -------------------------------------------------------------
    // 8. DEFENSE AGAINST PRIVILEGED FIELD TAMPERING
    // -------------------------------------------------------------
    console.log('\n--- 8. Defense Against Privileged Field Tampering ---');
    // Vendor tries to approve their own store or reassign owner ID
    const tamperRes = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: {
        status: 'approved',
        rejectionReason: 'Self-approved hacker',
        reviewedBy: '666666666666666666666666',
        vendor: '777777777777777777777777',
      },
    });
    assert(tamperRes.status === 200, 'Request processed without server crash');
    const dbVendor1AfterTamper = await Store.findById(vendor1StoreId);
    assert(
      dbVendor1AfterTamper.status === 'pending',
      'Protected field "status" CANNOT be modified by vendor update (remains pending)'
    );
    assert(
      dbVendor1AfterTamper.vendor.toString() === regRes1.data?.user?.id,
      'Protected field "vendor" owner ID CANNOT be modified by vendor update'
    );

    // -------------------------------------------------------------
    // 9. UNAUTHENTICATED REQUESTS REJECTED
    // -------------------------------------------------------------
    console.log('\n--- 9. Unauthenticated Request Rejections ---');
    const unauthGet = await request('/api/vendor/store');
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/vendor/store returns 401 Unauthorized');

    const unauthPut = await request('/api/vendor/store', {
      method: 'PUT',
      body: { name: 'Unauthenticated update' },
    });
    assert(unauthPut.status === 401, 'Unauthenticated PUT /api/vendor/store returns 401 Unauthorized');

    const unauthUpload = await request('/api/vendor/upload', { method: 'POST' });
    assert(unauthUpload.status === 401, 'Unauthenticated POST /api/vendor/upload returns 401 Unauthorized');

    // -------------------------------------------------------------
    // 10. PUBLIC STOREFRONT PROFILE (PENDING VS APPROVED VS HIDDEN)
    // -------------------------------------------------------------
    console.log('\n--- 10. Public Storefront Profile Endpoint ---');
    // While store is pending:
    const publicPending = await request(`/api/vendor/public/${validSlug}`);
    assert(
      publicPending.status === 404,
      'Public endpoint returns 404 when store application is still pending'
    );

    // Admin approves Vendor 1 store
    await request(`/api/admin/vendors/${vendor1StoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });

    // Re-open store for public view
    await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { isOpen: true, isPubliclyVisible: true },
    });

    // Now approved and visible store should be accessible publicly
    const publicApproved = await request(`/api/vendor/public/${validSlug}`);
    assert(publicApproved.status === 200, 'Public endpoint returns 200 OK for approved, visible store');
    assert(publicApproved.data?.store?.name.includes('Maison Vance'), 'Public store returns store name');
    assert(publicApproved.data?.store?.isOpen === true, 'Public store returns isOpen status');
    assert(Boolean(publicApproved.data?.store?.openingHours), 'Public store returns openingHours');

    // Verify alias endpoint /api/stores/:slug
    const publicAlias = await request(`/api/stores/${validSlug}`);
    assert(publicAlias.status === 200, 'Public alias endpoint /api/stores/:slug returns 200 OK');

    // Sensitive fields check: ensure taxId, rejectionReason, reviewedBy, vendor user ID are omitted
    assert(publicApproved.data?.store?.taxId === undefined, 'Public response strictly OMITS taxId');
    assert(publicApproved.data?.store?.rejectionReason === undefined, 'Public response strictly OMITS rejectionReason');
    assert(publicApproved.data?.store?.vendor === undefined, 'Public response strictly OMITS internal vendor user ID');

    // Vendor hides their store (isPubliclyVisible: false)
    await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { isPubliclyVisible: false },
    });
    const publicHidden = await request(`/api/vendor/public/${validSlug}`);
    assert(
      publicHidden.status === 404,
      'Public endpoint returns 404 when store isPubliclyVisible is toggled to false'
    );

    // Restore visibility
    await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { isPubliclyVisible: true },
    });

    // -------------------------------------------------------------
    // 11. SUSPENDED ACCOUNT & STORE BOUNDARIES
    // -------------------------------------------------------------
    console.log('\n--- 11. Suspended Account & Store Protections ---');
    // Suspend user in DB
    await User.findByIdAndUpdate(regRes1.data?.user?.id, { status: 'suspended', isActive: false });

    // Suspended vendor attempts to update store
    const suspendedUpdate = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { name: 'Attempted Update While Suspended' },
    });
    assert(
      suspendedUpdate.status === 403,
      'Suspended user cannot update store profile or settings (403 Forbidden)'
    );

    // Public storefront of suspended vendor
    const publicSuspended = await request(`/api/vendor/public/${validSlug}`);
    assert(
      publicSuspended.status === 404,
      'Suspended vendor store is hidden from public storefront (404 Not Found)'
    );

    // Restore user
    await User.findByIdAndUpdate(regRes1.data?.user?.id, { status: 'active', isActive: true });

    // Suspend store
    await Store.findByIdAndUpdate(vendor1StoreId, { status: 'suspended' });
    const suspendedStoreUpdate = await request('/api/vendor/store', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${vendor1Token}` },
      body: { name: 'Attempted Update While Store Suspended' },
    });
    assert(
      suspendedStoreUpdate.status === 403,
      'Suspended store cannot be updated by vendor (403 Forbidden)'
    );

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    console.log('\n--- Teardown Test Data ---');
    try {
      await User.deleteMany({ email: { $in: [vendor1Email.toLowerCase(), vendor2Email.toLowerCase()] } });
      await Store.deleteMany({ _id: { $in: [vendor1StoreId, vendor2StoreId] } });
      console.log('  Cleaned up temporary test users and stores.');
    } catch (e) {
      console.error('Teardown warning:', e.message);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`  TASK 3 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask3TestSuite();
