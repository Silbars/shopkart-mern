import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, AlertTriangle } from 'lucide-react';
import OrderStatusTracker from '../components/OrderStatusTracker';
import { getOrderById, advanceOrderStatus } from '../services/api';
import { formatINR, formatDate, orderNumber, STATUS_LABELS } from '../utils/format';

/**
 * Lab 06: One order (/orders/:id).
 * Shows the purchase-time snapshot (name, price, image), the address, payment
 * details and the status tracker. The server only returns the order if it is ours.
 */
const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found' | 'error'
  const [error, setError] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState('');

  const loadOrder = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getOrderById(id);
      setOrder(data.order);
      setStatus('ready');
    } catch (err) {
      if (err.status === 404 || err.status === 400) {
        setStatus('not-found');
      } else {
        setError(err.message);
        setStatus('error');
      }
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Bonus (development builds only): move the order one step forward
  const handleAdvance = async () => {
    setAdvancing(true);
    setAdvanceError('');
    try {
      const data = await advanceOrderStatus(id);
      setOrder(data.order);
    } catch (err) {
      setAdvanceError(err.message);
    } finally {
      setAdvancing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="checkout-page" role="status" aria-label="Loading order">
        <div className="cart-skeleton cart-skeleton-line"></div>
        <div className="cart-skeleton cart-skeleton-summary"></div>
      </div>
    );
  }

  if (status === 'not-found' || status === 'error') {
    return (
      <div className="checkout-page">
        <div className="state-card error-state" role="alert" id="order-not-found">
          <div className="state-icon-box error-icon-box">
            <AlertCircle size={36} />
          </div>
          <h1 className="state-title">{status === 'not-found' ? 'Order not found' : 'Unable to load this order.'}</h1>
          {status === 'error' && <p className="state-description">{error}</p>}
          {status === 'error' ? (
            <button type="button" className="btn-state-action" onClick={loadOrder}>
              Try Again
            </button>
          ) : (
            <Link to="/orders" className="btn-state-action">
              View my orders
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { shippingAddress: address } = order;
  const placed = order.status !== 'PENDING_PAYMENT';

  return (
    <div className="checkout-page" id="order-details">
      <Link to="/orders" className="btn-back-link order-back">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>My Orders</span>
      </Link>

      <header className="order-details-head">
        <h1 className="checkout-title">Order {orderNumber(order._id)}</h1>
        <p className="checkout-lead">
          Placed on {formatDate(order.createdAt)}. Status: <strong id="order-status">{STATUS_LABELS[order.status]}</strong>
        </p>
      </header>

      {placed && <OrderStatusTracker status={order.status} />}

      {order.stockIssue && (
        <p className="checkout-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Some items sold out while you were paying. ShopKart will contact you about this order.</span>
        </p>
      )}

      {import.meta.env.DEV && placed && order.status !== 'DELIVERED' && (
        <div className="dev-panel">
          <p>Development only (bonus): move this order to the next status.</p>
          <button type="button" className="checkout-back" onClick={handleAdvance} disabled={advancing} id="advance-status-btn">
            {advancing ? 'Updating...' : 'Advance status'}
          </button>
          {advanceError && <p className="cart-error-msg">{advanceError}</p>}
        </div>
      )}

      <section className="checkout-recap" aria-labelledby="order-items-heading">
        <h2 className="checkout-recap-title" id="order-items-heading">
          Items
        </h2>
        <ul className="checkout-lines">
          {order.items.map((item) => (
            <li key={item.product} className="checkout-line">
              <img src={item.image} alt="" className="checkout-line-image" loading="lazy" />
              <div className="checkout-line-info">
                <Link to={`/products/${item.product}`} className="checkout-line-name">
                  {item.name}
                </Link>
                <p className="checkout-line-qty">
                  {item.quantity} × {formatINR(item.price)}
                </p>
              </div>
              <p className="checkout-line-total">{formatINR(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <div className="checkout-total">
          <span>Total paid</span>
          <span id="order-total">{formatINR(order.totalAmount)}</span>
        </div>
      </section>

      <div className="order-info-grid">
        <section aria-labelledby="order-address-heading">
          <h2 className="checkout-recap-title" id="order-address-heading">
            Delivery address
          </h2>
          <address className="order-address">
            {address.fullName}
            <br />
            {address.addressLine1}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            Phone {address.phone}
          </address>
        </section>

        <section aria-labelledby="order-payment-heading">
          <h2 className="checkout-recap-title" id="order-payment-heading">
            Payment
          </h2>
          <dl className="order-payment">
            <div>
              <dt>Status</dt>
              <dd>{order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'FAILED' ? 'Failed' : 'Pending'}</dd>
            </div>
            {order.razorpayPaymentId && (
              <div>
                <dt>Razorpay payment ID</dt>
                <dd className="order-mono">{order.razorpayPaymentId}</dd>
              </div>
            )}
            {order.paidAt && (
              <div>
                <dt>Paid on</dt>
                <dd>{formatDate(order.paidAt)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
};

export default OrderDetails;
