import 'server-only';
import { cache } from 'react';

export const contentSlugs = Object.freeze(['about', 'contact', 'shipping', 'returns', 'privacy', 'terms']);
export class ContentPageError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function read(path) {
  const origin = (process.env.STOREFRONT_API_URL || 'http://localhost:4000/api/storefront/v1').replace(/\/$/, '');
  const tenant = encodeURIComponent(process.env.STOREFRONT_TENANT_CODE || 'HORNBOOK_RETAIL');
  const store = encodeURIComponent(process.env.STOREFRONT_STORE_CODE || 'MAIN');
  let response;
  try { response = await fetch(`${origin}/${tenant}/stores/${store}/pages${path}`, {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' },
  }); } catch { throw new ContentPageError(503, 'Store information is temporarily unavailable. Please try again later.'); }
  if (!response.ok) throw new ContentPageError(response.status === 404 ? 404 : 503,
    response.status === 404 ? 'This page is not published for this store.' : 'Store information is temporarily unavailable.');
  const payload = await response.json();
  if (!payload.data) throw new ContentPageError(503, 'Store information is temporarily unavailable.');
  return payload.data;
}
export const getStorePages = cache(async () => {
  try {
    const data = await read('');
    if (!Array.isArray(data.items)) throw new Error('Invalid page index');
    const items = data.items.filter((item) => contentSlugs.includes(item.slug) && typeof item.title === 'string')
      .slice(0, 6).map((item) => ({ slug: item.slug, title: item.title.slice(0, 120), path: `/pages/${item.slug}`, publishedAt: item.publishedAt }));
    return { items, unavailable: false };
  } catch { return { items: [], unavailable: true }; }
});
export const getStorePage = cache(async (slug) => {
  if (!contentSlugs.includes(slug)) throw new ContentPageError(404, 'This page is unavailable.');
  const data = await read(`/${encodeURIComponent(slug)}`);
  if (typeof data.title !== 'string' || typeof data.body !== 'string' || !data.body.trim()) throw new ContentPageError(503, 'This page could not be loaded.');
  return { slug, title: data.title, summary: typeof data.summary === 'string' ? data.summary : '', body: data.body, publishedAt: data.publishedAt };
});
