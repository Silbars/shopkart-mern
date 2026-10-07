import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Stock Status Badge
 * Shared by ProductCard (Lab 03) and WishlistCard (Lab 04).
 */
const StockBadge = ({ stock, id }) => {
  if (stock <= 0) {
    return (
      <span className="stock-badge stock-badge-out" id={id}>
        <XCircle size={13} />
        <span>Out of stock</span>
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="stock-badge stock-badge-low" id={id}>
        <AlertTriangle size={13} />
        <span>Only {stock} units left!</span>
      </span>
    );
  }

  return (
    <span className="stock-badge stock-badge-in" id={id}>
      <CheckCircle2 size={13} />
      <span>{stock} units left</span>
    </span>
  );
};

export default StockBadge;
