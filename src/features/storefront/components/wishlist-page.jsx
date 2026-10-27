'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import StoreHeader from './store-header';
import ProductCard from './product-card';
import { useStore } from '../store';
import styles from './wishlist-page.module.css';

export default function WishlistPage() {
  const list = useStore((state) => state.wishList), busy = useStore((state) => state.wishBusy);
  const ready = useStore((state) => state.wishReady), error = useStore((state) => state.wishError);
  const [requestedPage, setPage] = useState(1);
  const items = list?.items || [], pages = Math.max(1, Math.ceil(items.length / 10)), page = Math.min(requestedPage, pages);
  const refresh = () => { void useStore.getState().syncWishlist().catch(() => {}); };
  return <><StoreHeader /><main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Wishlist</span></nav>
    <header className={styles.heading}><div><p className={styles.eyebrow}>KEEP THE GOOD FINDS CLOSE</p><h1>Your wishlist.</h1><p>Save what you love. Come back when it feels right.</p></div><Link className={styles.link} href="/products">Explore products <ArrowRight size={17} aria-hidden="true" /></Link></header>
    {error && <div className={styles.error} role="alert">{error} <button type="button" disabled={busy} onClick={refresh}>Try again</button></div>}
    {!ready ? <section className={styles.state} aria-busy={busy} role="status"><Heart size={28} aria-hidden="true" /><p>{busy || !error ? 'Loading your wishlist…' : 'Your wishlist could not be loaded.'}</p></section> : <>
      <div className={styles.toolbar}><div><strong>{items.length} saved {items.length === 1 ? 'product' : 'products'}</strong><p>{list.mode === 'customer' ? 'Saved to your account. Available on your other devices.' : 'Saved for this browser for 30 days. Sign in to merge with your account.'}</p>{list.mode === 'guest' && <Link href="/account/login">Sign in to sync your wishlist</Link>}</div><button type="button" onClick={refresh} disabled={busy}><RefreshCw size={16} aria-hidden="true" />{busy ? 'Updating…' : 'Refresh'}</button></div>
      {!items.length ? <section className={styles.state}><Heart size={36} aria-hidden="true" /><h2>A little room for your favourites</h2><p>Tap the heart on a product to save it here.</p><Link className={styles.link} href="/products">Find something you love <ArrowRight size={17} aria-hidden="true" /></Link></section>
        : <div className={styles.grid} aria-busy={busy}>{items.slice((page - 1) * 10, page * 10).map((item) => item.product
          ? <ProductCard key={item.productId} product={item.product} />
          : <article className={styles.unavailable} key={item.productId}><Heart size={28} aria-hidden="true" /><h2>Product unavailable</h2><p>This saved product is no longer listed by this store. You can remove it from your wishlist.</p><button type="button" disabled={busy} onClick={async () => { try { await useStore.getState().setWish(item.productId, false); toast.success('Removed from your wishlist.'); } catch (cause) { toast.error(cause.message || 'Please try again.'); } }}><Trash2 size={16} aria-hidden="true" /> Remove unavailable product</button></article>)}</div>}
      {items.length > 0 && <nav className={styles.pagination} aria-label="Wishlist pages"><button type="button" disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Previous</button><span aria-live="polite">Page {page} of {pages}</span><button type="button" disabled={busy || page === pages} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </main></>;
}
