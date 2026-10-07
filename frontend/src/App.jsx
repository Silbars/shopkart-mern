import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import { useAuth } from './context/AuthContext';

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="app-container">
      {/* Universal Navigation Header */}
      <Navbar />

      {/* Main Routed Content */}
      <main className="main-content">
        <Routes>
          {/* Default Route: Redirect to /home or /login */}
          <Route
            path="/"
            element={
              loading ? (
                <div className="loading-screen">
                  <div className="spinner"></div>
                </div>
              ) : isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Task 1: Registration Page */}
          <Route
            path="/register"
            element={
              isAuthenticated ? <Navigate to="/home" replace /> : <Register />
            }
          />

          {/* Task 2: Login Page */}
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/home" replace /> : <Login />
            }
          />

          {/* Task 3: Protected Home Page */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Lab 03 Task 6: Product Listing Page */}
          <Route path="/products" element={<Products />} />

          {/* Lab 03 Task 8: Product Details Page */}
          <Route path="/products/:id" element={<ProductDetails />} />

          {/* Lab 04 Task 8: Wishlist Page (protected — wishlist belongs to the logged-in customer) */}
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All Route */}
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
