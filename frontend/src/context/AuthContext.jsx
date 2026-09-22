import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentCustomer, logoutCustomer } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth session on app startup by calling GET /customers/me
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const data = await getCurrentCustomer();
      setUser(data);
    } catch (err) {
      // 401 Unauthorized or cookie expired -> not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const loginUser = (customerData) => {
    setUser(customerData);
  };

  const logoutUser = async () => {
    try {
      await logoutCustomer();
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginUser,
        logoutUser,
        checkAuthStatus,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
