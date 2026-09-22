import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, User, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <Link to={isAuthenticated ? '/home' : '/login'} className="brand-logo" id="nav-brand-logo">
          <div className="brand-icon-box">
            <ShoppingBag size={20} color="#ffffff" />
          </div>
          <span>Shop<span className="brand-name-accent">Kart</span></span>
        </Link>

        {/* Navigation Actions */}
        <nav className="nav-links">
          {isAuthenticated ? (
            <>
              <NavLink 
                to="/home" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-home-link"
              >
                Home
              </NavLink>

              {/* User Identity Pill */}
              <div className="nav-user-pill" id="nav-user-pill" title={user?.email}>
                <div className="user-avatar-badge">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user?.fullName?.split(' ')[0] || 'Customer'}</span>
              </div>

              {/* Task 4: Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn-logout"
                id="nav-logout-btn"
                aria-label="Logout"
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-login-link"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <LogIn size={16} /> Login
                </span>
              </NavLink>

              <NavLink 
                to="/register" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-register-link"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserPlus size={16} /> Register
                </span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
