'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import { useState } from 'react';
import ProductCard from './product-card';
import { useCatalogQuery } from '../catalog-provider';
import { queryString, type Filters } from '../data/live-catalog';

type Props = { filters: Filters; currentPage?: number; onPageChange?: (page: number) => void };
export default function CatalogResults({ filters, currentPage, onPageChange }: Props) {
  return <Results key={queryString(filters)} filters={filters} currentPage={currentPage} onPageChange={onPageChange} />;
}
function Results({ filters, currentPage, onPageChange }: Props) {
 const {t: _uiText}=useUiLocalization();

  const [localPage, setLocalPage] = useState(1);
  const page = currentPage ?? localPage;
  const setPage = onPageChange || setLocalPage;
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
          {_uiText("Try again")} </button>
      </div>
    );
  if (!data?.items.length)
    return (
      <div className="empty-state">
        <h3>No products match these filters</h3>
        <p>Try another colour, size, brand or price, or clear your filters.</p>
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
        {data.total} {data.total === 1 ? 'product' : _uiText("products")} · Page {data.page} {_uiText("of")} {data.totalPages}
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
          {_uiText("Previous")} </button>
        <span>
          {_uiText("Page")} {page} {_uiText("of")} {data.totalPages}
        </span>
        <button
          className="outline-button"
          disabled={page >= data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          {_uiText("Next")} </button>
      </nav>
    </>
  );
}
