'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useCatalog } from '../catalog-provider';
import { newsletterRequest } from '../newsletter-client';
import styles from './newsletter.module.css';

export default function NewsletterForm() {
  const { configuration } = useCatalog();
  const name = configuration.store.tenantName || configuration.store.name;
  const id = useId(); const requestRef = useRef(null); const errorRef = useRef(null);
  const [email, setEmail] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function submit(event) {
    event.preventDefault(); if (requestRef.current || !consent) return;
    const controller = new AbortController(); requestRef.current = controller; setBusy(true); setError('');
    try {
      const data = await newsletterRequest('subscribe', { email: email.trim(), consent: true }, controller.signal);
      if (controller.signal.aborted) return;
      setMessage(data.message); setEmail(''); setConsent(false);
      toast.success('Your newsletter request was received. Check the instructions below.');
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure.message || 'Please try again later.'); toast.error('Unable to submit your newsletter request.'); }
    } finally { requestRef.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className={styles.newsletter} aria-labelledby={`${id}-heading`}>
    <div className={styles.intro}><Mail size={28} aria-hidden="true" /><div><h2 id={`${id}-heading`}>Good things. In your inbox.</h2><p>New finds, fresh collections and offers from {name}.</p></div></div>
    {message ? <div className={styles.success} role="status"><CheckCircle2 size={22} aria-hidden="true" /><div><strong>Check your email</strong><p>{message}</p><button type="button" className={styles.textButton} onClick={() => setMessage('')}>Use another email or request a new link</button></div></div>
      : <form className={styles.form} onSubmit={submit} aria-busy={busy}>
        <label htmlFor={`${id}-email`}>Email address <span>(required)</span></label>
        <div className={styles.inputRow}><input id={`${id}-email`} type="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="you@example.com" value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} aria-describedby={`${id}-consent`} />
          <button type="submit" className={styles.primary} disabled={busy || !consent}>{busy ? 'Sending…' : 'Subscribe'}<ArrowRight size={18} aria-hidden="true" /></button></div>
        <label className={styles.consent} id={`${id}-consent`}><input type="checkbox" required checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to receive new arrivals, collections and offers from {name}. I can unsubscribe at any time using the link in my email.</span></label>
        <p className={styles.help}>We will email a confirmation link. You are not subscribed until you confirm.</p>
        {error ? <p className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error}</p> : null}
      </form>}
  </section>;
}
