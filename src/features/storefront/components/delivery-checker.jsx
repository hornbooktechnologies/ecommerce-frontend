'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Truck, X } from 'lucide-react';
import styles from './delivery-checker.module.css';

const validPin = (value) => /^[1-9][0-9]{5}$/.test(value);
const time = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export default function DeliveryChecker() {
  const dialog = useRef(null), input = useRef(null), request = useRef(null), previousOverflow = useRef(null);
  const id = useId();
  const [pin, setPin] = useState(''), [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const restoreScroll = () => {
    if (previousOverflow.current !== null) { document.body.style.overflow = previousOverflow.current; previousOverflow.current = null; }
  };
  useEffect(() => () => { request.current?.abort(); restoreScroll(); }, []);
  function close() { request.current?.abort(); request.current = null; setBusy(false); dialog.current?.close(); restoreScroll(); }
  async function check(event) {
    event.preventDefault();
    if (!validPin(pin)) { setError('Enter a valid six-digit Indian PIN code.'); input.current?.focus(); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch(`/api/storefront/delivery-availability?postalCode=${encodeURIComponent(pin)}`, {
        cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)])
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Could not check delivery. Please try again.');
      if (request.current === controller) setResult(data.data);
    } catch (cause) {
      if (!controller.signal.aborted && request.current === controller) setError(cause.name === 'TimeoutError' ? 'The check timed out. Please try again.' : 'Could not check delivery. Please try again.');
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }
  return <>
    <button className={styles.trigger} type="button" aria-haspopup="dialog" onClick={() => {
      setResult(null); setError('');
      previousOverflow.current = document.body.style.overflow; document.body.style.overflow = 'hidden';
      dialog.current.showModal(); input.current?.focus();
    }}><MapPin size={18} aria-hidden="true" /><span>Check delivery</span></button>
    <dialog className={styles.dialog} ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`}
      onCancel={(event) => { event.preventDefault(); close(); }} onClose={restoreScroll}
      onClick={(event) => { if (event.target === dialog.current) { const box = dialog.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}>
      <div className={styles.content}>
        <button className={styles.close} type="button" aria-label="Close delivery checker" onClick={close}><X size={20} aria-hidden="true" /></button>
        <span className={styles.icon}><Truck size={24} aria-hidden="true" /></span>
        <p className={styles.eyebrow}>BEFORE YOU FILL YOUR BAG</p>
        <h2 id={`${id}-title`}>Do we deliver to you?</h2>
        <p id={`${id}-hint`}>Check your PIN code for current delivery availability.</p>
        <form onSubmit={check} noValidate>
          <label htmlFor={`${id}-pin`}>Delivery PIN code</label>
          <div className={styles.fields}>
            <input id={`${id}-pin`} ref={input} value={pin} maxLength={6} inputMode="numeric" autoComplete="postal-code" placeholder="6-digit PIN code"
              aria-invalid={Boolean(error) && !validPin(pin)} aria-describedby={error ? `${id}-error` : undefined}
              onBlur={() => { if (pin && !validPin(pin)) setError('Enter a valid six-digit Indian PIN code.'); }}
              onChange={(event) => { request.current?.abort(); request.current = null; setBusy(false); setPin(event.target.value.replace(/\D/g, '').slice(0, 6)); setResult(null); setError(''); }} />
            <button className={styles.submit} type="submit" disabled={busy}>{busy ? 'Checking…' : 'Check availability'}</button>
          </div>
          {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
          <div role="status" aria-live="polite" aria-atomic="true">
            {busy && <p>Checking delivery for {pin}…</p>}
            {result && <div className={styles.result} data-available={result.available}>
              <strong>{result.available ? 'Delivery available' : result.covered ? 'No bookable slots right now' : 'Outside our delivery area'} · {result.postalCode}</strong>
              <p>{result.message}</p>
              {result.nextStartsAt && <p>Next slot starts {time.format(new Date(result.nextStartsAt))} IST.</p>}
            </div>}
          </div>
        </form>
        <p className={styles.note}>This check does not reserve a slot or change your saved addresses. Stock, delivery fees and capacity are confirmed at checkout.</p>
      </div>
    </dialog>
  </>;
}
