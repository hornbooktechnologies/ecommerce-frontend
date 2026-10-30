'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Search, ShoppingBag, UserRound } from 'lucide-react';
import DeliveryChecker from './delivery-checker';
import { useStore } from '@/features/storefront/store';
import { useCustomerSummary } from '../use-customer-summary';
import CustomerInbox from './customer-inbox';

export default function StoreHeader() {
  const customer = useCustomerSummary();
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
          HORNBOOK<span className="logo-mall">RETAIL</span>
        </span>
      </Link>
      <DeliveryChecker />
      <Link className="detail-search" href="/#discover">
        <span>Search Hornbook Retail</span>
        <Search size={19} />
      </Link>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/#categories">Categories</Link>
        <Link href="/#discover">Deals</Link>
      </nav>
      <div className="detail-actions">
        <CustomerInbox customerId={customer.id} />
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
              <strong>{customer.email ? `Hello, ${customer.firstName}` : 'Your Hornbook account'}</strong>
              <p>Manage your profile, password and delivery addresses.</p>
              <Link className="popover-primary" href="/account">
                Go to account
              </Link>
              <hr />
              <Link href="/account/orders" onClick={() => setAccountOpen(false)}>My orders</Link>
              {!customer.email && <><Link href="/account/login">Sign in</Link><Link href="/account/register">Create account</Link></>}
            </div>
          ) : null}
        </div>
        <Link href="/wishlist" aria-label={`Wishlist, ${wishlist.length} saved products`}>
          <Heart size={19} />
          <b>{wishlist.length}</b>
        </Link>
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
