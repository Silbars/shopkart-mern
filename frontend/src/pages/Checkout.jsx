import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, AlertTriangle, AlertCircle, Info, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CheckoutForm, { CHECKOUT_FIELD_ORDER } from '../components/CheckoutForm';
import validateShippingAddress from '../utils/validateShippingAddress';
import loadRazorpay from '../utils/loadRazorpay';
import { formatINR } from '../utils/format';
import { createPaymentOrder, verifyPayment } from '../services/api';

/**
 * Lab 06 Task 2: Checkout (/checkout)
 *
 *   validate form (no request if invalid)
 *     -> POST /orders/create-payment-order   (server checks cart, stock, prices, total)
 *     -> Razorpay Checkout (test mode)
 *     -> POST /orders/verify-payment         (server checks the signature)
 *     -> clear shared cart -> /order-success/:id
 *
 * The cart is never cleared here unless the server verified the payment.
 */
const PHASE_LABELS = {
  idle: 'Place Order',
  preparing: 'Preparing payment...',
  paying: 'Waiting for payment...',
  verifying: 'Confirming payment...'
};

const Checkout = () => {
  const { user } = useAuth();
  const { cartItems, status, itemCount, subtotal, clearCart, refreshCart } = useCart();
  const navigate = useNavigate();

  // Checkout form state lives here: it only matters on this page
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('idle');
  const [notice, setNotice] = useState(null); // { tone: 'error' | 'info', text, cartLink? }
  const paymentFailedRef = useRef(false);

  const busy = phase !== 'idle';
  const isLoading = (status === 'loading' || status === 'idle') && cartItems.length === 0;
  const hasStockIssue = cartItems.some(
    (item) => item.product.stock <= 0 || item.quantity > item.product.stock
  );

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const focusFirstError = (fieldErrors) => {
    const first = CHECKOUT_FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) document.getElementById(`checkout-${first}`)?.focus();
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    if (busy) return;
    setNotice(null);

    // 1. Client-side validation: no request if this fails
    const { value: shippingAddress, errors: fieldErrors } = validateShippingAddress(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    setPhase('preparing');

    // 2. Server validates cart, stock and prices, creates the pending order + Razorpay order
    let checkout;
    try {
      checkout = await createPaymentOrder(shippingAddress);
    } catch (err) {
      setPhase('idle');
      if (err.data?.errors) {
        setErrors(err.data.errors);
        focusFirstError(err.data.errors);
      }
      if (err.status === 503) {
        setNotice({
          tone: 'info',
          text: "Online payment isn't set up yet. Add the Razorpay test keys to backend/.env and restart the server."
        });
      } else if (err.status === 400 && !err.data?.errors) {
        // Stock or product changed: refresh the cart so it shows the latest stock
        refreshCart({ silent: true });
        setNotice({ tone: 'error', text: err.message, cartLink: true });
      } else if (!err.data?.errors) {
        setNotice({ tone: 'error', text: err.message || 'Could not start the payment. Please try again.' });
      }
      return;
    }

    // 3. Load Razorpay Checkout
    const ready = await loadRazorpay();
    if (!ready) {
      setPhase('idle');
      setNotice({
        tone: 'error',
        text: 'Could not load the payment window. Check your connection and try again. Your cart has not been changed.'
      });
      return;
    }

    // 4. Open Razorpay Checkout (test mode)
    paymentFailedRef.current = false;
    const razorpay = new window.Razorpay({
      key: checkout.key,
      amount: checkout.amount,
      currency: checkout.currency,
      name: 'ShopKart',
      description: `ShopKart order (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`,
      order_id: checkout.razorpayOrderId,
      prefill: { name: shippingAddress.fullName, contact: shippingAddress.phone, email: user?.email },
      theme: { color: '#4f46e5' },

      // Razorpay says the payment went through. We still do NOT trust it:
      // the server verifies the signature before anything is marked paid.
      handler: async (response) => {
        setPhase('verifying');
        try {
          const result = await verifyPayment({
            shopKartOrderId: checkout.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          clearCart(); // server already emptied the cart; update the shared state too
          navigate(`/order-success/${result.order._id}`, { replace: true });
        } catch (err) {
          setPhase('idle');
          setNotice({
            tone: 'error',
            text: `We couldn't confirm this payment (${err.message}). Your cart has not been cleared.`
          });
        }
      },

      modal: {
        ondismiss: () => {
          setPhase((current) => (current === 'verifying' ? current : 'idle'));
          if (!paymentFailedRef.current) {
            setNotice({ tone: 'info', text: 'Payment cancelled. Your cart is unchanged.' });
          }
        }
      }
    });

    razorpay.on('payment.failed', (response) => {
      paymentFailedRef.current = true;
      const reason = response?.error?.description;
      setNotice({
        tone: 'error',
        text: `Payment failed${reason ? `: ${reason}` : ''}. Your cart has not been cleared. Please try again.`
      });
    });

    setPhase('paying');
    razorpay.open();
  };

  if (isLoading) {
    return (
      <div className="checkout-page" role="status" aria-label="Loading checkout">
        <div className="cart-skeleton cart-skeleton-line"></div>
        <div className="cart-skeleton cart-skeleton-summary"></div>
      </div>
    );
  }

  // Opened /checkout directly with an empty cart
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
    <div className="checkout-page checkout-page-wide">
      <h1 className="checkout-title" id="checkout-heading">
        Checkout
      </h1>

      <form className="checkout-layout" onSubmit={handlePlaceOrder} noValidate id="checkout-form">
        <section className="checkout-section" aria-labelledby="shipping-heading">
          <h2 className="checkout-section-title" id="shipping-heading">
            Shipping details
          </h2>
          <CheckoutForm values={form} errors={errors} onChange={handleChange} disabled={busy} />
        </section>

        <aside className="checkout-summary" aria-labelledby="summary-heading">
          <h2 className="checkout-section-title" id="summary-heading">
            Order summary
          </h2>

          <ul className="checkout-lines">
            {cartItems.map(({ product, quantity }) => (
              <li key={product._id} className="checkout-line">
                <img src={product.image} alt="" className="checkout-line-image" loading="lazy" />
                <div className="checkout-line-info">
                  <p className="checkout-line-name">{product.name}</p>
                  <p className="checkout-line-qty">
                    {quantity} × {formatINR(product.price)}
                  </p>
                </div>
                <p className="checkout-line-total">{formatINR(product.price * quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="checkout-total">
            <span>Total</span>
            <span id="checkout-total">{formatINR(subtotal)}</span>
          </div>

          {hasStockIssue && (
            <p className="checkout-warning" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                Some items need a smaller quantity. <Link to="/cart">Fix them in your cart</Link>.
              </span>
            </p>
          )}

          {notice && (
            <div
              className={`checkout-notice ${notice.tone === 'error' ? 'is-error' : 'is-info'}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
              id="checkout-notice"
            >
              {notice.tone === 'error' ? <AlertCircle size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
              <span>
                {notice.text}
                {notice.cartLink && (
                  <>
                    {' '}
                    <Link to="/cart">Review your cart</Link>.
                  </>
                )}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn-checkout"
            disabled={busy || hasStockIssue}
            id="place-order-btn"
          >
            {busy && <span className="spinner-xs spinner-xs-light" aria-hidden="true"></span>}
            <span>{PHASE_LABELS[phase]}</span>
          </button>

          <p className="checkout-secure-note">
            <Lock size={14} aria-hidden="true" />
            <span>Payment by Razorpay (test mode). The total is checked again on our server.</span>
          </p>

          <Link to="/cart" className="cart-continue-link" id="checkout-back-to-cart">
            Back to cart
          </Link>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
