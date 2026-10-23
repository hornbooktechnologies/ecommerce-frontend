import { apiConfig, apiRequest } from '@/lib/api';
import {
  mockDelay,
  paginate,
  requireRecord,
  sortRecords,
} from '@/lib/mock-utils';
import { mockProducts } from '@/mocks/catalog';
import type { PaginatedResponse, Product, ProductQuery } from '@/types/index';
export const productService = {
  async list(
    tenantId: string,
    query: ProductQuery = {},
  ): Promise<PaginatedResponse<Product>> {
    if (!apiConfig.useMock)
      return apiRequest('/products', {
        query: {
          tenantId,
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          sortBy: query.sortBy,
          sortDirection: query.sortDirection,
          filters: query.filters ? JSON.stringify(query.filters) : undefined,
        },
      });
    await mockDelay();
    const term = query.search?.toLowerCase();
    let items = mockProducts.filter(
      (p) =>
        p.tenantId === tenantId &&
        p.isActive &&
        (!term ||
          `${p.name} ${p.brand} ${p.categoryName}`
            .toLowerCase()
            .includes(term)),
    );
    const f = query.filters;
    if (f)
      items = items.filter((p) => {
        const price = p.variants[0].price,
          compare = p.variants[0].compareAtPrice || price,
          discount = ((compare - price) / compare) * 100;
        return (
          (!f.categoryId || p.categoryId === f.categoryId) &&
          (!f.brands?.length || f.brands.includes(p.brand)) &&
          (!f.minPrice || price >= f.minPrice) &&
          (!f.maxPrice || price <= f.maxPrice) &&
          (!f.minRating || p.rating >= f.minRating) &&
          (!f.minDiscount || discount >= f.minDiscount) &&
          (!f.inStock || p.variants.some((v) => v.stock > 0))
        );
      });
    return paginate(
      sortRecords(items, query.sortBy, query.sortDirection),
      query,
    );
  },
  async getBySlug(tenantId: string, slug: string): Promise<Product> {
    if (!apiConfig.useMock)
      return apiRequest(`/products/${slug}`, { query: { tenantId } });
    await mockDelay();
    return requireRecord(
      mockProducts.find((p) => p.tenantId === tenantId && p.slug === slug),
      'Product',
    );
  },
  async featured(tenantId: string, limit = 8): Promise<Product[]> {
    const result = await this.list(tenantId, { pageSize: limit });
    return result.data.filter((p) => p.isFeatured).slice(0, limit);
  },
};
