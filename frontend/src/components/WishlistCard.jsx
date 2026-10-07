import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, AlertCircle } from 'lucide-react';
import StockBadge from './StockBadge';
import { removeFromWishlist } from '../services/api';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

/**
 * Lab 04 Task 6: Wishlist Card
 * Shows a saved product (populated from the Product collection) with
 * View Details and Remove actions. Each card tracks its own remove request.
 */
const WishlistCard = ({ product, onRemoved }) => {
  const { _id, name, price, category, image, stock } = product;

  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRemove = async () => {
    if (isRemoving) return;

    setIsRemoving(true);
    setErrorMessage('');

    try {
      await removeFromWishlist(_id);
      onRemoved(_id, { alreadyRemoved: false });
    } catch (err) {
      // 404 = it is already gone from the wishlist (e.g. removed in another tab)
      if (err.status === 404) {
        onRemoved(_id, { alreadyRemoved: true });
        return;
      }
      setErrorMessage('Unable to remove product. Please try again.');
      setIsRemoving(false);
    }
  };

  return (
    <article className="product-card wishlist-card" id={`wishlist-card-${_id}`}>
      <div className="product-card-image-wrap">
        <img
          src={image}
          alt={name}
          className="product-card-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </div>

      <div className="product-card-body">
        <h3 className="product-card-title" title={name}>
          {name}
        </h3>
        <p className="product-card-category">{category}</p>

        <div className="product-stock-container">
          <StockBadge stock={stock} id={`wishlist-stock-${_id}`} />
        </div>

        <div className="product-card-footer">
          <div className="product-price-box">
            <span className="product-price-symbol">₹</span>
            <span className="product-price-amount">
              {typeof price === 'number' ? price.toLocaleString('en-IN') : price}
            </span>
          </div>

          <Link
            to={`/products/${_id}`}
            className="btn-view-details"
            id={`wishlist-view-${_id}`}
            aria-label={`View details for ${name}`}
          >
            <span>View Details</span>
          </Link>
        </div>

        <div className="wishlist-action">
          <button
            type="button"
            className="btn-wishlist is-saved"
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label={`Remove ${name} from wishlist`}
            id={`wishlist-remove-${_id}`}
          >
            {isRemoving ? (
              <span className="spinner-xs" aria-hidden="true"></span>
            ) : (
              <Heart size={16} className="btn-wishlist-heart" fill="currentColor" aria-hidden="true" />
            )}
            <span>{isRemoving ? 'Removing...' : 'Remove from Wishlist'}</span>
          </button>

          {errorMessage && (
            <p className="wishlist-error-msg" role="alert">
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

export default WishlistCard;
