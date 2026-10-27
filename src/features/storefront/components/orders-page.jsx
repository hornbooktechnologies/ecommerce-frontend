'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Clock3, Download, MapPin, Package, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import StoreHeader from './store-header';
import OrderReviews from './order-reviews';
import OrderAfterSales from './order-after-sales';
import styles from './orders-page.module.css';

const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const when = (value) => value && Number.isFinite(new Date(value).getTime()) ? `${date.format(new Date(value))} IST` : 'Not recorded';
const label = (value) => value ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : 'Not recorded';
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value || 0);
function Badge({ value }) {
  const tone = ['CANCELLED', 'FAILED', 'RETURNED'].includes(value) ? 'muted' : ['COMPLETED', 'DELIVERED', 'PAID', 'FULFILLED'].includes(value) ? 'success' : 'pending';
  return <span className={`${styles.badge} ${styles[tone]}`}>{label(value)}</span>;
}

export default function OrdersPage({ page = 1, orderId = '' }) {
  const [state, setState] = useState({ loading: true, data: null, error: '', status: 0 });
  const refresh = useRef(() => {});
  const errorRef = useRef(null);
  useEffect(() => {
    let active = true, generation = 0, controller;
    async function load(manual = false) {
      const current = ++generation;
      controller?.abort(); controller = new AbortController();
      setState({ loading: true, data: null, error: '', status: 0 });
      try {
        const response = await fetch(`/api/customer/orders/${orderId ? 'read' : 'list'}`, {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify(orderId ? { orderId } : { page, pageSize: 10 }),
        });
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Unable to load your orders.'), { status: response.status });
        if (active && current === generation) {
          setState({ loading: false, data: result.data, error: '', status: 0 });
          if (manual) toast.success('Order information updated.');
        }
      } catch (error) {
        if (active && current === generation && error.name !== 'AbortError') {
          setState({ loading: false, data: null, error: error.status ? error.message : 'Unable to connect. Please try again.', status: error.status || 0 });
          if (manual) toast.error(error.status === 401 ? 'Please sign in again.' : 'Unable to refresh your orders.');
        }
      }
    }
    refresh.current = () => load(true);
    const reload = () => { if (document.visibilityState === 'visible') void load(); };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hornbook-bag') : null;
    if (channel) channel.onmessage = (event) => { if (event.data === 'account') void load(); };
    window.addEventListener('customer-account-changed', reload);
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    void load();
    return () => { active = false; controller?.abort(); channel?.close(); window.removeEventListener('customer-account-changed', reload); window.removeEventListener('focus', reload); document.removeEventListener('visibilitychange', reload); };
  }, [orderId, page]);
  useEffect(() => { if (state.error) errorRef.current?.focus(); }, [state.error]);

  const { data, loading, error, status } = state;
  return <><StoreHeader /><main className={styles.page}>
    <Link className={styles.back} href={orderId ? '/account/orders' : '/account'}><ArrowLeft size={18} aria-hidden="true" />{orderId ? 'All orders' : 'My account'}</Link>
    <header className={styles.heading}><div><p className={styles.eyebrow}>THE HORNBOOK ACCOUNT</p><h1>{orderId ? 'Your order, step by step.' : 'My orders.'}</h1><p>{orderId ? 'The latest updates recorded by your store.' : 'Every purchase, all in one place.'}</p></div>
      <button disabled={loading} onClick={() => refresh.current()}><RefreshCw size={18} aria-hidden="true" />{loading ? 'Loading…' : 'Refresh updates'}</button></header>
    {loading ? <section className={styles.skeleton} role="status" aria-busy="true"><span className={styles.srOnly}>Loading your orders</span>{[1, 2, 3].map((key) => <div key={key} aria-hidden="true" />)}</section>
      : status === 401 ? <section className={styles.card}><ShieldCheck aria-hidden="true" /><h2>Sign in to view your orders</h2><p>Your order history is private to your customer account.</p><Link className={styles.primary} href="/account/login">Sign in <ArrowRight size={18} aria-hidden="true" /></Link></section>
      : error ? <section className={styles.card} role="alert" tabIndex={-1} ref={errorRef}><h2>{status === 404 ? 'Order unavailable' : 'We couldn’t load your orders'}</h2><p>{error}</p>{status !== 404 && <button onClick={() => refresh.current()}>Try again</button>} <Link className={styles.back} href="/account/orders">All orders</Link></section>
      : data && (orderId ? <OrderDetails data={data} onExpired={() => refresh.current()} /> : <OrderList data={data} />)}
  </main></>;
}

