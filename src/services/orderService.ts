import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, paginate, requireRecord } from '@/lib/mock-utils';
import { mockOrders } from '@/mocks/commerce';
import type { ListQuery, Order, PaginatedResponse } from '@/types/index';
export const orderService = {
  async list(
    tenantId: string,
    query: ListQuery = {},
  ): Promise<PaginatedResponse<Order>> {
    if (!apiConfig.useMock)
      return apiRequest('/orders', {
        query: { tenantId, page: query.page, pageSize: query.pageSize },
      });
    await mockDelay();
    return paginate(
      mockOrders.filter((o) => o.tenantId === tenantId),
      query,
    );
  },
  async get(tenantId: string, id: string): Promise<Order> {
    if (!apiConfig.useMock)
      return apiRequest(`/orders/${id}`, { query: { tenantId } });
    await mockDelay();
    return requireRecord(
      mockOrders.find((o) => o.tenantId === tenantId && o._id === id),
      'Order',
    );
  },
  async place(
    input: Omit<
      Order,
      '_id' | 'createdAt' | 'updatedAt' | 'orderNumber' | 'timeline'
    >,
  ): Promise<Order> {
    if (!apiConfig.useMock)
      return apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    await mockDelay(350);
    const at = new Date().toISOString();
    return {
      ...input,
      _id: `order_${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      createdAt: at,
      updatedAt: at,
      timeline: [{ status: 'PLACED', at, note: 'Order placed successfully' }],
    };
  },
};
