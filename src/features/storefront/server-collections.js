import 'server-only';
import { cache } from 'react';
import { fetchCatalog } from './server-catalog';
export const getCollection = cache(
  (slug, search = '', sort = 'curated', page = 1) =>
    fetchCatalog(`collections/${encodeURIComponent(slug)}`, {
      search,
      sort,
      page,
      pageSize: 10,
    }),
);
export const getCollections = cache((page = 1, pageSize = 10) =>
  fetchCatalog('collections', { page, pageSize }),
);
export async function getCollectionSitemap() {
  const result = await getCollections(1, 100);
  const next =
    result.totalPages > 1 ? await getCollections(2, 100) : { items: [] };
  return [...result.items, ...next.items];
}
