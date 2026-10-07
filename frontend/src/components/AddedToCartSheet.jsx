import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

const formatPrice = (value) => value.toLocaleString('en-IN');

/**
 * Lab 05: "Added to cart" side panel (Amazon-style), shown after adding from Product Details.
 *
 * - Slides in from the right; Esc, the close button or a click outside closes it.
 * - Focus moves into the panel, stays inside while open, and returns to the
 *   button that opened it when it closes.
 * - Subtotal and item count are the shared, derived values from CartContext.
 */
const AddedToCartSheet = ({ open, onClose, product, quantityAdded, returnFocusRef }) => {
  const { itemCount, subtotal, cartItems } = useCart();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  const hasStockIssue = cartItems.some(
    (item) => item.product.stock <= 0 || item.quantity > item.product.stock
  );

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Keep keyboard focus inside the panel while it is open
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const returnTarget = returnFocusRef?.current;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnTarget?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open || !product) return null;

  return createPortal(
    <div className="sheet-root">
      <div className="sheet-overlay" onClick={onClose} aria-hidden="true"></div>
      <aside
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="added-sheet-title"
        ref={panelRef}
        id="added-to-cart-sheet"
      >
        <div className="sheet-header">
          <h2 className="sheet-title" id="added-sheet-title">
            <CheckCircle2 size={22} aria-hidden="true" />
            <span>Added to cart</span>
          </h2>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close"
            id="added-sheet-close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="sheet-item">
          <img src={product.image} alt="" className="sheet-item-image" />
          <div>
            <p className="sheet-item-name">{product.name}</p>
            <p className="sheet-item-meta">
              {quantityAdded} added at ₹{formatPrice(product.price)} each
            </p>
          </div>
        </div>

        <div className="sheet-subtotal">
          <span>
            Cart subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span id="added-sheet-subtotal">₹{formatPrice(subtotal)}</span>
        </div>

        <div className="sheet-actions">
          {hasStockIssue ? (
            <p className="sheet-note">Some items in your cart need attention before checkout.</p>
          ) : (
            <Link to="/checkout" className="btn-checkout" id="added-sheet-checkout">
              Proceed to checkout
            </Link>
          )}
          <Link to="/cart" className="sheet-btn-secondary" id="added-sheet-go-to-cart">
            Go to Cart
          </Link>
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default AddedToCartSheet;
