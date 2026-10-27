import mongoose from 'mongoose';
import Store from '../models/Store.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

/**
 * @desc    Get all vendor applications with pagination, status filter, search, and dynamic sales statistics
 * @route   GET /api/admin/vendors
 * @access  Private (Admin only)
 */
export const getVendorApplications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    // Build filter query
    const filter = {};

    // Status filter
    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    // Search filter across store name, slug, or matching vendor user IDs
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Find users matching search to include their stores
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { businessAddress: searchRegex },
        { taxId: searchRegex },
        { vendor: { $in: userIds } },
      ];
    }

    // Execute store queries
    const [stores, totalCount, pendingCount, approvedCount, rejectedCount, suspendedCount] =
      await Promise.all([
        Store.find(filter)
          .populate('vendor', 'name email mobile role createdAt status')
          .populate('reviewedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Store.countDocuments(filter),
        Store.countDocuments({ status: 'pending' }),
        Store.countDocuments({ status: 'approved' }),
        Store.countDocuments({ status: 'rejected' }),
        Store.countDocuments({ status: 'suspended' }),
      ]);

    const storeIds = stores.map((s) => s._id);

    // Dynamic Sales Aggregation for these specific stores from real non-cancelled Orders
    const salesAggregation = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' }, stores: { $in: storeIds } } },
      { $unwind: '$products' },
      { $match: { 'products.store': { $in: storeIds } } },
      {
        $group: {
          _id: '$products.store',
          totalSales: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
          itemsSold: { $sum: '$products.quantity' },
          orderIds: { $addToSet: '$_id' },
        },
      },
    ]);

    const salesMap = {};
    salesAggregation.forEach((item) => {
      salesMap[item._id.toString()] = {
        totalSales: Math.round(item.totalSales || 0),
        itemsSold: item.itemsSold || 0,
        ordersCount: (item.orderIds || []).length,
      };
    });

    // Product count per store
    const productCountAgg = await Product.aggregate([
      { $match: { store: { $in: storeIds } } },
      { $group: { _id: '$store', count: { $sum: 1 } } },
    ]);

    const productCountMap = {};
    productCountAgg.forEach((item) => {
      productCountMap[item._id.toString()] = item.count;
    });

    // Overall total marketplace GMV across all completed/active vendor orders
    const overallGmvAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalMarketplaceSales = Math.round(overallGmvAgg[0]?.total || 0);

    const totalStoresAll = await Store.countDocuments();
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return res.status(200).json({
      success: true,
      stores: stores.map((s) => {
        const stats = salesMap[s._id.toString()] || {
          totalSales: 0,
          itemsSold: 0,
          ordersCount: 0,
        };
        const productsCount = productCountMap[s._id.toString()] || 0;

        return {
          id: s._id,
          _id: s._id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          businessAddress: s.businessAddress,
          taxId: s.taxId,
          supportEmail: s.supportEmail,
          supportPhone: s.supportPhone,
          status: s.status,
          rejectionReason: s.rejectionReason,
          reviewedAt: s.reviewedAt,
          reviewedBy: s.reviewedBy,
          vendor: s.vendor,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          // Live Commercial Sales Ledger
          totalSales: stats.totalSales,
          totalOrders: stats.ordersCount,
          ordersCount: stats.ordersCount,
          itemsSold: stats.itemsSold,
          productsCount,
        };
      }),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      counts: {
        all: totalStoresAll,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
      },
      summary: {
        totalVendors: totalStoresAll,
        pendingApprovals: pendingCount,
        approvedVendors: approvedCount,
        totalMarketplaceSales,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor applications.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get single vendor application by ID with complete sales ledger
 * @route   GET /api/admin/vendors/:id
 * @access  Private (Admin only)
 */
export const getVendorApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor store application ID format.',
      });
    }

    const store = await Store.findById(id)
      .populate('vendor', 'name email mobile role createdAt status')
      .populate('reviewedBy', 'name email');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Vendor store application not found.',
      });
    }

    // Sales metrics for this store
    const salesAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' }, stores: store._id } },
      { $unwind: '$products' },
      { $match: { 'products.store': store._id } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
          itemsSold: { $sum: '$products.quantity' },
          ordersCount: { $addToSet: '$_id' },
        },
      },
    ]);

    const totalSales = Math.round(salesAgg[0]?.totalSales || 0);
    const totalOrders = (salesAgg[0]?.ordersCount || []).length;
    const itemsSold = salesAgg[0]?.itemsSold || 0;
    const productsCount = await Product.countDocuments({ store: store._id });

    // Latest customer orders containing this vendor's creations
    const recentOrders = await Order.find({ stores: store._id })
      .populate('customer', 'name email mobile')
      .select('orderNumber totalAmount orderStatus deliveryAddress createdAt products')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      store: {
        id: store._id,
        _id: store._id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        businessAddress: store.businessAddress,
        taxId: store.taxId,
        supportEmail: store.supportEmail,
        supportPhone: store.supportPhone,
        status: store.status,
        rejectionReason: store.rejectionReason,
        reviewedAt: store.reviewedAt,
        reviewedBy: store.reviewedBy,
        vendor: store.vendor,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        totalSales,
        totalOrders,
        itemsSold,
        productsCount,
        recentOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor dossier by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor application dossier.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Approve, reject, or suspend a vendor store application
 * @route   PATCH /api/admin/vendors/:id/status
 * @access  Private (Admin only)
 */
export const updateVendorApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Validate ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store application ID format.',
      });
    }

    // Validate Status choice
    const allowed = ['approved', 'rejected', 'suspended', 'pending'];
    if (!status || !allowed.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved', 'rejected', 'suspended', or 'pending'.",
      });
    }

    const targetStatus = status.toLowerCase();

    // Rejection reason validation
    if (targetStatus === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A rejection reason is required when rejecting a vendor application.',
          errors: { rejectionReason: 'Rejection reason cannot be empty' },
        });
      }
      if (rejectionReason.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a detailed rejection reason (at least 5 characters).',
          errors: { rejectionReason: 'Rejection reason must be at least 5 characters' },
        });
      }
    }

    // Fetch store
    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Vendor store application not found.',
      });
    }

    // Update status and audit trail
    store.status = targetStatus;
    store.rejectionReason = targetStatus === 'rejected' ? rejectionReason.trim() : '';
    store.reviewedBy = req.user._id;
    store.reviewedAt = new Date();

    await store.save();

    // Sync vendor user account status and role
    if (store.vendor) {
      if (targetStatus === 'approved') {
        await User.findByIdAndUpdate(store.vendor, {
          role: 'vendor',
          status: 'active',
          isActive: true,
        });
      } else if (targetStatus === 'suspended') {
        await User.findByIdAndUpdate(store.vendor, {
          status: 'suspended',
        });
      }
    }

    const populatedStore = await Store.findById(store._id)
      .populate('vendor', 'name email mobile role createdAt status')
      .populate('reviewedBy', 'name email');

    return res.status(200).json({
      success: true,
      message:
        targetStatus === 'approved'
          ? `Vendor store "${store.name}" has been successfully approved and activated.`
          : targetStatus === 'suspended'
          ? `Vendor store "${store.name}" has been suspended.`
          : `Vendor store "${store.name}" application has been rejected.`,
      store: {
        id: populatedStore._id,
        _id: populatedStore._id,
        name: populatedStore.name,
        slug: populatedStore.slug,
        description: populatedStore.description,
        businessAddress: populatedStore.businessAddress,
        taxId: populatedStore.taxId,
        supportEmail: populatedStore.supportEmail,
        supportPhone: populatedStore.supportPhone,
        status: populatedStore.status,
        rejectionReason: populatedStore.rejectionReason,
        reviewedAt: populatedStore.reviewedAt,
        reviewedBy: populatedStore.reviewedBy,
        vendor: populatedStore.vendor,
        createdAt: populatedStore.createdAt,
        updatedAt: populatedStore.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating vendor application status:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating vendor application status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
