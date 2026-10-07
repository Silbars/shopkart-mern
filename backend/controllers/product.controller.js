const mongoose = require('mongoose');
const Product = require('../models/product.model');

/**
 * Task 2: Create a new product
 * POST /products
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // 1. Check for missing required fields
    if (
      name === undefined ||
      name === null ||
      name === '' ||
      description === undefined ||
      description === null ||
      description === '' ||
      price === undefined ||
      price === null ||
      price === '' ||
      category === undefined ||
      category === null ||
      category === '' ||
      image === undefined ||
      image === null ||
      image === '' ||
      stock === undefined ||
      stock === null ||
      stock === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are mandatory: name, description, price, category, image, stock'
      });
    }

    // 2. Validate price: must be a number > 0
    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid number greater than 0'
      });
    }

    // 3. Validate stock: must be a non-negative integer >= 0
    const parsedStock = Number(stock);
    if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be an integer greater than or equal to 0'
      });
    }

    // 4. Create and save product
    const product = new Product({
      name: String(name).trim(),
      description: String(description).trim(),
      price: parsedPrice,
      category: String(category).trim(),
      image: String(image).trim(),
      stock: parsedStock
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating product'
    });
  }
};

/**
 * Task 3 & Task 5 & Bonus: Get all products with dynamic search, category filter, and sorting
 * GET /products
 * 
 * Query params:
 * - search: case-insensitive match on product name
 * - category: category filter
 * - sort: 'price_asc' | 'price_desc'
 */
const getAllProducts = async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    // Build query filter dynamically
    const filter = {};

    // 1. Search filter: case-insensitive matching on name
    if (search && search.trim() !== '') {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // 2. Category filter: case-insensitive matching, ignore 'all' or empty
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      filter.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    // Build sort options (Bonus Challenge: +10 marks)
    let sortOptions = { createdAt: -1 }; // default: newest first
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    }

    // Execute query
    const products = await Product.find(filter)
      .select('_id name description price category image stock createdAt')
      .sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching products'
    });
  }
};

/**
 * Task 4: Get single product by ID
 * GET /products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // 2. Query database for product
    const product = await Product.findById(id);

    // 3. Handle product not found
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving product'
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById
};
