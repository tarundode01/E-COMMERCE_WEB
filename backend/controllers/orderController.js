import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { calculateOrderTotals } from '../services/shippingService.js';

/**
 * @desc    Place a new customer order
 * @route   POST /api/orders
 * @access  Private (Authenticated customers)
 */
export const createOrder = async (req, res) => {
  try {
    const { products: rawProducts, items, orderItems, deliveryAddress, paymentMethod } = req.body;
    const incomingItems = rawProducts || items || orderItems;

    // 1. Validate incoming products array
    if (!incomingItems || !Array.isArray(incomingItems) || incomingItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one product.',
        errors: { products: 'Products list is required and cannot be empty' },
      });
    }

    // 2. Validate delivery address
    if (!deliveryAddress || typeof deliveryAddress !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required.',
        errors: { deliveryAddress: 'Delivery address object is required' },
      });
    }

    const requiredAddressFields = [
      'fullName',
      'mobileNumber',
      'email',
      'address',
      'city',
      'state',
      'pinCode',
    ];

    const missingAddressFields = requiredAddressFields.filter(
      (field) => !deliveryAddress[field] || !String(deliveryAddress[field]).trim()
    );

    if (missingAddressFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please provide all required delivery details: ${missingAddressFields.join(', ')}`,
        errors: missingAddressFields.reduce((acc, field) => {
          acc[field] = `${field} is required`;
          return acc;
        }, {}),
      });
    }

    // 3. Validate payment method
    if (!paymentMethod || !String(paymentMethod).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required.',
        errors: { paymentMethod: 'Payment method is required' },
      });
    }

    // 4. Validate products, quantities, and verify trusted prices & stock from database
    const validatedProducts = [];
    let itemsPrice = 0;

    for (const item of incomingItems) {
      const productId = item.productId || item.product || item.id || item._id;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format provided: ${productId}`,
          errors: { productId: 'Must be a valid MongoDB ObjectId' },
        });
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${productId}. Quantity must be a positive integer.`,
          errors: { quantity: 'Quantity must be an integer greater than 0' },
        });
      }

      if (quantity > 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum limit of 10 units per luxury item exceeded.',
          errors: { quantity: 'Cannot purchase more than 10 units of a single item' },
        });
      }

      // Fetch trusted product data directly from database
      const dbProduct = await Product.findById(productId);
      if (!dbProduct) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} was not found in catalog.`,
        });
      }

      // Check available stock
      if (dbProduct.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for "${dbProduct.name}". Only ${dbProduct.stock} units available in stock.`,
          availableStock: dbProduct.stock,
          requestedQuantity: quantity,
        });
      }

      // Use trusted database price (never trust frontend-provided price)
      const trustedPrice = dbProduct.price;
      const lineTotal = trustedPrice * quantity;
      itemsPrice += lineTotal;

      validatedProducts.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: trustedPrice,
        quantity,
        image: dbProduct.image,
        selectedSize: item.selectedSize ? String(item.selectedSize).trim() : 'Standard',
      });
    }

    // 5. Compute server-side trusted financials using store settings & database product prices
    const financials = await calculateOrderTotals(itemsPrice);
    const shippingPrice = financials.shippingPrice;
    const taxPrice = financials.taxPrice;
    const totalAmount = financials.totalAmount;

    // 6. Safely decrement inventory atomically with rollback on failure
    const decrementedStock = [];
    try {
      for (const item of validatedProducts) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: 'after' }
        );

        if (!updatedProduct) {
          throw new Error(
            `Concurrent stock deduction conflict for "${item.name}". Please try placing the order again.`
          );
        }

        decrementedStock.push({ productId: item.product, quantity: item.quantity });
      }

      // 7. Create Order document
      // Payment status is marked as unpaid until verified payment integration exists
      const order = await Order.create({
        customer: req.user._id,
        products: validatedProducts,
        deliveryAddress: {
          fullName: String(deliveryAddress.fullName).trim(),
          mobileNumber: String(deliveryAddress.mobileNumber).trim(),
          email: String(deliveryAddress.email).trim().toLowerCase(),
          address: String(deliveryAddress.address).trim(),
          city: String(deliveryAddress.city).trim(),
          state: String(deliveryAddress.state).trim(),
          pinCode: String(deliveryAddress.pinCode).trim(),
        },
        paymentMethod: String(paymentMethod).trim(),
        paymentStatus: 'unpaid', // Marked unpaid as real payment processing is not implemented
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalAmount,
        orderStatus: 'Pending',
        statusHistory: [
          {
            status: 'Pending',
            changedAt: new Date(),
            changedBy: req.user._id,
            note: 'Order placed by customer',
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        subtotal: order.itemsPrice,
        shippingFee: order.shippingPrice,
        freeShippingThreshold: financials.freeShippingThreshold,
        isFreeShipping: financials.isFreeShipping,
        taxPrice: order.taxPrice,
        totalAmount: order.totalAmount,
        order,
      });
    } catch (orderError) {
      // Rollback any inventory decrements if order creation failed
      for (const item of decrementedStock) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        }).catch((err) => console.error('Stock rollback error:', err));
      }

      throw orderError;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred while creating order.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch authenticated customer's order history
 * @route   GET /api/orders/my-orders
 * @access  Private (Authenticated customer)
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order history. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch single order by ID
 * @route   GET /api/orders/:id
 * @access  Private (Order owner or Admin only)
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.',
      });
    }

    const order = await Order.findById(id).populate('customer', 'name email mobile role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found.`,
      });
    }

    // Authorization check: Only order owner or admin can view the order
    const orderCustomerId = order.customer?._id
      ? order.customer._id.toString()
      : order.customer.toString();

    const isOwner = orderCustomerId === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view this order.',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Cancel an order
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Order owner or Admin only)
 * Rules:
 * - Orders can only be cancelled if status is 'Pending' or 'Confirmed'
 * - Orders already 'Shipped', 'Delivered', or 'Cancelled' cannot be cancelled
 * - Restores product stock safely upon cancellation
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found.`,
      });
    }

    // Authorization check: Ensure customer cannot cancel another customer's order
    const orderCustomerId = order.customer.toString();
    const isOwner = orderCustomerId === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to cancel this order.',
      });
    }

    // Cancellation eligibility rules
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled.',
      });
    }

    if (order.orderStatus === 'Shipped') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already shipped and is in transit.',
      });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already been delivered.',
      });
    }

    // Restock all purchased products safely
    for (const item of order.products) {
      if (item.product && item.quantity > 0) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        }).catch((err) => console.error('Restock error on order cancellation:', err));
      }
    }

    // Update order status, cancellation reason, and cancellation timestamp
    order.orderStatus = 'Cancelled';
    order.cancellationReason = reason ? String(reason).trim() : 'Cancelled by customer';
    order.cancelledAt = new Date();

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'Cancelled',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: reason ? String(reason).trim() : 'Cancelled by customer',
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order has been successfully cancelled and inventory restocked.',
      order,
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Valid order statuses supported across the luxury platform
 */
const VALID_ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

/**
 * Allowed status transitions for luxury order workflow
 * Prevents invalid workflows (e.g. changing Delivered back to Pending)
 */
const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
  Confirmed: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
  Shipped: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'],
  Delivered: ['Shipped', 'Confirmed'],
  Cancelled: ['Pending', 'Confirmed'],
};

/**
 * @desc    Fetch all orders across the platform for admin ledger
 * @route   GET /api/admin/orders & GET /api/orders
 * @access  Private (Admin only)
 */
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      const matchedStatus = VALID_ORDER_STATUSES.find(
        (s) => s.toLowerCase() === String(status).trim().toLowerCase()
      );
      if (matchedStatus) {
        filter.orderStatus = matchedStatus;
      }
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const searchRegex = new RegExp(term, 'i');

      if (mongoose.Types.ObjectId.isValid(term)) {
        filter.$or = [
          { _id: term },
          { 'deliveryAddress.fullName': searchRegex },
          { 'deliveryAddress.email': searchRegex },
          { 'deliveryAddress.mobileNumber': searchRegex },
          { 'deliveryAddress.city': searchRegex },
        ];
      } else {
        filter.$or = [
          { 'deliveryAddress.fullName': searchRegex },
          { 'deliveryAddress.email': searchRegex },
          { 'deliveryAddress.mobileNumber': searchRegex },
          { 'deliveryAddress.city': searchRegex },
        ];
      }
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email mobile role')
      .populate('statusHistory.changedBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Error fetching admin orders ledger:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders ledger.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update order status with transition validation, stock management, and history audit
 * @route   PATCH /api/admin/orders/:id/status
 * @access  Private (Admin only)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: rawStatus, note, cancellationReason } = req.body;

    // 1. Validate Order ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format provided.',
      });
    }

    // 2. Validate requested status
    if (!rawStatus || typeof rawStatus !== 'string' || !rawStatus.trim()) {
      return res.status(400).json({
        success: false,
        message: `Order status is required. Valid statuses are: ${VALID_ORDER_STATUSES.join(', ')}.`,
      });
    }

    const targetStatus = VALID_ORDER_STATUSES.find(
      (s) => s.toLowerCase() === rawStatus.trim().toLowerCase()
    );

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status '${rawStatus}'. Supported statuses are: ${VALID_ORDER_STATUSES.join(', ')}.`,
      });
    }

    // 3. Find order
    const order = await Order.findById(id).populate('customer', 'name email mobile role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} was not found.`,
      });
    }

    const currentStatus = order.orderStatus;

    // 4. Check if order is already in the requested status
    if (currentStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${targetStatus}' status.`,
      });
    }

    // 5. Check state machine allowed transitions
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed options are: ${allowed.join(', ')}.`,
      });
    }

    // 7. Handle stock changes consistent with cancellation logic
    if (targetStatus === 'Cancelled') {
      for (const item of order.products) {
        if (item.product && item.quantity > 0) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          }).catch((err) => console.error('Restock error on admin order cancellation:', err));
        }
      }

      order.cancelledAt = new Date();
      order.cancellationReason = cancellationReason
        ? String(cancellationReason).trim()
        : note
        ? String(note).trim()
        : 'Cancelled by administrator';
    }

    // 8. Record delivery timestamp when delivered
    if (targetStatus === 'Delivered') {
      order.deliveredAt = new Date();
    }

    // 9. Update status and append to status history
    order.orderStatus = targetStatus;

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: targetStatus,
      changedAt: new Date(),
      changedBy: req.user._id,
      note: note
        ? String(note).trim()
        : `Status transitioned from ${currentStatus} to ${targetStatus} by administrator`,
    });

    order.markModified('statusHistory');
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status successfully updated to '${targetStatus}'.`,
      order,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Calculate verified shipping fee, subtotal, and total from trusted catalog prices
 * @route   POST /api/orders/calculate-shipping
 * @access  Public / Customer
 */
