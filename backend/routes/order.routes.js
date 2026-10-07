const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  advanceOrderStatus
} = require('../controllers/order.controller');

/**
 * Lab 06: Order Routes
 * Base route: /orders
 * Every route is protected; the customer comes from the JWT.
 */
router.use(authMiddleware);

// Checkout: validate cart + stock, create pending order + Razorpay order
router.post('/create-payment-order', createPaymentOrder);
router.post('/', createPaymentOrder); // same handler (lab Postman test 1 uses POST /orders)

// Verify Razorpay signature, mark PAID / PLACED, clear cart
router.post('/verify-payment', verifyPayment);

// Order history + single order (owner only)
router.get('/', getMyOrders);
router.get('/:id', getOrderById);

// Bonus (development only): advance PLACED -> CONFIRMED -> SHIPPED -> DELIVERED
router.patch('/:id/status', advanceOrderStatus);

module.exports = router;
