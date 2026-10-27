import mongoose from 'mongoose';
import DeliveryBoy from '../models/DeliveryBoy.js';
import Store from '../models/Store.js';
import Order from '../models/Order.js';
import bcrypt from 'bcryptjs';

/**
 * Helper to escape regex
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Get authenticated vendor's store
 */
async function getVendorStore(vendorId) {
  return await Store.findOne({ vendor: vendorId });
}

/**
 * @desc    Get all delivery boys for the authenticated vendor's store
 * @route   GET /api/vendor/delivery-boys
 * @access  Private (Approved Vendor only)
 */
export const getDeliveryBoys = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const { search, status, sort = 'newest' } = req.query;

    const query = { vendor: req.user._id, store: store._id };

    if (search && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { phone: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
        { vehicleNumber: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'name-asc') sortOptions = { name: 1 };
    if (sort === 'deliveries-desc') sortOptions = { deliveriesCompleted: -1 };
    if (sort === 'rating-desc') sortOptions = { rating: -1 };

    const deliveryBoys = await DeliveryBoy.find(query)
      .select('-password')
      .populate('activeOrderId', 'orderNumber deliveryAddress totalAmount status orderStatus paymentStatus createdAt items')
      .sort(sortOptions);

    // Dynamic Store Hub information from vendor's store
    const storeHub = {
      name: store.name || 'Store Atelier Hub',
      address: store.pickupAddress || store.businessAddress || 'Indore Central Dispatch Zone',
      latitude: store.address?.latitude || 22.7196,
      longitude: store.address?.longitude || 75.8577,
      phone: store.phone || '',
    };

    // Fleet Status Telemetry Summary
    const allBoys = await DeliveryBoy.find({ vendor: req.user._id, store: store._id });
    const summary = {
      total: allBoys.length,
      available: allBoys.filter((b) => b.status === 'available').length,
      onDelivery: allBoys.filter((b) => b.status === 'on_delivery').length,
      offline: allBoys.filter((b) => b.status === 'offline').length,
      inactive: allBoys.filter((b) => b.status === 'inactive').length,
    };

    return res.status(200).json({
      success: true,
      count: deliveryBoys.length,
      summary,
      storeHub,
      deliveryBoys,
    });
  } catch (error) {
    console.error('Error fetching delivery fleet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery staff members.',
    });
  }
};

/**
 * @desc    Create a new delivery boy account under the vendor's store
 * @route   POST /api/vendor/delivery-boys
 * @access  Private (Approved Vendor only)
 */
