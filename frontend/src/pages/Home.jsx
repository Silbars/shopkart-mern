import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  ShoppingBag, 
  Package, 
  Heart, 
  CreditCard, 
  KeyRound,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getCurrentCustomer } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user, loginUser } = useAuth();
  
  const [customer, setCustomer] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState('');

  // Fetch logged-in customer data from GET /customers/me
  useEffect(() => {
    let isMounted = true;

    const fetchCustomerProfile = async () => {
      try {
        setLoading(true);
        const data = await getCurrentCustomer();
        if (isMounted) {
          setCustomer(data);
          loginUser(data); // Sync context
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Session expired. Please log in again.');
          // If not logged in -> redirect to /login
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCustomerProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" role="status" aria-label="Loading customer dashboard"></div>
        <p>Loading your ShopKart account...</p>
      </div>
    );
  }

  // First letter of customer name for avatar badge
  const initial = customer?.fullName ? customer.fullName.charAt(0).toUpperCase() : 'C';

  return (
    <div className="dashboard-container">
      {/* Welcome Hero Banner */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-welcome-badge">
            <Sparkles size={14} />
            <span>Customer Dashboard</span>
          </div>
          <h1 className="hero-title" id="welcome-heading">
            Welcome back, {customer?.fullName || 'Valued Customer'}!
          </h1>
          <p className="hero-subtitle">
            Here is your ShopKart profile overview and verified account details.
          </p>
        </div>

        <div className="api-status-pill" id="security-badge">
          <span className="status-dot"></span>
          <span>HttpOnly Auth Session Active</span>
        </div>
      </section>

      {/* Main Grid: Customer Details & Dashboard Cards */}
      <div className="dashboard-grid">
        {/* Profile Card (Required Task 3 Info) */}
        <div className="card" id="profile-card">
          <div className="card-title-row">
            <h2 className="card-title">
              <User size={20} color="var(--primary-400)" />
              Profile Details
            </h2>
            <span className="api-status-pill">Verified</span>
          </div>

          <div className="profile-avatar-large" aria-hidden="true">
            {initial}
          </div>

          <div className="profile-info-list">
            {/* Customer Full Name */}
            <div className="profile-info-item">
              <div className="profile-info-icon">
                <User size={18} />
              </div>
              <div className="profile-info-meta">
                <p className="profile-info-label">Customer Name</p>
                <p className="profile-info-value" id="display-fullname">
                  {customer?.fullName || 'Not provided'}
                </p>
              </div>
            </div>

            {/* Email Address */}
            <div className="profile-info-item">
              <div className="profile-info-icon">
                <Mail size={18} />
              </div>
              <div className="profile-info-meta">
                <p className="profile-info-label">Email Address</p>
                <p className="profile-info-value" id="display-email">
                  {customer?.email || 'Not provided'}
                </p>
              </div>
            </div>

            {/* Phone Number */}
            <div className="profile-info-item">
              <div className="profile-info-icon">
                <Phone size={18} />
              </div>
              <div className="profile-info-meta">
                <p className="profile-info-label">Phone Number</p>
                <p className="profile-info-value" id="display-phone">
                  {customer?.phone || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: E-commerce Experience & System Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Quick Metrics */}
          <div className="features-grid">
            <div className="feature-widget">
              <div className="feature-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <p className="feature-stat-value">Active</p>
                <p className="feature-stat-label">Cart & Checkout</p>
              </div>
            </div>

            <div className="feature-widget">
              <div className="feature-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Package size={22} />
              </div>
              <div>
                <p className="feature-stat-value">3 Orders</p>
                <p className="feature-stat-label">Delivered on time</p>
              </div>
            </div>

            <div className="feature-widget">
              <div className="feature-icon-box" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
                <Heart size={22} />
              </div>
              <div>
                <p className="feature-stat-value">12 Items</p>
                <p className="feature-stat-label">In Wishlist</p>
              </div>
            </div>
          </div>

          {/* Session & Security Architecture Card */}
          <div className="card">
            <div className="card-title-row">
              <h2 className="card-title">
                <ShieldCheck size={20} color="var(--accent-emerald)" />
                Security & Session Status
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--slate-300)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span><strong>HttpOnly Cookie:</strong> JWT token is securely stored and protected from JavaScript XSS attacks.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--slate-300)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span><strong>Protected Endpoint:</strong> Profile data retrieved securely from <code>GET /customers/me</code>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--slate-300)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span><strong>Automatic Cookie Transmission:</strong> Axios configured with <code>withCredentials: true</code>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
