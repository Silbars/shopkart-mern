import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Lab 06 Task 2/3: Shipping details form (controlled; state lives in Checkout.jsx).
 * Labels sit above inputs, errors below. Browser autofill hints included.
 */
const FIELDS = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'phone', label: 'Phone number', autoComplete: 'tel-national', inputMode: 'numeric', maxLength: 14, hint: '10-digit mobile number' },
  { name: 'addressLine1', label: 'Address', autoComplete: 'address-line1', wide: true, hint: 'House number, street, area' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State', autoComplete: 'address-level1' },
  { name: 'pincode', label: 'Pincode', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 6 }
];

const CheckoutForm = ({ values, errors, onChange, disabled }) => (
  <div className="checkout-form-grid">
    {FIELDS.map(({ name, label, autoComplete, inputMode, maxLength, wide, hint }) => {
      const error = errors[name];
      const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined;
      return (
        <div className={`checkout-field ${wide ? 'is-wide' : ''}`} key={name}>
          <label className="checkout-label" htmlFor={`checkout-${name}`}>
            {label}
          </label>
          <input
            id={`checkout-${name}`}
            name={name}
            type="text"
            className={`checkout-input ${error ? 'has-error' : ''}`}
            value={values[name]}
            onChange={(e) => onChange(name, e.target.value)}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
          />
          {hint && !error && (
            <p className="checkout-hint" id={`${name}-hint`}>
              {hint}
            </p>
          )}
          {error && (
            <p className="checkout-error" id={`${name}-error`}>
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}
        </div>
      );
    })}
  </div>
);

export const CHECKOUT_FIELD_ORDER = FIELDS.map((f) => f.name);

export default CheckoutForm;
