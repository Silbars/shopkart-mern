import React from 'react';
import { Check } from 'lucide-react';
import { STATUS_LABELS } from '../utils/format';

/**
 * Lab 06 Bonus: shows where an order is in PLACED -> CONFIRMED -> SHIPPED -> DELIVERED.
 * Completed steps get a check, the current step is highlighted (aria-current="step").
 */
const STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

const OrderStatusTracker = ({ status }) => {
  const current = STEPS.indexOf(status);

  return (
    <ol className="status-tracker" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const state = index < current ? 'is-done' : index === current ? 'is-current' : 'is-upcoming';
        return (
          <li key={step} className={`status-step ${state}`} aria-current={index === current ? 'step' : undefined}>
            <span className="status-dot" aria-hidden="true">
              {index <= current ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            <span className="status-step-label">{STATUS_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderStatusTracker;