function OrderList({ data }) {
  const { items, pagination } = data;
  return <>
    {!items.length ? <section className={styles.card}><Package size={32} aria-hidden="true" /><h2>{pagination.page === 1 ? 'Your story starts with your first order.' : 'No orders on this page.'}</h2><p>{pagination.page === 1 ? 'Orders linked to your customer account will appear here.' : 'Return to the first page to see your latest orders.'}</p><Link className={styles.primary} href={pagination.page === 1 ? '/#discover' : '/account/orders'}>{pagination.page === 1 ? 'Explore the collection' : 'First page'}<ArrowRight size={18} aria-hidden="true" /></Link></section>
      : <ul className={styles.orders}>{items.map((order) => <li className={styles.card} key={order.id}>
        <div className={styles.row}><span className={styles.eyebrow}>ORDER · {when(order.placedAt)}</span><Badge value={order.status} /></div>
        <h2>{order.orderNumber}</h2><p>{order.firstItem || 'Order items'}{order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ''}</p>
        <div className={styles.orderBottom}><div><strong>{money(order.grandTotal, order.currency)}</strong><small>Payment: {order.paymentMethod === 'ONLINE_TEST' ? 'Test mode · ' : order.paymentMethod === 'COD' ? 'COD · ' : ''}{label(order.paymentStatus)} · Fulfilment: {label(order.fulfillmentStatus)}</small></div><Link className={styles.primary} href={`/account/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`}>View order<ArrowRight size={18} aria-hidden="true" /></Link></div>
      </li>)}</ul>}
    {pagination.total > 0 && <nav className={styles.pagination} aria-label="Order pages"><span>{pagination.total} orders · Page {pagination.page} of {Math.max(1, pagination.totalPages)} · 10 per page</span><div>{pagination.page > 1 && <Link className={styles.back} href={`/account/orders?page=${pagination.page - 1}`}><ArrowLeft size={16} aria-hidden="true" />Previous</Link>}{pagination.page < pagination.totalPages && <Link className={styles.back} href={`/account/orders?page=${pagination.page + 1}`}>Next<ArrowRight size={16} aria-hidden="true" /></Link>}</div></nav>}
  </>;
}

function InvoiceDownloads({ orderId, invoices, onExpired }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function download(invoice) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(invoice.id); setError('');
    try {
      const response = await fetch('/api/customer/orders/invoice', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, documentId: invoice.id }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]) });
      if (!response.ok) {
        const result = await response.json();
        if (response.status === 401) onExpired();
        throw new Error(result.error?.message || 'Unable to download the invoice. Please try again.');
      }
      if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The invoice could not be downloaded. Please try again.');
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = response.headers.get('content-disposition')?.match(/filename="([A-Za-z0-9_-]+\.pdf)"/)?.[1] || 'tax-invoice.pdf';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Invoice download started.');
    } catch (failure) {
      if (!controller.signal.aborted) {
        const message = failure.name === 'TimeoutError' || failure instanceof TypeError ? 'Unable to connect. Please try downloading again.' : failure.message;
        setError(message); toast.error(message);
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy('');
    }
  }
  return <section className={styles.card} aria-labelledby="invoice-heading"><h2 id="invoice-heading">Tax invoices</h2>
    <p>{invoices.length ? 'Download the issued PDF for each seller. An invoice is not a payment receipt.' : 'No invoice has been issued yet. It will appear here once your store issues it.'}</p>
    {error && <p className={styles.notice} role="alert">{error}</p>}
    <ul className={styles.invoices}>{invoices.map((invoice) => <li key={invoice.id}><div><h3>{invoice.number}</h3><p>{invoice.seller}</p><small>{invoice.date || 'Date not recorded'} · {money(invoice.total, invoice.currency)}</small></div>
      <button type="button" disabled={Boolean(busy)} aria-busy={busy === invoice.id} aria-label={`Download invoice ${invoice.number}`} onClick={() => download(invoice)}><Download size={18} aria-hidden="true" /><span aria-live="polite">{busy === invoice.id ? 'Preparing PDF...' : 'Download PDF'}</span></button>
    </li>)}</ul>
  </section>;
}