export const calculateOrderShipping = async (req, res) => {
  try {
    const { products: rawProducts, items, orderItems } = req.body;
    const incomingItems = rawProducts || items || orderItems;

    if (!incomingItems || !Array.isArray(incomingItems) || incomingItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items array is required to calculate shipping.',
        errors: { items: 'At least one product item is required' },
      });
    }

    let subtotal = 0;
    const verifiedItems = [];

    for (const item of incomingItems) {
      const productId = item.productId || item.product || item.id || item._id;
      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format provided: ${productId}`,
          errors: { productId: 'Must be a valid MongoDB ObjectId' },
        });
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${productId}. Quantity must be a positive integer.`,
          errors: { quantity: 'Quantity must be an integer greater than 0' },
        });
      }

      const dbProduct = await Product.findById(productId);
      if (!dbProduct) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} was not found in catalog.`,
        });
      }

      const lineTotal = dbProduct.price * quantity;
      subtotal += lineTotal;

      verifiedItems.push({
        productId: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity,
        lineTotal,
      });
    }

    const financials = await calculateOrderTotals(subtotal);

    return res.status(200).json({
      success: true,
      subtotal: financials.subtotal,
      shippingFee: financials.shippingFee,
      freeShippingThreshold: financials.freeShippingThreshold,
      isFreeShipping: financials.isFreeShipping,
      amountToFreeShipping: financials.amountToFreeShipping,
      taxPrice: financials.taxPrice,
      totalAmount: financials.totalAmount,
      items: verifiedItems,
    });
  } catch (error) {
    console.error('Error calculating shipping fee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping fee.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


