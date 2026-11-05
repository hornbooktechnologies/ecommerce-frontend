'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Search, ShoppingBag, UserRound } from 'lucide-react';
import DeliveryChecker from './delivery-checker';
import { useStore } from '@/features/storefront/store';
import { useCustomerSummary } from '../use-customer-summary';
import CustomerInbox from './customer-inbox';
import {LocalizationControls} from '@/localization/provider';

export default function StoreHeader() {
 const {t: _uiText}=useUiLocalization();

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
    <><header className="detail-header">
      <Link href="/" className="logo">
        <span className="logo-symbol">a</span>
        <span>
          HORNBOOK<span className="logo-mall">RETAIL</span>
        </span>
      </Link>
      <DeliveryChecker />
      <Link className="detail-search" href="/products">
        <span>{_uiText("Search Hornbook Retail")}</span>
        <Search size={19} />
      </Link>
      <nav>
        <Link href="/">{_uiText("Home")}</Link>
        <Link href="/#categories">{_uiText("Categories")}</Link>
        <Link href="/#discover">{_uiText("Deals")}</Link>
      </nav>
      <div className="detail-actions">
        <CustomerInbox customerId={customer.id} />
        <div className="header-menu-wrap">
          <button
            aria-label={_uiText("Account menu")}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((value) => !value)}
          >
            <UserRound size={19} />
          </button>
          {accountOpen ? (
            <div className="header-popover detail-account-popover">
              <strong>{customer.email ? `Hello, ${customer.firstName}` : _uiText("Your Hornbook account")}</strong>
              <p>{_uiText("Manage your profile, password and delivery addresses.")}</p>
              <Link className="popover-primary" href="/account">
                {_uiText("Go to account")} </Link>
              <hr />
              <Link href="/account/orders" onClick={() => setAccountOpen(false)}>{_uiText("My orders")}</Link>
              <Link href="/account/questions" onClick={() => setAccountOpen(false)}>{_uiText("My questions")}</Link>
              {!customer.email && <><Link href="/account/login">{_uiText("Sign in")}</Link><Link href="/account/register">{_uiText("Create account")}</Link></>}
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
    </header><div className="store-locale-bar"><LocalizationControls displayCurrency /></div></>
  );
}
