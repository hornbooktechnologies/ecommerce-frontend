'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import styles from './order-after-sales.module.css';

const labels = { REQUESTED: 'Requested', APPROVED: 'Approved', RECEIVED: 'Received by store', INSPECTED: 'Inspected', COMPLETED: 'Completed', REJECTED: 'Rejected' };
const reasons = { DAMAGED: 'Arrived damaged', DEFECTIVE: 'Not working / defective', WRONG_ITEM: 'Wrong item received', SIZE_FIT: 'Size or fit', CHANGED_MIND: 'Changed my mind', QUALITY: 'Quality concern', OTHER: 'Other' };
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const when = (value) => value && Number.isFinite(new Date(value).getTime()) ? `${date.format(new Date(value))} IST` : '';

async function api(path, body, signal) {
  const response = await fetch(`/api/customer/orders/${path}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Unable to process this request.'), { status: response.status, details: result.error?.details || [] });
  return result.data;
}

export default function OrderAfterSales({ orderId, onChanged, onExpired }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [notice, setNotice] = useState('');
  const requestId = useRef('');
  const pending = useRef(null);
  const firstField = useRef(null);
  const feedback = useRef(null);
  const actionRefs = useRef({});
  const restoreFocus = useRef('');
  const uid = useId();
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    api('after-sales', { orderId }, controller.signal).then(setData).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.status === 401 ? 'Your session has expired. Refresh updates and sign in again.' : 'Unable to load return and cancellation options. Please retry.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [orderId, version]);
  useEffect(() => {
    if (open) firstField.current?.focus();
    else if (restoreFocus.current) { actionRefs.current[restoreFocus.current]?.focus(); restoreFocus.current = ''; }
  }, [open]);
  useEffect(() => { if (error || notice) feedback.current?.focus(); }, [error, notice]);

  function start(key) {
    requestId.current = crypto.randomUUID();
    setOpen(key); setError(''); setFields({}); setNotice('');
  }
  async function submit(event, item) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setFields({}); setNotice('');
    try {
      const result = await api(item ? 'return' : 'cancel', item ? {
        orderId, orderItemId: item.id, requestId: requestId.current,
        returnType: form.get('returnType'), quantity: Number(form.get('quantity')),
        reasonCode: form.get('reasonCode'), customerComments: String(form.get('customerComments') || '').trim(), serialIds: form.getAll('serialIds'),
      } : { orderId, reason: String(form.get('reason') || '').trim() }, AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]));
      if (controller.signal.aborted) return;
      setOpen(''); setNotice(result.message); toast.success(result.message);
      if (!item) onChanged();
      else setVersion((current) => current + 1);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure.status === 401) onExpired();
        const message = failure.status ? failure.message : 'Unable to confirm the result. Retry with the same details; the request will not be duplicated.';
        setFields(Object.fromEntries((failure.details || []).map((detail) => [detail.field, detail.message])));
        setError(message); toast.error(message);
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const fieldError = (name) => fields[name] && <small id={`${uid}-${name}-error`} className={styles.error}>{fields[name]}</small>;
  const props = (name) => ({ 'aria-invalid': Boolean(fields[name]), 'aria-describedby': fields[name] ? `${uid}-${name}-error` : undefined });
  const close = () => { restoreFocus.current = open; setOpen(''); setError(''); setFields({}); };

  return <div className={styles.root}>
    <p>Requests are reviewed by the store. Do not send items back until the store confirms the return arrangements. No automatic refund is made here.</p>
    {(error || notice) && <p ref={feedback} tabIndex={-1} role={error ? 'alert' : 'status'} className={error ? styles.error : styles.notice}>{error || notice}</p>}
    {loading ? <p role="status">Checking cancellation and return eligibility…</p> : !data ? <button type="button" onClick={() => { setError(''); setLoading(true); setVersion((value) => value + 1); }}>Retry options</button> : <>
      <div className={styles.cancellation}><p>{data.cancellationMessage}</p>
        {data.canCancel && open !== 'cancel' && <button ref={(element) => { actionRefs.current.cancel = element; }} type="button" className={styles.danger} disabled={busy} onClick={() => start('cancel')}><XCircle size={17} aria-hidden="true" />Cancel order</button>}
        {open === 'cancel' && <form onSubmit={(event) => submit(event)} aria-label="Confirm order cancellation" aria-busy={busy}>
          <h3>Cancel this entire order?</h3><p>This cannot be undone. Any payment already collected will need separate refund review by the store.</p>
          <fieldset disabled={busy}><legend className={styles.srOnly}>Cancellation details</legend>
            <label htmlFor={`${uid}-reason`}>Reason for cancellation (required)</label>
            <textarea ref={firstField} id={`${uid}-reason`} name="reason" minLength={3} maxLength={1000} required rows={3} {...props('reason')} />{fieldError('reason')}
            <div className={styles.actions}><button type="button" onClick={close}>Keep order</button><button type="submit" className={styles.danger}>{busy ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
          </fieldset>
        </form>}
      </div>
      <div className={styles.items}>{data.items.map((item) => <article key={item.id} className={styles.item}>
        <div className={styles.row}><div><h3>{item.name}</h3><p>{item.variant}</p></div>
          {item.eligible && open !== item.id && <button ref={(element) => { actionRefs.current[item.id] = element; }} type="button" disabled={busy} onClick={() => start(item.id)}><RotateCcw size={17} aria-hidden="true" />{item.canExchange ? 'Return / exchange' : 'Request return'}</button>}
        </div>
        {item.eligible ? <small>Up to {item.remaining} eligible · Request by {when(item.expiresAt)}</small> : <small>{item.reason}</small>}
        {open === item.id && <form onSubmit={(event) => submit(event, item)} aria-label={`Return ${item.name}`} aria-busy={busy}>
          <fieldset disabled={busy}><legend className={styles.srOnly}>Return or exchange details</legend>
            <div className={styles.grid}>
              <div><label htmlFor={`${uid}-type`}>Request type</label><select ref={firstField} id={`${uid}-type`} name="returnType" defaultValue="RETURN" {...props('returnType')}><option value="RETURN">Return</option>{item.canExchange && <option value="EXCHANGE">Exchange size / colour</option>}</select>{fieldError('returnType')}</div>
              <div><label htmlFor={`${uid}-quantity`}>Quantity (required)</label><input id={`${uid}-quantity`} name="quantity" type="number" min={item.fractional ? 0.000001 : 1} max={item.remaining} step={item.fractional ? 0.000001 : 1} defaultValue={Math.min(1, item.remaining)} required {...props('quantity')} />{fieldError('quantity')}</div>
            </div>
            <label htmlFor={`${uid}-return-reason`}>Reason (required)</label><select id={`${uid}-return-reason`} name="reasonCode" defaultValue="" required {...props('reasonCode')}><option value="" disabled>Select a reason</option>{Object.entries(reasons).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>{fieldError('reasonCode')}
            {item.serials.length > 0 && <fieldset className={styles.serials} {...props('serialIds')}><legend>Serial numbers to return</legend><small>Select the serials for the returned units. For a bundle, include each serialized component.</small>{item.serials.map((serial) => <label key={serial.id}><input type="checkbox" name="serialIds" value={serial.id} /><span>{serial.number}</span></label>)}{fieldError('serialIds')}</fieldset>}
            <label htmlFor={`${uid}-comments`}>Details / preferred exchange size and colour</label><textarea id={`${uid}-comments`} name="customerComments" maxLength={1000} rows={3} {...props('customerComments')} />{fieldError('customerComments')}
            <small>The store will confirm replacement availability and any price difference. Do not include payment credentials or other sensitive information.</small>
            <div className={styles.actions}><button type="button" onClick={close}>Back</button><button type="submit" className={styles.primary}>{busy ? 'Submitting…' : 'Submit request'}</button></div>
          </fieldset>
        </form>}
      </article>)}</div>
      <section className={styles.history} aria-labelledby={`${uid}-history`}><h3 id={`${uid}-history`}>Your return and exchange requests</h3>
        {!data.cases.length ? <p>No requests for this order yet.</p> : data.cases.map((entry) => <article key={entry.id} className={styles.case}>
          <div className={styles.row}><strong>{entry.number}</strong><span className={styles.badge}>{labels[entry.status] || entry.status}</span></div>
          <p>{entry.type === 'EXCHANGE' ? 'Exchange' : 'Return'} · {reasons[entry.reason] || entry.reason}</p>
          <ul>{entry.items.map((item, index) => <li key={`${item.orderItemId}-${index}`}>{item.name} · {item.quantity} requested</li>)}</ul>
          <ol className={styles.timeline}>{[['Requested', entry.requestedAt], ['Approved', entry.approvedAt], ['Received by store', entry.receivedAt], ['Completed', entry.completedAt]].filter(([, at]) => at).map(([label, at]) => <li key={label}><strong>{label}</strong><small>{when(at)}</small></li>)}</ol>
          {entry.status === 'REJECTED' && <p>The store did not approve this request. Contact the store for details.</p>}
          {entry.exchange && <p>Replacement: {entry.exchange.variant} · {entry.exchange.sku} · {entry.exchange.status === 'COMPLETED' ? 'Completed' : 'Reserved by store'}</p>}
          <small>Request completion is not confirmation that a refund has reached your bank account.</small>
        </article>)}
      </section>
    </>}
  </div>;
}