export const createDeliveryBoy = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const {
      name,
      email,
      phone,
      password,
      vehicleType = 'Motorcycle',
      vehicleNumber = '',
      licenseNumber = '',
      emergencyContact = '',
      status = 'available',
      initialLatitude,
      initialLongitude,
      initialAddress,
    } = req.body;

    const errors = {};
    if (!name || !name.trim()) errors.name = 'Full name is required';
    if (!email || !email.trim()) errors.email = 'Email address is required';
    if (!phone || !phone.trim()) errors.phone = 'Phone number is required';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Check if email is already registered under this vendor
    const existing = await DeliveryBoy.findOne({
      vendor: req.user._id,
      email: email.trim().toLowerCase(),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A delivery boy with email "${email}" already exists in your fleet.`,
        errors: { email: 'Email is already in use' },
      });
    }

    // Base coordinates with realistic micro-scatter near city center (Indore hub default)
    const baseLat = initialLatitude || 22.7196 + (Math.random() - 0.5) * 0.05;
    const baseLng = initialLongitude || 75.8577 + (Math.random() - 0.5) * 0.05;

    const deliveryBoy = await DeliveryBoy.create({
      vendor: req.user._id,
      store: store._id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      emergencyContact: emergencyContact.trim(),
      status,
      currentLocation: {
        latitude: parseFloat(baseLat.toFixed(5)),
        longitude: parseFloat(baseLng.toFixed(5)),
        address: initialAddress || `${store.name} Dispatch Point, Zone 1`,
        lastUpdated: new Date(),
        speed: 0,
        batteryLevel: Math.floor(Math.random() * 25) + 75,
        heading: Math.floor(Math.random() * 360),
      },
    });

    const safeData = deliveryBoy.toObject();
    delete safeData.password;

    return res.status(201).json({
      success: true,
      message: `Delivery agent "${deliveryBoy.name}" registered successfully.`,
      deliveryBoy: safeData,
    });
  } catch (error) {
    console.error('Error creating delivery boy:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create delivery boy account.',
    });
  }
};

/**
 * @desc    Get single delivery boy by ID
 * @route   GET /api/vendor/delivery-boys/:id
 * @access  Private (Approved Vendor only)
 */
export const getDeliveryBoyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery agent ID format.' });
    }

    const deliveryBoy = await DeliveryBoy.findOne({
      _id: id,
      vendor: req.user._id,
    }).select('-password');

    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found.' });
    }

    return res.status(200).json({ success: true, deliveryBoy });
  } catch (error) {
    console.error('Error fetching delivery agent by ID:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve delivery agent.' });
  }
};

/**
 * @desc    Update delivery boy details or status
 * @route   PUT /api/vendor/delivery-boys/:id
 * @access  Private (Approved Vendor only)
 */
export const updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery agent ID format.' });
    }

    const deliveryBoy = await DeliveryBoy.findOne({ _id: id, vendor: req.user._id });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found in your fleet.' });
    }

    const {
      name,
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      status,
      emergencyContact,
      password,
    } = req.body;

    if (name) deliveryBoy.name = name.trim();
    if (phone) deliveryBoy.phone = phone.trim();
    if (vehicleType) deliveryBoy.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) deliveryBoy.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (licenseNumber !== undefined) deliveryBoy.licenseNumber = licenseNumber.trim().toUpperCase();
    if (status) deliveryBoy.status = status;
    if (emergencyContact !== undefined) deliveryBoy.emergencyContact = emergencyContact.trim();

    if (password && password.trim().length >= 6) {
      deliveryBoy.password = password.trim();
    }

    await deliveryBoy.save();

    const safeData = deliveryBoy.toObject();
    delete safeData.password;

    return res.status(200).json({
      success: true,
      message: `Delivery agent "${deliveryBoy.name}" updated successfully.`,
      deliveryBoy: safeData,
    });
  } catch (error) {
    console.error('Error updating delivery boy:', error);
    return res.status(500).json({ success: false, message: 'Failed to update delivery agent.' });
  }
};

/**
 * @desc    Delete delivery boy account
 * @route   DELETE /api/vendor/delivery-boys/:id
 * @access  Private (Approved Vendor only)
 */
export const deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery agent ID format.' });
    }

    const deliveryBoy = await DeliveryBoy.findOneAndDelete({ _id: id, vendor: req.user._id });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found in your fleet.' });
    }

    return res.status(200).json({
      success: true,
      message: `Delivery agent "${deliveryBoy.name}" removed from your fleet.`,
    });
  } catch (error) {
    console.error('Error deleting delivery boy:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete delivery agent.' });
  }
};

/**
 * @desc    Update live GPS coordinates and telemetry for a delivery boy
 * @route   PATCH /api/vendor/delivery-boys/:id/location
 * @access  Private (Approved Vendor only)
 */
export const updateDeliveryBoyLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address, speed, batteryLevel, heading } = req.body;

    let deliveryBoy;
    if (req.user.role === 'delivery_boy') {
      deliveryBoy = await DeliveryBoy.findById(req.user._id);
    } else {
      deliveryBoy = await DeliveryBoy.findOne({ _id: id, vendor: req.user._id });
    }

    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found.' });
    }

    if (latitude !== undefined) deliveryBoy.currentLocation.latitude = parseFloat(latitude);
    if (longitude !== undefined) deliveryBoy.currentLocation.longitude = parseFloat(longitude);
    if (address !== undefined) deliveryBoy.currentLocation.address = address;
    if (speed !== undefined) deliveryBoy.currentLocation.speed = parseFloat(speed);
    if (batteryLevel !== undefined) deliveryBoy.currentLocation.batteryLevel = parseInt(batteryLevel, 10);
    if (heading !== undefined) deliveryBoy.currentLocation.heading = parseInt(heading, 10);
    deliveryBoy.currentLocation.lastUpdated = new Date();

    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: 'Telemetry coordinates updated.',
      currentLocation: deliveryBoy.currentLocation,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({ success: false, message: 'Failed to update GPS telemetry.' });
  }
};

/**
 * @desc    Simulate real-time GPS telemetry movement step for on-duty agents
 * @route   POST /api/vendor/delivery-boys/simulate-live
 * @access  Private (Approved Vendor only)
 */
export const simulateLiveTelemetry = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    const activeFleet = await DeliveryBoy.find({
      vendor: req.user._id,
      store: store._id,
      status: { $in: ['available', 'on_delivery'] },
    });

    const landmarks = [
      'Near Velocity Mall, Scheme 54',
      'At 56 Dukan Gourmet Square',
      'Crossing Vijay Nagar Square',
      'Near Apollo Premier Tower',
      'En route to Regal Square Delivery',
      'Near Palasia Point Plaza',
      'Bhawarkua Transit Corridor',
    ];

    for (const boy of activeFleet) {
      // Small realistic jitter movement (~20-50 meters)
      const latDelta = (Math.random() - 0.48) * 0.0018;
      const lngDelta = (Math.random() - 0.48) * 0.0018;

      boy.currentLocation.latitude = parseFloat((boy.currentLocation.latitude + latDelta).toFixed(5));
      boy.currentLocation.longitude = parseFloat((boy.currentLocation.longitude + lngDelta).toFixed(5));
      boy.currentLocation.speed = boy.status === 'on_delivery' ? Math.floor(Math.random() * 25) + 18 : 0;
      boy.currentLocation.heading = Math.floor(Math.random() * 360);
      boy.currentLocation.lastUpdated = new Date();

      if (Math.random() > 0.4) {
        boy.currentLocation.address = landmarks[Math.floor(Math.random() * landmarks.length)];
      }

      await boy.save();
    }

    const updatedFleet = await DeliveryBoy.find({ vendor: req.user._id, store: store._id }).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Live GPS telemetry updated.',
      deliveryBoys: updatedFleet,
    });
  } catch (error) {
    console.error('Error simulating telemetry:', error);
    return res.status(500).json({ success: false, message: 'Failed to simulate GPS telemetry.' });
  }
};

/**
 * @desc    Assign an order to a delivery boy
 * @route   POST /api/vendor/delivery-boys/assign-order
 * @access  Private (Approved Vendor only)
 */
export const assignDeliveryBoyToOrder = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'No store profile found.' });
    }

    const { orderId, deliveryBoyId, deliveryNotes = '' } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
    }
    if (!deliveryBoyId || !mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({ success: false, message: 'Valid Delivery Agent ID is required.' });
    }

    // Find Delivery Boy and verify ownership
    const deliveryBoy = await DeliveryBoy.findOne({ _id: deliveryBoyId, vendor: req.user._id });
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found in your fleet.' });
    }

    // Find Order and verify it contains items from this store
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const storeItems = (order.products || []).filter(
      (p) => p.store && p.store.toString() === store._id.toString()
    );
    if (storeItems.length === 0) {
      return res.status(403).json({ success: false, message: 'Order does not belong to your store.' });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot assign a cancelled order.' });
    }
    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order has already been delivered.' });
    }

    // If order was assigned to a different delivery boy, release the previous one
    if (order.deliveryBoy && order.deliveryBoy.toString() !== deliveryBoy._id.toString()) {
      const prevBoy = await DeliveryBoy.findById(order.deliveryBoy);
      if (prevBoy && prevBoy.activeOrderId?.toString() === order._id.toString()) {
        prevBoy.status = 'available';
        prevBoy.activeOrderId = null;
        prevBoy.activeOrderNumber = '';
        await prevBoy.save();
      }
    }

    const currentStatus = order.orderStatus;
    const targetStatus = currentStatus === 'Pending' || currentStatus === 'Confirmed' || currentStatus === 'Processing' || currentStatus === 'Packed'
      ? 'Shipped'
      : currentStatus;

    order.deliveryBoy = deliveryBoy._id;
    order.deliveryBoySnapshot = {
      name: deliveryBoy.name,
      phone: deliveryBoy.phone,
      vehicleType: deliveryBoy.vehicleType,
      vehicleNumber: deliveryBoy.vehicleNumber,
    };
    order.deliveryStatus = 'assigned';
    order.orderStatus = targetStatus;
    order.deliveryAssignedAt = new Date();
    if (!order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }
    if (deliveryNotes) order.deliveryNotes = deliveryNotes.trim();

    order.statusHistory.push({
      status: targetStatus,
      previousStatus: currentStatus,
      changedBy: req.user._id,
      changedAt: new Date(),
      note: `Dispatched & assigned to delivery agent: ${deliveryBoy.name} (${deliveryBoy.phone})`,
    });

    await order.save();

    // Update Delivery Boy status & active order link
    deliveryBoy.status = 'on_delivery';
    deliveryBoy.activeOrderId = order._id;
    deliveryBoy.activeOrderNumber = '#' + order._id.toString().slice(-6).toUpperCase();
    deliveryBoy.currentLocation.lastUpdated = new Date();
    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} successfully dispatched to ${deliveryBoy.name}.`,
      order,
      deliveryBoy,
    });
  } catch (error) {
    console.error('Error assigning order to delivery boy:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign order to delivery agent.' });
  }
};

