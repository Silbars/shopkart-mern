import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const formatPrice = (value) => value.toLocaleString('en-IN');

/**
 * Lab 05: "Proceed to Checkout" destination.
 *
 * Shows a recap of the real cart (from CartContext) so the customer can see
 * what they are about to order. Placing the order (address, final stock check,
 * order snapshot) is Lab 06, so there is no "Place order" button yet.
 */
const Checkout = () => {
  const { cartItems, status, itemCount, subtotal } = useCart();

  const isLoading = (status === 'loading' || status === 'idle') && cartItems.length === 0;
  const hasStockIssue = cartItems.some(
    (item) => item.product.stock <= 0 || item.quantity > item.product.stock
  );

  if (isLoading) {
    return (
      <div className="checkout-page" role="status" aria-label="Loading your order">
        <div className="cart-skeleton cart-skeleton-line"></div>
        <div className="cart-skeleton cart-skeleton-summary"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="state-card empty-state" id="checkout-empty">
          <h1 className="state-title">There's nothing to check out</h1>
          <p className="state-description">Your cart is empty.</p>
          <Link to="/products" className="btn-state-action" id="checkout-browse-btn">
            <ShoppingBag size={16} />
            <span>Browse Products</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page" id="checkout-placeholder">
      <h1 className="checkout-title">Checkout</h1>
      <p className="checkout-lead">
        Here is what you are about to order. Address and payment arrive in the next update, so the
        order can't be placed yet.
      </p>

      {hasStockIssue && (
        <p className="checkout-warning" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Some items need a smaller quantity. Fix them in your cart first.</span>
        </p>
      )}

      <section className="checkout-recap" aria-labelledby="checkout-recap-heading">
        <h2 className="checkout-recap-title" id="checkout-recap-heading">
          Your order
        </h2>
        <ul className="checkout-lines">
          {cartItems.map(({ product, quantity }) => (
            <li key={product._id} className="checkout-line">
              <img src={product.image} alt="" className="checkout-line-image" loading="lazy" />
              <div className="checkout-line-info">
                <p className="checkout-line-name">{product.name}</p>
                <p className="checkout-line-qty">
                  {quantity} × ₹{formatPrice(product.price)}
                </p>
              </div>
              <p className="checkout-line-total">₹{formatPrice(product.price * quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="checkout-total">
          <span>
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span id="checkout-subtotal">₹{formatPrice(subtotal)}</span>
        </div>
      </section>

      <Link to="/cart" className="checkout-back" id="checkout-back-to-cart">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to cart</span>
      </Link>
    </div>
  );
};

export default Checkout;
