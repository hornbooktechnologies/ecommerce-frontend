import type { Coupon, Order, Review, User } from '@/types/index';
const now = '2026-10-09T10:00:00.000Z',
  tenantId = 'tenant_aura';
export const mockUsers: User[] = [
  {
    _id: 'user_customer',
    tenantId,
    createdAt: now,
    updatedAt: now,
    name: 'Demo Customer',
    email: 'customer@demo.store',
    role: 'CUSTOMER',
    addresses: [],
    walletBalance: 250,
    points: 840,
  },
];
export const mockCoupons: Coupon[] = [
  {
    _id: 'coupon_welcome',
    tenantId,
    createdAt: now,
    updatedAt: now,
    code: 'WELCOME10',
    description: '10% off your first order',
    type: 'PERCENT',
    value: 10,
    minOrder: 999,
    maxDiscount: 500,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-01-01T00:00:00.000Z',
    usageLimit: 10000,
    usedCount: 218,
    isActive: true,
  },
];
export const mockReviews: Review[] = [
  {
    _id: 'review_1',
    tenantId,
    createdAt: now,
    updatedAt: now,
    productId: 'product_1',
    customerId: 'user_customer',
    customerName: 'Demo Customer',
    rating: 5,
    title: 'Excellent everyday headphones',
    body: 'Comfortable, clear and easy to recommend.',
    images: [],
    verifiedPurchase: true,
    status: 'APPROVED',
    helpfulCount: 18,
  },
];
export const mockOrders: Order[] = [];
