import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/customers': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/products': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        }
      },
      // Lab 04: /wishlist is both a React page and an API path.
      // Browser page loads (text/html) get the React app; API calls go to Express.
      '/wishlist': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        }
      }
    }
  }
});
