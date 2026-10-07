const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist
} = require('../controllers/wishlist.controller');

/**
 * Lab 04: Wishlist Routes
 * Base route: /wishlist
 *
 * Every wishlist route is protected. The customer is identified from the JWT,
 * so there is deliberately NO /wishlist/:userId route.
 */
router.use(authMiddleware);

// Task 3: Get current customer's wishlist (populated)
router.get('/', getWishlist);

// Task 2: Add a product to the wishlist
router.post('/:productId', addToWishlist);

// Task 4: Remove a product from the wishlist
router.delete('/:productId', removeFromWishlist);

// Bonus: Toggle a product in the wishlist
router.patch('/:productId/toggle', toggleWishlist);

module.exports = router;
