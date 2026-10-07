const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart
} = require('../controllers/cart.controller');

/**
 * Lab 05: Cart Routes
 * Base route: /cart
 *
 * Every cart route is protected; the customer is identified from the JWT.
 */
router.use(authMiddleware);

// Task 3: Get current customer's cart (populated)
router.get('/', getCart);

// Task 2: Add product (or +1 if already in cart)
router.post('/:productId', addToCart);

// Task 4: Set quantity
router.patch('/:productId', updateCartQuantity);

// Task 5: Remove product
router.delete('/:productId', removeFromCart);

module.exports = router;
