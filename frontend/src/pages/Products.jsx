import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageOpen, AlertCircle, RefreshCw, Sparkles, FilterX } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { getProducts, getWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Task 6, 7 & Bonus: Products Listing Page
 * Fetches and displays products dynamically with search, category filter, and sorting.
 * Implements Loading, Error, and Empty states.
 */
const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize search & filters from URL search parameters or defaults
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState(searchParams.get('sort') || '');

  // Data states
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lab 04: IDs of products the logged-in customer has saved (from GET /wishlist)
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [savedStatusError, setSavedStatusError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds(new Set());
      setSavedStatusError(false);
      return undefined;
    }

    let isMounted = true;

    getWishlist()
      .then((data) => {
        if (!isMounted) return;
        setSavedIds(new Set((data.wishlist || []).map((item) => item._id)));
        setSavedStatusError(false);
      })
      .catch((err) => {
        console.error('Failed to load wishlist status:', err);
        if (isMounted) setSavedStatusError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Keep savedIds in step with toggles, so cards stay correct when filters re-render the grid
  const handleWishlistChange = useCallback((productId, saved) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  }, []);

  // Sync state to URL search params
  const updateUrlParams = (newSearch, newCategory, newSort) => {
    const params = {};
    if (newSearch && newSearch.trim()) params.search = newSearch.trim();
    if (newCategory && newCategory !== 'All') params.category = newCategory;
    if (newSort) params.sort = newSort;
    setSearchParams(params, { replace: true });
  };

  // Fetch products from backend GET /products
  const fetchProductsList = useCallback(async (searchQuery, categoryFilter, sortOption) => {
    try {
      setLoading(true);
      setError(null);

      const data = await getProducts({
        search: searchQuery,
        category: categoryFilter,
        sort: sortOption
      });

      if (data && data.success) {
        setProducts(data.products || []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(err.message || 'Something went wrong while loading products.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search & filter triggering
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      updateUrlParams(searchTerm, category, sort);
      fetchProductsList(searchTerm, category, sort);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, category, sort, fetchProductsList]);

  // Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
  };

  const handleSortChange = (value) => {
    setSort(value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setSort('');
    setSearchParams({}, { replace: true });
  };

  const handleRetry = () => {
    fetchProductsList(searchTerm, category, sort);
  };

  return (
    <div className="products-page-container">
      {/* Page Header */}
      <section className="products-hero-section">
        <div className="products-hero-badge">
          <Sparkles size={14} />
          <span>Explore Catalog</span>
        </div>
        <h1 className="products-hero-title" id="products-heading">
          Discover ShopKart Products
        </h1>
        <p className="products-hero-subtitle">
          Browse our curated selection of premium electronics, fashion, books, and home essentials.
        </p>

        {/* Search, Category Filter, and Sorting Controls */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          category={category}
          onCategoryChange={handleCategoryChange}
          sort={sort}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
        />
      </section>

      {/* Main Content Area: Products Grid or States */}
      <section className="products-content-section" aria-live="polite">
        {/* Results Metadata Bar */}
        {!loading && !error && (
          <div className="products-meta-bar">
            <span className="products-count-badge" id="products-count">
              Showing {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
            {category !== 'All' && (
              <span className="active-category-pill">
                Category: <strong>{category}</strong>
              </span>
            )}
            {searchTerm.trim() && (
              <span className="active-search-pill">
                Search: <strong>"{searchTerm.trim()}"</strong>
              </span>
            )}
          </div>
        )}

        {/* Lab 04: Catalog still works if saved status could not be loaded */}
        {savedStatusError && !loading && !error && (
          <div className="alert-banner alert-info" role="status" id="wishlist-status-notice">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>We couldn't check which products you've saved. Wishlist buttons still work.</span>
          </div>
        )}

        {/* 1. Loading State */}
        {loading && (
          <div className="state-card loading-state" id="loading-state">
            <div className="spinner" role="status" aria-label="Loading products"></div>
            <h2 className="state-title">Loading products...</h2>
            <p className="state-description">Fetching the latest catalog items from MongoDB.</p>
          </div>
        )}

        {/* 2. Error State */}
        {!loading && error && (
          <div className="state-card error-state" id="error-state" role="alert">
            <div className="state-icon-box error-icon-box">
              <AlertCircle size={36} />
            </div>
            <h2 className="state-title">Something went wrong while loading products.</h2>
            <p className="state-description">{error}</p>
            <button
              type="button"
              className="btn-state-action"
              onClick={handleRetry}
              id="retry-fetch-btn"
            >
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && products.length === 0 && (
          <div className="state-card empty-state" id="empty-state">
            <div className="state-icon-box empty-icon-box">
              <PackageOpen size={42} />
            </div>
            <h2 className="state-title">No products found.</h2>
            <p className="state-description">
              We couldn't find any products matching your current filters. Try changing your search keywords or category.
            </p>
            <button
              type="button"
              className="btn-state-action"
              onClick={handleClearFilters}
              id="clear-filters-empty-btn"
            >
              <FilterX size={16} />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}

        {/* 4. Products Grid (Rendered dynamically using .map()) */}
        {!loading && !error && products.length > 0 && (
          <div className="products-grid" id="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isSaved={savedIds.has(product._id)}
                onWishlistChange={handleWishlistChange}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Products;
