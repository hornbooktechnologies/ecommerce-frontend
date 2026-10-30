'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, ArrowUpRight, Package, RotateCcw, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { customerNotificationDestination, customerNotificationTime } from '@/lib/customer-inbox';
import styles from './customer-inbox.module.css';

async function inboxRequest(path, signal, method = 'GET', body) {
  const response = await fetch(`/api/customer/notifications${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'Unable to load notifications.'), { status: response.status });
  return result.data;
}

// A new account gets a fresh instance; no inbox content is persisted in the browser.
export default function CustomerInbox({ customerId }) {
  return customerId ? <Inbox key={customerId} /> : null;
}

function Inbox() {
  const router = useRouter(), titleId = useId();
  const [open, setOpen] = useState(false), [closing, setClosing] = useState(false);
  const [filter, setFilter] = useState('ALL'), [page, setPage] = useState(1);
  const [category, setCategory] = useState('ALL'), [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const searchRef = useRef(null);
  const narrowed = category !== 'ALL' || Boolean(search);
  const [data, setData] = useState(null), [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false);
  const [error, setError] = useState(''), [actionError, setActionError] = useState(''), [expired, setExpired] = useState(false);
  const [refresh, setRefresh] = useState(0), [announcement, setAnnouncement] = useState('');
  const dialog = useRef(null), trigger = useRef(null), filterButton = useRef(null);
  const timer = useRef(null), mutation = useRef(null), channel = useRef(null);
  const view = `${filter}:${page}:${category}:${search}`, result = data?.view === view ? data : null;

  useEffect(() => () => toast.dismiss(`${titleId}-action`), [titleId]);

  useEffect(() => {
    const updates = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hornbook-inbox') : null;
    channel.current = updates;
    if (updates) updates.onmessage = event => { if (event.data === 'changed') setRefresh(value => value + 1); };
    return () => { updates?.close(); mutation.current?.abort(); window.clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = dialog.current, previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; node.showModal();
    return () => { node.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (pending || expired) return;
    let active = true, controller;
    async function load() {
      if (document.visibilityState !== 'visible') return;
      setLoading(true);
      controller?.abort(); const request = new AbortController(); controller = request;
      try {
        const query = new URLSearchParams({ filter, page: String(page), pageSize: '10' });
        if (category !== 'ALL') query.set('category', category);
        if (search) query.set('search', search);
        const next = await inboxRequest(open ? `?${query}` : '/unread-count', request.signal);
        if (!active || request.signal.aborted) return;
        setCount(next.unreadCount); setError('');
        if (open) {
          if (page > next.totalPages) { setPage(Math.max(1, next.totalPages)); return; }
          setData({ ...next, view: `${filter}:${page}:${category}:${search}` });
        }
      } catch (failure) {
        if (!active || request.signal.aborted) return;
        setData(null); setCount(null);
        if (failure.status === 401) setExpired(true);
        setError(failure.status ? failure.message : 'We could not connect. Please try again.');
      } finally { if (active && !request.signal.aborted) setLoading(false); }
    }
    void load();
    const interval = window.setInterval(load, 30000);
    const visible = () => { if (document.visibilityState === 'visible') void load(); else controller?.abort(); };
    window.addEventListener('focus', load); document.addEventListener('visibilitychange', visible);
    return () => { active = false; controller?.abort(); window.clearInterval(interval); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', visible); };
  }, [open, filter, page, category, search, refresh, pending, expired]);

  function close(afterClose) {
    if (closing) return;
    toast.dismiss(`${titleId}-action`);
    setClosing(true);
    timer.current = window.setTimeout(() => {
      dialog.current?.close(); setOpen(false); setClosing(false); trigger.current?.focus(); afterClose?.();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150);
  }

  async function update(item, href) {
    if (mutation.current || expired || (!item && narrowed)) return;
    const request = new AbortController(); mutation.current = request;
    setPending(true); setActionError('');
    try {
      if (item) await inboxRequest(`/${item.id}`, request.signal, 'PATCH', { read: href ? true : !item.readAt });
      else await inboxRequest('/read-all', request.signal, 'POST', { throughId: result.readThroughId });
      if (request.signal.aborted) return;
      const message = item ? (href || !item.readAt ? 'Notification marked read.' : 'Notification marked unread.') : 'Notifications marked read. New arrivals stay unread.';
      setAnnouncement(message); channel.current?.postMessage('changed');
      // Only explicit actions produce a toast. Initial history and background polls stay quiet.
      if (!href) toast.success(message, { id: `${titleId}-action`, toasterId: titleId });
      if (href) close(() => router.push(href));
      else if (filter === 'UNREAD' || !item) filterButton.current?.focus();
      setRefresh(value => value + 1);
    } catch (failure) {
      if (!request.signal.aborted) {
        const message = failure.status === 404 ? 'This update is no longer available. Refresh your notifications.' : failure.status ? failure.message : 'Could not save this change. Please try again.';
        setActionError(message);
        if ([401, 403, 404].includes(failure.status)) { setData(null); setCount(null); }
        if (failure.status === 401) setExpired(true);
      }
    } finally {
      if (!request.signal.aborted) { mutation.current = null; setPending(false); }
    }
  }

  return <div className={styles.root}>
    <button className={styles.trigger} type="button" ref={trigger} aria-haspopup="dialog" aria-expanded={open}
      aria-label={expired ? 'Notifications, sign in again' : error ? 'Notifications, unavailable' : `Notifications${count ? `, ${count} unread` : ''}`}
      onClick={() => { setActionError(''); setAnnouncement(''); setOpen(true); }}>
      <Bell size={21} aria-hidden="true" />{count > 0 ? <span className={styles.badge} aria-hidden="true">{count > 99 ? '99+' : count}</span> : error ? <span className={styles.badge} aria-hidden="true">!</span> : null}
    </button>
    {!open && <span className={styles.srOnly} role="status">{count === null ? '' : `${count} unread notifications`}</span>}
    {open && createPortal(<dialog ref={dialog} className={styles.dialog} data-closing={closing || undefined} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); close(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]')].filter(element => element.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
      }}>
      <header className={styles.heading}><div><p className={styles.eyebrow}>YOUR HORNBOOK ACCOUNT</p><h2 id={titleId}>Your updates</h2><p>{count === null ? 'Order, delivery and return updates' : `${count} unread across all types`}</p></div>
        <button className={styles.iconButton} autoFocus type="button" aria-label="Close notifications" onClick={() => close()}><X size={21} aria-hidden="true" /></button></header>
      <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filter notifications">
        <button ref={filterButton} type="button" aria-pressed={filter === 'ALL'} disabled={pending || expired} onClick={() => { setFilter('ALL'); setPage(1); }}>All</button>
        <button type="button" aria-pressed={filter === 'UNREAD'} disabled={pending || expired} onClick={() => { setFilter('UNREAD'); setPage(1); }}>Unread</button></div>
        <button className={styles.textAction} type="button" disabled={narrowed || expired || pending || loading || !result?.readThroughId || !count} onClick={() => update(null)}><CheckCheck size={18} aria-hidden="true" />Mark all read</button>
        <button className={styles.iconButton} type="button" aria-label="Refresh notifications" disabled={pending || loading || expired} onClick={() => { setActionError(''); setRefresh(value => value + 1); }}><RefreshCw size={18} aria-hidden="true" /></button></div>
      <div className={styles.scroll} aria-busy={loading || pending}>
        <form className={styles.search} role="search" aria-label="Search your notifications" onSubmit={event => {
          event.preventDefault(); if (pending || expired) return; setSearch(searchDraft.trim()); setPage(1); setActionError(''); setRefresh(value => value + 1);
        }}>
          <fieldset disabled={pending || expired}>
            <label>Notification type<select value={category} onChange={event => { setCategory(event.target.value); setPage(1); setActionError(''); }}>
              <option value="ALL">All types</option><option value="ORDERS">Orders &amp; delivery</option>
              <option value="RETURNS">Returns &amp; exchanges</option><option value="PAYMENTS">Payments</option><option value="WARRANTIES">Warranties</option>
            </select></label>
            <label>Search updates<input ref={searchRef} type="search" maxLength={100} value={searchDraft} placeholder="Title or message"
              onChange={event => setSearchDraft(event.target.value)} /></label>
            <div className={styles.searchActions}><button type="submit">Search</button><button type="button" disabled={!narrowed && !searchDraft}
              onClick={() => { setCategory('ALL'); setSearch(''); setSearchDraft(''); setPage(1); setActionError(''); searchRef.current?.focus(); }}>Clear search &amp; type</button></div>
          </fieldset>
          {narrowed && <p>Filtered results. Clear search and type to enable “Mark all read”.</p>}
          {search && <p>Searching for: <strong>{search}</strong></p>}
          {result && <p role="status">{result.total} {narrowed ? 'matching ' : ''}{filter === 'UNREAD' ? 'unread ' : ''}updates</p>}
        </form>
        {actionError && !expired && <p className={styles.error} role="alert">{actionError}</p>}
        {expired ? <div className={styles.empty}><Bell size={28} aria-hidden="true" /><h3>Sign in to see your updates</h3><p>Your session has ended. Your notifications are safely saved to your account.</p><Link href="/account/login" onClick={() => close()}>Sign in again</Link></div>
          : error ? <div className={styles.empty}><Bell size={28} aria-hidden="true" /><h3>Updates unavailable</h3><p role="alert">{error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
          : !result ? <div className={styles.skeleton} role="status" aria-label="Loading notifications">{[1, 2, 3].map(key => <div key={key} aria-hidden="true"><i /><i /></div>)}</div>
          : !result.items.length ? <div className={styles.empty}><CheckCheck size={30} aria-hidden="true" /><h3>{narrowed ? 'No matching updates' : filter === 'UNREAD' ? 'You’re all caught up' : 'No updates yet'}</h3><p>{narrowed ? 'Try another type or search, or clear these filters to see other updates.' : filter === 'UNREAD' ? 'There are no unread updates for your account.' : 'New order, delivery and return updates will appear here. Earlier activity is not imported.'}</p></div>
          : <ol className={styles.list}>{result.items.map(item => {
            const href = customerNotificationDestination(item), Icon = item.category === 'RETURNS' ? RotateCcw : item.category === 'WARRANTIES' ? ShieldCheck : Package;
            return <li key={item.id} data-unread={!item.readAt || undefined}><span className={styles.itemIcon}><Icon size={20} aria-hidden="true" /></span><div className={styles.copy}>
              <div className={styles.itemTitle}><h3>{item.title}</h3>{!item.readAt && <span>Unread</span>}</div><p>{item.message}</p>
              <time>{customerNotificationTime(item.createdAt)}</time><div className={styles.itemActions}>
                {href ? <button type="button" className={styles.textAction} disabled={pending} onClick={() => update(item, href)}>{item.target.type === 'RETURN' ? 'View return update' : 'View order'}<ArrowUpRight size={17} aria-hidden="true" /></button> : <small>Record link unavailable</small>}
                <button type="button" className={styles.textAction} disabled={pending} aria-label={`Mark ${item.title} ${item.readAt ? 'unread' : 'read'}`} onClick={() => update(item)}>Mark {item.readAt ? 'unread' : 'read'}</button>
              </div></div></li>;
          })}</ol>}
      </div>
      <footer className={styles.footer}><span className={styles.srOnly} role="status">{announcement}</span><span>{pending ? 'Saving…' : result?.total ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, result.total)} of ${result.total}` : '10 updates per page'}</span>
        <nav aria-label="Notification pages"><button type="button" className={styles.iconButton} aria-label="Previous notifications page" disabled={expired || pending || loading || page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={18} aria-hidden="true" /></button><span>Page {page}{result ? ` of ${result.totalPages}` : ''}</span><button type="button" className={styles.iconButton} aria-label="Next notifications page" disabled={expired || pending || loading || !result || page >= result.totalPages} onClick={() => setPage(value => value + 1)}><ChevronRight size={18} aria-hidden="true" /></button></nav>
      </footer>
      <Toaster id={titleId} className={styles.toaster} position="bottom-right" theme="light" richColors duration={2500} visibleToasts={1} toastOptions={{ style: { fontFamily: 'inherit', fontSize: 13 } }} />
    </dialog>, document.body)}
  </div>;
}
