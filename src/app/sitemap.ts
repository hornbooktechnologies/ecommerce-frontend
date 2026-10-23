import type { MetadataRoute } from 'next';
import { products, categories } from '@/features/storefront/data/catalog';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return [
    { url: base, priority: 1 },
    ...categories.map((c) => ({
      url: `${base}/c/${slug(c.name)}`,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/p/${slug(p.name)}`,
      priority: 0.6,
    })),
  ];
}
