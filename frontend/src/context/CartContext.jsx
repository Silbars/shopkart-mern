import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getCart,
  addToCart as addToCartApi,
  updateCartQuantity as updateCartQuantityApi,
  removeFromCart as removeFromCartApi
} from '../services/api';

/**
 * Lab 05 Task 6: Global Cart State (Context API)
 *
 * ONE shared copy of the cart for the whole app. The Navbar, Product Cards,
 * Product Details and the Cart page all read from here, so they can never disagree.
 *
 * - Server state: `cartItems` always holds exactly what the backend last returned.
 *   Every mutation response contains the full cart, and we replace our copy with it.
 * - UI state: `status`, `error`, and `pendingIds` (which products have a request running).
 * - Derived state: `itemCount` and `subtotal` are calculated from `cartItems`, never stored.
 */
const CartContext = createContext(null);

const friendlyMessage = (err, fallback) => {
  if (err?.status === 401) return 'Your session has expired. Log in again to use your cart.';
  if (err?.status === 400 || err?.status === 404) return err.message || fallback;
  return fallback;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  // Mirror of pendingIds that is always current (state can lag one render behind a fast double-click)
  const pendingRef = useRef(new Set());

  const setPending = useCallback((productId, isPending) => {
    if (isPending) pendingRef.current.add(productId);
    else pendingRef.current.delete(productId);
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  /**
   * Load the cart from GET /cart.
   * `silent` refreshes in the background without showing the loading state
   * (used to pick up new stock/price values after a rejected change).
   */
  const refreshCart = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setStatus('loading');
      setError(null);
    }
    try {
      const data = await getCart();
      setCartItems(data.cart || []);
      setStatus('ready');
      setError(null);
    } catch (err) {
      if (!silent) {
        setStatus('error');
        setError(err.message || 'Unable to load your cart.');
      }
    }
  }, []);

  // Load the cart when a customer logs in; clear it when they log out
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCartItems([]);
      setStatus('idle');
      setError(null);
      pendingRef.current = new Set();
      setPendingIds(new Set());
    }
  }, [isAuthenticated, refreshCart]);

  /**
   * Runs one cart mutation for one product:
   * mark it pending -> call the API -> replace cartItems with the server's cart.
   * Returns { ok, message } so the component that asked can show its own error.
   */
  const runMutation = useCallback(
    async (productId, request, fallbackMessage) => {
      // One request per product at a time
      if (pendingRef.current.has(productId)) {
        return { ok: false, ignored: true };
      }

      setPending(productId, true);
      try {
        const data = await request();
        setCartItems(data.cart || []);
        setStatus('ready');
        return { ok: true };
      } catch (err) {
        // The change was rejected (e.g. stock dropped). Re-sync so the UI shows the latest stock.
        if (err?.status === 400 || err?.status === 404) {
          refreshCart({ silent: true });
        }
        return { ok: false, status: err?.status, message: friendlyMessage(err, fallbackMessage) };
      } finally {
        setPending(productId, false);
      }
    },
    [setPending, refreshCart]
  );

  const addToCart = useCallback(
    (productId, quantity = 1) =>
      runMutation(
        productId,
        () => addToCartApi(productId, quantity),
        'Unable to add to cart. Please try again.'
      ),
    [runMutation]
  );

  const updateQuantity = useCallback(
    (productId, quantity) =>
      runMutation(
        productId,
        () => updateCartQuantityApi(productId, quantity),
        'Unable to update quantity. Please try again.'
      ),
    [runMutation]
  );

  const removeFromCart = useCallback(
    (productId) =>
      runMutation(productId, () => removeFromCartApi(productId), 'Unable to remove item. Please try again.'),
    [runMutation]
  );

  // Derived values: always calculated from cartItems, so they can never be stale
  const itemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [cartItems]
  );

  const getQuantity = useCallback(
    (productId) => cartItems.find((item) => item.product._id === productId)?.quantity || 0,
    [cartItems]
  );

  const isPending = useCallback((productId) => pendingIds.has(productId), [pendingIds]);

  const value = {
    cartItems,
    status,
    loading: status === 'loading',
    error,
    itemCount,
    subtotal,
    getQuantity,
    isPending,
    addToCart,
    updateQuantity,
    removeFromCart,
    refreshCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
