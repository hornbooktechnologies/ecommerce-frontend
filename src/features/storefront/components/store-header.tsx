'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useStore } from '@/features/storefront/store';

export default function StoreHeader() {
  const [accountOpen, setAccountOpen] = useState(false);
  const cart = useStore((state) => state.cart),
    wishlist = useStore((state) => state.wishlist);
  const count = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  return (
    <header className="detail-header">
      <Link href="/" className="logo">
        <span className="logo-symbol">a</span>
        <span>
          AURA<span className="logo-mall">MALL</span>
        </span>
      </Link>
      <span className="detail-location">
        <MapPin size={16} /> Deliver to your location
      </span>
      <Link className="detail-search" href="/#discover">
        <span>Search AURA Mall</span>
        <Search size={19} />
      </Link>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/#categories">Categories</Link>
        <Link href="/#discover">Deals</Link>
      </nav>
      <div className="detail-actions">
        <div className="header-menu-wrap">
          <button
            aria-label="Account menu"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((value) => !value)}
          >
            <UserRound size={19} />
          </button>
          {accountOpen ? (
            <div className="header-popover detail-account-popover">
              <strong>Your AURA account</strong>
              <p>Sign in to manage orders, addresses and saved products.</p>
              <Link className="popover-primary" href="/">
                Go to account
              </Link>
              <hr />
              <Link href="/#discover">Your orders</Link>
              <Link href="/#discover">Wishlist</Link>
              <Link href="/#discover">Help centre</Link>
            </div>
          ) : null}
        </div>
        <span aria-label={`${wishlist.length} wishlist items`}>
          <Heart size={19} />
          <b>{wishlist.length}</b>
        </span>
        <Link
          className="detail-cart-link"
          href="/cart"
          aria-label={`${count} cart items`}
        >
          <ShoppingBag size={19} />
          <b>{count}</b>
        </Link>
      </div>
    </header>
  );
}
