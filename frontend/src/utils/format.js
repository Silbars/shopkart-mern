/** Shared display formatting for the order pages (Lab 06) */
export const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Short, readable order number from a MongoDB id (last 8 characters) */
export const orderNumber = (id = '') => `#${String(id).slice(-8).toUpperCase()}`;

export const STATUS_LABELS = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered'
};
