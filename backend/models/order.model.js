const mongoose = require('mongoose');

/**
 * Lab 06: Order
 *
 * Unlike the Cart (live references to Product), an Order is a historical record.
 * Each item keeps a SNAPSHOT of the product's name, price and image at purchase
 * time, so the order stays correct even if the product changes or is deleted later.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String }
  },
  { _id: false }
);

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED'];

const orderSchema = new mongoose.Schema(
  {
    // ShopKart's user model is Customer (Labs 01-05)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must contain at least one item'
      }
    },

    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      addressLine1: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true }
    },

    // Calculated on the server from the latest product prices, never taken from the client
    totalAmount: { type: Number, required: true, min: 0 },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING_PAYMENT' },

    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },

    // Set if stock ran out between checkout and payment (two buyers, last unit)
    stockIssue: { type: Boolean, default: false }
  },
  { timestamps: true, versionKey: false }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
