import type { MetadataRoute } from 'next';
import { getConfiguration } from '@/features/storefront/server-catalog';
import { getStorePages } from '@/features/storefront/server-content';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const [{ categories }, pages] = await Promise.all([getConfiguration(), getStorePages()]);
  if (pages.unavailable) throw new Error('Store information index is temporarily unavailable.');
  return [
    { url: base, priority: 1 },
    { url: `${base}/products`, priority: 0.9 },
    ...pages.items.map((page) => ({ url: `${base}/pages/${page.slug}`, priority: 0.5 })),
    ...categories.map((category) => ({
      url: `${base}/c/${category.slug}`,
      priority: 0.8,
    })),
  ];
}
