import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Heart } from 'lucide-react';
import { loginCustomer, getCurrentCustomer } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();

  // Pick up pre-filled email or success banner if redirected from Register page
  const initialEmail = location.state?.email || '';
  const successBanner = location.state?.successMessage || '';

  // Lab 04: Guests sent here from a wishlist action see why, and return there after login
  const infoBanner = location.state?.message || '';
  const redirectTo = location.state?.from || '/home';

  const [formData, setFormData] = useState({
    email: initialEmail,
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Controlled input handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
    if (errorMessage) setErrorMessage('');
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      // Task 2: POST /customers/login (cookies automatically handled via withCredentials: true)
      const data = await loginCustomer({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      // Update AuthContext user state from login response or GET /customers/me
      if (data.customer) {
        loginUser(data.customer);
      } else {
        const profile = await getCurrentCustomer();
        loginUser(profile);
      }

      // On success -> Navigate back to where the user came from (default /home)
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Show "Invalid Credentials" or backend message
      setErrorMessage(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your ShopKart account.</p>
        </div>

        {/* Success Alert Banner (from Registration) */}
        {successBanner && (
          <div className="alert-banner alert-success" role="status" id="login-success-banner">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Info Alert Banner (e.g. redirected from a wishlist action) */}
        {infoBanner && (
          <div className="alert-banner alert-info" role="status" id="login-info-banner">
            <Heart size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{infoBanner}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="alert-banner alert-error" role="alert" id="login-error-banner">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate id="login-form">
          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-container">
              <input
                id="email"
                name="email"
                type="email"
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={isSubmitting}
              />
              <span className="input-icon">
                <Mail size={18} />
              </span>
            </div>
            {errors.email && (
              <p className="field-error-msg" id="error-email">
                <AlertCircle size={14} />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'has-error' : ''}`}
                placeholder="Enter your account password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <button
                type="button"
                className="input-addon-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="field-error-msg" id="error-password">
                <AlertCircle size={14} />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            id="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-sm"></span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Don't have an account yet?</span>
          <Link to="/register" className="auth-link" id="link-to-register">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
