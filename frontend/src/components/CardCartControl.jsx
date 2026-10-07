import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * Lab 05: Add to Cart on a product card, Amazon-style.
 *
 *   Not in cart:  [ Add to cart ]
 *   Adding:       [ Adding... ]
 *   In cart:      [ 🗑 | 1 | + ]   at 1 the left button removes the item
 *                 [ − | 3 | + ]   above 1 it decreases; + stops at stock
 *
 * Everything reads from the shared CartContext, so the stepper, the Navbar
 * count and the Cart page always show the same quantity.
 */
const CardCartControl = ({ product }) => {
  const { _id, name, stock } = product;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addToCart, updateQuantity, removeFromCart, getQuantity, isPending } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('');

  const inCart = getQuantity(_id);
  const pending = isPending(_id);
  const outOfStock = stock <= 0;

  const run = async (action) => {
    setErrorMessage('');
    const result = await action();
    if (!result.ok && !result.ignored) {
      setErrorMessage(result.message);
    }
  };

  const handleAdd = () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}`,
          message: 'Log in to add products to your cart.'
        }
      });
      return;
    }
    run(() => addToCart(_id));
  };

  // Left button: remove at 1 (or when the product sold out), otherwise one less.
  // If stock dropped below what is in the cart, jump straight to the available stock.
  const removesItem = inCart <= 1 || outOfStock;
  const handleLeft = () => {
    if (removesItem) {
      run(() => removeFromCart(_id));
    } else {
      run(() => updateQuantity(_id, inCart > stock ? stock : inCart - 1));
    }
  };

  const handleIncrease = () => run(() => addToCart(_id));
  const atStockLimit = inCart >= stock;

  return (
    <div className="card-cart-control">
      {inCart === 0 ? (
        <button
          type="button"
          className="btn-add-cart"
          onClick={handleAdd}
          disabled={outOfStock || pending || authLoading}
          aria-label={outOfStock ? `Currently unavailable: ${name}` : `Add to cart: ${name}`}
          id={`add-cart-btn-${_id}`}
        >
          {pending ? (
            <span className="spinner-xs spinner-xs-light" aria-hidden="true"></span>
          ) : (
            <ShoppingCart size={16} aria-hidden="true" />
          )}
          <span>{outOfStock ? 'Currently unavailable' : pending ? 'Adding...' : 'Add to cart'}</span>
        </button>
      ) : (
        <div
          className="cart-stepper"
          role="group"
          aria-label={`${name}: ${inCart} in cart`}
          id={`cart-stepper-${_id}`}
        >
          <button
            type="button"
            onClick={handleLeft}
            disabled={pending}
            aria-label={removesItem ? `Remove ${name} from cart` : 'Decrease quantity'}
            id={`stepper-left-${_id}`}
          >
            {removesItem ? <Trash2 size={16} aria-hidden="true" /> : <Minus size={16} aria-hidden="true" />}
          </button>
          <span className="cart-stepper-value" aria-live="polite" id={`stepper-value-${_id}`}>
            {pending ? <span className="spinner-xs spinner-xs-light" aria-label="Updating"></span> : inCart}
          </span>
          <button
            type="button"
            onClick={handleIncrease}
            disabled={pending || atStockLimit}
            aria-label={atStockLimit ? `Only ${stock} in stock` : 'Increase quantity'}
            title={atStockLimit ? `Only ${stock} in stock` : undefined}
            id={`stepper-plus-${_id}`}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {errorMessage && (
        <p className="cart-error-msg" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};

export default CardCartControl;
