const Razorpay = require('razorpay');

/**
 * Lab 06: Razorpay client (Test Mode keys only).
 *
 * Keys come from backend/.env:
 *   RAZORPAY_KEY_ID=rzp_test_...
 *   RAZORPAY_KEY_SECRET=...
 *
 * The key SECRET stays on the server. Only the key ID is ever sent to React.
 * If the keys are missing, checkout answers 503 "Payment is not configured"
 * instead of crashing.
 */
let client = null;

const isRazorpayConfigured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpay = () => {
  if (!isRazorpayConfigured()) return null;
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return client;
};

module.exports = { isRazorpayConfigured, getRazorpay };
