import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AddedToCartSheet from './AddedToCartSheet';

const MAX_QTY_OPTIONS = 10;

/**
 * Lab 05: Product Details buy box, Amazon-style.
 *
 *   Qty: [ 1 v ]   [ Add to cart ]
 *
 * The Qty list only offers what can still be added (stock minus what is already
 * in the cart, up to 10). Adding sends ONE request with the chosen quantity and
 * opens the "Added to cart" side panel.
 */
const BuyBox = ({ product }) => {
  const { _id, name, stock } = product;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addToCart, getQuantity, isPending } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const inCart = getQuantity(_id);
  const pending = isPending(_id);
  const outOfStock = stock <= 0;
  const canStillAdd = Math.max(0, stock - inCart);
  const maxSelectable = Math.min(MAX_QTY_OPTIONS, canStillAdd);

  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [sheet, setSheet] = useState({ open: false, quantityAdded: 0 });
  const addButtonRef = useRef(null);

  // Keep the selected quantity valid when stock or the cart changes
  useEffect(() => {
    if (quantity > maxSelectable) {
      setQuantity(Math.max(1, maxSelectable));
    }
  }, [quantity, maxSelectable]);

  const closeSheet = useCallback(() => setSheet((prev) => ({ ...prev, open: false })), []);

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: location.pathname, message: 'Log in to add products to your cart.' }
      });
      return;
    }

    setErrorMessage('');
    const result = await addToCart(_id, quantity);
    if (result.ok) {
      setSheet({ open: true, quantityAdded: quantity });
      setQuantity(1);
    } else if (!result.ignored) {
      setErrorMessage(result.message);
    }
  };

  if (outOfStock) {
    return (
      <div className="buy-box">
        <p className="buy-box-unavailable">Currently unavailable.</p>
        <button type="button" className="btn-add-cart btn-add-cart-large" disabled id={`add-cart-btn-${_id}`}>
          <ShoppingCart size={18} aria-hidden="true" />
          <span>Add to cart</span>
        </button>
      </div>
    );
  }

  return (
    <div className="buy-box">
      {canStillAdd === 0 ? (
        <p className="buy-box-limit" id={`buy-box-limit-${_id}`}>
          All {stock} available are in your cart.
        </p>
      ) : (
        <div className="buy-box-row">
          <label className="buy-box-qty" htmlFor={`qty-select-${_id}`}>
            <span>Qty:</span>
            <select
              id={`qty-select-${_id}`}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={pending}
            >
              {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn-add-cart btn-add-cart-large"
            onClick={handleAdd}
            disabled={pending || authLoading}
            ref={addButtonRef}
            aria-label={`Add ${quantity} to cart: ${name}`}
            id={`add-cart-btn-${_id}`}
          >
            {pending ? (
              <span className="spinner-xs spinner-xs-light" aria-hidden="true"></span>
            ) : (
              <ShoppingCart size={18} aria-hidden="true" />
            )}
            <span>{pending ? 'Adding...' : 'Add to cart'}</span>
          </button>
        </div>
      )}

      {inCart > 0 && (
        <p className="buy-box-in-cart" id={`in-cart-note-${_id}`}>
          <span>{inCart} in your cart</span>
          <Link to="/cart" className="cart-view-link">
            View cart
          </Link>
        </p>
      )}

      {errorMessage && (
        <p className="cart-error-msg" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}

      <AddedToCartSheet
        open={sheet.open}
        onClose={closeSheet}
        product={product}
        quantityAdded={sheet.quantityAdded}
        returnFocusRef={addButtonRef}
      />
    </div>
  );
};

export default BuyBox;
