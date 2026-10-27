'use client';
import { useState } from 'react';
import ProductCard from './product-card';
import { useCatalogQuery } from '../catalog-provider';
import { queryString, type Filters } from '../data/live-catalog';

export default function CatalogResults({ filters }: { filters: Filters }) {
  return <Results key={queryString(filters)} filters={filters} />;
}
function Results({ filters }: { filters: Filters }) {
  const [page, setPage] = useState(1);
  const { data, loading, error, retry } = useCatalogQuery({
    ...filters,
    page,
    pageSize: 10,
  });
  if (loading)
    return (
      <div
        className="category-product-grid"
        aria-busy="true"
        aria-label="Loading products"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="catalog-loading-card" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="empty-state" role="alert">
        <p>{error}</p>
        <button className="outline-button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!data?.items.length)
    return (
      <div className="empty-state">
        <h3>No products match these filters</h3>
        <p>Try a different category, brand or price.</p>
        {page > 1 && (
          <button className="outline-button" onClick={() => setPage(1)}>
            Back to first page
          </button>
        )}
      </div>
    );
  return (
    <>
      <p className="search-summary" role="status">
        {data.total} products · Page {data.page} of {data.totalPages}
      </p>
      <div className="category-product-grid">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <nav className="catalog-pagination" aria-label="Product pages">
        <button
          className="outline-button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {data.totalPages}
        </span>
        <button
          className="outline-button"
          disabled={page >= data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </nav>
    </>
  );
}
