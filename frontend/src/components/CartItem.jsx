import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

const formatPrice = (value) => value.toLocaleString('en-IN');

/**
 * Lab 05: One cart row with quantity controls.
 *
 * - [-] lowers by 1 but never below 1 (use Remove for that).
 * - [+] raises by 1 but never above the product's stock.
 * - Only THIS row is disabled while its request runs (isPending(productId)).
 * - If stock dropped below the quantity in the cart, [-] jumps straight to the
 *   available stock, because the server rejects any quantity above stock.
 */
const CartItem = ({ item }) => {
  const { product, quantity } = item;
  const { _id, name, price, category, image, stock } = product;
  const { updateQuantity, removeFromCart, isPending } = useCart();
  const [errorMessage, setErrorMessage] = useState('');

  const pending = isPending(_id);
  const outOfStock = stock <= 0;
  const overStock = !outOfStock && quantity > stock;
  const canDecrease = !pending && !outOfStock && quantity > 1;
  const canIncrease = !pending && quantity < stock;

  const changeQuantity = async (nextQuantity) => {
    setErrorMessage('');
    const result = await updateQuantity(_id, nextQuantity);
    if (!result.ok && !result.ignored) {
      setErrorMessage(result.message);
    }
  };

  const handleDecrease = () => changeQuantity(overStock ? stock : quantity - 1);
  const handleIncrease = () => changeQuantity(quantity + 1);

  const handleRemove = async () => {
    setErrorMessage('');
    const result = await removeFromCart(_id);
    if (!result.ok && !result.ignored) {
      setErrorMessage(result.message);
    }
  };

  return (
    <li className={`cart-item ${pending ? 'is-pending' : ''}`} id={`cart-item-${_id}`}>
      <Link to={`/products/${_id}`} className="cart-item-image" tabIndex={-1} aria-hidden="true">
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </Link>

      <div className="cart-item-info">
        <Link to={`/products/${_id}`} className="cart-item-name">
          {name}
        </Link>
        <p className="cart-item-meta">
          {category} <span aria-hidden="true">/</span> ₹{formatPrice(price)} each
        </p>

        {outOfStock && (
          <p className="cart-item-warning is-error">
            <AlertCircle size={14} aria-hidden="true" />
            <span>Out of stock. Remove it to continue.</span>
          </p>
        )}
        {overStock && (
          <p className="cart-item-warning">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>Only {stock} left. Lower the quantity to continue.</span>
          </p>
        )}
        {!outOfStock && !overStock && stock <= 5 && (
          <p className="cart-item-stock">Only {stock} left in stock</p>
        )}

        <div className="cart-item-controls">
          <div className="qty-control" role="group" aria-label={`Quantity for ${name}`}>
            <button
              type="button"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
              id={`qty-decrease-${_id}`}
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="qty-value" aria-live="polite" id={`qty-value-${_id}`}>
              {pending ? <span className="spinner-xs" aria-label="Updating"></span> : quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label="Increase quantity"
              id={`qty-increase-${_id}`}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="cart-remove-btn"
            onClick={handleRemove}
            disabled={pending}
            id={`cart-remove-${_id}`}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>Remove</span>
          </button>
        </div>

        {errorMessage && (
          <p className="cart-error-msg" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        )}
      </div>

      <p className="cart-item-total" id={`cart-line-total-${_id}`}>
        ₹{formatPrice(price * quantity)}
      </p>
    </li>
  );
};

export default CartItem;
