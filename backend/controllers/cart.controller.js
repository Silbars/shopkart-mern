const mongoose = require('mongoose');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');

/**
 * Lab 05: Cart Controller
 *
 * - The customer always comes from req.user._id (set by authMiddleware from the JWT).
 * - Every mutation returns the full, populated cart, so the frontend can replace
 *   its state with exactly what the server has (one source of truth).
 * - Stock rules are enforced inside the MongoDB update itself, so two requests
 *   arriving at the same time cannot push a quantity past the available stock.
 */

const CART_PRODUCT_FIELDS = 'name price category image stock';

const invalidIdResponse = (res) =>
  res.status(400).json({ success: false, message: 'Invalid product ID format' });

const productNotFoundResponse = (res) =>
  res.status(404).json({ success: false, message: 'Product not found' });

const notInCartResponse = (res) =>
  res.status(404).json({ success: false, message: 'Product not in cart' });

/**
 * Loads the customer's cart with Product data filled in.
 * Rows whose product was deleted from the catalog come back with product = null,
 * so they are filtered out.
 */
const loadPopulatedCart = async (customerId) => {
  const customer = await Customer.findById(customerId)
    .select('cart')
    .populate({ path: 'cart.product', select: CART_PRODUCT_FIELDS });

  return (customer.cart || [])
    .filter((item) => item.product)
    .map((item) => ({ product: item.product, quantity: item.quantity }));
};

const sendCart = async (res, status, message, customerId) => {
  const cart = await loadPopulatedCart(customerId);
  return res.status(status).json({ success: true, message, cart });
};

/**
 * Task 3: Get current customer's cart
 * GET /cart
 */
const getCart = async (req, res) => {
  try {
    const cart = await loadPopulatedCart(req.user._id);
    return res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching cart' });
  }
};

/**
 * Task 2: Add product to cart (or increase its quantity)
 * POST /cart/:productId
 * Optional body: { "quantity": 3 }  (defaults to 1, used by the Product Details "Qty" selector)
 */
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.user._id;
    const requested = req.body?.quantity;
    const amount = requested === undefined ? 1 : requested;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a whole number of at least 1' });
    }

    const product = await Product.findById(productId).select('stock');
    if (!product) {
      return productNotFoundResponse(res);
    }

    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: 'This product is out of stock' });
    }

    // Two attempts cover the race where another request inserts the row
    // between our "increase" and "insert" steps.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // 1. Already in cart -> add `amount`, but ONLY if the result stays within stock.
      //    $elemMatch makes both conditions apply to the same cart row.
      const increased = await Customer.updateOne(
        {
          _id: customerId,
          cart: {
            $elemMatch: { product: productId, quantity: { $lte: product.stock - amount } }
          }
        },
        { $inc: { 'cart.$.quantity': amount } }
      );
      if (increased.modifiedCount === 1) {
        return sendCart(res, 200, 'Cart updated', customerId);
      }

      // 2. Not in cart yet -> insert one row (never a duplicate row), if stock allows.
      if (amount <= product.stock) {
        const inserted = await Customer.updateOne(
          { _id: customerId, 'cart.product': { $ne: productId } },
          { $push: { cart: { product: productId, quantity: amount } } }
        );
        if (inserted.modifiedCount === 1) {
          return sendCart(res, 201, 'Cart updated', customerId);
        }
      }

      // 3. Neither matched. Explain using what is in the cart right now.
      const existing = await Customer.findOne(
        { _id: customerId, 'cart.product': productId },
        { 'cart.$': 1 }
      );
      if (!existing) {
        // Not in cart and the requested amount alone is above stock
        if (amount > product.stock) {
          return res.status(400).json({ success: false, message: `Only ${product.stock} in stock` });
        }
        continue; // row disappeared between steps: try again
      }

      const current = existing.cart[0].quantity;
      if (current + amount > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} in stock. You already have ${current} in your cart.`
        });
      }
    }

    return res.status(409).json({ success: false, message: 'Cart changed while updating. Please try again.' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while adding to cart' });
  }
};

/**
 * Task 4: Update quantity of a product already in the cart
 * PATCH /cart/:productId   body: { "quantity": 3 }
 */
const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body || {};
    const customerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    // Must be a real whole number (not "3", not 1.5)
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      return res.status(400).json({ success: false, message: 'Quantity must be a whole number' });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1. Use remove to delete the item.'
      });
    }

    const product = await Product.findById(productId).select('stock');
    if (!product) {
      return productNotFoundResponse(res);
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} in stock`
      });
    }

    // Positional $ updates the matching cart row only
    const updated = await Customer.updateOne(
      { _id: customerId, 'cart.product': productId },
      { $set: { 'cart.$.quantity': quantity } }
    );

    if (updated.matchedCount === 0) {
      return notInCartResponse(res);
    }

    return sendCart(res, 200, 'Cart updated', customerId);
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while updating cart' });
  }
};

/**
 * Task 5: Remove a product from the cart
 * DELETE /cart/:productId
 * Does not require the product to still exist, so deleted products can be removed.
 */
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const customerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return invalidIdResponse(res);
    }

    const removed = await Customer.updateOne(
      { _id: customerId, 'cart.product': productId },
      { $pull: { cart: { product: productId } } }
    );

    if (removed.matchedCount === 0) {
      return notInCartResponse(res);
    }

    return sendCart(res, 200, 'Product removed from cart', customerId);
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while removing from cart' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart
};
