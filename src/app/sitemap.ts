import type { MetadataRoute } from 'next';
import { getConfiguration } from '@/features/storefront/server-catalog';
import { getStorePages } from '@/features/storefront/server-content';
import {getCollectionSitemap} from '@/features/storefront/server-collections';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const [{ categories }, pages, collections] = await Promise.all([getConfiguration(), getStorePages(),getCollectionSitemap()]);
  if (pages.unavailable) throw new Error('Store information index is temporarily unavailable.');
  return [
    { url: base, priority: 1 },
    { url: `${base}/products`, priority: 0.9 },
    { url: `${base}/collections`,priority:0.7 },
    ...collections.map((collection) => ({url:`${base}/collections/${collection.slug}`,priority:0.7})),
    ...pages.items.map((page) => ({ url: `${base}/pages/${page.slug}`, priority: 0.5 })),
    ...categories.map((category) => ({
      url: `${base}/c/${category.slug}`,
      priority: 0.8,
    })),
  ];
}
