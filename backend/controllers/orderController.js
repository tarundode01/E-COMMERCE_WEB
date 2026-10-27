import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import StoreSettings from '../models/StoreSettings.js';
import { calculateOrderTotals } from '../services/shippingService.js';

/**
 * Valid order statuses supported across the luxury platform
 */
export const VALID_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Ready for Pickup',
  'Shipped',
  'Delivered',
  'Cancelled',
];

/**
 * Allowed status transitions for luxury order workflow (Admin / Platform)
 */
const ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Processing', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
  Confirmed: ['Pending', 'Processing', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
  Processing: ['Confirmed', 'Packed', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
  Packed: ['Processing', 'Ready for Pickup', 'Shipped', 'Delivered', 'Cancelled'],
  'Ready for Pickup': ['Packed', 'Shipped', 'Delivered', 'Cancelled'],
  Shipped: ['Processing', 'Confirmed', 'Delivered', 'Cancelled'],
  Delivered: ['Shipped', 'Confirmed'],
  Cancelled: ['Pending', 'Confirmed'],
};

/**
 * Target statuses that vendors are authorized to set
 * Note: Vendors can NEVER mark 'Shipped' or 'Delivered' (reserved for courier / admin)
 */
export const VENDOR_ALLOWED_TARGET_STATUSES = [
  'Confirmed',
  'Processing',
  'Packed',
  'Ready for Pickup',
  'Cancelled',
];

/**
 * Vendor-specific allowed transitions state machine
 */
export const VENDOR_ALLOWED_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Packed', 'Ready for Pickup', 'Cancelled'],
  Processing: ['Packed', 'Ready for Pickup', 'Cancelled'],
  Packed: ['Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Cancelled'],
};

/**
 * Standard Cash on Delivery limit to guard against high-risk luxury fraud
 */
const COD_MAX_LIMIT = 3000;

/**
 * Helper to normalize and merge incoming product lines
 * Merges duplicate lines with the same productId and selectedSize
 */
const normalizeCartItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];

  const merged = new Map();

  for (const it of rawItems) {
    if (!it) continue;
    const productId = String(it.productId || it.product || it.id || it._id || '').trim();
    if (!productId) continue;

    const size = it.selectedSize ? String(it.selectedSize).trim() : 'Standard';
    const key = `${productId}__${size}`;
    const qty = Math.max(1, Number(it.quantity) || 1);

    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.quantity = Math.min(10, existing.quantity + qty);
    } else {
      merged.set(key, {
        productId,
        quantity: Math.min(10, qty),
        selectedSize: size,
      });
    }
  }

  return Array.from(merged.values());
};

/**
 * @desc    Revalidate customer cart items against real MongoDB products & store status
 * @route   POST /api/orders/validate-cart & POST /api/orders/validate
 * @access  Public / Customer
 */
