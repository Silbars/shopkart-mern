import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, AlertCircle, RefreshCw, ShoppingBag, ArrowLeft } from 'lucide-react';
import WishlistCard from '../components/WishlistCard';
import { getWishlist } from '../services/api';

/**
 * Lab 04 Task 6 & 7: Wishlist Page (/wishlist)
 *
 * Fetches GET /wishlist (populated products) and renders one of:
 * Loading -> Error (with retry) -> Empty -> Wishlist grid
 *
 * Data always comes from the backend; nothing is hardcoded or kept in global state.
 */
const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWishlist();
      setItems(data.wishlist || []);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
      setError(err.message || 'Unable to load wishlist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // A card was removed: drop it from the list without refetching.
  const handleRemoved = (productId, { alreadyRemoved }) => {
    setItems((prev) => prev.filter((item) => item._id !== productId));

    // The item was already gone on the server, so no count came back with this request.
    // Ask the backend once more so the Navbar count stays accurate.
    if (alreadyRemoved) {
      getWishlist().catch(() => {});
    }
  };

  const count = items.length;

  return (
    <div className="wishlist-page-container">
      {/* Page Header (left-aligned: this is the customer's own list, not a storefront) */}
      <header className="wishlist-header">
        <div>
          <h1 className="wishlist-title" id="wishlist-heading">
            My Wishlist
          </h1>
          {!loading && !error && count > 0 && (
            <p className="wishlist-subtitle" id="wishlist-count">
              {count} {count === 1 ? 'product' : 'products'} saved
            </p>
          )}
        </div>

        {!loading && !error && count > 0 && (
          <Link to="/products" className="btn-continue-shopping" id="wishlist-continue-shopping">
            <ArrowLeft size={16} />
            <span>Continue shopping</span>
          </Link>
        )}
      </header>

      <section aria-live="polite">
        {/* 1. Loading State */}
        {loading && (
          <div className="state-card loading-state" id="wishlist-loading-state">
            <div className="spinner" role="status" aria-label="Loading wishlist"></div>
            <h2 className="state-title">Loading your wishlist...</h2>
          </div>
        )}

        {/* 2. Error State (Try Again makes a new API request) */}
        {!loading && error && (
          <div className="state-card error-state" id="wishlist-error-state" role="alert">
            <div className="state-icon-box error-icon-box">
              <AlertCircle size={36} />
            </div>
            <h2 className="state-title">Something went wrong.</h2>
            <p className="state-description">We couldn't load your wishlist.</p>
            <button
              type="button"
              className="btn-state-action"
              onClick={loadWishlist}
              id="wishlist-retry-btn"
            >
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && count === 0 && (
          <div className="state-card empty-state" id="wishlist-empty-state">
            <div className="state-icon-box wishlist-empty-icon-box">
              <Heart size={38} fill="currentColor" />
            </div>
            <h2 className="state-title">Your wishlist is empty</h2>
            <p className="state-description">
              Save products you love and find them here later.
            </p>
            <Link to="/products" className="btn-state-action" id="wishlist-browse-btn">
              <ShoppingBag size={16} />
              <span>Browse Products</span>
            </Link>
          </div>
        )}

        {/* 4. Wishlist Grid (rendered dynamically with .map()) */}
        {!loading && !error && count > 0 && (
          <div className="products-grid" id="wishlist-grid">
            {items.map((product) => (
              <WishlistCard key={product._id} product={product} onRemoved={handleRemoved} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Wishlist;
