import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Tag, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  AlertCircle,
  Check
} from 'lucide-react';
import { getProductById } from '../services/api';

/**
 * Task 8: Product Details Page
 * Dynamic route /products/:id
 * Fetches single product details and renders full specifications, stock status, and Add to Cart UI.
 */
const ProductDetails = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductById(id);

        if (isMounted) {
          if (data && data.success && data.product) {
            setProduct(data.product);
          } else if (data && data.product) {
            setProduct(data.product);
          } else {
            setError('Product not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching product details:', err);
          setError(err.message || 'Unable to load product details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Add to Cart button click (UI-only for Lab 03 as specified)
  const handleAddToCart = () => {
    setAddedToCartToast(true);
    setTimeout(() => {
      setAddedToCartToast(false);
    }, 3500);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="product-details-container">
        <div className="state-card loading-state" id="details-loading-state">
          <div className="spinner" role="status" aria-label="Loading product details"></div>
          <h2 className="state-title">Loading product details...</h2>
          <p className="state-description">Fetching product specifications from MongoDB.</p>
        </div>
      </div>
    );
  }

  // 2. Error State / Not Found
  if (error || !product) {
    return (
      <div className="product-details-container">
        <div className="state-card error-state" id="details-error-state" role="alert">
          <div className="state-icon-box error-icon-box">
            <AlertCircle size={40} />
          </div>
          <h2 className="state-title">Product Not Found</h2>
          <p className="state-description">
            {error || "The product you're looking for doesn't exist or has been removed."}
          </p>
          <Link to="/products" className="btn-state-action" id="btn-back-to-catalog-error">
            <ArrowLeft size={16} />
            <span>Back to Products</span>
          </Link>
        </div>
      </div>
    );
  }

  const { name, description, price, category, image, stock, createdAt } = product;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  return (
    <div className="product-details-container">
      {/* Back Navigation Breadcrumb */}
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products" className="btn-back-link" id="btn-back-to-products">
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-category">{category}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{name}</span>
      </nav>

      {/* Main Product Details Layout */}
      <article className="product-details-grid" id="product-details-layout">
        {/* Left Column: Large Product Image */}
        <div className="product-details-image-card">
          <div className="product-details-image-wrap">
            <img
              src={image}
              alt={name}
              className="product-details-img"
              id="product-details-image"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Guarantee Badges */}
          <div className="product-guarantee-badges">
            <div className="guarantee-badge-item">
              <Truck size={18} color="var(--primary-400)" />
              <span>Fast Tracked Delivery</span>
            </div>
            <div className="guarantee-badge-item">
              <RotateCcw size={18} color="var(--primary-400)" />
              <span>7-Day Return Policy</span>
            </div>
            <div className="guarantee-badge-item">
              <ShieldCheck size={18} color="var(--accent-emerald)" />
              <span>100% Genuine Quality</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information, Pricing, & Add to Cart */}
        <div className="product-details-info-card">
          {/* Category Pill */}
          <div className="details-category-pill" id="details-category">
            <Tag size={13} />
            <span>{category}</span>
          </div>

          {/* Product Name */}
          <h1 className="product-details-title" id="product-details-name">
            {name}
          </h1>

          {/* Price Box */}
          <div className="product-details-price-row">
            <div className="product-details-price-box">
              <span className="details-currency-symbol">₹</span>
              <span className="details-price-number" id="product-details-price">
                {typeof price === 'number' ? price.toLocaleString('en-IN') : price}
              </span>
            </div>
            <span className="price-tax-note">Inclusive of all taxes</span>
          </div>

          {/* Stock Availability */}
          <div className="product-details-stock-row">
            <span className="stock-label">Availability:</span>
            {isOutOfStock ? (
              <span className="stock-badge stock-badge-out" id="product-details-stock">
                <XCircle size={14} />
                <span>Out of stock</span>
              </span>
            ) : isLowStock ? (
              <span className="stock-badge stock-badge-low" id="product-details-stock">
                <AlertTriangle size={14} />
                <span>Hurry! Only {stock} units left in stock</span>
              </span>
            ) : (
              <span className="stock-badge stock-badge-in" id="product-details-stock">
                <CheckCircle2 size={14} />
                <span>In Stock ({stock} units available)</span>
              </span>
            )}
          </div>

          {/* Product Description */}
          <div className="product-details-desc-box">
            <h2 className="desc-heading">Description</h2>
            <p className="desc-text" id="product-details-description">
              {description}
            </p>
          </div>

          {/* Add to Cart Action Area */}
          <div className="product-actions-area">
            <button
              type="button"
              className={`btn-add-to-cart ${isOutOfStock ? 'disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              id="btn-add-to-cart"
              aria-label="Add product to cart"
            >
              <ShoppingCart size={18} />
              <span>{isOutOfStock ? 'Currently Unavailable' : 'Add to Cart'}</span>
            </button>

            {/* Added to cart feedback toast / notification */}
            {addedToCartToast && (
              <div className="add-to-cart-toast" role="alert" id="add-to-cart-toast">
                <Check size={16} />
                <span><strong>{name}</strong> added to cart! (Cart persistence coming in Lab 04)</span>
              </div>
            )}
          </div>

          {/* Product Metadata Info */}
          <div className="product-meta-specs">
            <div className="meta-spec-item">
              <span className="meta-spec-key">Product ID:</span>
              <code className="meta-spec-code">{id}</code>
            </div>
            {createdAt && (
              <div className="meta-spec-item">
                <span className="meta-spec-key">Listed On:</span>
                <span className="meta-spec-val">
                  {new Date(createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

export default ProductDetails;