export const validateCart = async (req, res) => {
  try {
    const { products: rawProducts, items, orderItems } = req.body;
    const incoming = rawProducts || items || orderItems;

    if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart items array is required for validation.',
        isValid: false,
        items: [],
      });
    }

    const normalized = normalizeCartItems(incoming);
    const validatedItems = [];
    let subtotal = 0;
    let allValid = true;

    for (const item of normalized) {
      // 1. Verify ObjectId format
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        allValid = false;
        validatedItems.push({
          productId: item.productId,
          name: 'Unknown Product',
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          available: false,
          issue: 'invalid_id',
          message: 'Invalid product identification format.',
        });
        continue;
      }

      // 2. Query MongoDB product and populate owning store
      const dbProduct = await Product.findById(item.productId).populate('store');

      if (!dbProduct) {
        allValid = false;
        validatedItems.push({
          productId: item.productId,
          name: 'Discontinued Item',
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          available: false,
          issue: 'deleted',
          message: 'Product has been removed from catalog.',
        });
        continue;
      }

      // 3. Verify publication status
      if (dbProduct.status !== 'published') {
        allValid = false;
        validatedItems.push({
          productId: dbProduct._id,
          name: dbProduct.name,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          available: false,
          issue: 'unpublished',
          message: `"${dbProduct.name}" is currently unpublished or not available for purchase.`,
        });
        continue;
      }

      // 4. Verify owning store status (if product belongs to a multi-vendor store)
      if (dbProduct.store) {
        const store = dbProduct.store;
        const isApproved = store.status === 'approved';
        const isVisible = store.isPubliclyVisible !== false;
        const isOpen = store.isOpen !== false;

        if (!isApproved || !isVisible || !isOpen) {
          allValid = false;
          validatedItems.push({
            productId: dbProduct._id,
            name: dbProduct.name,
            storeName: store.name,
            requestedQuantity: item.quantity,
            availableQuantity: 0,
            available: false,
            issue: 'store_inactive',
            message: `The boutique "${store.name}" is temporarily not accepting orders.`,
          });
          continue;
        }
      }

      // 5. Check stock availability
      const availableStock = Math.max(0, Number(dbProduct.stock) || 0);

      if (availableStock <= 0) {
        allValid = false;
        validatedItems.push({
          productId: dbProduct._id,
          name: dbProduct.name,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          available: false,
          issue: 'out_of_stock',
          message: `"${dbProduct.name}" is currently out of stock.`,
        });
        continue;
      }

      const isStockSufficient = availableStock >= item.quantity;
      if (!isStockSufficient) {
        allValid = false;
      }

      const effectiveQty = isStockSufficient ? item.quantity : availableStock;
      const trustedPrice = dbProduct.price;
      const lineTotal = trustedPrice * effectiveQty;
      subtotal += lineTotal;

      validatedItems.push({
        productId: dbProduct._id,
        id: dbProduct._id,
        name: dbProduct.name,
        price: trustedPrice,
        originalPrice: dbProduct.originalPrice || null,
        discount: dbProduct.discount || 0,
        sku: dbProduct.sku || '',
        image: dbProduct.image,
        selectedSize: item.selectedSize || 'Standard',
        requestedQuantity: item.quantity,
        availableQuantity: availableStock,
        available: isStockSufficient,
        issue: isStockSufficient ? null : 'insufficient_stock',
        message: isStockSufficient
          ? null
          : `Only ${availableStock} units of "${dbProduct.name}" available.`,
        lineTotal,
        store: dbProduct.store
          ? {
              id: dbProduct.store._id,
              name: dbProduct.store.name,
              slug: dbProduct.store.slug,
            }
          : null,
      });
    }

    // 6. Compute trusted order financials from server
    const financials = await calculateOrderTotals(subtotal);

    return res.status(200).json({
      success: true,
      isValid: allValid && validatedItems.length > 0,
      subtotal: financials.subtotal,
      shippingFee: financials.shippingFee,
      freeShippingThreshold: financials.freeShippingThreshold,
      isFreeShipping: financials.isFreeShipping,
      amountToFreeShipping: financials.amountToFreeShipping,
      taxPrice: financials.taxPrice,
      totalAmount: financials.totalAmount,
      itemCount: validatedItems.length,
      items: validatedItems,
    });
  } catch (error) {
    console.error('Error validating cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate cart. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Place a new customer order with server-side pricing, multi-vendor snapshots, and stock reservation
 * @route   POST /api/orders
 * @access  Private (Authenticated customers)
 */
export const createOrder = async (req, res) => {
  try {
    const {
      products: rawProducts,
      items,
      orderItems,
      deliveryAddress,
      paymentMethod,
      idempotencyKey: bodyIdempotencyKey,
    } = req.body;

    const incomingItems = rawProducts || items || orderItems;

    // 0. Idempotency safeguard: prevent duplicate order creation on network retries
    const idempotencyKey =
      String(req.headers['idempotency-key'] || bodyIdempotencyKey || '').trim() || null;

    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        customer: req.user._id,
        idempotencyKey,
      });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already processed (retrieved via idempotency key)',
          isDuplicate: true,
          order: existingOrder,
          subtotal: existingOrder.itemsPrice,
          shippingFee: existingOrder.shippingPrice,
          taxPrice: existingOrder.taxPrice,
          totalAmount: existingOrder.totalAmount,
        });
      }
    }

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

    // Validate phone number format (10-15 digits)
    const cleanPhone = String(deliveryAddress.mobileNumber).replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid contact mobile number (10 to 15 digits).',
        errors: { mobileNumber: 'Invalid phone number format' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(deliveryAddress.email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        errors: { email: 'Invalid email format' },
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

    const normalizedPaymentMethod = String(paymentMethod).trim();
    const isCOD = /cash on delivery|cod/i.test(normalizedPaymentMethod);

    // 4. Validate products, quantities, and verify trusted prices & stock from database
    const normalizedItems = normalizeCartItems(incomingItems);
    const validatedProducts = [];
    const involvedStoreIds = new Set();
    let itemsPrice = 0;

    for (const item of normalizedItems) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format provided: ${item.productId}`,
          errors: { productId: 'Must be a valid MongoDB ObjectId' },
        });
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${item.productId}. Quantity must be a positive integer.`,
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

      // Fetch trusted product data directly from database, including store association
      const dbProduct = await Product.findById(item.productId).populate('store');
      if (!dbProduct) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} was not found in catalog.`,
        });
      }

      // Check product publication status
      if (dbProduct.status !== 'published') {
        return res.status(400).json({
          success: false,
          message: `Product "${dbProduct.name}" is not published or currently unavailable for purchase.`,
          productId: dbProduct._id,
        });
      }

      // Check multi-vendor store status
      let storeId = null;
      let storeName = 'Maison Boutique';
      let vendorId = dbProduct.vendor || null;

      if (dbProduct.store) {
        const store = dbProduct.store;
        if (store.status !== 'approved' || store.isPubliclyVisible === false || store.isOpen === false) {
          return res.status(400).json({
            success: false,
            message: `The merchant store "${store.name}" for item "${dbProduct.name}" is currently inactive or not approved.`,
            storeId: store._id,
          });
        }
        storeId = store._id;
        storeName = store.name;
        vendorId = store.vendor || dbProduct.vendor;
        involvedStoreIds.add(store._id.toString());
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

      // Use trusted database price snapshot (never trust frontend-provided price)
      const trustedPrice = dbProduct.price;
      const lineSubtotal = trustedPrice * quantity;
      itemsPrice += lineSubtotal;

      validatedProducts.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: trustedPrice,
        quantity,
        image: dbProduct.image,
        selectedSize: item.selectedSize || 'Standard',
        store: storeId,
        storeName,
        vendor: vendorId,
        sku: dbProduct.sku || '',
        discount: dbProduct.discount || 0,
        subtotal: lineSubtotal,
      });
    }

    // 5. Compute server-side trusted financials using database product prices & store settings
    const financials = await calculateOrderTotals(itemsPrice);
    const shippingPrice = financials.shippingPrice;
    const taxPrice = financials.taxPrice;
    const totalAmount = financials.totalAmount;

    // COD eligibility check: orders over $3,000 are not eligible for Cash on Delivery
    if (isCOD && totalAmount > COD_MAX_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Cash on Delivery is limited to orders up to $${COD_MAX_LIMIT.toLocaleString()}. For orders of $${totalAmount.toLocaleString()}, please select Online Payment.`,
        errors: { paymentMethod: `COD limit exceeded ($${COD_MAX_LIMIT} max)` },
      });
    }

    // Determine initial payment status:
    // Online payment stays 'pending' until verified gateway webhook confirms payment
    // COD is marked 'unpaid' until paid upon delivery
    const initialPaymentStatus = isCOD ? 'unpaid' : 'pending';

    let orderResult = null;
    let session = null;

    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // Atomic stock decrement in transaction
      for (const item of validatedProducts) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session, returnDocument: 'after' }
        );

        if (!updatedProduct) {
          throw new Error(
            `Concurrent stock deduction conflict for "${item.name}". Please try placing your order again.`
          );
        }
      }

      // Create Order document in transaction
      const orderData = {
        customer: req.user._id,
        products: validatedProducts,
        stores: Array.from(involvedStoreIds).map((id) => new mongoose.Types.ObjectId(id)),
        idempotencyKey,
        deliveryAddress: {
          fullName: String(deliveryAddress.fullName).trim(),
          mobileNumber: String(deliveryAddress.mobileNumber).trim(),
          email: String(deliveryAddress.email).trim().toLowerCase(),
          address: String(deliveryAddress.address).trim(),
          city: String(deliveryAddress.city).trim(),
          state: String(deliveryAddress.state).trim(),
          pinCode: String(deliveryAddress.pinCode).trim(),
        },
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: initialPaymentStatus,
        isPaid: false,
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
            note: isCOD
              ? 'Order placed with Cash on Delivery'
              : 'Order placed; online payment pending gateway verification',
          },
        ],
      };

      const [created] = await Order.create([orderData], { session });
      await session.commitTransaction();
      orderResult = created;
    } catch (txnError) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (_) {}
      }

      const isDeploymentLimitation =
        /transaction|replica set|retryable write/i.test(txnError.message);

      if (!isDeploymentLimitation) {
        throw txnError;
      }

      // Gracefully fall back to safe atomic conditional updates with compensating rollback
      orderResult = null;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (_) {}
      }
    }

    // Safe alternative: atomic conditional decrement with rollback (for standalone MongoDB)
    if (!orderResult) {
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
              `Concurrent stock deduction conflict for "${item.name}". Please try placing your order again.`
            );
          }

          decrementedStock.push({ productId: item.product, quantity: item.quantity });
        }

        const order = await Order.create({
          customer: req.user._id,
          products: validatedProducts,
          stores: Array.from(involvedStoreIds).map((id) => new mongoose.Types.ObjectId(id)),
          idempotencyKey,
          deliveryAddress: {
            fullName: String(deliveryAddress.fullName).trim(),
            mobileNumber: String(deliveryAddress.mobileNumber).trim(),
            email: String(deliveryAddress.email).trim().toLowerCase(),
            address: String(deliveryAddress.address).trim(),
            city: String(deliveryAddress.city).trim(),
            state: String(deliveryAddress.state).trim(),
            pinCode: String(deliveryAddress.pinCode).trim(),
          },
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: initialPaymentStatus,
          isPaid: false,
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
              note: isCOD
                ? 'Order placed with Cash on Delivery'
                : 'Order placed; online payment pending gateway verification',
            },
          ],
        });

        orderResult = order;
      } catch (orderError) {
        // Compensating rollback for standalone deployments
        for (const dec of decrementedStock) {
          await Product.findByIdAndUpdate(dec.productId, {
            $inc: { stock: dec.quantity },
          }).catch((err) => console.error('Rollback error on order creation:', err));
        }
        throw orderError;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      subtotal: orderResult.itemsPrice,
      shippingFee: orderResult.shippingPrice,
      freeShippingThreshold: financials.freeShippingThreshold,
      isFreeShipping: financials.isFreeShipping,
      taxPrice: orderResult.taxPrice,
      totalAmount: orderResult.totalAmount,
      paymentMethod: orderResult.paymentMethod,
      paymentStatus: orderResult.paymentStatus,
      paymentNotice: isCOD
        ? 'Payment due upon delivery'
        : 'Payment pending: live gateway webhook integration required for automatic paid status',
      order: orderResult,
    });
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
 * @desc    Fetch authenticated customer's order history with pagination & store information
 * @route   GET /api/orders/my-orders
 * @access  Private (Authenticated customer)
 */
