import type { MetadataRoute } from 'next';
import { getConfiguration } from '@/features/storefront/server-catalog';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const { categories } = await getConfiguration();
  return [
    { url: base, priority: 1 },
    { url: `${base}/products`, priority: 0.9 },
    ...categories.map((category) => ({
      url: `${base}/c/${category.slug}`,
      priority: 0.8,
    })),
  ];
}
