import {
  categories as legacyCategories,
  products as legacyProducts,
  productDetails,
  slugify,
} from '@/features/storefront/data/catalog';
import type { Category, Product } from '@/types/index';
const now = '2026-10-09T10:00:00.000Z',
  tenantId = 'tenant_aura';
export const mockCategories: Category[] = legacyCategories.map(
  (item, index) => ({
    _id: `category_${index + 1}`,
    tenantId,
    createdAt: now,
    updatedAt: now,
    name: item.name,
    slug: slugify(item.name),
    description: item.subtitle,
    image: `/images/${item.image}-card.webp`,
    parentId: null,
    position: index + 1,
    isActive: true,
    attributes: ['brand', 'rating', 'price'],
  }),
);
export const mockProducts: Product[] = legacyProducts.map((item) => {
  const category = mockCategories.find(
    (entry) => entry.name === item.category,
  )!;
  const details = productDetails(item);
  return {
    _id: `product_${item.id}`,
    tenantId,
    createdAt: now,
    updatedAt: now,
    name: item.name,
    slug: slugify(item.name),
    sku: `AURA-${String(item.id).padStart(5, '0')}`,
    brand: item.brand,
    categoryId: category._id,
    categoryName: item.category,
    description: details.intro,
    highlights: details.features,
    images: [
      {
        id: `image_${item.id}`,
        url: `/images/${item.image}-card.webp`,
        alt: item.name,
        type: 'image',
      },
    ],
    variants: [
      {
        _id: `variant_${item.id}`,
        sku: `AURA-${item.id}-DEFAULT`,
        title: 'Default',
        price: item.price,
        compareAtPrice: item.mrp,
        stock: 10 + (item.id % 9),
        options: {},
      },
    ],
    rating: Number(item.rating),
    reviewCount: item.reviews,
    tags: [item.tag],
    specifications: details.specs,
    isActive: true,
    isFeatured: item.id <= 10,
    seo: {
      title: `${item.name} | AURA Mall`,
      description: details.intro,
      keywords: [item.category, item.brand, item.name],
    },
  };
});