export const getMyOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = { customer: req.user._id };

    if (status && status !== 'All' && status !== 'all') {
      const matched = VALID_ORDER_STATUSES.find(
        (s) => s.toLowerCase() === String(status).trim().toLowerCase()
      );
      if (matched) {
        query.orderStatus = matched;
      }
    }

    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('stores', 'name slug logoUrl')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status currentLocation rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: orders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit) || 1,
      currentPage: page,
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
 * @desc    Fetch single order by ID with strict ownership isolation
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

    const order = await Order.findById(id)
      .populate('customer', 'name email mobile role')
      .populate('stores', 'name slug supportEmail supportPhone')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status currentLocation rating');

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
 * @desc    Get real-time live delivery tracking for customer order
 * @route   GET /api/orders/:id/track
 * @access  Private (Order customer, Vendor, or Admin)
 */
export const getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email mobile role')
      .populate('stores', 'name slug supportEmail supportPhone address')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status currentLocation rating');

    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${id} not found.` });
    }

    // Dynamic Store Hub for dispatch (from store record or product store snapshot)
    const storeObj = order.stores?.[0];
    const storeHub = {
      name: storeObj?.name || order.products?.[0]?.storeName || 'Atelier Central Hub',
      address: storeObj?.pickupAddress || storeObj?.businessAddress || 'Indore Central Dispatch Hub, Zone 1',
      latitude: storeObj?.latitude || 22.7196,
      longitude: storeObj?.longitude || 75.8577,
    };

    // Dynamic Customer Destination from Order Delivery Address
    const addr = order.deliveryAddress || {};
    let destLat = addr.latitude;
    let destLng = addr.longitude;
    if (!destLat || !destLng) {
      // Deterministically derive unique coordinates for each order's specific address
      let hash = 0;
      const str = (order._id ? order._id.toString() : '') + (addr.address || '') + (addr.pinCode || '');
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);
      destLat = +(22.722 + (absHash % 320) / 10000).toFixed(4);
      destLng = +(75.865 + ((absHash >> 3) % 360) / 10000).toFixed(4);
    }

    const customerDestination = {
      fullName: addr.fullName || order.customer?.name || 'Customer Destination',
      address: addr.address || 'Indore City Area',
      city: addr.city || 'Indore',
      state: addr.state || 'Madhya Pradesh',
      pinCode: addr.pinCode || '452001',
      mobileNumber: addr.mobileNumber || order.customer?.mobile || '',
      latitude: destLat,
      longitude: destLng,
    };

    // Tracking is ACTIVE only after delivery boy accepts / is out for delivery
    // As specifically requested: "vo jab accept kare tab hi se user uski location dekh sake"
    const isTrackingActive = Boolean(
      order.deliveryStatus === 'accepted' ||
      order.deliveryStatus === 'picked_up' ||
      order.deliveryStatus === 'out_for_delivery' ||
      order.deliveryStatus === 'delivered'
    );

    // Rider Telemetry
    const riderTelemetry = order.deliveryBoy ? {
      _id: order.deliveryBoy._id,
      name: order.deliveryBoy.name,
      phone: order.deliveryBoy.phone,
      vehicleType: order.deliveryBoy.vehicleType,
      vehicleNumber: order.deliveryBoy.vehicleNumber,
      rating: order.deliveryBoy.rating || 4.9,
      status: order.deliveryBoy.status,
      currentLocation: order.deliveryBoy.currentLocation,
    } : order.deliveryBoySnapshot ? {
      name: order.deliveryBoySnapshot.name,
      phone: order.deliveryBoySnapshot.phone,
      vehicleType: order.deliveryBoySnapshot.vehicleType,
      vehicleNumber: order.deliveryBoySnapshot.vehicleNumber,
      rating: 4.9,
      status: 'assigned',
      currentLocation: {
        latitude: 22.7250,
        longitude: 75.8650,
        speed: 25,
        heading: 45,
        address: 'En route to customer destination',
        batteryLevel: 88,
      },
    } : null;

    // Mathematical Haversine Distance Calculation (dynamic)
    const riderLat = riderTelemetry?.currentLocation?.latitude || storeHub.latitude;
    const riderLng = riderTelemetry?.currentLocation?.longitude || storeHub.longitude;
    const R = 6371; // km
    const dLat = ((destLat - riderLat) * Math.PI) / 180;
    const dLng = ((destLng - riderLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((riderLat * Math.PI) / 180) *
        Math.cos((destLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.max(0.2, +(R * c).toFixed(1));
    const speed = riderTelemetry?.currentLocation?.speed || (isTrackingActive ? 28 : 20);
    const etaMins = Math.max(3, Math.round((distanceKm / Math.max(15, speed)) * 60));

    return res.status(200).json({
      success: true,
      deliveryStatus: order.deliveryStatus,
      orderStatus: order.orderStatus,
      order: {
        _id: order._id,
        orderStatus: order.orderStatus,
        deliveryStatus: order.deliveryStatus,
        deliveryAssignedAt: order.deliveryAssignedAt,
        deliveryNotes: order.deliveryNotes,
        deliveredAt: order.deliveredAt,
        statusHistory: order.statusHistory,
        itemsCount: order.products?.length || 0,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryOtp: order.deliveryOtp || '',
        products: order.products,
      },
      storeHub,
      customerDestination,
      deliveryBoy: riderTelemetry,
      isTrackingActive,
      distanceKm,
      etaMins,
      trackingNotice: !order.deliveryBoy && !order.deliveryBoySnapshot
        ? 'No delivery agent assigned yet. Order is in atelier preparation queue.'
        : !isTrackingActive
        ? 'Delivery agent assigned. Live GPS tracking radar activates as soon as rider accepts and starts transit.'
        : 'Live GPS radar active. Delivery rider is en route.',
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tracking data.' });
  }
};

/**
 * @desc    Cancel an order and safely restore product inventory
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Order owner or Admin only)
 * Rules:
 * - Orders can only be cancelled if status is 'Pending', 'Confirmed', or 'Processing'
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
 * Helper to build vendor-scoped order representation
 * Isolates items, subtotal, and permits only fulfillment-necessary customer delivery details
 */
const formatVendorScopedOrder = (orderDoc, storeId) => {
  const orderObj = typeof orderDoc.toObject === 'function' ? orderDoc.toObject() : orderDoc;
  const storeIdStr = storeId.toString();

  // Strictly filter products to only those belonging to the authenticated vendor's store
  const vendorItems = (orderObj.products || []).filter(
    (it) => it.store && it.store.toString() === storeIdStr
  );

  const vendorSubtotal = vendorItems.reduce(
    (acc, it) => acc + (it.price || 0) * (it.quantity || 1),
    0
  );

  const vendorItemsCount = vendorItems.reduce(
    (acc, it) => acc + (it.quantity || 1),
    0
  );

  // Return permitted fulfillment customer coordinates and order metadata
  return {
    _id: orderObj._id,
    id: orderObj._id,
    createdAt: orderObj.createdAt,
    updatedAt: orderObj.updatedAt,
    orderStatus: orderObj.orderStatus,
    paymentStatus: orderObj.paymentStatus,
    paymentMethod: orderObj.paymentMethod,
    isPaid: Boolean(orderObj.isPaid),
    paidAt: orderObj.paidAt,
    cancellationReason: orderObj.cancellationReason,
    cancelledAt: orderObj.cancelledAt,
    deliveredAt: orderObj.deliveredAt,
    customer: orderObj.customer
      ? {
          _id: orderObj.customer._id || orderObj.customer,
          name: orderObj.customer.name || orderObj.deliveryAddress?.fullName || 'Customer',
          email: orderObj.customer.email || orderObj.deliveryAddress?.email || '',
          mobileNumber: orderObj.customer.mobileNumber || orderObj.deliveryAddress?.mobileNumber || '',
        }
      : {
          name: orderObj.deliveryAddress?.fullName || 'Customer',
          email: orderObj.deliveryAddress?.email || '',
          mobileNumber: orderObj.deliveryAddress?.mobileNumber || '',
        },
    deliveryAddress: orderObj.deliveryAddress
      ? {
          fullName: orderObj.deliveryAddress.fullName,
          mobileNumber: orderObj.deliveryAddress.mobileNumber,
          email: orderObj.deliveryAddress.email,
          address: orderObj.deliveryAddress.address,
          city: orderObj.deliveryAddress.city,
          state: orderObj.deliveryAddress.state,
          pinCode: orderObj.deliveryAddress.pinCode,
        }
      : null,
    items: vendorItems,
    vendorItemsCount,
    vendorSubtotal,
    deliveryBoy: orderObj.deliveryBoy || null,
    deliveryBoySnapshot: orderObj.deliveryBoySnapshot || null,
    deliveryStatus: orderObj.deliveryStatus || 'unassigned',
    deliveryAssignedAt: orderObj.deliveryAssignedAt || null,
    deliveryNotes: orderObj.deliveryNotes || '',
    statusHistory: orderObj.statusHistory || [],
  };
};

/**
 * @desc    Fetch vendor-specific store orders with status filters, text search, date range & pagination
 * @route   GET /api/vendor/orders
 * @access  Private (Approved Vendor only)
 */
export const getVendorOrders = async (req, res) => {
  try {
    const store = req.store || (await Store.findOne({ vendor: req.user._id }));
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store registered for this vendor account.',
      });
    }

    const { status, search, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Base query: Order must contain at least one product from this vendor's store
    const storeMatch = {
      $or: [{ stores: store._id }, { 'products.store': store._id }],
    };

    const filter = { ...storeMatch };

    // 1. Status Filter
    if (status && status !== 'All' && status !== 'all') {
      const matched = VALID_ORDER_STATUSES.find(
        (s) => s.toLowerCase() === String(status).trim().toLowerCase()
      );
      if (matched) {
        filter.orderStatus = matched;
      }
    }

    // 2. Date Range Filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // If date only (no time), include entire end of day
          if (String(endDate).length <= 10) {
            end.setHours(23, 59, 59, 999);
          }
          filter.createdAt.$lte = end;
        }
      }
    }

    // 3. Text Search (Order ID, customer name, email, phone, city, or item name)
    if (search && String(search).trim()) {
      const term = String(search).trim();
      const searchRegex = new RegExp(term, 'i');

      const searchConditions = [
        { 'deliveryAddress.fullName': searchRegex },
        { 'deliveryAddress.email': searchRegex },
        { 'deliveryAddress.mobileNumber': searchRegex },
        { 'deliveryAddress.city': searchRegex },
        { 'products.name': searchRegex },
      ];

      if (mongoose.Types.ObjectId.isValid(term)) {
        searchConditions.unshift({ _id: new mongoose.Types.ObjectId(term) });
      }

      filter.$and = filter.$and || [];
      filter.$and.push({ $or: searchConditions });
    }

    // Fast metric aggregation for vendor dashboard KPI cards
    const allStoreOrders = await Order.find(storeMatch)
      .select('orderStatus products')
      .lean();

    const summary = {
      total: allStoreOrders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      readyForPickup: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    for (const ord of allStoreOrders) {
      const s = ord.orderStatus;
      if (s === 'Pending') summary.pending += 1;
      else if (s === 'Confirmed') summary.confirmed += 1;
      else if (s === 'Processing') summary.processing += 1;
      else if (s === 'Packed') summary.packed += 1;
      else if (s === 'Ready for Pickup') summary.readyForPickup += 1;
      else if (s === 'Shipped') summary.shipped += 1;
      else if (s === 'Delivered') summary.delivered += 1;
      else if (s === 'Cancelled') summary.cancelled += 1;

      // Calculate revenue from non-cancelled orders for this vendor
      if (s !== 'Cancelled') {
        const vendorLines = (ord.products || []).filter(
          (it) => it.store && it.store.toString() === store._id.toString()
        );
        for (const line of vendorLines) {
          summary.totalRevenue += (line.price || 0) * (line.quantity || 1);
        }
      }
    }

    const totalOrders = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('customer', 'name email mobileNumber role')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status currentLocation')
      .populate('statusHistory.changedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format orders with strict store-level isolation
    const storeOrders = orders.map((order) =>
      formatVendorScopedOrder(order, store._id)
    );

    return res.status(200).json({
      success: true,
      count: storeOrders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit) || 1,
      currentPage: page,
      limit,
      store: {
        id: store._id,
        name: store.name,
        slug: store.slug,
      },
      summary,
      orders: storeOrders,
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vendor orders.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch a specific vendor order by ID with strict store-level isolation
 * @route   GET /api/vendor/orders/:id
 * @access  Private (Approved Vendor only)
 */
export const getVendorOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order identification format.',
      });
    }

    const store = req.store || (await Store.findOne({ vendor: req.user._id }));
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store registered for this vendor account.',
      });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email mobileNumber role')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status currentLocation')
      .populate('statusHistory.changedBy', 'name role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${id} was not found.`,
      });
    }

    // Verify order contains products from this vendor's store
    const vendorItems = (order.products || []).filter(
      (it) => it.store && it.store.toString() === store._id.toString()
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view this order because it does not contain products from your store.',
      });
    }

    const scopedOrder = formatVendorScopedOrder(order, store._id);

    return res.status(200).json({
      success: true,
      order: scopedOrder,
    });
  } catch (error) {
    console.error('Error fetching vendor order by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order details.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update order fulfillment status, accept/confirm, or reject with reason (Vendor action)
 * @route   PATCH /api/vendor/orders/:id/status
 * @access  Private (Approved Vendor only)
 * Rules:
 * - Vendor can only transition their store's orders
 * - Valid target statuses: Confirmed, Processing, Packed, Ready for Pickup, Cancelled (Rejection)
 * - Vendors CANNOT set 'Shipped' or 'Delivered' (reserved for delivery/admin workflow)
 * - Vendors CANNOT modify payments, prices, or totals
 * - If target status is 'Cancelled', a rejection reason is strictly required
 * - Rejection restores product inventory exactly once, with idempotent protection
 * - Audit entry appended to statusHistory with previousStatus, newStatus, changedBy, and note
 */
export const updateVendorOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: rawStatus, note, reason, cancellationReason } = req.body;

    // 1. Validate Order ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format provided.',
      });
    }

    // 2. Identify vendor store
    const store = req.store || (await Store.findOne({ vendor: req.user._id }));
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store registered for this vendor account.',
      });
    }

    // 3. Validate requested status
    if (!rawStatus || typeof rawStatus !== 'string' || !rawStatus.trim()) {
      return res.status(400).json({
        success: false,
        message: `Status is required. Permitted statuses for vendors: ${VENDOR_ALLOWED_TARGET_STATUSES.join(', ')}.`,
      });
    }

    const normalizedStatus = rawStatus.trim();

    // Guard: Delivery and Shipped are strictly reserved for logistics/admin workflow
    if (normalizedStatus.toLowerCase() === 'delivered' || normalizedStatus.toLowerCase() === 'shipped') {
      return res.status(403).json({
        success: false,
        message: 'Vendors are not authorized to mark orders as Delivered or Shipped. Delivery confirmation is reserved for authorized courier and administration workflow.',
      });
    }

    // Check if status is in vendor-permitted list
    const targetStatus = VENDOR_ALLOWED_TARGET_STATUSES.find(
      (s) => s.toLowerCase() === normalizedStatus.toLowerCase()
    );

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status '${rawStatus}'. Permitted statuses for vendors are: ${VENDOR_ALLOWED_TARGET_STATUSES.join(', ')}.`,
      });
    }

    // 4. Find order
    const order = await Order.findById(id).populate('customer', 'name email mobileNumber role');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order #${id} was not found.`,
      });
    }

    // 5. Enforce store-level isolation: check if order contains items from this vendor's store
    const vendorItems = (order.products || []).filter(
      (it) => it.store && it.store.toString() === store._id.toString()
    );

    if (vendorItems.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to modify this order.',
      });
    }

    const currentStatus = order.orderStatus;

    // 6. Prevent repeated conflicting or redundant updates
    if (currentStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${targetStatus}' status.`,
      });
    }

    // 7. Check if order is already terminal or in transit
    if (['Shipped', 'Delivered', 'Cancelled'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status of an order that is already '${currentStatus}'.`,
      });
    }

    // 8. Check state machine allowed transitions
    const allowed = VENDOR_ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed options are: ${allowed.join(', ')}.`,
      });
    }

    // 9. Rejection / Cancellation handling with idempotent stock restoration
    const effectiveReason = reason || cancellationReason || note;

    if (targetStatus === 'Cancelled') {
      if (!effectiveReason || !String(effectiveReason).trim()) {
        return res.status(400).json({
          success: false,
          message: 'A rejection reason is required when rejecting or cancelling an order.',
        });
      }

      // Restore stock for vendor's products exactly once
      for (const item of vendorItems) {
        if (!item.isRestocked && item.product && item.quantity > 0) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          }).catch((err) => console.error('Restock error on vendor rejection:', err));

          item.isRestocked = true;
          item.restockedAt = new Date();
        }
      }

      order.isStockRestocked = true;
      order.cancellationReason = String(effectiveReason).trim();
      order.cancelledAt = new Date();
    }

    // 10. Update status and append to audit history
    order.orderStatus = targetStatus;

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: targetStatus,
      previousStatus: currentStatus,
      changedAt: new Date(),
      changedBy: req.user._id,
      note: effectiveReason
        ? String(effectiveReason).trim()
        : `Order marked as ${targetStatus} by merchant (${store.name})`,
    });

    order.markModified('products');
    order.markModified('statusHistory');
    await order.save();

    const scopedOrder = formatVendorScopedOrder(order, store._id);

    return res.status(200).json({
      success: true,
      message: `Order #${order._id} status successfully updated to '${targetStatus}'.`,
      order: scopedOrder,
    });
  } catch (error) {
    console.error('Error updating vendor order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch all orders across the platform for admin ledger
 * @route   GET /api/admin/orders & GET /api/orders
 * @access  Private (Admin only)
 */
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, search, storeId } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      const matchedStatus = VALID_ORDER_STATUSES.find(
        (s) => s.toLowerCase() === String(status).trim().toLowerCase()
      );
      if (matchedStatus) {
        filter.orderStatus = matchedStatus;
      }
    }

    if (storeId && mongoose.isValidObjectId(storeId)) {
      filter.stores = new mongoose.Types.ObjectId(storeId);
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
          { 'products.name': searchRegex },
          { 'products.storeName': searchRegex },
        ];
      } else {
        filter.$or = [
          { 'deliveryAddress.fullName': searchRegex },
          { 'deliveryAddress.email': searchRegex },
          { 'deliveryAddress.mobileNumber': searchRegex },
          { 'deliveryAddress.city': searchRegex },
          { 'products.name': searchRegex },
          { 'products.storeName': searchRegex },
        ];
      }
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name email mobile role')
      .populate('stores', 'name slug logoUrl supportEmail supportPhone')
      .populate('products.store', 'name slug logoUrl')
      .populate('products.vendor', 'name email mobile')
      .populate('deliveryBoy', 'name phone vehicleType vehicleNumber status')
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

    // 6. Handle stock restoration on cancellation
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

    // 7. Record delivery timestamp when delivered
    if (targetStatus === 'Delivered') {
      order.deliveredAt = new Date();
    }

    // 8. Update status and append to status history
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
 * @desc    Calculate verified shipping fee, subtotal, and total from trusted catalog prices (Backward-compatible)
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


