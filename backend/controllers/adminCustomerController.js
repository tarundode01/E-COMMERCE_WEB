import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';

/**
 * @desc    Fetch registered customers with search, filter, and pagination
 * @route   GET /api/admin/customers
 * @access  Private (Admin only)
 */
export const getCustomers = async (req, res) => {
  try {
    const { search, q, role, sortBy } = req.query;

    // 1. Construct query filter
    const filter = {};

    // Role filtering (e.g. 'user' or 'admin')
    if (role && ['user', 'admin'].includes(role.toLowerCase())) {
      filter.role = role.toLowerCase();
    }

    // Search by customer name, email, or mobile phone
    const rawSearch = (search || q || '').trim();
    if (rawSearch) {
      // Escape regex special characters to prevent regex injection or crashes
      const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { mobile: { $regex: escaped, $options: 'i' } },
      ];
    }

    // 2. Sorting options
    let sort = { createdAt: -1 }; // Default newest first
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else if (sortBy === 'name') {
      sort = { name: 1 };
    }

    // 3. Pagination calculation
    const totalCustomers = await User.countDocuments(filter);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    // 4. Fetch registered customers from User model (excluding sensitive password hash)
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // 5. Aggregate order metrics (orderCount & totalSpend) for retrieved customers
    const userIds = users.map((u) => u._id);
    let statsMap = new Map();

    if (userIds.length > 0) {
      try {
        const orderAggregates = await Order.aggregate([
          {
            $match: {
              customer: { $in: userIds },
            },
          },
          {
            $group: {
              _id: '$customer',
              orderCount: { $sum: 1 },
              totalSpend: {
                $sum: {
                  $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 0, '$totalAmount'],
                },
              },
            },
          },
        ]);

        orderAggregates.forEach((stat) => {
          statsMap.set(String(stat._id), {
            orderCount: stat.orderCount || 0,
            totalSpend: stat.totalSpend || 0,
          });
        });
      } catch (aggErr) {
        console.error('Customer orders aggregation error:', aggErr);
        // Graceful fallback to zeros if Order collection query encounters issues
      }
    }

    // 6. Format customer records with only required fields for Admin UI
    const customers = users.map((u) => {
      const stats = statsMap.get(String(u._id)) || { orderCount: 0, totalSpend: 0 };
      return {
        _id: u._id,
        id: u._id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role || 'user',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        orderCount: stats.orderCount,
        totalSpend: stats.totalSpend,
      };
    });

    const totalPages = Math.ceil(totalCustomers / limit) || 1;

    return res.status(200).json({
      success: true,
      count: customers.length,
      totalCustomers,
      totalPages,
      currentPage: page,
      limit,
      customers,
      data: customers, // Backward-compatible alias
    });
  } catch (error) {
    console.error('Error fetching admin customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch single customer profile with comprehensive order history
 * @route   GET /api/admin/customers/:id
 * @access  Private (Admin only)
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
      });
    }

    // Fetch customer profile from User model (exclude password)
    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Customer not found with ID: ${id}`,
      });
    }

    // Fetch customer order history
    const orders = await Order.find({ customer: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate customer metrics
    const orderCount = orders.length;
    const totalSpend = orders
      .filter((o) => o.orderStatus !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const formattedOrders = orders.map((ord) => ({
      _id: ord._id,
      id: ord.orderNumber || ord._id,
      orderNumber: ord.orderNumber,
      createdAt: ord.createdAt,
      date: ord.createdAt,
      orderStatus: ord.orderStatus,
      status: ord.orderStatus,
      totalAmount: ord.totalAmount,
      total: ord.totalAmount,
      paymentMethod: ord.paymentMethod,
      paymentStatus: ord.paymentStatus,
      itemsCount: ord.products?.length || 0,
      products: ord.products,
      deliveryAddress: ord.deliveryAddress,
    }));

    return res.status(200).json({
      success: true,
      customer: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        orderCount,
        totalSpend,
        orders: formattedOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch only order history for a specific customer
 * @route   GET /api/admin/customers/:id/orders
 * @access  Private (Admin only)
 */
export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
      });
    }

    const customerExists = await User.exists({ _id: id });
    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: `Customer not found with ID: ${id}`,
      });
    }

    const orders = await Order.find({ customer: id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
