import React from 'react';
import { Link } from 'react-router-dom';
import { formatINR, formatDate, orderNumber, STATUS_LABELS } from '../utils/format';

const MAX_LINES = 3;

/**
 * Lab 06 Task 8: One order in "My Orders".
 * Everything shown comes from the order's purchase-time snapshot, not the live Product.
 */
const OrderCard = ({ order }) => {
  const { _id, createdAt, items, totalAmount, status } = order;
  const shown = items.slice(0, MAX_LINES);
  const more = items.length - shown.length;

  return (
    <article className="order-card" id={`order-card-${_id}`}>
      <div className="order-card-media" aria-hidden="true">
        {shown.map((item) => (
          <img key={item.product} src={item.image} alt="" loading="lazy" />
        ))}
      </div>

      <div className="order-card-body">
        <div className="order-card-head">
          <h2 className="order-card-number">Order {orderNumber(_id)}</h2>
          <span className={`order-status-badge status-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>
        </div>
        <p className="order-card-date">{formatDate(createdAt)}</p>

        <ul className="order-card-items">
          {shown.map((item) => (
            <li key={item.product}>
              {item.name} × {item.quantity}
            </li>
          ))}
          {more > 0 && <li className="order-card-more">and {more} more</li>}
        </ul>
      </div>

      <div className="order-card-side">
        <p className="order-card-total">{formatINR(totalAmount)}</p>
        <Link to={`/orders/${_id}`} className="btn-view-details" id={`order-view-${_id}`}>
          View Details
        </Link>
      </div>
    </article>
  );
};

export default OrderCard;
