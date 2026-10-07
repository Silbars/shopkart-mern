/**
 * Lab 06: Loads Razorpay Standard Checkout (checkout.js) once.
 * Resolves true when window.Razorpay is ready, false if the script could not load
 * (offline, blocked by an extension...). Never assume window.Razorpay exists.
 */
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      script.remove();
      loading = null; // allow another try later
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loading;
};

export default loadRazorpay;
