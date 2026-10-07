const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById
} = require('../controllers/product.controller');

/**
 * Product Discovery & Management Routes
 * Base route: /products
 */

// Task 2: Create a product
router.post('/', createProduct);

// Task 3, 5 & Bonus: Get all products (with search, category filter, and sorting)
router.get('/', getAllProducts);

// Task 4: Get a single product by ID
router.get('/:id', getProductById);

module.exports = router;