/**
 * @desc    Unassign an order from its delivery boy
 * @route   POST /api/vendor/delivery-boys/unassign-order
 * @access  Private (Approved Vendor only)
 */
export const unassignDeliveryBoyFromOrder = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found.' });

    const { orderId } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.deliveryBoy) {
      const boy = await DeliveryBoy.findOne({ _id: order.deliveryBoy, vendor: req.user._id });
      if (boy) {
        boy.status = 'available';
        boy.activeOrderId = null;
        boy.activeOrderNumber = '';
        await boy.save();
      }
    }

    order.deliveryBoy = null;
    order.deliveryBoySnapshot = null;
    order.deliveryStatus = 'unassigned';
    if (order.orderStatus === 'Shipped') {
      order.orderStatus = 'Ready for Pickup';
    }
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Delivery assignment removed. Order returned to unassigned queue.',
      order,
    });
  } catch (error) {
    console.error('Error unassigning delivery boy:', error);
    return res.status(500).json({ success: false, message: 'Failed to unassign delivery agent.' });
  }
};

/**
 * @desc    Complete order delivery (Mark delivered)
 * @route   POST /api/vendor/delivery-boys/complete-order
 * @access  Private (Approved Vendor or Assigned Delivery Boy)
 */
export const completeOrderDelivery = async (req, res) => {
  try {
    const { orderId, deliveryOtp, cashCollected } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // OTP Verification Check (if order has OTP and deliveryOtp is supplied)
    if (order.deliveryOtp && deliveryOtp) {
      if (String(deliveryOtp).trim() !== String(order.deliveryOtp).trim()) {
        return res.status(400).json({
          success: false,
          message: `Invalid Delivery OTP "${deliveryOtp}". Please request the customer's 4-digit code shown on their tracking screen.`,
        });
      }
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = 'Delivered';
    order.deliveryStatus = 'delivered';
    order.deliveredAt = new Date();

    if (cashCollected !== undefined && cashCollected !== null) {
      order.cashCollected = Math.max(0, Number(cashCollected) || 0);
    }

    // Auto mark paid if COD delivery completed
    if (order.paymentMethod && /cod|cash/i.test(order.paymentMethod)) {
      order.isPaid = true;
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }

    order.statusHistory.push({
      status: 'Delivered',
      previousStatus: prevStatus,
      changedBy: req.user._id,
      changedAt: new Date(),
      note: 'Order successfully delivered to customer destination.',
    });
    await order.save();

    if (order.deliveryBoy) {
      const boy = await DeliveryBoy.findById(order.deliveryBoy);
      if (boy) {
        boy.status = 'available';
        boy.activeOrderId = null;
        boy.activeOrderNumber = '';
        boy.deliveriesCompleted = (boy.deliveriesCompleted || 0) + 1;
        await boy.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} marked as Delivered successfully!`,
      order,
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete order delivery.' });
  }
};

/**
 * @desc    Get unassigned store orders awaiting delivery dispatch
 * @route   GET /api/vendor/delivery-boys/unassigned-orders
 * @access  Private (Approved Vendor only)
 */
export const getUnassignedStoreOrders = async (req, res) => {
  try {
    const store = await getVendorStore(req.user._id);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found.' });

    const orders = await Order.find({
      $or: [{ stores: store._id }, { 'products.store': store._id }],
      orderStatus: { $in: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Pickup'] },
      $or: [{ deliveryBoy: null }, { deliveryStatus: 'unassigned' }],
    })
      .populate('customer', 'name mobileNumber email')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Error fetching unassigned orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve unassigned orders.' });
  }
};

/**
 * @desc    Get assigned orders for the logged-in delivery boy
 * @route   GET /api/vendor/delivery-boys/my-orders
 * @access  Private (Delivery Boy only)
 */
export const getDeliveryBoyAssignedOrders = async (req, res) => {
  try {
    const boyId = req.user._id;
    const boy = await DeliveryBoy.findById(boyId).select('-password');
    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery agent profile not found.' });
    }

    // Find orders where deliveryBoy is this rider
    const orders = await Order.find({ deliveryBoy: boyId })
      .populate('customer', 'name mobileNumber email')
      .populate('stores', 'name supportPhone address')
      .sort({ createdAt: -1 });

    const activeOrders = orders.filter(
      (o) => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled'
    );
    const completedOrders = orders.filter((o) => o.orderStatus === 'Delivered');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCompleted = completedOrders.filter(
      (o) => o.deliveredAt && new Date(o.deliveredAt) >= startOfToday
    );

    // Dynamic earnings formula: ₹60 base pay + ₹25 fuel incentive per delivery
    const todayEarnings = todayCompleted.length * 85;
    const todayCodCollected = todayCompleted.reduce((acc, o) => {
      if (o.paymentMethod && /cod|cash/i.test(o.paymentMethod)) {
        return acc + (Number(o.totalAmount || o.totalPrice || 0));
      }
      return acc;
    }, 0);

    return res.status(200).json({
      success: true,
      profile: boy,
      activeOrders,
      completedOrders,
      totalActive: activeOrders.length,
      totalCompleted: completedOrders.length,
      summary: {
        todayEarnings,
        todayCompletedCount: todayCompleted.length,
        todayCodCollected,
        activeCount: activeOrders.length,
        totalCompletedCount: completedOrders.length,
      },
    });
  } catch (error) {
    console.error('Error fetching delivery boy orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assigned orders.' });
  }
};

/**
 * @desc    Delivery boy accepts an assigned order
 * @route   POST /api/vendor/delivery-boys/accept-order
 * @access  Private (Delivery Boy only)
 */
export const acceptAssignedOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
    }

    const boyId = req.user._id;
    const boy = await DeliveryBoy.findById(boyId);
    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery agent profile not found.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.deliveryBoy && order.deliveryBoy.toString() !== boyId.toString()) {
      return res.status(403).json({ success: false, message: 'This order is not assigned to you.' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is already delivered.' });
    }

    const prevStatus = order.orderStatus;
    order.deliveryStatus = 'out_for_delivery';
    order.orderStatus = 'Shipped';
    if (!order.deliveryOtp) {
      order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }
    order.statusHistory.push({
      status: 'Shipped',
      previousStatus: prevStatus,
      changedBy: boy._id,
      changedAt: new Date(),
      note: `Delivery partner ${boy.name} (${boy.phone}) accepted the assignment and is out for delivery.`,
    });

    await order.save();

    boy.status = 'on_delivery';
    boy.activeOrderId = order._id;
    boy.activeOrderNumber = '#' + order._id.toString().slice(-6).toUpperCase();
    await boy.save();

    return res.status(200).json({
      success: true,
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} accepted! Live tracking is now active.`,
      order,
      boy,
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept order.' });
  }
};

/**
 * @desc    Delivery boy rejects an assigned order
 * @route   POST /api/vendor/delivery-boys/reject-order
 * @access  Private (Delivery Boy only)
 */
export const rejectAssignedOrder = async (req, res) => {
  try {
    const { orderId, reason = 'Rider unavailable' } = req.body;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Valid Order ID is required.' });
    }

    const boyId = req.user._id;
    const boy = await DeliveryBoy.findById(boyId);
    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery agent profile not found.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.deliveryBoy = null;
    order.deliveryBoySnapshot = null;
    order.deliveryStatus = 'unassigned';
    order.statusHistory.push({
      status: 'Pending',
      previousStatus: order.orderStatus,
      changedBy: boy._id,
      changedAt: new Date(),
      note: `Rider ${boy.name} declined assignment (${reason}). Order returned to store dispatch queue.`,
    });
    await order.save();

    boy.status = 'available';
    boy.activeOrderId = null;
    boy.activeOrderNumber = '';
    await boy.save();

    return res.status(200).json({
      success: true,
      message: 'Order declined and returned to store queue.',
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    return res.status(500).json({ success: false, message: 'Failed to decline order.' });
  }
};

/**
 * @desc    Delivery boy updates duty status (available / offline)
 * @route   PATCH /api/vendor/delivery-boys/my-status
 * @access  Private (Delivery Boy only)
 */
export const updateMyDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'offline'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be available or offline.' });
    }

    const boy = await DeliveryBoy.findById(req.user._id);
    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found.' });
    }

    boy.status = status;
    await boy.save();

    return res.status(200).json({
      success: true,
      message: `Duty status updated to ${status}.`,
      boy,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update duty status.' });
  }
};

/**
 * @desc    Delivery boy updates live GPS telemetry (latitude, longitude, speed, heading, battery, address)
 * @route   PATCH /api/vendor/delivery-boys/my-location
 * @access  Private (Delivery Boy only)
 */
export const updateMyDeliveryLocation = async (req, res) => {
  try {
    const { latitude, longitude, speed, heading, batteryLevel, address } = req.body;
    const boy = await DeliveryBoy.findById(req.user._id);
    if (!boy) {
      return res.status(404).json({ success: false, message: 'Delivery agent not found.' });
    }

    if (latitude !== undefined && latitude !== null) boy.currentLocation.latitude = Number(latitude);
    if (longitude !== undefined && longitude !== null) boy.currentLocation.longitude = Number(longitude);
    if (speed !== undefined && speed !== null) boy.currentLocation.speed = Math.max(0, Number(speed));
    if (heading !== undefined && heading !== null) boy.currentLocation.heading = Number(heading);
    if (batteryLevel !== undefined && batteryLevel !== null) boy.currentLocation.batteryLevel = Math.min(100, Math.max(0, Number(batteryLevel)));
    if (address) boy.currentLocation.address = String(address).trim();
    boy.currentLocation.lastUpdated = new Date();

    await boy.save();

    return res.status(200).json({
      success: true,
      message: 'Live GPS telemetry updated successfully.',
      currentLocation: boy.currentLocation,
    });
  } catch (error) {
    console.error('Error updating delivery boy location:', error);
    return res.status(500).json({ success: false, message: 'Failed to update location telemetry.' });
  }
};

