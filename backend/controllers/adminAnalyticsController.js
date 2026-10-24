import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

/**
 * Helper to parse, validate, and construct MongoDB date range queries
 */
const parseDateRange = (query) => {
  const { startDate, endDate, start, end, period } = query;
  const filter = {};
  const now = new Date();

  // Period Presets
  if (period) {
    const p = String(period).toLowerCase().trim();
    if (p === '7d' || p === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: d };
    } else if (p === '30d' || p === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: d };
    } else if (p === 'this_month' || p === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: d };
    } else if (p === 'this_year' || p === 'year') {
      const d = new Date(now.getFullYear(), 0, 1);
      d.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: d };
    }
  }

  // Explicit start date
  const rawStart = startDate || start;
  if (rawStart) {
    const sDate = new Date(rawStart);
    if (isNaN(sDate.getTime())) {
      const err = new Error('Invalid startDate format. Please provide a valid ISO or YYYY-MM-DD date.');
      err.statusCode = 400;
      throw err;
    }
    sDate.setHours(0, 0, 0, 0);
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$gte = sDate;
  }

  // Explicit end date
  const rawEnd = endDate || end;
  if (rawEnd) {
    const eDate = new Date(rawEnd);
    if (isNaN(eDate.getTime())) {
      const err = new Error('Invalid endDate format. Please provide a valid ISO or YYYY-MM-DD date.');
      err.statusCode = 400;
      throw err;
    }
    eDate.setHours(23, 59, 59, 999);
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$lte = eDate;
  }

  // Ensure start <= end
  if (filter.createdAt?.$gte && filter.createdAt?.$lte) {
    if (filter.createdAt.$gte > filter.createdAt.$lte) {
      const err = new Error('startDate cannot be later than endDate.');
      err.statusCode = 400;
      throw err;
    }
  }

  return filter;
};

/**
 * Filter condition for orders that qualify for recognized revenue:
 * 1. Exclude Cancelled orders
 * 2. Exclude refunded orders
 * 3. Include paid, pending verification, and cash-on-delivery transactions
 */
const getRevenueMatchCondition = (dateFilter = {}) => ({
  ...dateFilter,
  orderStatus: { $ne: 'Cancelled' },
  paymentStatus: { $ne: 'refunded' },
});

/**
 * @desc    Get executive analytics summary KPIs
 * @route   GET /api/admin/analytics/summary
 * @access  Private (Admin only)
 */
