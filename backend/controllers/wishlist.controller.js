const mongoose = require('mongoose');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');

/**
 * Lab 04: Wishlist Controller
 *
 * Every handler runs after authMiddleware, so the customer is always
 * identified by req.user._id (from the JWT) — never from the request body or URL.
 */

const invalidIdResponse = (res) =>
  res.status(400).json({
    success: false,
    message: 'Invalid product ID format'
  });

/**
 * Task 3: Get current customer's wishlist
 * GET /wishlist
 */
const getWishlist = async (req, res) => {
  try {
    // populate() replaces each stored ObjectId with the matching Product document.
    // Products deleted from the catalog are skipped automatically.
    const customer = await Customer.findById(req.user._id).populate({
      path: 'wishlist',
      select: 'name price category image stock'
    });

    const wishlist = customer.wishlist || [];

    return res.status(200).json({
      success: true,
      count: wishlist.length,
      wishlist
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching wishlist'
    });
  }
};

/**
 * Task 2: Add product to wishlist
 * POST /wishlist/:productId
 */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    // 2. Make sure the product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // 3. Add only if not already present — the check and the write happen in ONE
    //    atomic MongoDB operation, so even simultaneous clicks cannot create duplicates.
    const updated = await Customer.findOneAndUpdate(
      { _id: req.user._id, wishlist: { $ne: productId } },
      { $push: { wishlist: productId } },
      { new: true, select: 'wishlist' }
    );

    // No document matched => the product was already in the wishlist
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      count: updated.wishlist.length
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while adding to wishlist'
    });
  }
};

/**
 * Task 4: Remove product from wishlist
 * DELETE /wishlist/:productId
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    // 2. Remove only if present. We intentionally do not check the Product
    //    collection, so a product deleted from the catalog can still be removed.
    const updated = await Customer.findOneAndUpdate(
      { _id: req.user._id, wishlist: productId },
      { $pull: { wishlist: productId } },
      { new: true, select: 'wishlist' }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not in wishlist'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      count: updated.wishlist.length
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while removing from wishlist'
    });
  }
};

/**
 * Bonus (+10): Toggle product in wishlist
 * PATCH /wishlist/:productId/toggle
 */
const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    // 1. Already saved? -> remove it
    const removed = await Customer.findOneAndUpdate(
      { _id: req.user._id, wishlist: productId },
      { $pull: { wishlist: productId } },
      { new: true, select: 'wishlist' }
    );

    if (removed) {
      return res.status(200).json({
        success: true,
        saved: false,
        message: 'Product removed from wishlist',
        count: removed.wishlist.length
      });
    }

    // 2. Not saved -> product must exist before we add it
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // $addToSet never inserts a value that is already in the array
    const added = await Customer.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: productId } },
      { new: true, select: 'wishlist' }
    );

    return res.status(200).json({
      success: true,
      saved: true,
      message: 'Product added to wishlist',
      count: added.wishlist.length
    });
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating wishlist'
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist
};
