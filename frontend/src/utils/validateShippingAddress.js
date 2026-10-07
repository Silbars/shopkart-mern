/**
 * Lab 06 Task 3: Shipping address validation in the browser.
 * Same rules as backend/utils/validateShippingAddress.js. If these fail,
 * no request is sent. The server checks again anyway.
 */
export const SHIPPING_FIELDS = {
  fullName: 'Full name',
  phone: 'Phone number',
  addressLine1: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode'
};

const validateShippingAddress = (input) => {
  const value = {};
  const errors = {};

  for (const [field, label] of Object.entries(SHIPPING_FIELDS)) {
    const trimmed = typeof input[field] === 'string' ? input[field].trim() : '';
    value[field] = trimmed;
    if (!trimmed) errors[field] = `${label} is required.`;
  }

  value.phone = value.phone.replace(/\s+/g, '');
  if (!errors.phone && !/^[6-9]\d{9}$/.test(value.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number.';
  }

  if (!errors.pincode && !/^\d{6}$/.test(value.pincode)) {
    errors.pincode = 'Pincode must contain 6 digits.';
  } else if (!errors.pincode && value.pincode.startsWith('0')) {
    errors.pincode = 'Pincode cannot start with 0.';
  }

  return { value, errors };
};

export default validateShippingAddress;
