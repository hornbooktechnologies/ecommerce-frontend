import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, requireRecord } from '@/lib/mock-utils';
import { mockCategories } from '@/mocks/catalog';
import type { Category } from '@/types/index';
export const categoryService = {
  async list(tenantId: string): Promise<Category[]> {
    if (!apiConfig.useMock)
      return apiRequest('/categories', { query: { tenantId } });
    await mockDelay();
    return mockCategories
      .filter((c) => c.tenantId === tenantId && c.isActive)
      .toSorted((a, b) => a.position - b.position);
  },
  async getBySlug(tenantId: string, slug: string): Promise<Category> {
    if (!apiConfig.useMock)
      return apiRequest(`/categories/${slug}`, { query: { tenantId } });
    await mockDelay();
    return requireRecord(
      mockCategories.find((c) => c.tenantId === tenantId && c.slug === slug),
      'Category',
    );
  },
};
