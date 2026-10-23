'use client';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/features/storefront/components/product-card';
import type { Product } from '@/features/storefront/data/catalog';

export default function CategoryCatalog({ products }: { products: Product[] }) {
  const [sort, setSort] = useState('featured');
  const [maxPrice, setMaxPrice] = useState(15000);
  const [onlyTopRated, setOnlyTopRated] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.price <= maxPrice && (!onlyTopRated || Number(p.rating) >= 4.8),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price - b.price
            : sort === 'high'
              ? b.price - a.price
              : sort === 'rating'
                ? Number(b.rating) - Number(a.rating)
                : a.id - b.id,
        ),
    [products, maxPrice, onlyTopRated, sort],
  );
  return (
    <div className="category-catalog">
      <button
        className="mobile-filter-button"
        onClick={() => setFiltersOpen(true)}
      >
        <SlidersHorizontal size={16} /> Filters
      </button>
      <aside className={filtersOpen ? 'filters open' : 'filters'}>
        <button
          className="close-filters"
          onClick={() => setFiltersOpen(false)}
          aria-label="Close filters"
        >
          <X size={18} />
        </button>
        <h3>Refine your finds</h3>
        <div className="filter-group">
          <label>
            Maximum price <strong>₹{maxPrice.toLocaleString('en-IN')}</strong>
          </label>
          <input
            type="range"
            min="500"
            max="15000"
            step="500"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </div>
        <div className="filter-group">
          <label className="check-filter">
            <input
              type="checkbox"
              checked={onlyTopRated}
              onChange={(e) => setOnlyTopRated(e.target.checked)}
            />{' '}
            4.8 stars & above
          </label>
        </div>
        <div className="filter-group">
          <span>Shopping promises</span>
          <p>✓ Authentic products</p>
          <p>✓ Easy 7-day returns</p>
          <p>✓ Secure demo checkout</p>
        </div>
      </aside>
      <section className="category-results">
        <div className="results-toolbar">
          <p>
            <strong>{visible.length}</strong> products
          </p>
          <label>
            Sort by{' '}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="rating">Highest rated</option>
            </select>
          </label>
        </div>
        <div className="category-product-grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>No products match these filters</h3>
            <button
              className="outline-button"
              onClick={() => {
                setMaxPrice(15000);
                setOnlyTopRated(false);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
