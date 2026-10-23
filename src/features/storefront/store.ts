'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type Store = {
  cart: Record<number, number>;
  wishlist: number[];
  add: (id: number) => void;
  quantity: (id: number, delta: number) => void;
  toggleWish: (id: number) => void;
  clear: () => void;
};
export const useStore = create<Store>()(
  persist(
    (set) => ({
      cart: {},
      wishlist: [],
      add: (id) =>
        set((s) => ({ cart: { ...s.cart, [id]: (s.cart[id] || 0) + 1 } })),
      quantity: (id, delta) =>
        set((s) => {
          const cart = { ...s.cart };
          cart[id] = Math.max(0, (cart[id] || 0) + delta);
          if (!cart[id]) delete cart[id];
          return { cart };
        }),
      toggleWish: (id) =>
        set((s) => ({
          wishlist: s.wishlist.includes(id)
            ? s.wishlist.filter((x) => x !== id)
            : [...s.wishlist, id],
        })),
      clear: () => set({ cart: {} }),
    }),
    { name: 'aura-mall-v1', skipHydration: true },
  ),
);
