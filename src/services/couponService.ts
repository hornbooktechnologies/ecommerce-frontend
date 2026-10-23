import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, requireRecord } from '@/lib/mock-utils';
import { mockCoupons } from '@/mocks/commerce';
import type { Coupon } from '@/types/index';
export const couponService = {
  async validate(
    tenantId: string,
    code: string,
    subtotal: number,
  ): Promise<{ coupon: Coupon; discount: number }> {
    if (!apiConfig.useMock)
      return apiRequest('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ tenantId, code, subtotal }),
      });
    await mockDelay();
    const coupon = requireRecord(
      mockCoupons.find(
        (c) =>
          c.tenantId === tenantId &&
          c.code === code.toUpperCase() &&
          c.isActive,
      ),
      'Coupon',
    );
    if (subtotal < coupon.minOrder)
      throw new Error(`Minimum order is ₹${coupon.minOrder}`);
    const raw =
      coupon.type === 'PERCENT'
        ? (subtotal * coupon.value) / 100
        : coupon.value;
    return { coupon, discount: Math.min(raw, coupon.maxDiscount || raw) };
  },
};
