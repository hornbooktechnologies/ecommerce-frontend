import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, paginate } from '@/lib/mock-utils';
import { mockReviews } from '@/mocks/commerce';
import type { ListQuery, PaginatedResponse, Review } from '@/types/index';
export const reviewService = {
  async list(
    productId: string,
    query: ListQuery = {},
  ): Promise<PaginatedResponse<Review>> {
    if (!apiConfig.useMock)
      return apiRequest(`/products/${productId}/reviews`, {
        query: { page: query.page, pageSize: query.pageSize },
      });
    await mockDelay();
    return paginate(
      mockReviews.filter(
        (r) => r.productId === productId && r.status === 'APPROVED',
      ),
      query,
    );
  },
  async create(
    input: Omit<
      Review,
      '_id' | 'createdAt' | 'updatedAt' | 'status' | 'helpfulCount'
    >,
  ): Promise<Review> {
    if (!apiConfig.useMock)
      return apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    await mockDelay();
    const at = new Date().toISOString();
    return {
      ...input,
      _id: `review_${Date.now()}`,
      createdAt: at,
      updatedAt: at,
      status: 'PENDING',
      helpfulCount: 0,
    };
  },
};
