'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import StoreHeader from './store-header';
import { money, photo } from '../data/live-catalog';
import { useStore } from '../store';
import styles from './cart-page.module.css';

async function feedback(action: () => Promise<void>, message?: string) {
  try { await action(); if (message) toast.success(message); }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update your bag.'); }
}

function Quantity({ offerId, quantity, minimum, maximum, step, uom, disabled }: {
  offerId: string; quantity: number; minimum: number; maximum: number; step: number; uom: string; disabled: boolean;
}) {
  const [value, setValue] = useState(String(quantity));
  const update = useStore((state) => state.setQuantity);
  return <form className={styles.quantity} onSubmit={(event) => {
    event.preventDefault();
    void feedback(() => update(offerId, Number(value)));
  }}>
    <button type="button" aria-label="Decrease quantity" disabled={disabled || quantity <= minimum}
      onClick={() => void feedback(() => update(offerId, Math.max(minimum, Number((quantity - step).toFixed(6)))))}><Minus size={16} /></button>
    <label><span className={styles.srOnly}>Quantity ({uom})</span><input type="number" min={minimum} max={maximum} step={step} value={value}
      onChange={(event) => setValue(event.target.value)} disabled={disabled} required /></label>
    <button type="button" aria-label="Increase quantity" disabled={disabled || quantity + step > maximum}
      onClick={() => void feedback(() => update(offerId, Number((quantity + step).toFixed(6))))}><Plus size={16} /></button>
    {value !== String(quantity) && <button type="submit" className={styles.apply} disabled={disabled}>Update</button>}
  </form>;
}

export default function CartPage() {
  const { bag, busy, ready, error, sync, setQuantity, clear } = useStore();
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    let active = true;
    // The root layout persists across navigation; recheck ownership on entering
    // the cart rather than displaying a previously loaded guest cart as current.
    void sync().catch(() => {}).finally(() => { if (active) setSessionChecked(true); });
    return () => { active = false; };
  }, [sync]);
  const guest = sessionChecked && ready && !busy && !error && bag?.mode === 'guest';
  return <><StoreHeader /><main className={styles.page}>
    <Link className={styles.back} href="/#discover"><ArrowLeft size={16} /> Continue exploring</Link>
    <header className={styles.heading}><div><p className={styles.eyebrow}>YOUR HORNBOOK BAG</p><h1>A few good finds.</h1>
      <p>{!sessionChecked || !ready || busy ? 'Checking your saved bag…' : bag?.mode === 'customer' ? 'Saved to your customer account.' : guest ? 'Your guest bag stays saved on this browser for up to 30 days.' : 'Refresh your bag to confirm its latest status.'}</p></div>
      <button className={styles.secondary} disabled={busy} onClick={() => void feedback(sync)}><RefreshCw size={17} /> Refresh bag</button></header>
    {error && <div role="alert" className={styles.error}>{error} <button disabled={busy} onClick={() => void feedback(sync)}>Retry</button></div>}
    {!ready ? <section aria-live="polite" aria-busy={busy} className={styles.empty}><ShoppingBag size={32} /><h2>{busy ? 'Checking your bag…' : 'Your bag could not be loaded.'}</h2><p>Prices and availability are checked with the store.</p></section>
      : !bag?.items.length ? <section className={styles.empty}><ShoppingBag size={38} /><h2>Your bag has room for something good.</h2><p>Explore the collection and choose your colour, size and seller.</p><Link className={styles.primary} href="/#discover">Explore products <ArrowRight size={18} /></Link></section>
      : <div className={styles.layout} aria-busy={busy}>
        <section className={styles.items} aria-label="Bag items">
          <div className={styles.listHeading}><h2>{bag.items.length} {bag.items.length === 1 ? 'item' : 'items'}</h2><button className={styles.textButton} disabled={busy} onClick={() => void feedback(clear, 'Bag cleared.')}>Clear bag</button></div>
          {bag.merged && <p role="status" className={styles.notice}>Your guest bag has been combined with your saved bag. Please review the quantities.</p>}
          {bag.items.map((line) => {
            const product = line.product;
            const maximum = product ? Math.min(product.availableQuantity, product.maximumOrderQuantity ?? product.availableQuantity) : 0;
            return <article className={styles.item} key={line.offerId}>
              <div className={styles.image}>{product ? <img src={photo(product.image, 350)} alt={product.name} /> : <ShoppingBag aria-hidden="true" size={32} />}</div>
              <div className={styles.details}>
                <small>{product?.brand || 'UNAVAILABLE ITEM'}</small>
                <h3>{product ? <Link href={`/p/${product.slug}`}>{product.name}</Link> : 'This item is no longer available'}</h3>
                {product && <><p>{product.variantName} · {product.sku}</p><p>Sold by {product.sellerName}</p>
                  <p className={styles.unitPrice}>{money(product.price)}{product.soldByWeight ? ` per ${product.uom}` : ' each'}{product.mrp > product.price && <del>{money(product.mrp)}</del>}</p></>}
                {line.issue && <p className={styles.issue} role="status">{line.issue}</p>}
                <div className={styles.controls}>
                  {product && maximum >= product.minimumOrderQuantity ? <Quantity key={`${line.offerId}-${line.quantity}`} offerId={line.offerId} quantity={line.quantity}
                    minimum={product.minimumOrderQuantity} maximum={maximum} step={product.quantityStep} uom={product.uom} disabled={busy} /> : <span>Quantity: {line.quantity}</span>}
                  <button className={styles.remove} disabled={busy} onClick={() => void feedback(() => setQuantity(line.offerId, 0), 'Item removed.')} aria-label={`Remove ${product?.name || 'unavailable item'}`}><Trash2 size={17} /> Remove</button>
                </div>
              </div><strong className={styles.lineTotal}>{line.lineTotal === null ? '—' : money(line.lineTotal)}</strong>
            </article>;
          })}
        </section>
        <aside className={styles.summary}><p className={styles.eyebrow}>BAG SUMMARY</p><h2>Good things, accounted for.</h2>
          <div className={styles.total}><span>Item subtotal</span><strong>{money(bag.subtotal)}</strong></div>
          {bag.hasIssues && <p className={styles.issue}>Some items need attention. This subtotal is not a payable order total.</p>}
          <p>Prices are checked live. Delivery charges, applicable taxes and discounts will be confirmed at checkout.</p>
          {bag.items.some((line) => line.product?.soldByWeight) && <p>Weighted items use the requested quantity. The final packed weight may change the amount.</p>}
          <div className={styles.notice}><strong>Ready to review your order?</strong><p>Choose a saved address and delivery slot. Orders are submitted unpaid for store confirmation; no online payment is collected.</p></div>
          {!bag.hasIssues && <Link className={styles.primary} href="/checkout">Continue to checkout <ArrowRight size={17} /></Link>}
          {guest && <Link className={styles.primary} href="/account/login">Sign in to save across devices <ArrowRight size={17} aria-hidden="true" /></Link>}
          <p className={styles.footnote}>Stock and prices can change before you place your order.</p>
        </aside>
      </div>}
  </main></>;
}
