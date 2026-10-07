import axios from 'axios';

/**
 * ShopKart API Service
 * 
 * Configured with `withCredentials: true` so HttpOnly cookies
 * set by the backend (/customers/login) are automatically attached
 * to subsequent authenticated requests (/customers/me, /customers/logout).
 */
const api = axios.create({
  // Default to relative path to leverage Vite proxy, or use explicit backend URL
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract server message if available
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data,
      originalError: error
    });
  }
);

/* ==========================================================================
   Customer Authentication APIs (Lab 01 & 02)
   ========================================================================== */

/**
 * Task 1: Register customer
 * POST /customers/register
 * @param {{ fullName: string, email: string, password: string, phone: string }} customerData
 */
export const registerCustomer = async (customerData) => {
  const response = await api.post('/customers/register', customerData);
  return response.data;
};

/**
 * Task 2: Login customer
 * POST /customers/login
 * @param {{ email: string, password: string }} credentials
 */
export const loginCustomer = async (credentials) => {
  const response = await api.post('/customers/login', credentials);
  return response.data;
};

/**
 * Task 3: Get logged-in customer profile
 * GET /customers/me
 */
export const getCurrentCustomer = async () => {
  const response = await api.get('/customers/me');
  return response.data;
};

/**
 * Task 4: Logout customer
 * POST /customers/logout
 */
export const logoutCustomer = async () => {
  const response = await api.post('/customers/logout');
  return response.data;
};

/* ==========================================================================
   Product APIs (Lab 03 - Catalog & Discovery)
   ========================================================================== */

/**
 * Task 3, 5 & Bonus: Fetch all products with dynamic search, category, and sorting
 * GET /products?search=...&category=...&sort=...
 * @param {{ search?: string, category?: string, sort?: string }} params
 */
export const getProducts = async (params = {}) => {
  const cleanParams = {};
  if (params.search && params.search.trim()) {
    cleanParams.search = params.search.trim();
  }
  if (params.category && params.category !== 'All' && params.category.trim()) {
    cleanParams.category = params.category.trim();
  }
  if (params.sort && params.sort.trim()) {
    cleanParams.sort = params.sort.trim();
  }

  const response = await api.get('/products', { params: cleanParams });
  return response.data;
};

/**
 * Task 4: Get single product by ID
 * GET /products/:id
 * @param {string} id - MongoDB ObjectId of product
 */
export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

/**
 * Task 2: Create a new product
 * POST /products
 * @param {{ name: string, description: string, price: number, category: string, image: string, stock: number }} productData
 */
export const createProduct = async (productData) => {
  const response = await api.post('/products', productData);
  return response.data;
};

/* ==========================================================================
   Wishlist APIs (Lab 04 - Persistent, Protected Wishlist)
   ========================================================================== */

/**
 * Browser event fired whenever the backend reports a new wishlist count.
 * This is NOT global state: it carries the count the server just returned,
 * so components like the Navbar can show it without a store or Context.
 */
export const WISHLIST_CHANGED_EVENT = 'wishlist:changed';

const notifyWishlistChanged = (count) => {
  if (typeof count === 'number') {
    window.dispatchEvent(new CustomEvent(WISHLIST_CHANGED_EVENT, { detail: { count } }));
  }
};

/**
 * Task 3: Get the logged-in customer's wishlist (populated products)
 * GET /wishlist
 * The server identifies the customer from the JWT cookie — no userId is sent.
 */
export const getWishlist = async () => {
  const response = await api.get('/wishlist');
  notifyWishlistChanged(response.data.count);
  return response.data;
};

/**
 * Task 2: Add a product to the wishlist
 * POST /wishlist/:productId
 * @param {string} productId - MongoDB ObjectId of product
 */
export const addToWishlist = async (productId) => {
  const response = await api.post(`/wishlist/${productId}`);
  notifyWishlistChanged(response.data.count);
  return response.data;
};

/**
 * Task 4: Remove a product from the wishlist
 * DELETE /wishlist/:productId
 * @param {string} productId - MongoDB ObjectId of product
 */
export const removeFromWishlist = async (productId) => {
  const response = await api.delete(`/wishlist/${productId}`);
  notifyWishlistChanged(response.data.count);
  return response.data;
};

/**
 * Bonus: Toggle a product in the wishlist
 * PATCH /wishlist/:productId/toggle
 * @param {string} productId - MongoDB ObjectId of product
 * @returns {{ success: boolean, saved: boolean, message: string, count: number }}
 */
export const toggleWishlist = async (productId) => {
  const response = await api.patch(`/wishlist/${productId}/toggle`);
  notifyWishlistChanged(response.data.count);
  return response.data;
};

/* ==========================================================================
   Cart APIs (Lab 05 - Persistent cart, shared through CartContext)
   Every call returns { success, message, cart } where cart is the full,
   populated cart from the server.
   ========================================================================== */

/**
 * Task 3: Get the logged-in customer's cart
 * GET /cart
 */
export const getCart = async () => {
  const response = await api.get('/cart');
  return response.data;
};

/**
 * Task 2: Add a product to the cart (or add to its quantity if it is already there)
 * POST /cart/:productId   body: { quantity }  (defaults to 1)
 * @param {string} productId - MongoDB ObjectId of product
 * @param {number} [quantity=1] - how many units to add
 */
export const addToCart = async (productId, quantity = 1) => {
  const response = await api.post(`/cart/${productId}`, { quantity });
  return response.data;
};

/**
 * Task 4: Set the quantity of a product already in the cart
 * PATCH /cart/:productId   body: { quantity }
 * @param {string} productId - MongoDB ObjectId of product
 * @param {number} quantity - new quantity (1 to stock)
 */
export const updateCartQuantity = async (productId, quantity) => {
  const response = await api.patch(`/cart/${productId}`, { quantity });
  return response.data;
};

/**
 * Task 5: Remove a product from the cart
 * DELETE /cart/:productId
 * @param {string} productId - MongoDB ObjectId of product
 */
export const removeFromCart = async (productId) => {
  const response = await api.delete(`/cart/${productId}`);
  return response.data;
};

/* ==========================================================================
   Order APIs (Lab 06 - Checkout, Razorpay payment verification, order history)
   ========================================================================== */

/**
 * Validate the cart on the server and start a Razorpay payment.
 * POST /orders/create-payment-order   body: { shippingAddress }
 * Only the address is sent: items, prices and the total are read from MongoDB.
 * @returns {{ shopKartOrderId, razorpayOrderId, amount, currency, key }}
 */
export const createPaymentOrder = async (shippingAddress) => {
  const response = await api.post('/orders/create-payment-order', { shippingAddress });
  return response.data;
};

/**
 * Send Razorpay's checkout response to the server for signature verification.
 * POST /orders/verify-payment
 * @param {{ shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }} payload
 */
export const verifyPayment = async (payload) => {
  const response = await api.post('/orders/verify-payment', payload);
  return response.data;
};

/** GET /orders: the logged-in customer's placed orders, newest first */
export const getOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

/** GET /orders/:id: one order (only if it belongs to the logged-in customer) */
export const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

/** Bonus (development only): PATCH /orders/:id/status moves the order one step forward */
export const advanceOrderStatus = async (id) => {
  const response = await api.patch(`/orders/${id}/status`);
  return response.data;
};

export default api;
