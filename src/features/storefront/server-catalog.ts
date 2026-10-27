import 'server-only';
import { cache } from 'react';
import {
  queryString,
  type Configuration,
  type Filters,
  type ProductDetail,
  type ProductList,
} from './data/live-catalog';

export class CatalogError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function fetchCatalog<T>(
  path: string,
  filters: Filters = {},
): Promise<T> {
  const origin = (
    process.env.STOREFRONT_API_URL || 'http://localhost:4000/api/storefront/v1'
  ).replace(/\/$/, '');
  const tenant = encodeURIComponent(
    process.env.STOREFRONT_TENANT_CODE || 'HORNBOOK_RETAIL',
  );
  const store = encodeURIComponent(process.env.STOREFRONT_STORE_CODE || 'MAIN');
  let response: Response;
  try {
    response = await fetch(
      `${origin}/${tenant}/stores/${store}/${path}?${queryString(filters)}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json' },
      },
    );
  } catch {
    throw new CatalogError(
      503,
      'The store is temporarily unavailable. Please try again.',
    );
  }
  if (!response.ok)
    throw new CatalogError(
      response.status === 404 ? 404 : response.status === 422 ? 422 : 503,
      response.status === 404
        ? 'This store or product is unavailable.'
        : response.status === 422
          ? 'Please check your search filters.'
          : 'The store is temporarily unavailable. Please try again.',
    );
  return (await response.json()).data as T;
}
export const getConfiguration = cache(() =>
  fetchCatalog<Configuration>('config'),
);
export const getProduct = cache((slug: string) =>
  fetchCatalog<ProductDetail>(`products/${encodeURIComponent(slug)}`),
);
export const getProducts = (filters: Filters = {}) =>
  fetchCatalog<ProductList>('products', filters);
