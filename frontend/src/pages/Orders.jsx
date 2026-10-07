import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import OrderCard from '../components/OrderCard';
import { getOrders } from '../services/api';

/**
 * Lab 06 Task 8: My Orders (/orders)
 * Loading / error (with retry) / empty / list. Data comes from GET /orders.
 */
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await getOrders();
      setOrders(data.orders || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Unable to load your orders.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="orders-page">
      <header className="cart-header">
        <h1 className="cart-title" id="orders-heading">
          My Orders
        </h1>
        {status === 'ready' && orders.length > 0 && (
          <p className="cart-subtitle">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </p>
        )}
      </header>

      <section aria-live="polite">
        {status === 'loading' && (
          <div id="orders-loading-state" role="status" aria-label="Loading your orders">
            <p className="cart-loading-text">Loading your orders...</p>
            {[0, 1].map((row) => (
              <div className="cart-skeleton orders-skeleton-card" key={row} aria-hidden="true"></div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="state-card error-state" role="alert" id="orders-error-state">
            <div className="state-icon-box error-icon-box">
              <AlertCircle size={36} />
            </div>
            <h2 className="state-title">Unable to load your orders.</h2>
            <p className="state-description">{error}</p>
            <button type="button" className="btn-state-action" onClick={loadOrders} id="orders-retry-btn">
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {status === 'ready' && orders.length === 0 && (
          <div className="state-card empty-state" id="orders-empty-state">
            <div className="state-icon-box empty-icon-box">
              <Package size={38} />
            </div>
            <h2 className="state-title">You have not placed any orders yet.</h2>
            <Link to="/products" className="btn-state-action" id="orders-start-shopping">
              <ShoppingBag size={16} />
              <span>Start Shopping</span>
            </Link>
          </div>
        )}

        {status === 'ready' && orders.length > 0 && (
          <div className="orders-list" id="orders-list">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Orders;
