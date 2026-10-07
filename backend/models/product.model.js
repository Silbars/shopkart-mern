const mongoose = require('mongoose');

/**
 * Product Schema
 * 
 * Defines the structure and validations for products in the ShopKart catalog.
 * Validations:
 * - name: String, required, trimmed
 * - description: String, required, trimmed
 * - price: Number, required, strictly greater than 0
 * - category: String, required, trimmed
 * - image: String, required, trimmed
 * - stock: Number, required, minimum 0
 * - createdAt: Date, generated automatically via timestamps
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      validate: {
        validator: function (value) {
          return typeof value === 'number' && !isNaN(value) && value > 0;
        },
        message: 'Product price must be greater than 0'
      }
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Product image URL is required'],
      trim: true
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      validate: {
        validator: function (value) {
          return typeof value === 'number' && !isNaN(value) && value >= 0 && Number.isInteger(value);
        },
        message: 'Product stock must be an integer of at least 0'
      }
    }
  },
  {
    timestamps: true
  }
);

// Index for search & category optimization
productSchema.index({ name: 'text', category: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
