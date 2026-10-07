/**
 * Lab 06 Task 3: Shipping address validation (server side).
 * The React checkout runs the same rules first, but the server never trusts the client.
 *
 * Returns { value, errors } where `value` holds trimmed strings and
 * `errors` maps a field name to a message (empty object = valid).
 */
const FIELDS = {
  fullName: 'Full name',
  phone: 'Phone number',
  addressLine1: 'Address',
  city: 'City',
  state: 'State',
  pincode: 'Pincode'
};

// Indian mobile number: 10 digits starting with 6-9 (spaces are ignored)
const PHONE_PATTERN = /^[6-9]\d{9}$/;
// Indian PIN code: 6 digits, first digit 1-9
const PINCODE_PATTERN = /^[1-9]\d{5}$/;

const validateShippingAddress = (input) => {
  const source = input && typeof input === 'object' ? input : {};
  const value = {};
  const errors = {};

  for (const [field, label] of Object.entries(FIELDS)) {
    const raw = source[field];
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    value[field] = trimmed;
    if (!trimmed) {
      errors[field] = `${label} is required.`;
    }
  }

  value.phone = value.phone.replace(/\s+/g, '');
  if (!errors.phone && !PHONE_PATTERN.test(value.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number.';
  }

  if (!errors.pincode && !/^\d{6}$/.test(value.pincode)) {
    errors.pincode = 'Pincode must contain 6 digits.';
  } else if (!errors.pincode && !PINCODE_PATTERN.test(value.pincode)) {
    errors.pincode = 'Pincode cannot start with 0.';
  }

  return { value, errors };
};

module.exports = validateShippingAddress;
