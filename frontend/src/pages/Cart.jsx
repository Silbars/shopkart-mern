import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, AlertCircle, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';
import CartItem from '../components/CartItem';
import { useCart } from '../context/CartContext';

/**
 * Lab 05 Task 8: Cart Page (/cart)
 *
 * Reads the shared cart from CartContext (it does NOT fetch the cart itself).
 * Item count and subtotal are derived values from the context.
 */
const Cart = () => {
  const { cartItems, status, error, itemCount, subtotal, refreshCart } = useCart();

  // Briefly highlight the subtotal when the customer changes it (+, - or Remove).
  // We only start comparing once the cart has loaded, so the first load never flashes.
  const previousSubtotal = useRef(null);
  const subtotalChanged = previousSubtotal.current !== null && previousSubtotal.current !== subtotal;
  useEffect(() => {
    if (status === 'ready') {
      previousSubtotal.current = subtotal;
    }
  }, [subtotal, status]);

  const isLoading = (status === 'loading' || status === 'idle') && cartItems.length === 0;
  const isEmpty = status === 'ready' && cartItems.length === 0;

  // Checkout is blocked while any row asks for more than is in stock
  const hasStockIssue = cartItems.some(
    (item) => item.product.stock <= 0 || item.quantity > item.product.stock
  );

  return (
    <div className="cart-page">
      <header className="cart-header">
        <h1 className="cart-title" id="cart-heading">
          My Cart
        </h1>
        {cartItems.length > 0 && (
          <p className="cart-subtitle" id="cart-count-text">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        )}
      </header>

      <section aria-live="polite">
        {/* 1. Loading: skeleton in the same shape as the cart */}
        {isLoading && (
          <div className="cart-layout" id="cart-loading-state" role="status" aria-label="Loading your cart">
            <div>
              <p className="cart-loading-text">Loading your cart...</p>
              {[0, 1].map((row) => (
                <div className="cart-item" key={row} aria-hidden="true">
                  <div className="cart-skeleton cart-skeleton-image"></div>
                  <div className="cart-item-info">
                    <div className="cart-skeleton cart-skeleton-line"></div>
                    <div className="cart-skeleton cart-skeleton-line cart-skeleton-line-short"></div>
                    <div className="cart-skeleton cart-skeleton-qty"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-skeleton cart-skeleton-summary" aria-hidden="true"></div>
          </div>
        )}

        {/* 2. Error */}
        {status === 'error' && (
          <div className="state-card error-state" id="cart-error-state" role="alert">
            <div className="state-icon-box error-icon-box">
              <AlertCircle size={36} />
            </div>
            <h2 className="state-title">Unable to load your cart.</h2>
            <p className="state-description">{error || 'Check your connection and try again.'}</p>
            <button type="button" className="btn-state-action" onClick={() => refreshCart()} id="cart-retry-btn">
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* 3. Empty */}
        {isEmpty && (
          <div className="state-card empty-state" id="cart-empty-state">
            <div className="state-icon-box empty-icon-box">
              <ShoppingCart size={38} />
            </div>
            <h2 className="state-title">Your cart is empty</h2>
            <p className="state-description">Looks like you haven't added anything yet.</p>
            <Link to="/products" className="btn-state-action" id="cart-browse-btn">
              <ShoppingBag size={16} />
              <span>Browse Products</span>
            </Link>
          </div>
        )}

        {/* 4. Items + Order Summary */}
        {status !== 'error' && cartItems.length > 0 && (
          <div className="cart-layout">
            <ul className="cart-list" id="cart-list">
              {cartItems.map((item) => (
                <CartItem key={item.product._id} item={item} />
              ))}
            </ul>

            <aside className="cart-summary" aria-labelledby="cart-summary-heading">
              <h2 className="cart-summary-title" id="cart-summary-heading">
                Order Summary
              </h2>
              <dl className="cart-summary-rows">
                <div>
                  <dt>Items</dt>
                  <dd id="cart-summary-items">{itemCount}</dd>
                </div>
                <div className="cart-summary-subtotal">
                  <dt>Subtotal</dt>
                  <dd
                    id="cart-summary-subtotal"
                    key={subtotal}
                    className={subtotalChanged ? 'is-updated' : ''}
                  >
                    ₹{subtotal.toLocaleString('en-IN')}
                  </dd>
                </div>
              </dl>
              <p className="cart-summary-note">Shipping is calculated at checkout.</p>

              {hasStockIssue ? (
                <>
                  <button type="button" className="btn-checkout" disabled id="cart-checkout-btn">
                    <span>Proceed to Checkout</span>
                  </button>
                  <p className="cart-summary-blocked" role="status">
                    Fix the highlighted items to continue.
                  </p>
                </>
              ) : (
                <Link to="/checkout" className="btn-checkout" id="cart-checkout-btn">
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}

              <Link to="/products" className="cart-continue-link" id="cart-continue-shopping">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
};

export default Cart;