function OrderDetails({ data, onExpired }) {
  const { order, items, address, history, fulfillments, deliverySlot } = data;
  return <>
    <section className={`${styles.card} ${styles.overview}`}><div className={styles.row}><Package size={28} aria-hidden="true" /><Badge value={order.status} /></div><h2>{order.orderNumber}</h2><p>Placed {when(order.placedAt)}</p>
      <dl className={styles.metrics}><div><dt>Order total</dt><dd>{money(order.grandTotal, order.currency)}</dd></div><div><dt>Payment</dt><dd><Badge value={order.paymentStatus} />{order.paymentMethod === 'ONLINE_TEST' ? ' · Test mode' : order.paymentMethod === 'COD' ? ' · COD' : ''}</dd></div><div><dt>Fulfilment</dt><dd><Badge value={order.fulfillmentStatus} /></dd></div></dl>
      {order.paymentMethod === 'ONLINE_TEST' && order.checkoutId && <p>This order uses simulated payments, not real money. <Link className={styles.primary} href={`/checkout?attempt=${order.checkoutId}`}>{order.paymentStatus === 'PAID' ? 'View test payment' : 'Check or resume test payment'}</Link></p>}
      {order.paymentStatus === 'UNPAID' && <p className={styles.notice}>No payment is recorded for this order. Online payment is not available here; contact the store for payment arrangements.</p>}
      {order.status === 'CANCELLED' && <p className={styles.notice}>This order has been cancelled. The payment and refund amounts below reflect the store’s recorded updates.</p>}
    </section>
    <div className={styles.layout}><div>
      <InvoiceDownloads orderId={order.id} invoices={data.invoices || []} onExpired={onExpired} />
      <section className={styles.card} aria-labelledby="after-sales-heading"><h2 id="after-sales-heading">Cancellations, returns and exchanges</h2><OrderAfterSales orderId={order.id} onChanged={onExpired} onExpired={onExpired} /></section>
      <section className={styles.card} aria-labelledby="product-reviews-heading"><h2 id="product-reviews-heading">Review your purchases</h2><OrderReviews orderId={order.id} items={items} onExpired={onExpired} /></section>
      <section className={styles.card}><h2>Items in your order</h2><ul className={styles.items}>{items.map((item) => <li key={item.id}><div><h3>{item.productName}</h3><p>{item.variantName} · {item.sku}</p><small>Sold by {item.seller} · {label(item.status)}</small><p>{item.quantity} × {money(item.unitPrice, order.currency)}</p></div><strong>{money(item.lineTotal, order.currency)}</strong></li>)}</ul>
        <dl className={styles.totals}>{[['Subtotal', order.subtotal], ['Discount', -order.discountTotal], ['Delivery', order.shippingTotal], ['Included item GST', order.taxTotal], ...(order.roundingTotal ? [['Rounding', order.roundingTotal]] : []), ['Total', order.grandTotal], ...(order.refundedTotal ? [['Refund recorded', order.refundedTotal]] : [])].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{money(value, order.currency)}</dd></div>)}</dl>
      </section>
      <section className={styles.card}><h2><Truck size={22} aria-hidden="true" /> Fulfilment updates</h2><p>Updates are recorded by the store, not a live courier feed. Refresh to check for changes.</p>
        {!fulfillments.length ? <p className={styles.notice}>{order.status === 'CANCELLED' ? 'No fulfilment was recorded.' : 'Your store has not started fulfilment yet.'}</p> : fulfillments.map((shipment) => <article className={styles.shipment} key={`${shipment.id}-${shipment.shipmentId || 'pending'}`}><div className={styles.row}><h3>{shipment.seller}</h3><Badge value={shipment.status} /></div>
          {shipment.trackingNumber && <p><strong>Tracking reference:</strong> {shipment.trackingNumber}{shipment.carrier ? ` · ${shipment.carrier}` : ''}</p>}
          {shipment.shipmentStatus && <p>Shipment: {label(shipment.shipmentStatus)}</p>}
          <ol className={styles.timeline}>{[['Picking started', shipment.pickingAt], ['Packed', shipment.packedAt], ['Dispatched', shipment.dispatchedAt || shipment.shippedAt], ['Delivered', shipment.deliveredAt], ['Fulfilment completed', shipment.completedAt]].filter(([, at]) => at).map(([name, at]) => <li key={name}><Check size={16} aria-hidden="true" /><div><strong>{name}</strong><small>{when(at)}</small></div></li>)}</ol>
        </article>)}
      </section>
    </div><aside>
      <section className={styles.card}><h2><MapPin size={22} aria-hidden="true" /> Delivery details</h2><address><strong>{address.contactName}</strong><p>{[address.line1, address.line2, address.landmark, address.city, address.stateName, address.postalCode, address.countryCode].filter(Boolean).join(', ') || 'No delivery address recorded.'}</p></address>
        {deliverySlot && <div className={styles.slot}><strong>Selected delivery slot</strong><p>{when(deliverySlot.startsAt)}<br />to {when(deliverySlot.endsAt)}</p><Badge value={deliverySlot.status} /><p>This is the requested slot, not a guaranteed delivery estimate.</p></div>}
      </section>
      <section className={styles.card}><h2><Clock3 size={22} aria-hidden="true" /> Order activity</h2><ol className={styles.timeline}>{history.length ? history.map((event) => <li key={event.id}><span className={styles.dot} aria-hidden="true" /><div><strong>{label(event.type)} · {label(event.status)}</strong><small>{when(event.at)}</small></div></li>) : <li><span className={styles.dot} aria-hidden="true" /><div><strong>Order placed</strong><small>{when(order.placedAt)}</small></div></li>}</ol><small>Latest order update: {when(order.updatedAt)}</small></section>
    </aside></div>
  </>;
}
