import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay } from '@/lib/mock-utils';
import type { Cart, CartLine } from '@/types/index';
const KEY = 'commerce-cart-v1',
  now = () => new Date().toISOString();
function empty(tenantId: string): Cart {
  return {
    _id: 'cart_local',
    tenantId,
    createdAt: now(),
    updatedAt: now(),
    items: [],
    subtotal: 0,
    discount: 0,
    shipping: 0,
    total: 0,
  };
}
function read(tenantId: string) {
  if (typeof window === 'undefined') return empty(tenantId);
  try {
    return (
      (JSON.parse(localStorage.getItem(KEY) || 'null') as Cart | null) ||
      empty(tenantId)
    );
  } catch {
    return empty(tenantId);
  }
}
function calculate(cart: Cart): Cart {
  const subtotal = cart.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),
    shipping = subtotal === 0 || subtotal >= 999 ? 0 : 79;
  return {
    ...cart,
    updatedAt: now(),
    subtotal,
    shipping,
    total: subtotal - cart.discount + shipping,
  };
}
function save(cart: Cart) {
  const next = calculate(cart);
  if (typeof window !== 'undefined')
    localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export const cartService = {
  async get(tenantId: string): Promise<Cart> {
    if (!apiConfig.useMock) return apiRequest('/cart', { query: { tenantId } });
    await mockDelay(60);
    return calculate(read(tenantId));
  },
  async add(tenantId: string, line: CartLine): Promise<Cart> {
    if (!apiConfig.useMock)
      return apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify(line),
      });
    await mockDelay();
    const cart = read(tenantId),
      existing = cart.items.find((i) => i.variantId === line.variantId);
    if (existing) existing.quantity += line.quantity;
    else cart.items.push(line);
    return save(cart);
  },
  async update(
    tenantId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart> {
    if (!apiConfig.useMock)
      return apiRequest(`/cart/items/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
    await mockDelay();
    const cart = read(tenantId);
    cart.items =
      quantity <= 0
        ? cart.items.filter((i) => i.variantId !== variantId)
        : cart.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i,
          );
    return save(cart);
  },
  async clear(tenantId: string): Promise<Cart> {
    if (!apiConfig.useMock) return apiRequest('/cart', { method: 'DELETE' });
    await mockDelay();
    return save(empty(tenantId));
  },
};
