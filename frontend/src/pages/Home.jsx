import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, RefreshCw } from 'lucide-react';
import { getCurrentCustomer, getWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Lab 02 Task 3: Protected Home Page (personal)
 *
 * Built only from real data:
 * - GET /customers/me  -> greeting, monogram, account details
 * - GET /wishlist      -> "You have N products saved" + the first saved products
 */

const SAVED_PREVIEW_LIMIT = 4;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// "Asha Rao" -> "AR", "Asha" -> "A"
const getInitials = (fullName = '') => {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
};

const formatPrice = (price) =>
  typeof price === 'number' ? price.toLocaleString('en-IN') : price;

const Home = () => {
  const navigate = useNavigate();
  const { user, loginUser } = useAuth();

  // Profile: show what AuthContext already has, refresh quietly from GET /customers/me
  const [customer, setCustomer] = useState(user || null);
  const [loadingProfile, setLoadingProfile] = useState(!user);

  // Saved products from GET /wishlist
  const [saved, setSaved] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    let isMounted = true;

    const fetchCustomerProfile = async () => {
      try {
        const data = await getCurrentCustomer();
        if (isMounted) {
          setCustomer(data);
          loginUser(data); // Keep AuthContext in sync
        }
      } catch (err) {
        // Session missing or expired -> back to login
        if (isMounted) {
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    fetchCustomerProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const loadSaved = useCallback(async () => {
    setSaved((prev) => ({ ...prev, status: 'loading' }));
    try {
      const data = await getWishlist();
      setSaved({ status: 'ready', items: data.wishlist || [] });
    } catch (err) {
      console.error('Failed to load saved products:', err);
      setSaved({ status: 'error', items: [] });
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  if (loadingProfile) {
    return <HomeSkeleton />;
  }

  const firstName = customer?.fullName?.trim().split(/\s+/)[0];
  const initials = getInitials(customer?.fullName);
  const savedCount = saved.items.length;
  const preview = saved.items.slice(0, SAVED_PREVIEW_LIMIT);

  let activityLine = null;
  if (saved.status === 'ready') {
    activityLine =
      savedCount === 0
        ? 'Nothing saved yet.'
        : `You have ${savedCount} ${savedCount === 1 ? 'product' : 'products'} saved.`;
  }

  return (
    <div className="home-page">
      {/* Greeting */}
      <header className="home-hero">
        {initials && (
          <div className="home-monogram" aria-hidden="true">
            {initials}
          </div>
        )}
        <div>
          <h1 className="home-greeting" id="welcome-heading">
            {getGreeting()}
            {firstName ? `, ${firstName}.` : '.'}
          </h1>
          {saved.status === 'loading' && (
            <div className="home-skeleton home-skeleton-activity" aria-hidden="true"></div>
          )}
          {activityLine && (
            <p className="home-activity" id="home-activity">
              {activityLine}
            </p>
          )}
          <Link to="/products" className="home-btn home-btn-primary" id="home-explore-products-btn">
            <ShoppingBag size={18} aria-hidden="true" />
            <span>Browse products</span>
          </Link>
        </div>
      </header>

      {/* Saved for later (from GET /wishlist) */}
      <section className="home-saved" aria-labelledby="home-saved-heading" aria-live="polite">
        <div className="home-saved-header">
          <h2 className="home-saved-title" id="home-saved-heading">
            Saved for later
          </h2>
          {saved.status === 'ready' && savedCount > 0 && (
            <Link to="/wishlist" className="home-see-all" id="home-see-all-saved">
              <span>See all {savedCount}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>

        {saved.status === 'loading' && (
          <div className="home-saved-grid" aria-hidden="true">
            {Array.from({ length: SAVED_PREVIEW_LIMIT }).map((_, i) => (
              <div key={i}>
                <div className="home-skeleton home-skeleton-tile"></div>
                <div className="home-skeleton home-skeleton-line"></div>
                <div className="home-skeleton home-skeleton-line home-skeleton-line-short"></div>
              </div>
            ))}
          </div>
        )}

        {saved.status === 'error' && (
          <div className="home-saved-message" role="alert">
            <p>We couldn't load your saved products.</p>
            <button type="button" className="home-text-btn" onClick={loadSaved} id="home-saved-retry">
              <RefreshCw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {saved.status === 'ready' && savedCount === 0 && (
          <div className="home-saved-message" id="home-saved-empty">
            <p>Tap the heart on any product and it shows up here.</p>
          </div>
        )}

        {saved.status === 'ready' && savedCount > 0 && (
          <ul className="home-saved-grid" id="home-saved-grid">
            {preview.map((product) => (
              <li key={product._id}>
                <Link
                  to={`/products/${product._id}`}
                  className="home-saved-item"
                  aria-label={`${product.name}, ₹${formatPrice(product.price)}`}
                >
                  <div className="home-saved-image">
                    <img
                      src={product.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                  <p className="home-saved-name">{product.name}</p>
                  <p className="home-saved-price">₹{formatPrice(product.price)}</p>
                  {product.stock <= 0 && <p className="home-saved-stock is-out">Out of stock</p>}
                  {product.stock > 0 && product.stock <= 5 && (
                    <p className="home-saved-stock">Only {product.stock} left</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Account details (Lab 02: name, email, phone from GET /customers/me) */}
      <section className="home-details-strip" aria-labelledby="home-details-heading">
        <h2 className="home-details-title" id="home-details-heading">
          Your details
        </h2>
        <dl className="home-details-list">
          <div>
            <dt>Name</dt>
            <dd id="display-fullname">{customer?.fullName || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd id="display-email">{customer?.email || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd id="display-phone" className="home-detail-phone">
              {customer?.phone || 'Not provided'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

// Shown only when there is no profile data yet: same shape as the real page
const HomeSkeleton = () => (
  <div className="home-page" role="status" aria-label="Loading your account">
    <div className="home-hero">
      <div className="home-skeleton home-monogram"></div>
      <div>
        <div className="home-skeleton home-skeleton-heading"></div>
        <div className="home-skeleton home-skeleton-activity"></div>
      </div>
    </div>
    <div className="home-saved-grid">
      {Array.from({ length: SAVED_PREVIEW_LIMIT }).map((_, i) => (
        <div key={i} className="home-skeleton home-skeleton-tile"></div>
      ))}
    </div>
  </div>
);

export default Home;
