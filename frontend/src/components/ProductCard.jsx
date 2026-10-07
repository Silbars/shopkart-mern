import React from 'react';
import { Link } from 'react-router-dom';

import StockBadge from './StockBadge';
import WishlistButton from './WishlistButton';
import CardCartControl from './CardCartControl';

/**
 * Task 6: Product Card Component
 * Displays product image, name, category, price, stock status, and a View Details button.
 * Lab 04: Adds a Wishlist toggle action (saved state comes from the backend).
 */
const ProductCard = ({ product, isSaved = false, onWishlistChange }) => {
  const { _id, name, price, category, image, stock } = product;

  return (
    <article className="product-card" id={`product-card-${_id}`}>
      {/* Product Image Container with Category Badge */}
      <div className="product-card-image-wrap">
        <img
          src={image}
          alt={name}
          className="product-card-img"
          loading="lazy"
          onError={(e) => {
            // High quality fallback image if URL fails
            e.currentTarget.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Card Content Area */}
      <div className="product-card-body">
        <h3 className="product-card-title" title={name} id={`product-title-${_id}`}>
          {name}
        </h3>
        <p className="product-card-category">{category}</p>

        {/* Stock Status Badge */}
        <div className="product-stock-container">
          <StockBadge stock={stock} id={`product-stock-${_id}`} />
        </div>

        {/* Price and Action Row */}
        <div className="product-card-footer">
          <div className="product-price-box">
            <span className="product-price-symbol">₹</span>
            <span className="product-price-amount" id={`product-price-${_id}`}>
              {typeof price === 'number' ? price.toLocaleString('en-IN') : price}
            </span>
          </div>

          <Link
            to={`/products/${_id}`}
            className="btn-view-details"
            id={`view-details-${_id}`}
            aria-label={`View details for ${name}`}
          >
            <span>View Details</span>
          </Link>
        </div>

        {/* Lab 05: Add to cart, becomes a quantity stepper once the product is in the cart */}
        <CardCartControl product={product} />

        {/* Lab 04: Wishlist Toggle */}
        <WishlistButton
          productId={_id}
          productName={name}
          isSaved={isSaved}
          onChange={onWishlistChange}
        />
      </div>
    </article>
  );
};

export default ProductCard;
