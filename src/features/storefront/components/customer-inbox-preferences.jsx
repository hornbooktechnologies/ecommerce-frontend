'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import styles from './customer-inbox-preferences.module.css';

export default function CustomerInboxPreferences({ request, onBusy, onExpired, toasterId }) {
  const id = useId(); const heading = useRef(null); const mutation = useRef(null);
  const [data, setData] = useState(null); const [disabled, setDisabled] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [reload, setReload] = useState(0);
  const expiredRef = useRef(onExpired); expiredRef.current = onExpired;
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { onBusy(saving); }, [saving, onBusy]);
  useEffect(() => () => { mutation.current?.abort(); onBusy(false); toast.dismiss(`${toasterId}-preferences`); }, [onBusy, toasterId]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setMessage('');
    request('/preferences', controller.signal)
      .then((next) => { if (!controller.signal.aborted) { setData(next); setDisabled(next.options.filter((item) => !item.enabled).map((item) => item.category)); } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message || 'Preferences could not be loaded. Try reloading.'); if (failure.status === 401) expiredRef.current(); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, reload]);
  const saved = data?.options.filter((item) => !item.enabled).map((item) => item.category).sort() || [];
  const dirty = JSON.stringify([...disabled].sort()) !== JSON.stringify(saved);
  async function save(event) {
    event.preventDefault(); if (!data || mutation.current || !dirty) return;
    const controller = new AbortController(); mutation.current = controller; setSaving(true); setError(''); setMessage('');
    try {
      const next = await request('/preferences', controller.signal, 'PUT', { revision: data.revision, disabledCategories: disabled });
      if (controller.signal.aborted) return;
      setData(next); setDisabled(next.options.filter((item) => !item.enabled).map((item) => item.category));
      setMessage('Preferences saved for future in-app deliveries. Existing updates are unchanged.');
      toast.success('Notification preferences saved.', { id: `${toasterId}-preferences`, toasterId });
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure.message || 'Preferences could not be saved. Please try again.'); if (failure.status === 401) expiredRef.current(); }
    } finally { if (mutation.current === controller) mutation.current = null; if (!controller.signal.aborted) setSaving(false); }
  }
  return <section className={styles.panel} aria-labelledby={id}>
    <h3 id={id} tabIndex={-1} ref={heading}>Notification preferences</h3>
    <p>Choose optional in-app updates for this store. This does not change order emails, account/security emails or newsletter subscriptions.</p>
    {loading ? <p role="status">Loading preferences…</p> : data ? <form onSubmit={save} aria-busy={saving}>
      <fieldset disabled={saving}><legend>Optional updates</legend>{data.options.map((item) => <label className={styles.option} key={item.category}>
        <input type="checkbox" checked={!disabled.includes(item.category)} onChange={(event) => { setDisabled((current) => event.target.checked ? current.filter((category) => category !== item.category) : [...current, item.category]); setMessage(''); }} /><span>{item.label}</span>
      </label>)}</fieldset>
      <div className={styles.required}><strong>Always enabled</strong><p>{data.required.map((item) => item.label).join(' · ')}</p></div>
      <p>Only new deliveries are affected, including queued updates not yet processed. Re-enabling a type does not restore previously muted deliveries.</p>
      <div className={styles.actions}><button type="button" disabled={saving} onClick={() => { setDisabled([]); setMessage(''); }}>Enable all optional updates</button><button className={styles.save} type="submit" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save preferences'}</button></div>
      {dirty ? <p>Changes are not saved yet.</p> : null}
    </form> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {message ? <p className={styles.success} role="status">{message}</p> : null}
    <button className={styles.reload} type="button" disabled={saving || loading} onClick={() => setReload((value) => value + 1)}>Reload saved preferences{dirty ? ' (discard edits)' : ''}</button>
  </section>;
}
