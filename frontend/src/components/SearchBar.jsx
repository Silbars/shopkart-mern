import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown, Filter } from 'lucide-react';

/**
 * Task 7 & Bonus: SearchBar Component
 * Provides search text input, category selector dropdown, and price sort options.
 */
const SearchBar = ({
  searchTerm,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  onClearFilters
}) => {
  const categories = ['All', 'Electronics', 'Fashion', 'Books', 'Home'];

  const hasActiveFilters = Boolean(
    searchTerm.trim() !== '' ||
    (category && category !== 'All') ||
    (sort && sort !== '')
  );

  return (
    <div className="search-filter-panel" id="search-filter-panel">
      {/* Search Input Box */}
      <div className="search-input-wrapper">
        <Search className="search-input-icon" size={18} />
        <input
          type="text"
          id="search-products-input"
          className="search-input-field"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search products"
        />
        {searchTerm && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search text"
            id="clear-search-btn"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter and Sort Controls Row */}
      <div className="filter-controls-group">
        {/* Category Dropdown */}
        <div className="select-wrapper">
          <Filter size={16} className="select-icon" />
          <select
            id="category-filter-select"
            className="filter-select"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Fashion">Fashion</option>
            <option value="Books">Books</option>
            <option value="Home">Home</option>
          </select>
        </div>

        {/* Bonus Challenge: Price Sort Dropdown */}
        <div className="select-wrapper">
          <ArrowUpDown size={16} className="select-icon" />
          <select
            id="sort-filter-select"
            className="filter-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort products by price"
          >
            <option value="">Featured / Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn-clear-filters"
            id="btn-clear-all-filters"
            title="Reset all filters"
          >
            <X size={15} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
