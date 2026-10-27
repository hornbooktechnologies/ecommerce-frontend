'use client';
import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useCatalog } from '../catalog-provider';
import CatalogResults from './catalog-results';

export default function CategoryCatalog({ category }: { category: string }) {
  const { brands } = useCatalog();
  const [sort, setSort] = useState('featured'),
    [brand, setBrand] = useState(''),
    [maxPrice, setMaxPrice] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false);
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
          <label htmlFor="catalog-brand">Brand</label>
          <select
            id="catalog-brand"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="catalog-price">Maximum price (₹)</label>
          <input
            id="catalog-price"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="No limit"
          />
        </div>
        <div className="filter-group">
          <label className="check-filter">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(event) => setOnlyInStock(event.target.checked)}
            />{' '}
            In stock only
          </label>
        </div>
        <button
          className="outline-button"
          onClick={() => {
            setBrand('');
            setMaxPrice('');
            setOnlyInStock(false);
          }}
        >
          Reset filters
        </button>
      </aside>
      <section className="category-results">
        <div className="results-toolbar">
          <h2>Shop the collection</h2>
          <label>
            Sort by{' '}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Highest rated</option>
            </select>
          </label>
        </div>
        <CatalogResults
          filters={{
            category,
            brand,
            maxPrice:
              maxPrice === '' ? undefined : Math.max(0, Number(maxPrice)),
            inStock: onlyInStock,
            sort,
          }}
        />
      </section>
    </div>
  );
}
