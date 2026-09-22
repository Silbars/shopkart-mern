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

export default api;
