const BASE_URL = 'http://localhost:5000';

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
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== STARTING COMPLETE SAAS VENDOR REGISTRATION & ADMIN APPROVAL TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('--- 1. Testing Server Health ---');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'Server health check returns 200 OK');

  // 2. Admin Login
  console.log('\n--- 2. Authenticating Existing Admin ---');
  let adminToken = '';
  const adminEmail = 'admin@luxury.com';
  const adminPassword = 'password123';

  let adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });

  if (adminLoginRes.status !== 200) {
    console.log('  Registering admin user account...');
    const adminRegRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Executive Administrator',
        email: adminEmail,
        mobile: '9876543210',
        password: adminPassword,
      },
    });
    if (adminRegRes.status === 201) {
      adminToken = adminRegRes.data.token;
    }
  } else {
    adminToken = adminLoginRes.data.token;
  }

  assert(Boolean(adminToken), 'Admin authenticated successfully with JWT token');

  // 3. Validation Tests on Vendor Registration
  console.log('\n--- 3. Testing Vendor Registration Validation (Negative Tests) ---');
  // 3a. Missing fields
  const missingRes = await request('/api/vendor/register', { method: 'POST', body: {} });
  assert(missingRes.status === 400, 'Missing all fields returns 400 Bad Request');
  assert(Boolean(missingRes.data.errors?.name), 'Identifies missing vendor name');
  assert(Boolean(missingRes.data.errors?.email), 'Identifies missing vendor email');
  assert(Boolean(missingRes.data.errors?.storeName), 'Identifies missing store name');

  // 3b. Invalid email
  const badEmailRes = await request('/api/vendor/register', {
    method: 'POST',
    body: {
      name: 'John Doe',
      email: 'not-an-email',
      mobile: '9999999999',
      password: 'password123',
      storeName: 'Test Store',
      storeDescription: 'Description with sufficient characters',
      businessAddress: '123 Test Street',
    },
  });
  assert(badEmailRes.status === 400, 'Invalid email returns 400 Bad Request');

  // 3c. Short password (< 6 chars)
  const shortPassRes = await request('/api/vendor/register', {
    method: 'POST',
    body: {
      name: 'John Doe',
      email: 'test@email.com',
      mobile: '9999999999',
      password: '123',
      storeName: 'Test Store',
      storeDescription: 'Description with sufficient characters',
      businessAddress: '123 Test Street',
    },
  });
  assert(shortPassRes.status === 400, 'Password < 6 chars returns 400 Bad Request');

  // 4. Successful Vendor Registration (Pending by default, Unique Slug Generation)
  console.log('\n--- 4. Testing Successful Vendor Registration & Store Creation ---');
  const timestamp = Date.now();
  const vendorEmail = `vendor_${timestamp}@curatedatelier.com`;
  const vendorStoreName = `Maison Aurelia Horology ${timestamp}`;

  const regRes = await request('/api/vendor/register', {
    method: 'POST',
    body: {
      name: 'Lord Horatio Vance',
      email: vendorEmail,
      mobile: '9876543210',
      password: 'VendorSecretPassword2026!',
      storeName: vendorStoreName,
      storeDescription: 'Premier independent watchmakers crafting tourbillons with hand-engraved dials in Geneva.',
      businessAddress: 'Rue du Rhône 42, 1204 Genève, Switzerland',
      taxId: 'CHE-109.876.543',
      supportEmail: `concierge_${timestamp}@aurelia.com`,
      supportPhone: '+41 22 819 2000',
    },
  });

  assert(regRes.status === 201, 'Vendor registered successfully returns 201 Created');
  assert(Boolean(regRes.data.token), 'JWT token returned on registration');
  assert(regRes.data.user.role === 'vendor', 'User role is strictly "vendor"');
  assert(regRes.data.store.status === 'pending', 'Store status is strictly "pending" by default');
  assert(Boolean(regRes.data.store.slug), `URL-friendly unique slug created: /${regRes.data.store.slug}`);

  const vendorToken = regRes.data.token;
  const storeId = regRes.data.store.id;

  // 5. Duplicate Email & Duplicate Slug Handling
  console.log('\n--- 5. Testing Duplicate Registration & Collision Handling ---');
  // 5a. Duplicate Email
  const dupEmailRes = await request('/api/vendor/register', {
    method: 'POST',
    body: {
      name: 'Imposter Vance',
      email: vendorEmail,
      mobile: '9876543210',
      password: 'AnotherPassword!',
      storeName: 'Different Store',
      storeDescription: 'Different description with sufficient characters',
      businessAddress: 'Different address',
    },
  });
  assert(dupEmailRes.status === 400, 'Duplicate email registration blocked with 400');

  // 5b. Same Store Name (Safe Slug collision handling)
  const dupSlugRes = await request('/api/vendor/register', {
    method: 'POST',
    body: {
      name: 'Lady Vance',
      email: `second_vendor_${timestamp}@curatedatelier.com`,
      mobile: '9876543211',
      password: 'VendorSecretPassword2026!',
      storeName: vendorStoreName, // identical name
      storeDescription: 'Another watchmaker atelier with sufficient characters',
      businessAddress: 'Another address, London',
    },
  });
  assert(dupSlugRes.status === 201, 'Duplicate store name safely allowed by generating unique slug suffix');
  assert(dupSlugRes.data.store.slug !== regRes.data.store.slug, `Second slug differs safely: /${dupSlugRes.data.store.slug}`);

  // 6. Vendor Login with Credentials
  console.log('\n--- 6. Testing Vendor Login & Session Retrieval ---');
  const vendorLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: vendorEmail,
      password: 'VendorSecretPassword2026!',
    },
  });
  assert(vendorLoginRes.status === 200, 'Vendor can sign in via existing login endpoint');
  assert(vendorLoginRes.data.user.role === 'vendor', 'Login response preserves role "vendor"');

  // 7. Authenticated Vendor Profile & Status Retrieval
  console.log('\n--- 7. Testing Authenticated Vendor Store Retrieval ---');
  const vendorStoreRes = await request('/api/vendor/store', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert(vendorStoreRes.status === 200, 'Vendor can retrieve their store profile');
  assert(vendorStoreRes.data.store.status === 'pending', 'Store status accurately reflects "pending"');

  const vendorStatusRes = await request('/api/vendor/status', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert(vendorStatusRes.status === 200, 'Vendor can retrieve light application status');
  assert(vendorStatusRes.data.status === 'pending', 'Status endpoint returns "pending"');

  // 8. Permitted Store Profile Updates by Vendor
  console.log('\n--- 8. Testing Vendor Permitted Profile Updates ---');
  const updateRes = await request('/api/vendor/store', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: {
      description: 'Updated description: Handcrafted Swiss chronometers with certified in-house calibers.',
      supportPhone: '+41 22 999 8888',
    },
  });
  assert(updateRes.status === 200, 'Vendor can update permitted store fields');
  assert(updateRes.data.store.supportPhone === '+41 22 999 8888', 'Phone number updated');

  // 9. Security & Access Control: Unauthorized Admin Requests Blocked
  console.log('\n--- 9. Testing Security: Vendor Cannot Access Admin APIs ---');
  const unauthListRes = await request('/api/admin/vendors', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert(unauthListRes.status === 403, 'Vendor cannot list all applications (403 Forbidden)');

  const unauthApproveRes = await request(`/api/admin/vendors/${storeId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: { status: 'approved' },
  });
  assert(unauthApproveRes.status === 403, 'Vendor cannot approve their own application (403 Forbidden)');

  // Unauthenticated request
  const noTokenRes = await request('/api/admin/vendors');
  assert(noTokenRes.status === 401, 'Unauthenticated request returns 401 Unauthorized');

  // 10. Admin Listing & Filtering Applications
  console.log('\n--- 10. Testing Admin Vendor Application Management ---');
  const adminListRes = await request('/api/admin/vendors?status=pending', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminListRes.status === 200, 'Admin can list vendor applications');
  assert(Array.isArray(adminListRes.data.stores), 'Returns array of stores');
  assert(typeof adminListRes.data.counts?.pending === 'number', 'Returns pending count');

  // Search filter
  const adminSearchRes = await request(`/api/admin/vendors?search=${encodeURIComponent(vendorStoreName)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminSearchRes.status === 200, 'Admin can search vendor applications by name');
  assert(adminSearchRes.data.stores.length >= 1, 'Found targeted store application in search');

  // 11. Admin Rejection with Reason
  console.log('\n--- 11. Testing Admin Application Rejection & Rejection Reason ---');
  // 11a. Missing rejection reason
  const badRejectRes = await request(`/api/admin/vendors/${storeId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'rejected', rejectionReason: '' },
  });
  assert(badRejectRes.status === 400, 'Rejecting without reason is rejected with 400 Bad Request');

  // 11b. Valid rejection
  const validRejectRes = await request(`/api/admin/vendors/${storeId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      status: 'rejected',
      rejectionReason: 'Business address needs an official suite or building registration certificate.',
    },
  });
  assert(validRejectRes.status === 200, 'Application successfully rejected with reason');
  assert(validRejectRes.data.store.status === 'rejected', 'Store status updated to "rejected" in DB');

  // Check vendor views the rejection reason
  const vendorAfterReject = await request('/api/vendor/store', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert(vendorAfterReject.data.store.status === 'rejected', 'Vendor dashboard sees "rejected" status');
  assert(
    vendorAfterReject.data.store.rejectionReason.includes('suite or building registration'),
    'Vendor sees exact rejection reason from admin'
  );

  // 12. Vendor Updates Details and Resubmits
  console.log('\n--- 12. Testing Vendor Resubmission After Rejection ---');
  const resubmitRes = await request('/api/vendor/store', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: {
      businessAddress: 'Suite 101, Rue du Rhône 42, 1204 Genève, Switzerland',
      resubmit: true,
    },
  });
  assert(resubmitRes.status === 200, 'Vendor updates profile and resubmits');
  assert(resubmitRes.data.store.status === 'pending', 'Status transitions back to "pending" for review');
  assert(resubmitRes.data.store.rejectionReason === '', 'Rejection reason cleared upon resubmission');

  // 13. Admin Approval Flow
  console.log('\n--- 13. Testing Admin Approval Flow ---');
  const approveRes = await request(`/api/admin/vendors/${storeId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'approved' },
  });
  assert(approveRes.status === 200, 'Admin approves vendor application (200 OK)');
  assert(approveRes.data.store.status === 'approved', 'Store status updated to "approved" in DB');

  // Verify vendor sees approved status
  const vendorAfterApprove = await request('/api/vendor/store', {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert(vendorAfterApprove.data.store.status === 'approved', 'Vendor dashboard sees "approved" status');

  // 14. Invalid ID test
  console.log('\n--- 14. Testing Invalid MongoDB ID Handling ---');
  const invalidIdRes = await request('/api/admin/vendors/invalid-mongo-id', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(invalidIdRes.status === 400, 'Invalid MongoDB ID format returns 400 Bad Request');

  // 15. Admin Self-Approval Prevention Test
  console.log('\n--- 15. Testing Self-Approval Prevention ---');
  const { connectDB } = await import('./config/db.js');
  await connectDB();
  const Store = (await import('./models/Store.js')).default;
  const User = (await import('./models/User.js')).default;
  const adminDoc = await User.findOne({ email: adminEmail });

  const adminStore = await Store.create({
    vendor: adminDoc._id,
    name: `Admin Owned Store ${timestamp}`,
    slug: `admin-owned-store-${timestamp}`,
    description: 'An administrative store to verify self-approval prevention rule.',
    businessAddress: '1 Admin Way, London',
    status: 'pending',
  });

  const selfApproveRes = await request(`/api/admin/vendors/${adminStore._id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 'approved' },
  });
  assert(selfApproveRes.status === 403, 'Admin cannot approve their own store application (403 Forbidden)');

  // Clean up test admin store
  await Store.findByIdAndDelete(adminStore._id);

  console.log(`\n======================================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
