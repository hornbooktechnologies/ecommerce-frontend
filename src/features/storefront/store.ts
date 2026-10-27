'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from './data/live-catalog';
import { toast } from 'sonner';

type CartProduct = Product & { variantName: string; uom: string; maximumOrderQuantity: number | null; soldByWeight: boolean };
type Line = { offerId: string; quantity: number; product: CartProduct | null; issue: string | null; lineTotal: number | null };
type LegacyLine = { offerId: string; quantity: number };
type Bag = { cartKey: string; revision: number; mode: 'guest' | 'customer'; items: Line[]; subtotal: number; hasIssues: boolean; merged: boolean };
type WishList = { listKey: string; revision: number; mode: 'guest' | 'customer'; items: { productId: string; product: Product | null }[]; merged: boolean };
type Store = {
  cart: Record<string, number>; snapshots: Record<string, Product>; bag: Bag | null;
  wishlist: string[]; wishSnapshots: Record<string, Product>; legacyItems: LegacyLine[];
  wishList: WishList | null; wishBusy: boolean; wishReady: boolean; wishError: string; legacyWishIds: string[];
  syncWishlist: () => Promise<void>;
  setWish: (productId: string, saved: boolean) => Promise<void>;
  busy: boolean; ready: boolean; error: string;
  sync: () => Promise<void>;
  add: (product: Product, amount?: number) => Promise<void>;
  quantity: (id: string, delta: number) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  toggleWish: (product: Product) => void;
  clear: () => Promise<void>;
  resetAccount: () => void;
};
let inFlight: Promise<void> | null = null;
let generation = 0;
let wishInFlight: Promise<void> | null = null;
let channel: BroadcastChannel | null = null;
async function request(path: string, method: string, body: unknown): Promise<Bag> {
  const response = await fetch(`/api/customer/${path}`, { method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Your bag could not be updated.'), { status: response.status });
  return result.data;
}
function accept(bag: Bag) {
  useStore.setState({ bag, ready: true, legacyItems: [], error: '',
    cart: Object.fromEntries(bag.items.map((line) => [line.offerId, line.quantity])),
    snapshots: Object.fromEntries(bag.items.filter((line) => line.product).map((line) => [line.offerId, line.product!])) });
}
async function run(operation: () => Promise<Bag>, broadcast = false) {
  if (inFlight) throw new Error('Please wait for your bag to finish updating.');
  const version = generation;
  useStore.setState({ busy: true, error: '' });
  const task = (async () => {
    try {
      const bag = await operation();
      if (version !== generation) return;
      accept(bag);
      if (broadcast) channel?.postMessage('refresh');
    } catch (cause) {
      const error = cause as Error & { status?: number };
      if (version === generation) {
        if (error.status === 401 || error.status === 410) useStore.setState({ bag: null, cart: {}, snapshots: {}, ready: false });
        if (error.status === 409) {
          try { const bag = await request('cart/sync', 'POST', {}); if (version === generation) accept(bag); } catch { /* Keep original error. */ }
        }
        useStore.setState({ error: error.message || 'Unable to connect. Please retry.' });
      }
      throw error;
    } finally { useStore.setState({ busy: false }); }
  })();
  inFlight = task;
  try { await task; } finally { inFlight = null; }
}
export const useStore = create<Store>()(persist((set, get) => ({
  cart: {}, snapshots: {}, bag: null, wishlist: [], wishSnapshots: {}, legacyItems: [], busy: false, ready: false, error: '',
  wishList: null, wishBusy: false, wishReady: false, wishError: '', legacyWishIds: [],
  syncWishlist: async () => {
    if (wishInFlight) return wishInFlight;
    await useStore.persist.rehydrate();
    if (wishInFlight) return wishInFlight;
    return runWish(() => get().legacyWishIds.length > 100
      ? Promise.reject(new Error('Your existing wishlist has more than 100 products. It has been preserved on this browser; contact the store for help migrating it.'))
      : wishRequest('wishlist/sync', { legacyProductIds: get().legacyWishIds }));
  },
  setWish: async (productId, saved) => {
    const list = get().wishList;
    if (!list) throw new Error('Refresh your wishlist before updating it.');
    await runWish(() => wishRequest('wishlist', { productId, saved, listKey: list.listKey, revision: list.revision }), true);
  },
  sync: async () => {
    // A login in another tab can replace the cookie while an old guest request
    // is in flight. Wait for it, then refresh using the current session instead
    // of treating that stale response as this refresh's result.
    if (inFlight) { try { await inFlight; } catch { /* A fresh request can recover. */ } }
    await useStore.persist.rehydrate();
    // Coalesce refreshes that were waiting for the same previous operation.
    if (inFlight) return inFlight;
    return run(() => request('cart/sync', 'POST', { legacyItems: get().legacyItems }));
  },
  add: async (product, amount = product.minimumOrderQuantity) => {
    await get().sync();
    return get().setQuantity(product.offerId, Number(((get().cart[product.offerId] || 0) + amount).toFixed(6)));
  },
  quantity: async (id, delta) => get().setQuantity(id, Math.max(0, Number(((get().cart[id] || 0) + delta).toFixed(6)))),
  setQuantity: async (offerId, quantity) => {
    const bag = get().bag;
    if (!bag) throw new Error('Refresh your bag before updating it.');
    await run(() => request('cart', 'PUT', { offerId, quantity, cartKey: bag.cartKey, revision: bag.revision }), true);
  },
  clear: async () => {
    const bag = get().bag;
    if (!bag) return;
    await run(() => request('cart', 'DELETE', { cartKey: bag.cartKey, revision: bag.revision }), true);
  },
  resetAccount: () => { generation++; set({ bag: null, cart: {}, snapshots: {}, ready: false, error: '', wishlist: [], wishSnapshots: {}, wishList: null, wishReady: false, wishError: '' }); },
  toggleWish: (product) => {
    const version = generation;
    if (get().wishBusy) return;
    void (async () => {
      try {
        if (!get().wishReady) await get().syncWishlist();
        if (version !== generation) return;
        const saved = !get().wishlist.includes(product.id);
        await get().setWish(product.id, saved);
        if (version === generation) toast.success(saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
      } catch (error) { if (version === generation) toast.error((error as Error).message || 'Could not update your wishlist.'); }
    })();
  },
}), {
  name: 'hornbook-retail-main-cart-v2', skipHydration: true,
  // Never persist account cart contents in shared-browser local storage.
  partialize: (state) => ({ legacyWishIds: state.legacyWishIds, legacyItems: state.legacyItems }),
  merge: (persisted, current) => {
    const old = (persisted || {}) as Partial<Store>;
    const wishIds = Array.isArray(old.legacyWishIds) ? old.legacyWishIds : Array.isArray(old.wishlist) ? old.wishlist : [];
    const legacy = old.legacyItems || Object.entries(old.cart || {}).map(([offerId, quantity]) => ({ offerId, quantity }));
    return { ...current, legacyWishIds: [...new Set(wishIds.filter((id) => typeof id === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)).map((id) => id.toLowerCase()))],
      legacyItems: legacy.filter((line) => /^[0-9a-f-]{36}$/i.test(line.offerId) && Number.isFinite(line.quantity) && line.quantity > 0 && line.quantity <= 1000000).slice(0, 50) };
  },
}));

async function wishRequest(path: string, body: unknown): Promise<WishList> {
  const response = await fetch(`/api/customer/${path}`, { method: path.endsWith('/sync') ? 'POST' : 'PUT', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Your wishlist could not be updated.'), { status: response.status });
  return result.data;
}
function acceptWish(list: WishList) {
  useStore.setState({ wishList: list, wishReady: true, wishError: '', legacyWishIds: [], wishlist: list.items.map((item) => item.productId),
    wishSnapshots: Object.fromEntries(list.items.filter((item) => item.product).map((item) => [item.productId, item.product!])) });
}
async function runWish(operation: () => Promise<WishList>, broadcast = false) {
  if (wishInFlight) throw new Error('Please wait for your wishlist to finish updating.');
  const version = generation;
  useStore.setState({ wishBusy: true, wishError: '' });
  const task = (async () => {
    try {
      const list = await operation();
      if (version !== generation) return;
      acceptWish(list); if (broadcast) channel?.postMessage('wishlist');
    } catch (cause) {
      const error = cause as Error & { status?: number };
      if (version === generation) {
        if (error.status === 401 || error.status === 410) useStore.setState({ wishList: null, wishReady: false, wishlist: [], wishSnapshots: {} });
        if (error.status === 409) { try { const list = await wishRequest('wishlist/sync', {}); if (version === generation) acceptWish(list); } catch { /* Preserve the mutation error. */ } }
        useStore.setState({ wishError: error.message || 'Could not connect. Please retry.' });
      }
      throw error;
    } finally { if (version === generation) useStore.setState({ wishBusy: false }); }
  })();
  wishInFlight = task;
  try { await task; } finally { wishInFlight = null; if (version !== generation) useStore.setState({ wishBusy: false }); }
}

export function listenForBagChanges() {
  if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('hornbook-bag');
  const refresh = () => { void useStore.getState().sync().catch(() => {}); void useStore.getState().syncWishlist().catch(() => {}); };
  const account = async () => {
    useStore.getState().resetAccount();
    try { await inFlight; } catch { /* Previous request belongs to the old session. */ }
    try { await wishInFlight; } catch { /* Never accept a previous account's list. */ }
    refresh(); channel?.postMessage('account');
  };
  const receive = async (event: MessageEvent) => {
    if (event.data === 'wishlist') { try { await wishInFlight; } catch { /* Retry with current server state. */ } void useStore.getState().syncWishlist().catch(() => {}); return; }
    if (event.data === 'account') useStore.getState().resetAccount();
    try { await inFlight; } catch { /* Refresh after an unsuccessful request too. */ }
    try { await wishInFlight; } catch { /* Refresh the current wishlist identity. */ }
    refresh();
  };
  channel?.addEventListener('message', receive);
  window.addEventListener('focus', refresh);
  window.addEventListener('customer-account-changed', account);
  refresh();
  return () => { window.removeEventListener('focus', refresh); window.removeEventListener('customer-account-changed', account); channel?.close(); channel = null; };
}
