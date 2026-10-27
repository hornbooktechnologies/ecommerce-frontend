'use client';
import PaymentControls from './payment-controls';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, MapPin, Plus, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';
import StoreHeader from './store-header';
import { useStore } from '../store';
import { money } from '../data/live-catalog';
import styles from './checkout-page.module.css';

const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const slotLabel = (slot) => `${date.format(new Date(slot.startsAt))} – ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(slot.endsAt))} IST`;
async function api(path, body = {}) {
  const response = await fetch(`/api/customer/${path}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
    .catch(() => { throw new Error('Connection interrupted. Please retry this same checkout attempt; a completed order will not be duplicated.'); });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Unable to complete this request.'), { status: response.status, details: result.error?.details || [] });
  return result.data;
}
const emptyAddress = { label: '', contactName: '', phone: '', line1: '', line2: '', landmark: '', city: '', stateCode: '', postalCode: '', isDefault: false };
function AddressForm({ states, initialAddress, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyAddress, ...initialAddress })), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const errorRef = useRef(null);
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  return <form className={styles.addressForm} onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('addresses', form); toast.success('Address saved.'); onSaved(result.addresses); }
    catch (cause) { setError([cause.message, ...(cause.details || []).map((item) => item.message)].join(' ')); } finally { setBusy(false); }
  }}>
    <h3 ref={headingRef} tabIndex={-1}>New delivery address</h3>
    {initialAddress && <p>Confirm these details from your previous order. Saving adds this address to your account and selects it for checkout.</p>}
    {error && <p className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    <div className={styles.grid}>
      {[['label', 'Address label', false], ['contactName', 'Recipient name', true], ['phone', 'Phone number', true], ['line1', 'Address line 1', true], ['line2', 'Address line 2', false], ['landmark', 'Landmark', false], ['city', 'City', true], ['postalCode', 'PIN code', true]].map(([name, label, required]) =>
        <label key={name}>{label}{required ? ' *' : ''}<input value={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.value })} required={required} maxLength={name === 'postalCode' ? 6 : name === 'phone' ? 32 : 255}
          inputMode={name === 'postalCode' ? 'numeric' : name === 'phone' ? 'tel' : 'text'} pattern={name === 'postalCode' ? '[1-9][0-9]{5}' : undefined} disabled={busy} /></label>)}
      <label>State / union territory *<select value={form.stateCode} required onChange={(event) => setForm({ ...form, stateCode: event.target.value })} disabled={busy}><option value="">Select state</option>{Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    </div><label className={styles.check}><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} disabled={busy} /> Make this my default delivery address</label>
    <div className={styles.actions}><button className={styles.secondary} type="button" onClick={onCancel} disabled={busy}>Cancel</button><button className={styles.primary} disabled={busy}>{busy ? 'Saving…' : 'Save delivery address'}</button></div>
  </form>;
}

export default function CheckoutPage({ attempt }) {
  const bag = useStore((state) => state.bag);
  const [options, setOptions] = useState({ addresses: [], previousAddresses: [], states: {}, slots: [] });
  const [addressDraft, setAddressDraft] = useState(null);
  const [addressId, setAddressId] = useState(''), [slotId, setSlotId] = useState('');
  const [couponCode, setCouponCode] = useState(''), [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [substitutionPreference, setSubstitution] = useState('CONTACT_ME');
  const [quote, setQuote] = useState(null), [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true), [slotsLoading, setSlotsLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [signedOut, setSignedOut] = useState(false), [newAddress, setNewAddress] = useState(false), [reload, setReload] = useState(0);
  const errorRef = useRef(null), confirmationRef = useRef(null);
  const editingRef = useRef(false);
  useEffect(() => { editingRef.current = newAddress || busy; }, [newAddress, busy]);
  function failure(cause) { setError(cause.message || 'Connection interrupted. Retry this same checkout attempt to avoid a duplicate.'); if ([401, 404].includes(cause.status)) { setQuote(null); setReceipt(null); } if (cause.status === 401) { setSignedOut(true); setOptions({ addresses: [], states: {}, slots: [] }); setAddressId(''); setSlotId(''); setNewAddress(false); } }
  useEffect(() => {
    let active = true;
    const refresh = () => { setLoading(true); setReload((value) => value + 1); };
    const onFocus = () => { if (!editingRef.current) refresh(); };
    window.addEventListener('focus', onFocus); window.addEventListener('customer-account-changed', refresh);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hornbook-bag') : null;
    if (channel) channel.onmessage = (event) => { if (event.data === 'account') refresh(); };
    (async () => {
      try {
        const data = await api('checkout/options');
        await useStore.getState().sync();
        if (!active) return;
        const pending = new URLSearchParams(window.location.search).get('attempt') || attempt;
        const saved = pending ? await api('checkout/read', { quoteId: pending }) : null;
        if (!active) return;
        setSignedOut(false); setOptions(data);
        setAddressId((current) => data.addresses.some((item) => item.id === current) ? current : data.addresses.find((item) => item.isDefault)?.id || data.addresses[0]?.id || '');
        setSlotsLoading(data.addresses.length > 0);
        if (!data.addresses.length) setSlotId('');
        setQuote(saved && !saved.receipt && !saved.expired ? saved : null); setReceipt(saved?.receipt || null);
        if (saved?.expired) setError('Your review expired. Choose delivery details and review your order again.');
      } catch (cause) { if (active) failure(cause); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; window.removeEventListener('focus', onFocus); window.removeEventListener('customer-account-changed', refresh); channel?.close(); };
  }, [attempt, reload]);
  useEffect(() => {
    if (!addressId || loading || signedOut) return;
    let active = true;
    api('checkout/options', { addressId }).then((data) => {
      if (active) { setOptions(data); setSlotId((current) => data.slots.some((item) => item.id === current) ? current : ''); }
    }).catch((cause) => { if (active) { setOptions((current) => ({ ...current, slots: [], deliveryAvailability: null })); setSlotId(''); failure(cause); } })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [addressId, loading, signedOut]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (receipt) confirmationRef.current?.focus(); }, [receipt]);
  function edit() { setQuote(null); setError(''); window.history.replaceState(null, '', '/checkout'); }
  async function review(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await useStore.getState().sync();
      const current = useStore.getState().bag;
      if (!current) throw new Error('Your bag could not be loaded. Return to your bag and retry.');
      const result = await api('checkout/quote', { addressId, deliverySlotId: slotId, couponCode, notes, substitutionPreference, paymentMethod, revision: current.revision, cartKey: current.cartKey });
      setQuote(result); window.history.replaceState(null, '', `/checkout?attempt=${result.quoteId}`); toast.success('Order reviewed. Check the details before placing it.');
    } catch (cause) { failure(cause); } finally { setBusy(false); }
  }
  async function place() {
    setBusy(true); setError('');
    try {
      const result = await api('checkout/place', { quoteId: quote.quoteId }); setReceipt(result.receipt); setQuote(null);
      toast.success(result.receipt.paymentMethod === 'ONLINE_TEST' ? 'Order saved. Continue with your test payment.' : 'Order received. Pay on delivery.');
      await useStore.getState().sync().catch(() => {});
    } catch (cause) {
      if (cause.status === 409) { setQuote(null); window.history.replaceState(null, '', '/checkout'); }
      failure(cause);
    } finally { setBusy(false); }
  }
  return <><StoreHeader /><main className={styles.page}>
    <Link className={styles.back} href="/cart"><ArrowLeft size={16} aria-hidden="true" /> Back to bag</Link>
    <header><p className={styles.eyebrow}>HORNBOOK CHECKOUT</p><h1>{receipt ? 'We have your order.' : 'One last look.'}</h1><p>Delivery details, clear totals and your preferred payment method.</p></header>
    {error && <div role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>{error} <button onClick={() => { setError(''); setLoading(true); setReload((value) => value + 1); }} disabled={busy}>Check again</button></div>}
    {loading ? <section className={styles.card} aria-busy="true" role="status">Loading your secure checkout…</section>
      : signedOut ? <section className={styles.card}><ShieldCheck aria-hidden="true" /><h2>Sign in to continue</h2><p>Use your verified customer account for saved addresses and secure checkout. Your guest bag will merge after sign-in.</p><Link href="/account/login" className={styles.primary}>Sign in</Link></section>
      : receipt ? <section className={styles.card} tabIndex={-1} ref={confirmationRef}><span className={styles.success}><Check size={24} aria-hidden="true" /> Order saved</span><h2>{receipt.orderNumber}</h2><p>{receipt.message}</p><dl className={styles.totals}><div><dt>Order total</dt><dd>{money(receipt.grandTotal)}</dd></div><div><dt>Payment</dt><dd>{receipt.paymentMethod === 'ONLINE_TEST' ? receipt.paymentStatus === 'PAID' ? 'Test payment verified' : 'Awaiting test payment' : receipt.paymentMethod === 'COD' ? 'Cash on delivery' : 'Unpaid'}</dd></div><div><dt>Status</dt><dd>{receipt.status === 'CANCELLED' ? 'Cancelled' : 'Awaiting store confirmation'}</dd></div></dl>
        {receipt.testMode && <PaymentControls receipt={receipt} onUpdated={setReceipt} onBusyChange={setBusy} />}
        <p>The selected delivery slot is recorded. Stock is allocated when the store confirms and prepares fulfilment.</p><Link href={`/account/orders/${receipt.id}`} className={styles.primary}>Track your order <ArrowRight size={18} aria-hidden="true" /></Link> <Link href="/#discover" className={styles.back}>Continue shopping <ArrowRight size={18} aria-hidden="true" /></Link></section>
      : quote ? <div className={styles.layout}>
        <section className={styles.card}><p className={styles.eyebrow}>REVIEW YOUR ORDER</p><h2>Everything in its place.</h2><h3>Deliver to {quote.address.contactName}</h3><p>{[quote.address.line1, quote.address.line2, quote.address.city, quote.address.stateName, quote.address.postalCode].filter(Boolean).join(', ')}</p><p><Truck size={18} aria-hidden="true" /> {slotLabel(quote.slot)}</p>
          <ul className={styles.lines}>{quote.review.items.map((line) => <li key={line.offerId}><div><strong>{line.productName}</strong><span>{line.variantName} · {line.sku}</span><span>Quantity {line.quantity}{line.soldByWeight ? ' (requested weight)' : ''}</span></div><strong>{money(line.lineTotal)}</strong></li>)}</ul>
          <button className={styles.secondary} disabled={busy} onClick={edit}>Edit delivery or coupon</button>
        </section><aside className={styles.card}><p className={styles.eyebrow}>FINAL REVIEW</p><h2>Order summary</h2><dl className={styles.totals}>
          <div><dt>List-price subtotal</dt><dd>{money(quote.review.subtotal)}</dd></div><div><dt>Discounts</dt><dd>−{money(quote.review.discountTotal)}</dd></div><div><dt>Delivery</dt><dd>{money(quote.review.shippingTotal)}</dd></div><div><dt>Included item GST</dt><dd>{money(quote.review.taxTotal)}</dd></div><div className={styles.grand}><dt>Order total</dt><dd>{money(quote.review.grandTotal)}</dd></div></dl>
          <p className={styles.notice}>{quote.paymentMethod === 'ONLINE_TEST' ? 'Online payment · Razorpay Test Mode. Save your order, then complete a simulated payment. No real money will be collected.' : 'Cash on delivery. Pay when your order arrives; nothing is collected online.'} Stock is allocated during fulfilment.</p>
          {quote.review.items.some((line) => line.soldByWeight) && <p>Weight-based item amounts are estimates until the store records the final packed weight.</p>}
          <button className={styles.primary} disabled={busy} onClick={place}>{busy ? 'Submitting securely…' : quote.paymentMethod === 'ONLINE_TEST' ? 'Save order & continue to test payment' : 'Place COD order'} <ArrowRight size={18} aria-hidden="true" /></button><p className={styles.small}>Review valid until {date.format(new Date(quote.expiresAt))} IST. Prices and capacity are checked again on submission. If the connection fails, retry this same attempt.</p>
        </aside></div>
      : !bag?.items.length ? <section className={styles.card}><h2>Your bag is empty</h2><Link className={styles.primary} href="/#discover">Explore products</Link></section>
      : <div className={styles.layout}><section className={styles.card}><h2><MapPin size={21} aria-hidden="true" /> Where should it go?</h2>
        {newAddress ? <AddressForm states={options.states} initialAddress={addressDraft} onCancel={() => setNewAddress(false)} onSaved={(addresses) => { const added = addresses.find((item) => !options.addresses.some((old) => old.id === item.id)); setOptions({ ...options, addresses, slots: [] }); setAddressId(added?.id || addresses[0]?.id || ''); setSlotId(''); setSlotsLoading(true); setNewAddress(false); setAddressDraft(null); }} /> : <><button className={styles.secondary} onClick={() => { setAddressDraft(null); setNewAddress(true); }}><Plus size={16} aria-hidden="true" /> Add delivery address</button>
        <form onSubmit={review} className={styles.form}>
          <fieldset className={styles.savedAddresses} disabled={busy}>
            <legend>Saved delivery addresses</legend>
            <p>Choose an address from your account. Your default address is selected on your first visit.</p>
            {!options.addresses.length ? <p className={styles.notice}>You have no saved delivery addresses yet. Add one above to continue.</p> :
              <div className={styles.addressChoices}>{options.addresses.map((item) => <label key={item.id} className={`${styles.addressChoice} ${addressId === item.id ? styles.addressSelected : ''}`}>
                <input type="radio" name="deliveryAddress" value={item.id} required checked={addressId === item.id}
                  aria-label={`Deliver to ${item.label || item.contactName}, ${item.line1}, ${item.postalCode}`}
                  onChange={() => { setAddressId(item.id); setSlotId(''); setOptions((current) => ({ ...current, slots: [] })); setSlotsLoading(true); }} />
                <span className={styles.addressContent}><span className={styles.addressTitle}><strong>{item.label || 'Delivery address'}</strong>{item.isDefault && <span className={styles.addressBadge}>Default</span>}{addressId === item.id && <span className={styles.addressBadge}><Check size={14} aria-hidden="true" /> Selected</span>}</span>
                  <strong>{item.contactName}</strong><span>{[item.line1, item.line2, item.landmark].filter(Boolean).join(', ')}</span><span>{item.city}, {item.stateName} {item.postalCode}</span><span>{item.countryCode === 'IN' ? 'India' : item.countryCode}</span><span>{item.phone || 'Phone number missing — update this address before ordering.'}</span>
                </span>
              </label>)}</div>}
            <Link className={styles.back} href="/account">Manage saved addresses</Link>
          </fieldset>
          {Boolean(options.previousAddresses?.length) && <section aria-labelledby="previous-addresses-title" className={styles.previousAddresses}>
            <h3 id="previous-addresses-title">Previous order addresses</h3><p>Review and save an address from your recent orders before using it for this delivery.</p>
            <div className={styles.addressChoices}>{options.previousAddresses.map((item) => <article className={styles.previousAddress} key={item.orderId}>
              <div className={styles.addressContent}><strong>{item.contactName || 'Previous delivery'}</strong><span>{[item.line1, item.line2, item.landmark].filter(Boolean).join(', ')}</span><span>{item.city}, {item.stateName} {item.postalCode}</span><span>{item.phone || 'Add a delivery phone number'}</span><small>From order {item.orderNumber}</small></div>
              <button type="button" className={styles.secondary} disabled={busy || options.addresses.length >= 20} aria-label={`Use address from order ${item.orderNumber}`} onClick={() => {
                setAddressDraft(Object.fromEntries(Object.keys(emptyAddress).map((key) => [key, key === 'label' ? 'Previous delivery' : key === 'isDefault' ? false : item[key] || ''])));
                setNewAddress(true);
              }}>Use this address <ArrowRight size={16} aria-hidden="true" /></button>
            </article>)}</div>
            {options.addresses.length >= 20 && <p className={styles.notice}>Your address book is full. Manage saved addresses to remove one before adding another.</p>}
          </section>}
          <label>Delivery slot *<select required value={slotId} onChange={(event) => setSlotId(event.target.value)} disabled={busy || slotsLoading || !options.slots.length}><option value="">{slotsLoading ? 'Loading slots…' : 'Choose delivery slot'}</option>{options.slots.map((slot) => <option key={slot.id} value={slot.id}>{slotLabel(slot)} · {money(slot.deliveryFee)} before offers</option>)}</select></label>
          {addressId && !slotsLoading && !options.slots.length && <p className={styles.notice} role="status">{options.deliveryAvailability?.message || 'Delivery availability could not be confirmed. Please check again.'}</p>}
          <label>Coupon code (optional)<input value={couponCode} maxLength={80} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} disabled={busy} autoCapitalize="characters" /><small>Applied and validated when you review the order.</small></label>
          <label>Grocery substitutions<select value={substitutionPreference} onChange={(event) => setSubstitution(event.target.value)} disabled={busy}><option value="CONTACT_ME">Contact me before substituting</option><option value="NO_SUBSTITUTION">Do not substitute</option><option value="ALLOW_SIMILAR">Allow similar items</option></select></label>
          <label>Delivery notes (optional)<textarea value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} disabled={busy} rows={3} /></label>
          <fieldset className={styles.paymentChoices} disabled={busy}><legend>Payment method</legend>
            <label className={styles.paymentChoice}><input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} disabled={!options.paymentOptions?.codEnabled} onChange={() => setPaymentMethod('COD')} /><span><strong>Cash on delivery</strong><small>{options.paymentOptions?.codEnabled ? 'Pay when your order arrives.' : 'Not available for this store.'}</small></span></label>
            <label className={styles.paymentChoice}><input type="radio" name="paymentMethod" value="ONLINE_TEST" checked={paymentMethod === 'ONLINE_TEST'} disabled={!options.paymentOptions?.onlineEnabled || bag.items.some((item) => item.soldByWeight)} onChange={() => setPaymentMethod('ONLINE_TEST')} /><span><strong>Pay online — test mode</strong><small>{!options.paymentOptions?.onlineEnabled ? 'Not yet connected by the store.' : bag.items.some((item) => item.soldByWeight) ? 'Variable-weight products currently require COD.' : 'Razorpay sandbox. Use test details only; no real money is collected.'}</small></span></label>
          </fieldset>
          <button className={styles.primary} disabled={busy || slotsLoading || !addressId || !slotId || bag.hasIssues}>{busy ? 'Checking prices and availability…' : 'Review order'} <ArrowRight size={18} aria-hidden="true" /></button>
        </form></>}
      </section><aside className={styles.card}><p className={styles.eyebrow}>YOUR BAG</p><h2>{bag.items.length} {bag.items.length === 1 ? 'good find' : 'good finds'}</h2><p>Item subtotal <strong>{money(bag.subtotal)}</strong></p><p>Final discounts, delivery fee and included GST appear in your review.</p>{bag.hasIssues && <p className={styles.error}>Some items need attention. <Link href="/cart">Update your bag</Link> before checkout.</p>}<p className={styles.notice}><ShieldCheck size={18} aria-hidden="true" /> Choose an available payment method before reviewing your order. Online payments currently use test mode only.</p></aside></div>}
  </main></>;
}
