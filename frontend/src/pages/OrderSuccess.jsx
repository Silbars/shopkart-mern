import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getOrderById } from '../services/api';
import { formatINR, orderNumber, STATUS_LABELS } from '../utils/format';

/**
 * Lab 06 Task 6: Order confirmation (/order-success/:id)
 * Loads the order from the server (so a refresh still works) instead of trusting page state.
 */
const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getOrderById(id)
      .then((data) => active && setOrder(data.order))
      .catch((err) => active && setError(err.status === 404 ? 'We could not find this order.' : err.message));
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="checkout-page">
        <div className="state-card error-state" role="alert">
          <div className="state-icon-box error-icon-box">
            <AlertCircle size={36} />
          </div>
          <h1 className="state-title">{error}</h1>
          <Link to="/orders" className="btn-state-action">
            View my orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="checkout-page" role="status" aria-label="Loading your order">
        <div className="cart-skeleton cart-skeleton-line"></div>
        <div className="cart-skeleton cart-skeleton-summary"></div>
      </div>
    );
  }

  const paid = order.paymentStatus === 'PAID';

  return (
    <div className="checkout-page" id="order-success">
      <div className="success-head">
        <CheckCircle2 size={40} className="success-icon" aria-hidden="true" />
        <h1 className="checkout-title">{paid ? 'Order placed successfully' : 'Order received'}</h1>
        <p className="checkout-lead">
          {paid
            ? 'Your payment was verified and your order has been saved.'
            : 'We are still waiting for the payment to be confirmed.'}
        </p>
      </div>

      <dl className="success-facts">
        <div>
          <dt>Order ID</dt>
          <dd id="success-order-id" title={order._id}>
            {orderNumber(order._id)}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd id="success-total">{formatINR(order.totalAmount)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd id="success-status">{STATUS_LABELS[order.status]}</dd>
        </div>
      </dl>

      <section className="checkout-recap" aria-labelledby="success-items-heading">
        <h2 className="checkout-recap-title" id="success-items-heading">
          Items
        </h2>
        <ul className="checkout-lines">
          {order.items.map((item) => (
            <li key={item.product} className="checkout-line">
              <img src={item.image} alt="" className="checkout-line-image" loading="lazy" />
              <div className="checkout-line-info">
                <p className="checkout-line-name">{item.name}</p>
                <p className="checkout-line-qty">
                  {item.quantity} × {formatINR(item.price)}
                </p>
              </div>
              <p className="checkout-line-total">{formatINR(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="success-address">
        Delivering to <strong>{order.shippingAddress.fullName}</strong>, {order.shippingAddress.addressLine1},{' '}
        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
      </p>

      <div className="success-actions">
        <Link to="/orders" className="btn-state-action" id="success-view-orders">
          View My Orders
        </Link>
        <Link to="/products" className="checkout-back" id="success-continue-shopping">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
