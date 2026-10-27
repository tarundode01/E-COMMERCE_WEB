/**
 * Comprehensive Task 2 Automated Test Suite
 * Tests Vendor Login, Authentication, Role-Based Access Control, Approval Flow, and Data Security
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

async function runTask2TestSuite() {
  console.log('================================================================');
  console.log('  TASK 2: VENDOR LOGIN, AUTHENTICATION & ACCESS CONTROL TESTS  ');
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

  // Connect to MongoDB directly for safe test teardown / state modification
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium-ecommerce';
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const vendor1Email = `task2_vendor_${timestamp}@brandlux.com`;
  const vendor1Password = 'SecurePass123!';
  const vendor2Email = `task2_vendor2_${timestamp}@altbrand.com`;
  const vendor2Password = 'AltSecurePass456!';
  const customerEmail = `task2_customer_${timestamp}@luxuryuser.com`;
  const customerPassword = 'CustomerPass123!';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@luxury.com').toLowerCase();
  const adminPassword = 'password123';

  let vendor1Token = null;
  let vendor1StoreId = null;
  let vendor2Token = null;
  let vendor2StoreId = null;
  let adminToken = null;
  let customerToken = null;

  try {
    // -------------------------------------------------------------
    // 1. HEALTH CHECK
    // -------------------------------------------------------------
    console.log('--- 1. Health & Pre-flight Check ---');
    const health = await request('/api/health');
    assert(health.status === 200 && (health.data.success || health.data.status === 'ok'), 'Backend server is healthy and responding');

    // -------------------------------------------------------------
    // 2. ADMIN AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Admin Authentication ---');
    let adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });

    if (adminLogin.status !== 200) {
      console.log('  Creating admin user account for tests...');
      await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Super Admin',
          email: adminEmail,
          mobile: '9999999999',
          password: adminPassword,
        },
      });
      adminLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: adminEmail, password: adminPassword },
      });
    }

    assert(adminLogin.status === 200, 'Admin can log in successfully');
    assert(adminLogin.data?.user?.role === 'admin', 'Admin user role is verified as "admin"');
    adminToken = adminLogin.data?.token;

    // -------------------------------------------------------------
    // 3. VENDOR REGISTRATION & INITIAL PENDING STATE
    // -------------------------------------------------------------
    console.log('\n--- 3. Vendor Registration & Initial State ---');
    const regRes = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Aurelia Vance',
        email: vendor1Email,
        mobile: '9876543210',
        password: vendor1Password,
        storeName: `Vance Luxury Atelier ${timestamp}`,
        storeDescription: 'Exquisite handcrafted leather accessories and fine silk goods.',
        businessAddress: '742 Evergreen Terrace, Milan, Italy',
        taxId: 'IT-99283741',
        supportEmail: 'contact@vanceatelier.com',
        supportPhone: '9876543210',
      },
    });

    assert(regRes.status === 201, 'Vendor 1 registered successfully (HTTP 201)');
    assert(regRes.data?.user?.role === 'vendor', 'Registered user has role "vendor"');
    assert(regRes.data?.store?.status === 'pending', 'New store application defaults to "pending"');
    vendor1StoreId = regRes.data?.store?.id;

    // -------------------------------------------------------------
    // 4. VENDOR LOGIN WITH VALID CREDENTIALS
    // -------------------------------------------------------------
    console.log('\n--- 4. Vendor Login with Valid Credentials ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendor1Email, password: vendor1Password },
    });

    assert(loginRes.status === 200, 'Vendor 1 logged in successfully (HTTP 200)');
    assert(typeof loginRes.data?.token === 'string' && loginRes.data.token.length > 20, 'Login returns JWT token');
    assert(loginRes.data?.user?.email === vendor1Email.toLowerCase(), 'Login returns matching email');
    assert(loginRes.data?.user?.role === 'vendor', 'Login response confirms role "vendor"');
    assert(!loginRes.data?.user?.password, 'Login response does NOT expose password or password hash');
    assert(loginRes.data?.store?.id === vendor1StoreId, 'Login response returns populated store details');
    assert(loginRes.data?.store?.status === 'pending', 'Store status in login response is "pending"');
    vendor1Token = loginRes.data?.token;

    // -------------------------------------------------------------
    // 5. VENDOR LOGIN WITH INVALID CREDENTIALS (SAFE ERROR HANDLING)
    // -------------------------------------------------------------
    console.log('\n--- 5. Safe Error Handling on Invalid Credentials ---');
    const badPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendor1Email, password: 'WrongPassword999!' },
    });
    assert(badPassRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');
    assert(
      badPassRes.data?.message === 'Invalid email or password credentials',
      'Returns generic, safe error message without leaking email existence'
    );

    const badEmailRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent_account_xyz@luxury.com', password: 'Password123!' },
    });
    assert(badEmailRes.status === 401, 'Login with non-existent email returns 401 Unauthorized');
    assert(
      badEmailRes.data?.message === 'Invalid email or password credentials',
      'Returns identical generic safe error message for missing accounts'
    );

    // -------------------------------------------------------------
    // 6. UNATHENTICATED / LOGGED-OUT ACCESS RESTRICTIONS
    // -------------------------------------------------------------
    console.log('\n--- 6. Unauthenticated (Logged-Out) Access Restrictions ---');
    const unauthStore = await request('/api/vendor/store');
    assert(unauthStore.status === 401, 'Logged-out access to /api/vendor/store denied with 401');

    const unauthFeatures = await request('/api/vendor/features');
    assert(unauthFeatures.status === 401, 'Logged-out access to /api/vendor/features denied with 401');

    const unauthProfile = await request('/api/auth/profile');
    assert(unauthProfile.status === 401, 'Logged-out access to /api/auth/profile denied with 401');

    const invalidTokenRes = await request('/api/vendor/store', {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    assert(invalidTokenRes.status === 401, 'Invalid signature JWT token denied with 401');

    // -------------------------------------------------------------
    // 7. APPROVAL-BASED ACCESS CONTROL (PENDING VENDOR)
    // -------------------------------------------------------------
    console.log('\n--- 7. Approval-Based Access: Pending Vendor ---');
    const pendingStoreRes = await request('/api/vendor/store', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(pendingStoreRes.status === 200, 'Pending vendor CAN view their own store profile');
    assert(pendingStoreRes.data?.store?.status === 'pending', 'Store profile reflects pending status');

    const pendingFeaturesRes = await request('/api/vendor/features', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      pendingFeaturesRes.status === 403,
      'Pending vendor CANNOT access approved-only features (/api/vendor/features returns 403 Forbidden)'
    );
    assert(
      pendingFeaturesRes.data?.storeStatus === 'pending',
      'Forbidden response specifies store application is pending'
    );

    // -------------------------------------------------------------
    // 8. APPROVAL-BASED ACCESS CONTROL (APPROVED VENDOR)
    // -------------------------------------------------------------
    console.log('\n--- 8. Approval-Based Access: Approved Vendor ---');
    const approveAction = await request(`/api/admin/vendors/${vendor1StoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveAction.status === 200, 'Admin approves vendor store successfully');

    const approvedFeaturesRes = await request('/api/vendor/features', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      approvedFeaturesRes.status === 200,
      'Approved vendor CAN access approved commercial features (HTTP 200 OK)'
    );
    assert(
      approvedFeaturesRes.data?.storeStatus === 'approved' && approvedFeaturesRes.data?.canSell === true,
      'Approved features response confirms active selling privileges'
    );

    // -------------------------------------------------------------
    // 9. APPROVAL-BASED ACCESS CONTROL (REJECTED VENDOR)
    // -------------------------------------------------------------
    console.log('\n--- 9. Approval-Based Access: Rejected Vendor ---');
    const rejectReasonText = 'Tax identification documentation is illegible. Please re-upload.';
    const rejectAction = await request(`/api/admin/vendors/${vendor1StoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'rejected', rejectionReason: rejectReasonText },
    });
    assert(rejectAction.status === 200, 'Admin rejects vendor store with reason');

    const rejectedStoreRes = await request('/api/vendor/store', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(rejectedStoreRes.status === 200, 'Rejected vendor can still view their profile information');
    assert(
      rejectedStoreRes.data?.store?.rejectionReason === rejectReasonText,
      'Rejected vendor can view admin rejection feedback'
    );

    const rejectedFeaturesRes = await request('/api/vendor/features', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      rejectedFeaturesRes.status === 403,
      'Rejected vendor CANNOT access approved-only features (HTTP 403 Forbidden)'
    );
    assert(
      rejectedFeaturesRes.data?.rejectionReason === rejectReasonText,
      'Forbidden error returns rejection reason for client display'
    );

    // Restore to approved for subsequent tests
    await request(`/api/admin/vendors/${vendor1StoreId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });

    // -------------------------------------------------------------
    // 10. ACCOUNT SUSPENSION & INACTIVE CHECKS
    // -------------------------------------------------------------
    console.log('\n--- 10. Account Suspension & Inactive Checks ---');
    // Suspend user directly in DB
    await User.findByIdAndUpdate(loginRes.data.user.id, { status: 'suspended', isActive: false });

    // Try logging in with suspended account
    const suspendedLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: vendor1Email, password: vendor1Password },
    });
    assert(
      suspendedLogin.status === 403,
      'Suspended vendor cannot log in (HTTP 403 Forbidden)'
    );
    assert(
      suspendedLogin.data?.accountStatus === 'suspended',
      'Suspended login returns accountStatus: suspended'
    );

    // Try using existing token with suspended account
    const suspendedTokenReq = await request('/api/vendor/store', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      suspendedTokenReq.status === 403,
      'Suspended vendor with active token is denied protected API access (HTTP 403 Forbidden)'
    );

    // Re-activate user
    await User.findByIdAndUpdate(loginRes.data.user.id, { status: 'active', isActive: true });

    // Now test store suspension
    await Store.findByIdAndUpdate(vendor1StoreId, { status: 'suspended' });
    const suspendedStoreReq = await request('/api/vendor/features', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      suspendedStoreReq.status === 403,
      'Vendor with suspended store is denied commercial features (HTTP 403 Forbidden)'
    );
    assert(
      suspendedStoreReq.data?.storeStatus === 'suspended',
      'Error identifies store is suspended'
    );

    // Restore store to approved
    await Store.findByIdAndUpdate(vendor1StoreId, { status: 'approved' });

    // -------------------------------------------------------------
    // 11. STRICT CROSS-VENDOR DATA ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 11. Strict Cross-Vendor Data Isolation ---');
    // Register Vendor 2
    const regRes2 = await request('/api/vendor/register', {
      method: 'POST',
      body: {
        name: 'Julian Ross',
        email: vendor2Email,
        mobile: '9123456780',
        password: vendor2Password,
        storeName: `Ross Heritage Horology ${timestamp}`,
        storeDescription: 'Luxury Swiss chronographs and horological masterworks.',
        businessAddress: '12 Rue du Rhone, Geneva, Switzerland',
        taxId: 'CH-4482910',
        supportEmail: 'contact@rosshorology.ch',
        supportPhone: '9123456780',
      },
    });
    vendor2Token = regRes2.data?.token;
    vendor2StoreId = regRes2.data?.store?.id;

    // Vendor 2 attempts to view Vendor 1's store by ID
    const crossVendorAccess = await request(`/api/vendor/store/${vendor1StoreId}`, {
      headers: { Authorization: `Bearer ${vendor2Token}` },
    });
    assert(
      crossVendorAccess.status === 403,
      'Vendor 2 attempting to access Vendor 1\'s store dossier is DENIED (HTTP 403 Forbidden)'
    );
    assert(
      crossVendorAccess.data?.message?.includes('permission'),
      'Strict cross-vendor isolation message returned'
    );

    // Vendor 1 accesses their own store by ID
    const ownStoreAccess = await request(`/api/vendor/store/${vendor1StoreId}`, {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      ownStoreAccess.status === 200,
      'Vendor 1 can successfully access their own store by ID (HTTP 200 OK)'
    );

    // Admin accesses Vendor 1's store by ID (oversight permission)
    const adminStoreAccess = await request(`/api/vendor/store/${vendor1StoreId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminStoreAccess.status === 200,
      'Super Admin can access store dossier for administrative review (HTTP 200 OK)'
    );

    // -------------------------------------------------------------
    // 12. ROLE BOUNDARIES: VENDOR ACCESS TO ADMIN-ONLY APIS
    // -------------------------------------------------------------
    console.log('\n--- 12. Role Boundaries: Vendor Denied Admin Routes ---');
    const vendorCallAdminVendors = await request('/api/admin/vendors', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      vendorCallAdminVendors.status === 403,
      'Vendor calling admin endpoint /api/admin/vendors is BLOCKED (HTTP 403 Forbidden)'
    );

    const vendorCallAdminAnalytics = await request('/api/admin/analytics/summary', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(
      vendorCallAdminAnalytics.status === 403,
      'Vendor calling admin endpoint /api/admin/analytics/summary is BLOCKED (HTTP 403 Forbidden)'
    );

    // -------------------------------------------------------------
    // 13. SESSION RESTORATION & PROFILE VERIFICATION ON REFRESH
    // -------------------------------------------------------------
    console.log('\n--- 13. Session Restoration & Profile Endpoint ---');
    const profileRes = await request('/api/auth/profile', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(profileRes.status === 200, 'GET /api/auth/profile returns HTTP 200');
    assert(profileRes.data?.user?.email === vendor1Email.toLowerCase(), 'Profile returns authenticated vendor identity');
    assert(profileRes.data?.store?.id === vendor1StoreId, 'Profile returns associated store details');

    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${vendor1Token}` },
    });
    assert(meRes.status === 200, 'GET /api/auth/me alias returns HTTP 200');
    assert(meRes.data?.user?.email === vendor1Email.toLowerCase(), 'Me endpoint returns authenticated user identity');

    // -------------------------------------------------------------
    // 14. REGRESSION VERIFICATION: CUSTOMER & ADMIN AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n--- 14. Regression: Customer & Admin Authentication ---');
    // Register customer
    const custReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Lord Hamilton',
        email: customerEmail,
        mobile: '9888877777',
        password: customerPassword,
      },
    });
    assert(custReg.status === 201, 'Customer registered successfully');
    assert(custReg.data?.user?.role === 'user', 'Customer role is "user"');
    customerToken = custReg.data?.token;

    // Customer login
    const custLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: customerEmail, password: customerPassword },
    });
    assert(custLogin.status === 200, 'Customer logged in successfully');
    assert(custLogin.data?.user?.role === 'user', 'Customer retains role "user"');

    // Customer attempts to access vendor-protected endpoint
    const custVendorReq = await request('/api/vendor/store', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custVendorReq.status === 403,
      'Customer cannot access vendor endpoint /api/vendor/store (HTTP 403 Forbidden)'
    );

    // Customer attempts to access admin endpoint
    const custAdminReq = await request('/api/admin/vendors', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      custAdminReq.status === 403,
      'Customer cannot access admin endpoint /api/admin/vendors (HTTP 403 Forbidden)'
    );

    // Admin verifies vendor list
    const adminVendors = await request('/api/admin/vendors', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminVendors.status === 200, 'Admin can access /api/admin/vendors successfully');
    assert(Array.isArray(adminVendors.data?.stores), 'Admin receives vendor applications list array');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // Teardown test accounts safely
    try {
      console.log('\n--- Test Teardown ---');
      await User.deleteMany({ email: { $in: [vendor1Email.toLowerCase(), vendor2Email.toLowerCase(), customerEmail.toLowerCase()] } });
      await Store.deleteMany({ _id: { $in: [vendor1StoreId, vendor2StoreId] } });
      console.log('  Cleaned up temporary test users and stores.');
    } catch (e) {
      console.error('Teardown warning:', e.message);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`  TASK 2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask2TestSuite();
