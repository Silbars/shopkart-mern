const crypto = require('crypto');
const mongoose = require('mongoose');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const { ORDER_STATUSES } = require('../models/order.model');
const { isRazorpayConfigured, getRazorpay } = require('../config/razorpay');
const validateShippingAddress = require('../utils/validateShippingAddress');

/**
 * Lab 06: Checkout & Orders Controller
 *
 * Rules this file enforces:
 * - The customer is always req.user._id (from the JWT), never from the request body.
 * - Items, prices and the total come from MongoDB, never from the client.
 * - An order becomes PAID only after the Razorpay signature is verified here.
 * - The cart is cleared only after that verification succeeds.
 */

const ORDER_NOT_FOUND = { success: false, message: 'Order not found' };

// Orders with these statuses appear in "My Orders" (abandoned payments are hidden)
const PLACED_STATUSES = ORDER_STATUSES.filter((s) => s !== 'PENDING_PAYMENT');

const toPaise = (rupees) => Math.round(rupees * 100);

/**
 * Same items (product, quantity, price) and same total?
 * Used to reuse a pending order when the customer retries checkout.
 */
const sameSnapshot = (order, items, totalAmount) =>
  order.totalAmount === totalAmount &&
  order.items.length === items.length &&
  items.every((item) =>
    order.items.some(
      (o) =>
        o.product.toString() === item.product.toString() &&
        o.quantity === item.quantity &&
        o.price === item.price
    )
  );

/**
 * Task 4: Validate the cart, create a pending ShopKart order and a Razorpay order.
 * POST /orders/create-payment-order   (also POST /orders)
 * Body: { shippingAddress } - anything else (totalAmount, items) is ignored.
 */
const createPaymentOrder = async (req, res) => {
  try {
    // 1. Shipping address
    const { value: shippingAddress, errors } = validateShippingAddress(req.body?.shippingAddress);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Please fix the shipping details.', errors });
    }

    // 2. The customer's cart, from the database
    const customer = await Customer.findById(req.user._id).select('cart');
    const cart = customer?.cart || [];
    if (cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    // 3. Latest product data for every cart row
    const products = await Product.find({ _id: { $in: cart.map((row) => row.product) } });
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    const items = [];
    for (const row of cart) {
      const product = productById.get(row.product.toString());
      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'An item in your cart is no longer available. Remove it from your cart and try again.'
        });
      }
      // 4. Final stock check (stock may have changed since it was added to the cart)
      if (row.quantity > product.stock) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}.` });
      }
      // 5. Snapshot of purchase-time data
      items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: row.quantity,
        image: product.image
      });
    }

    // 6. Total calculated on the server
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment is not configured on this server. Add the Razorpay test keys to backend/.env.'
      });
    }

    // 7. Retrying with the same cart? Reuse the pending order and its Razorpay order.
    const pending = await Order.findOne({
      user: req.user._id,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      razorpayOrderId: { $exists: true }
    }).sort({ createdAt: -1 });

    if (pending && sameSnapshot(pending, items, totalAmount)) {
      pending.shippingAddress = shippingAddress;
      await pending.save();
      return res.status(200).json({
        success: true,
        shopKartOrderId: pending._id,
        razorpayOrderId: pending.razorpayOrderId,
        amount: toPaise(totalAmount),
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      });
    }

    // 8. New pending ShopKart order
    const order = await Order.create({ user: req.user._id, items, shippingAddress, totalAmount });

    // 9. Razorpay order, amount in paise (₹1 = 100 paise)
    let razorpayOrder;
    try {
      razorpayOrder = await getRazorpay().orders.create({
        amount: toPaise(totalAmount),
        currency: 'INR',
        receipt: order._id.toString()
      });
    } catch (error) {
      console.error('Razorpay order creation failed:', error?.error || error);
      order.paymentStatus = 'FAILED';
      await order.save();
      return res.status(502).json({
        success: false,
        message: 'Could not start the payment. Your cart has not been changed. Please try again.'
      });
    }

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    // 10. Safe checkout data: key ID only, never the key secret
    return res.status(201).json({
      success: true,
      shopKartOrderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while starting checkout' });
  }
};

/** Constant-time comparison of two hex signatures */
const signaturesMatch = (expected, received) => {
  if (typeof received !== 'string' || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Verify the Razorpay payment signature, then confirm the order.
 * POST /orders/verify-payment
 * Body: { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      shopKartOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature
    } = req.body || {};

    if (!shopKartOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }
    if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    // Only the owner's order (someone else's order looks exactly like a missing one)
    const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
    if (!order) {
      return res.status(404).json(ORDER_NOT_FOUND);
    }

    // Already confirmed (double submit / retry): return it, change nothing
    if (order.paymentStatus === 'PAID') {
      return res.status(200).json({ success: true, message: 'Payment already verified', order });
    }

    // The trusted Razorpay order id is the one WE stored, not the one the browser sent
    if (!order.razorpayOrderId || razorpayOrderId !== order.razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Payment does not belong to this order' });
    }

    // HMAC_SHA256(stored_razorpay_order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!process.env.RAZORPAY_KEY_SECRET || !signaturesMatch(expectedSignature, razorpaySignature)) {
      // Nothing changes: order stays PENDING_PAYMENT, cart is kept
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 1. Mark PAID / PLACED, but only if it is still pending (runs at most once per order)
    const paid = await Order.findOneAndUpdate(
      { _id: order._id, user: req.user._id, status: 'PENDING_PAYMENT' },
      {
        $set: {
          paymentStatus: 'PAID',
          status: 'PLACED',
          razorpayPaymentId,
          paidAt: new Date()
        }
      },
      { new: true }
    );

    if (!paid) {
      // Another request confirmed it a moment ago
      const current = await Order.findById(order._id);
      return res.status(200).json({ success: true, message: 'Payment already verified', order: current });
    }

    // 2. Reduce stock. Each update only succeeds if enough stock is left, so stock never goes negative.
    let stockIssue = false;
    for (const item of paid.items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (result.modifiedCount === 0) stockIssue = true;
    }
    if (stockIssue) {
      paid.stockIssue = true;
      await paid.save();
    }

    // 3. Clear the cart, only now that payment is verified
    await Customer.updateOne({ _id: req.user._id }, { $set: { cart: [] } });

    return res.status(200).json({ success: true, message: 'Payment verified. Order placed.', order: paid });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while verifying payment' });
  }
};

/**
 * Task 7: The current customer's orders, newest first.
 * GET /orders
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id, status: { $in: PLACED_STATUSES } }).sort({
      createdAt: -1
    });
    return res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching orders' });
  }
};

/**
 * One order, only if it belongs to the current customer.
 * GET /orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      return res.status(404).json(ORDER_NOT_FOUND);
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching order' });
  }
};

/**
 * Bonus: move an order one step forward (development only).
 * PATCH /orders/:id/status    PLACED -> CONFIRMED -> SHIPPED -> DELIVERED
 */
const NEXT_STATUS = { PLACED: 'CONFIRMED', CONFIRMED: 'SHIPPED', SHIPPED: 'DELIVERED' };

const advanceOrderStatus = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Status updates are disabled in production' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) {
      return res.status(404).json(ORDER_NOT_FOUND);
    }

    const next = NEXT_STATUS[order.status];
    if (!next) {
      return res.status(400).json({
        success: false,
        message:
          order.status === 'DELIVERED'
            ? 'This order is already delivered'
            : 'Only paid orders can move forward'
      });
    }

    // Conditional update: only moves forward from the status we just read
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: next } },
      { new: true }
    );

    return res.status(200).json({ success: true, order: updated || order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while updating status' });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  advanceOrderStatus
};
