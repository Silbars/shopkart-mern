import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toggleWishlist } from '../services/api';

/**
 * Lab 04 Task 5 + Bonus Toggle: Wishlist Button
 *
 * Request lifecycle: idle -> saving -> added (brief confirmation) -> idle
 *                                   \-> error (message shown, user can retry)
 *
 * The server response (`saved`) is always the source of truth for the heart state.
 */
const ADDED_CONFIRMATION_MS = 2000;

const WishlistButton = ({ productId, productName, isSaved = false, onChange }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [saved, setSaved] = useState(isSaved);
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'added' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Keep in sync when the page finishes loading the saved product IDs
  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  // Show "Added to Wishlist" briefly, then settle on "Remove from Wishlist"
  useEffect(() => {
    if (status !== 'added') return undefined;
    const timer = setTimeout(() => setStatus('idle'), ADDED_CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleClick = async () => {
    // Guests: send them to login, then bring them back to this page
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: `${location.pathname}${location.search}`,
          message: 'Log in to save products to your wishlist.'
        }
      });
      return;
    }

    // Prevent duplicate requests while one is already in flight
    if (status === 'saving') return;

    const wasSaved = saved;
    setStatus('saving');
    setErrorMessage('');

    try {
      const data = await toggleWishlist(productId);
      setSaved(data.saved);
      setStatus(data.saved ? 'added' : 'idle');
      if (onChange) onChange(productId, data.saved);
    } catch (err) {
      setStatus('error');
      if (err.status === 401) {
        setErrorMessage('Your session has expired. Log in again to use your wishlist.');
      } else if (wasSaved) {
        setErrorMessage('Unable to remove product. Please try again.');
      } else {
        setErrorMessage('Unable to save product. Please try again.');
      }
    }
  };

  const isSaving = status === 'saving';

  let label;
  if (isSaving) {
    label = saved ? 'Removing...' : 'Saving...';
  } else if (status === 'added') {
    label = 'Added to Wishlist';
  } else if (saved) {
    label = 'Remove from Wishlist';
  } else {
    label = 'Add to Wishlist';
  }

  return (
    <div className="wishlist-action">
      <button
        type="button"
        className={`btn-wishlist ${saved ? 'is-saved' : ''} ${status === 'added' ? 'just-added' : ''}`}
        onClick={handleClick}
        disabled={isSaving}
        aria-pressed={saved}
        aria-label={`${label}: ${productName}`}
        id={`wishlist-btn-${productId}`}
      >
        {isSaving ? (
          <span className="spinner-xs" aria-hidden="true"></span>
        ) : (
          <Heart
            size={16}
            className="btn-wishlist-heart"
            fill={saved ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
      </button>

      {status === 'error' && (
        <p className="wishlist-error-msg" role="alert" id={`wishlist-error-${productId}`}>
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};

export default WishlistButton;
