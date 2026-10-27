'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  queryString,
  type Configuration,
  type Filters,
  type ProductList,
} from './data/live-catalog';

export async function catalogRequest<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/storefront/${path}`, {
    signal,
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || 'Unable to load the catalog.');
  return result.data;
}
const CatalogContext = createContext<{
  configuration: Configuration;
  products: ProductList['items'];
} | null>(null);
export function CatalogProvider({
  configuration,
  products,
  children,
}: {
  configuration: Configuration;
  products: ProductList['items'];
  children: React.ReactNode;
}) {
  return (
    <CatalogContext.Provider value={{ configuration, products }}>
      {children}
    </CatalogContext.Provider>
  );
}
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('CatalogProvider is missing.');
  return {
    ...value,
    categories: value.configuration.categories,
    brands: value.configuration.brands,
  };
}
export function useCatalogQuery(filters: Filters) {
  const key = queryString(filters);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    attempt: number;
    data?: ProductList;
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      catalogRequest<ProductList>(`products?${key}`, controller.signal)
        .then((data) => setResult({ key, attempt, data }))
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({ key, attempt, error: error.message });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, attempt]);
  const current =
    result?.key === key && result.attempt === attempt ? result : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
