'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import StoreHeader from '@/features/storefront/components/store-header';
import {
  money,
  photo,
  products,
  slugify,
} from '@/features/storefront/data/catalog';
import { useStore } from '@/features/storefront/store';

export default function CartPage() {
  const cart = useStore((state) => state.cart),
    quantity = useStore((state) => state.quantity),
    toggleWish = useStore((state) => state.toggleWish),
    wishlist = useStore((state) => state.wishlist),
    clear = useStore((state) => state.clear);
  const [coupon, setCoupon] = useState(''),
    [couponApplied, setCouponApplied] = useState(false),
    [checkout, setCheckout] = useState(false),
    [ordered, setOrdered] = useState(false);
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  const items = useMemo(
    () => products.filter((product) => cart[product.id]),
    [cart],
  );
  const itemCount = Object.values(cart).reduce((sum, value) => sum + value, 0),
    subtotal = items.reduce(
      (sum, product) => sum + product.price * cart[product.id],
      0,
    ),
    mrpTotal = items.reduce(
      (sum, product) => sum + product.mrp * cart[product.id],
      0,
    );
  const delivery = subtotal >= 999 || subtotal === 0 ? 0 : 79,
    couponDiscount = couponApplied
      ? Math.min(500, Math.round(subtotal * 0.1))
      : 0,
    total = subtotal + delivery - couponDiscount,
    remaining = Math.max(0, 999 - subtotal);
  const recommendations = products
    .filter((product) => !cart[product.id])
    .slice(0, 4);
  const moveToWishlist = (id: number) => {
    if (!wishlist.includes(id)) toggleWish(id);
    quantity(id, -cart[id]);
  };
  const placeOrder = () => {
    clear();
    setOrdered(true);
    setCheckout(false);
  };
  return (
    <>
      <StoreHeader />
      <main className="cart-page">
        <nav className="cart-breadcrumb">
          <Link href="/">
            <ArrowLeft size={14} /> Continue shopping
          </Link>
          <span>Bag</span>
          <span>Delivery</span>
          <span>Payment</span>
        </nav>
        {ordered ? (
          <section className="cart-success">
            <span>
              <Check size={38} />
            </span>
            <p className="eyebrow">ORDER CONFIRMED</p>
            <h1>Your order is all set.</h1>
            <p>
              This is a storefront preview, so no payment was taken. Your cart
              is ready for a fresh start.
            </p>
            <Link className="cart-primary" href="/">
              Keep exploring <ArrowRight size={17} />
            </Link>
          </section>
        ) : itemCount === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <header className="cart-title">
              <div>
                <p className="eyebrow">YOUR SHOPPING BAG</p>
                <h1>
                  My cart{' '}
                  <span>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                </h1>
              </div>
              <p>
                <ShieldCheck size={17} /> Safe and secure checkout
              </p>
            </header>
            <div className="cart-layout">
              <section className="cart-items" aria-label="Items in your cart">
                <div
                  className={`delivery-progress ${remaining === 0 ? 'complete' : ''}`}
                >
                  <Truck size={20} />
                  <div>
                    <strong>
                      {remaining === 0
                        ? 'You unlocked free delivery'
                        : `${money(remaining)} away from free delivery`}
                    </strong>
                    <span>
                      <i
                        style={{
                          width: `${Math.min(100, (subtotal / 999) * 100)}%`,
                        }}
                      />
                    </span>
                  </div>
                  {remaining === 0 ? <Check size={17} /> : null}
                </div>
                <div className="cart-list-heading">
                  <span>
                    Deliver to <strong>400001</strong>
                  </span>
                  <button>Change address</button>
                </div>
                {items.map((product) => (
                  <article className="cart-product" key={product.id}>
                    <Link
                      className="cart-product-image"
                      href={`/p/${slugify(product.name)}`}
                    >
                      <Image
                        src={photo(product.image, 350)}
                        alt={product.name}
                        width={350}
                        height={350}
                        unoptimized
                      />
                      <span>{product.tag}</span>
                    </Link>
                    <div className="cart-product-info">
                      <Link href={`/p/${slugify(product.name)}`}>
                        <small>{product.brand}</small>
                        <h2>{product.name}</h2>
                      </Link>
                      <p>{product.category} · Natural finish</p>
                      <button className="cart-variant">
                        Standard <ChevronDown size={13} />
                      </button>
                      <div className="cart-unit-price">
                        <strong>{money(product.price)}</strong>
                        <del>{money(product.mrp)}</del>
                        <span>
                          {Math.round((1 - product.price / product.mrp) * 100)}%
                          off
                        </span>
                      </div>
                      <p className="cart-stock">
                        <Check size={12} /> In stock · dispatches within 24
                        hours
                      </p>
                    </div>
                    <div className="cart-product-actions">
                      <strong>{money(product.price * cart[product.id])}</strong>
                      <div className="cart-quantity">
                        <button
                          aria-label={`Decrease ${product.name} quantity`}
                          onClick={() => quantity(product.id, -1)}
                        >
                          <Minus size={14} />
                        </button>
                        <span aria-label={`${product.name} quantity`}>
                          {cart[product.id]}
                        </span>
                        <button
                          aria-label={`Increase ${product.name} quantity`}
                          onClick={() => quantity(product.id, 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => moveToWishlist(product.id)}>
                        <Heart size={14} /> Save for later
                      </button>
                      <button
                        onClick={() => quantity(product.id, -cart[product.id])}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </article>
                ))}
                <div className="cart-assurance">
                  <span>
                    <PackageCheck size={20} />
                    <b>Easy returns</b>
                    <small>7-day return window</small>
                  </span>
                  <span>
                    <ShieldCheck size={20} />
                    <b>Authentic products</b>
                    <small>Quality checked</small>
                  </span>
                  <span>
                    <Truck size={20} />
                    <b>Tracked delivery</b>
                    <small>Updates at every step</small>
                  </span>
                </div>
              </section>
              <aside className="cart-summary">
                {!checkout ? (
                  <>
                    <h2>Order summary</h2>
                    <div className="coupon-box">
                      <Tag size={18} />
                      <label>
                        <span>Apply coupon</span>
                        <input
                          aria-label="Coupon code"
                          value={coupon}
                          onChange={(event) =>
                            setCoupon(event.target.value.toUpperCase())
                          }
                          placeholder="Try AURA10"
                        />
                      </label>
                      <button
                        onClick={() => setCouponApplied(coupon === 'AURA10')}
                        disabled={!coupon}
                      >
                        {couponApplied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                    {coupon && !couponApplied && coupon !== 'AURA10' ? (
                      <p className="coupon-error">
                        Use AURA10 to unlock this offer.
                      </p>
                    ) : null}
                    <div className="price-lines">
                      <p>
                        <span>MRP ({itemCount} items)</span>
                        <strong>{money(mrpTotal)}</strong>
                      </p>
                      <p>
                        <span>Product discount</span>
                        <strong className="saving">
                          − {money(mrpTotal - subtotal)}
                        </strong>
                      </p>
                      {couponApplied ? (
                        <p>
                          <span>Coupon discount</span>
                          <strong className="saving">
                            − {money(couponDiscount)}
                          </strong>
                        </p>
                      ) : null}
                      <p>
                        <span>Delivery fee</span>
                        <strong className={delivery === 0 ? 'saving' : ''}>
                          {delivery === 0 ? 'FREE' : money(delivery)}
                        </strong>
                      </p>
                      <hr />
                      <p className="payable">
                        <span>Total amount</span>
                        <strong>{money(total)}</strong>
                      </p>
                    </div>
                    <p className="cart-saving">
                      You save {money(mrpTotal - subtotal + couponDiscount)} on
                      this order
                    </p>
                    <button
                      className="cart-primary"
                      onClick={() => setCheckout(true)}
                    >
                      Proceed to checkout <ArrowRight size={17} />
                    </button>
                    <small className="payment-note">
                      <ShieldCheck size={13} /> Secure checkout · No real
                      payment in this preview
                    </small>
                  </>
                ) : (
                  <CheckoutForm
                    total={total}
                    onBack={() => setCheckout(false)}
                    onSubmit={placeOrder}
                  />
                )}
              </aside>
            </div>
            <section className="cart-recommendations">
              <p className="eyebrow">YOU MAY ALSO LIKE</p>
              <h2>Complete your order</h2>
              <div>
                {recommendations.map((product) => (
                  <Link href={`/p/${slugify(product.name)}`} key={product.id}>
                    <Image
                      src={photo(product.image, 350)}
                      alt={product.name}
                      width={350}
                      height={350}
                      unoptimized
                    />
                    <small>{product.brand}</small>
                    <strong>{product.name}</strong>
                    <span>
                      {money(product.price)} <del>{money(product.mrp)}</del>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
function CheckoutForm({
  total,
  onBack,
  onSubmit,
}: {
  total: number;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="cart-checkout"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <button type="button" onClick={onBack}>
        <ArrowLeft size={14} /> Back to summary
      </button>
      <p className="eyebrow">DELIVERY DETAILS</p>
      <h2>Where should we send it?</h2>
      <label>
        Full name
        <input required autoComplete="name" />
      </label>
      <label>
        Mobile number
        <input
          required
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
        />
      </label>
      <label>
        Delivery address
        <textarea required rows={3} />
      </label>
      <div>
        <label>
          City
          <input required />
        </label>
        <label>
          PIN code
          <input
            required
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            maxLength={6}
          />
        </label>
      </div>
      <p className="payable">
        <span>Amount payable</span>
        <strong>{money(total)}</strong>
      </p>
      <button className="cart-primary">
        Place preview order <ArrowRight size={16} />
      </button>
    </form>
  );
}
function EmptyCart() {
  return (
    <section className="empty-cart-page">
      <span>
        <ShoppingBag size={36} />
      </span>
      <p className="eyebrow">YOUR BAG IS READY</p>
      <h1>Your cart is waiting for something special.</h1>
      <p>
        Explore this month’s most-loved products and add your favourites here.
      </p>
      <Link className="cart-primary" href="/#discover">
        Discover products <ArrowRight size={17} />
      </Link>
    </section>
  );
}
