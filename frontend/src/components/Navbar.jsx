import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut, User, LogIn, UserPlus, Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getWishlist, WISHLIST_CHANGED_EVENT } from '../services/api';

const Navbar = () => {
  const { user, isAuthenticated, logoutUser } = useAuth();
  // Lab 05: cart count comes from the shared CartContext (total units), never fetched here
  const { itemCount: cartCount, status: cartStatus } = useCart();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Lab 04 Bonus: Wishlist count, always taken from a backend response.
  // Every wishlist API call announces the count the server returned (see services/api.js).
  const [wishlistCount, setWishlistCount] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistCount(null);
      return undefined;
    }

    const handleWishlistChanged = (event) => {
      setWishlistCount(event.detail.count);
    };

    window.addEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);

    // Initial count: GET /wishlist fires the event with the server's count
    getWishlist().catch((err) => console.error('Failed to load wishlist count:', err));

    return () => {
      window.removeEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);
    };
  }, [isAuthenticated]);

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

              <NavLink 
                to="/products" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-products-link"
              >
                Products
              </NavLink>

              {/* Lab 04: Wishlist link with live count from the backend */}
              <NavLink
                to="/wishlist"
                className={({ isActive }) => `nav-link nav-link-wishlist ${isActive ? 'active' : ''}`}
                id="nav-wishlist-link"
                aria-label={
                  wishlistCount === null ? 'Wishlist' : `Wishlist, ${wishlistCount} saved products`
                }
              >
                <Heart size={15} aria-hidden="true" />
                <span>Wishlist</span>
                {wishlistCount !== null && (
                  <span
                    className={`nav-count-badge ${wishlistCount === 0 ? 'is-empty' : ''}`}
                    id="nav-wishlist-count"
                    aria-hidden="true"
                  >
                    {wishlistCount}
                  </span>
                )}
              </NavLink>

              {/* Lab 05: Cart link, count = total units from CartContext */}
              <NavLink
                to="/cart"
                className={({ isActive }) => `nav-link nav-link-cart ${isActive ? 'active' : ''}`}
                id="nav-cart-link"
                aria-label={
                  cartStatus === 'ready' ? `Cart, ${cartCount} items` : 'Cart'
                }
              >
                <ShoppingCart size={15} aria-hidden="true" />
                <span>Cart</span>
                {cartStatus === 'ready' && (
                  <span
                    className={`nav-count-badge nav-count-badge-cart ${cartCount === 0 ? 'is-empty' : ''}`}
                    id="nav-cart-count"
                    aria-hidden="true"
                  >
                    {cartCount}
                  </span>
                )}
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
                to="/products" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                id="nav-products-guest-link"
              >
                Products
              </NavLink>

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
