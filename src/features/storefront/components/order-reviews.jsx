'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import styles from './order-reviews.module.css';

const statusText = {
  PENDING: 'Awaiting moderation', PUBLISHED: 'Published',
  HIDDEN: 'Not published', FLAGGED: 'Under review',
};

function ItemReview({ orderId, item, onExpired }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(item.review);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const pending = useRef(null);
  const ratingRef = useRef(null);
  const buttonRef = useRef(null);
  const feedbackRef = useRef(null);
  const feedbackRequested = useRef(false);
  const uid = useId();
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { if (open) ratingRef.current?.focus(); }, [open]);
  useEffect(() => { if (feedbackRequested.current && (error || saved)) feedbackRef.current?.focus(); }, [error, saved]);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    pending.current = controller;
    feedbackRequested.current = true;
    setBusy(true); setError(''); setFields({});
    try {
      const response = await fetch('/api/customer/orders/review', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        body: JSON.stringify({ orderId, orderItemId: item.id, rating: Number(form.get('rating')),
          title: String(form.get('title')).trim(), review: String(form.get('review')).trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) onExpired();
        setFields(Object.fromEntries((result.error?.details || []).map((detail) => [detail.field, detail.message])));
        throw new Error(result.error?.message || 'Unable to send your review. Please try again.');
      }
      if (!controller.signal.aborted) {
        setSaved(result.data.review); setOpen(false);
        toast.success(result.data.message);
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        const message = failure.name === 'TimeoutError' || failure instanceof TypeError
          ? 'Unable to confirm submission. Please try again; your review will not be duplicated.' : failure.message;
        setError(message); toast.error(message);
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <article className={styles.item} aria-labelledby={`${uid}-product`}>
    <div className={styles.heading}><div><h3 id={`${uid}-product`}>{item.productName}</h3><p>{item.variantName} · {item.sku}</p></div>
      {!saved && !open && <button ref={buttonRef} type="button" onClick={() => setOpen(true)}><Star size={17} aria-hidden="true" />Write a review</button>}
    </div>
    {saved ? <p ref={feedbackRef} tabIndex={-1} role="status" className={styles.feedback}>Your review: {statusText[saved.status] || 'Received'}. {saved.status === 'PENDING' && 'It will appear on the product page after approval.'}</p>
      : open && <form onSubmit={submit} aria-label={`Review ${item.productName}`} aria-busy={busy}>
        {error && <p role="alert" tabIndex={-1} ref={feedbackRef} className={styles.error}>{error}</p>}
        <fieldset disabled={busy}>
          <legend className={styles.srOnly}>Your product review</legend>
          <label htmlFor={`${uid}-rating`}>Rating <span>(required)</span></label>
          <select id={`${uid}-rating`} name="rating" required defaultValue="" ref={ratingRef}
            aria-invalid={Boolean(fields.rating)} aria-describedby={fields.rating ? `${uid}-rating-error` : undefined}>
            <option value="" disabled>Choose a rating</option>
            {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}
          </select>
          {fields.rating && <span id={`${uid}-rating-error`} className={styles.error}>{fields.rating}</span>}
          <label htmlFor={`${uid}-title`}>Review title <span>(optional)</span></label>
          <input id={`${uid}-title`} name="title" maxLength={190} aria-invalid={Boolean(fields.title)}
            aria-describedby={fields.title ? `${uid}-title-error` : undefined} />
          {fields.title && <span id={`${uid}-title-error`} className={styles.error}>{fields.title}</span>}
          <label htmlFor={`${uid}-review`}>Your experience <span>(required)</span></label>
          <textarea id={`${uid}-review`} name="review" rows={4} minLength={10} maxLength={3000} required
            aria-invalid={Boolean(fields.review)} aria-describedby={`${uid}-help${fields.review ? ` ${uid}-review-error` : ''}`} />
          <small id={`${uid}-help`}>10–3,000 characters. Describe the product, not personal contact or payment information. Your first name will be shown with an approved review.</small>
          {fields.review && <span id={`${uid}-review-error`} className={styles.error}>{fields.review}</span>}
          <div className={styles.actions}><button type="button" onClick={() => { setOpen(false); setError(''); requestAnimationFrame(() => buttonRef.current?.focus()); }}>Cancel</button>
            <button type="submit" className={styles.submit}>{busy ? 'Submitting…' : 'Submit review'}</button></div>
        </fieldset>
      </form>}
  </article>;
}

export default function OrderReviews({ orderId, items, onExpired }) {
  const eligible = items.filter((item) => item.reviewEligible || item.review);
  return <div className={styles.reviews}>
    <p>{eligible.length ? 'Share your experience with delivered products. Reviews are checked before publication. One review per purchased order item.'
      : 'You can review your products here once their delivery is completed.'}</p>
    {eligible.map((item) => <ItemReview key={item.id} orderId={orderId} item={item} onExpired={onExpired} />)}
  </div>;
}