export const getAnalyticsSummary = async (req, res) => {
  try {
    let dateFilter = {};
    try {
      dateFilter = parseDateRange(req.query);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({
        success: false,
        message: valErr.message,
      });
    }

    // 1. Total Orders count in date range
    const totalOrders = await Order.countDocuments(dateFilter);

    // 2. Delivered Orders count in date range
    const deliveredOrders = await Order.countDocuments({
      ...dateFilter,
      orderStatus: 'Delivered',
    });

    // 3. Revenue & AOV via MongoDB aggregation pipeline (excluding cancelled & unpaid)
    const revenuePipeline = [
      {
        $match: getRevenueMatchCondition(dateFilter),
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          revenueOrdersCount: { $sum: 1 },
        },
      },
    ];

    const revenueResult = await Order.aggregate(revenuePipeline);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const revenueOrdersCount = revenueResult.length > 0 ? revenueResult[0].revenueOrdersCount : 0;
    const averageOrderValue = revenueOrdersCount > 0 ? Number((totalRevenue / revenueOrdersCount).toFixed(2)) : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        deliveredOrders,
        deliveryRate,
        revenueOrdersCount,
      },
    });
  } catch (error) {
    console.error('Error computing analytics summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute analytics summary metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get sales telemetry grouped by day or month
 * @route   GET /api/admin/analytics/sales
 * @access  Private (Admin only)
 */
export const getSalesTelemetry = async (req, res) => {
  try {
    let dateFilter = {};
    try {
      dateFilter = parseDateRange(req.query);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({
        success: false,
        message: valErr.message,
      });
    }

    const rawGroup = (req.query.groupBy || req.query.interval || 'day').toLowerCase().trim();
    if (!['day', 'month', 'daily', 'monthly'].includes(rawGroup)) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupBy parameter. Supported values are 'day' or 'month'.",
      });
    }

    const isDay = rawGroup === 'day' || rawGroup === 'daily';
    const dateFormat = isDay ? '%Y-%m-%d' : '%Y-%m';

    // Aggregation pipeline to group recognized sales revenue by day or month
    const salesPipeline = [
      {
        $match: getRevenueMatchCondition(dateFilter),
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
          itemsCount: {
            $sum: {
              $reduce: {
                input: '$products',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] },
              },
            },
          },
        },
      },
      {
        $sort: { _id: 1 }, // Chronological sort
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          key: '$_id',
          revenue: 1,
          ordersCount: 1,
          itemsCount: 1,
        },
      },
    ];

    const sales = await Order.aggregate(salesPipeline);

    return res.status(200).json({
      success: true,
      groupBy: isDay ? 'day' : 'month',
      count: sales.length,
      sales,
      data: sales, // Backward-compatible alias
    });
  } catch (error) {
    console.error('Error computing sales telemetry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sales telemetry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get top-selling products based on order items
 * @route   GET /api/admin/analytics/top-products
 * @access  Private (Admin only)
 */
export const getTopSellingProducts = async (req, res) => {
  try {
    let dateFilter = {};
    try {
      dateFilter = parseDateRange(req.query);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({
        success: false,
        message: valErr.message,
      });
    }

    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 5));

    // Pipeline to unwind order products, aggregate by product, and rank
    const topProductsPipeline = [
      {
        $match: getRevenueMatchCondition(dateFilter),
      },
      {
        $unwind: '$products',
      },
      {
        $group: {
          _id: '$products.product',
          name: { $first: '$products.name' },
          image: { $first: '$products.image' },
          unitsSold: { $sum: '$products.quantity' },
          revenue: {
            $sum: { $multiply: ['$products.price', '$products.quantity'] },
          },
          ordersCount: { $sum: 1 },
        },
      },
      {
        $sort: { revenue: -1, unitsSold: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'catalogInfo',
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          id: '$_id',
          name: 1,
          image: 1,
          category: {
            $ifNull: [{ $arrayElemAt: ['$catalogInfo.category', 0] }, 'Luxury Goods'],
          },
          unitsSold: 1,
          revenue: 1,
          ordersCount: 1,
        },
      },
    ];

    const rawTopProducts = await Order.aggregate(topProductsPipeline);

    const maxRev = rawTopProducts.length > 0 ? rawTopProducts[0].revenue : 1;
    const topProducts = rawTopProducts.map((p, idx) => ({
      ...p,
      rank: idx + 1,
      sharePercentage: maxRev > 0 ? Math.round((p.revenue / maxRev) * 100) : 0,
    }));

    return res.status(200).json({
      success: true,
      count: topProducts.length,
      topProducts,
      data: topProducts, // Backward-compatible alias
    });
  } catch (error) {
    console.error('Error computing top products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve top-selling products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get order counts and amounts grouped by status
 * @route   GET /api/admin/analytics/order-status
 * @access  Private (Admin only)
 */
export const getOrderStatusBreakdown = async (req, res) => {
  try {
    let dateFilter = {};
    try {
      dateFilter = parseDateRange(req.query);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({
        success: false,
        message: valErr.message,
      });
    }

    const totalOrders = await Order.countDocuments(dateFilter);

    const statusPipeline = [
      {
        $match: dateFilter,
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' },
        },
      },
    ];

    const statusResults = await Order.aggregate(statusPipeline);
    const statusMap = new Map();
    statusResults.forEach((item) => {
      statusMap.set(item._id, { count: item.count, amount: item.amount });
    });

    const VALID_STATUSES = ['Delivered', 'Confirmed', 'Shipped', 'Pending', 'Cancelled'];
    const breakdown = VALID_STATUSES.map((status) => {
      const data = statusMap.get(status) || { count: 0, amount: 0 };
      const percentage = totalOrders > 0 ? Math.round((data.count / totalOrders) * 100) : 0;
      return {
        status,
        count: data.count,
        amount: data.amount,
        percentage,
      };
    });

    return res.status(200).json({
      success: true,
      totalOrders,
      breakdown,
      statuses: breakdown, // Backward-compatible alias
    });
  } catch (error) {
    console.error('Error computing order status breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order status breakdown',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Comprehensive analytics dashboard endpoint combining summary, sales, top-products, and status
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
export const getFullAnalytics = async (req, res) => {
  try {
    let dateFilter = {};
    try {
      dateFilter = parseDateRange(req.query);
    } catch (valErr) {
      return res.status(valErr.statusCode || 400).json({
        success: false,
        message: valErr.message,
      });
    }

    // 1. Total Orders & Delivered
    const totalOrders = await Order.countDocuments(dateFilter);
    const deliveredOrders = await Order.countDocuments({
      ...dateFilter,
      orderStatus: 'Delivered',
    });

    // 2. Revenue aggregation
    const revenuePipeline = [
      { $match: getRevenueMatchCondition(dateFilter) },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          revenueOrdersCount: { $sum: 1 },
        },
      },
    ];
    const revenueResult = await Order.aggregate(revenuePipeline);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const revenueOrdersCount = revenueResult.length > 0 ? revenueResult[0].revenueOrdersCount : 0;
    const averageOrderValue = revenueOrdersCount > 0 ? Number((totalRevenue / revenueOrdersCount).toFixed(2)) : 0;
    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

    // 3. Raw orders for frontend components that accept orders list
    const orders = await Order.find(dateFilter).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        deliveredOrders,
        deliveryRate,
        revenueOrdersCount,
      },
      orders,
    });
  } catch (error) {
    console.error('Error compiling full analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compile full analytics report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
