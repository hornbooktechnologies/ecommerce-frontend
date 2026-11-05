'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import styles from './merchandising-analytics.module.css';
const Context = createContext(null),
  privacyBlocked = () =>
    typeof navigator !== 'undefined' &&
    (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1');
async function api(action, body) {
  const response = await fetch(`/api/merchandising/${action}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    ...(body
      ? { body: JSON.stringify(body), keepalive: action === 'events' }
      : {}),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error?.message || 'Optional analytics unavailable.');
  return data.data;
}
export function MerchandisingProvider({ children }) {
  const [state, setState] = useState({
      ready: false,
      enabled: false,
      expiresAt: null,
      privacySignal: false,
    }),
    [error, setError] = useState(''),
    pathname = usePathname(),
    active = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const data = await api('settings');
      setState({
        ready: true,
        ...data,
        privacySignal: privacyBlocked() || data.privacySignal,
      });
      setError('');
    } catch (cause) {
      setState({ ready: true, enabled: false });
      setError(cause.message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);
  const save = useCallback(async (enabled) => {
    active.current = false;
    setError('');
    try {
      const data = await api('consent', {
        enabled: enabled && !privacyBlocked(),
        consent: enabled && !privacyBlocked(),
      });
      setState({
        ready: true,
        ...data,
        privacySignal: privacyBlocked() || data.privacySignal,
      });
      return data.enabled;
    } catch (cause) {
      setState((current) => ({ ...current, enabled: false }));
      setError(cause.message);
      throw cause;
    }
  }, []);
  const enabled =
    state.enabled &&
    !state.privacySignal &&
    !privacyBlocked() &&
    (!state.expiresAt || Date.parse(state.expiresAt) > Date.now());
  useEffect(() => {
    active.current = Boolean(enabled);
    if (!enabled) return;
    const sent = new Set(),
      observed = new WeakMap(),
      timers = new Map();
    let stopped = false;
    const send = (payload) => {
      if (active.current && !privacyBlocked())
        void api('events', payload)
          .then((result) => {
            if (result.recorded === false) active.current = false;
          })
          .catch(() => {});
    };
    const source = (node) => ({
      sourceKind: node.dataset.merchKind,
      sourceKey: node.dataset.merchKey,
    });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target,
            root = node.closest('[data-merch-kind]'),
            key = root && `${root.dataset.merchKind}:${root.dataset.merchKey}`;
          if (!root || sent.has(key)) continue;
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.25 &&
            document.visibilityState === 'visible'
          ) {
            if (!timers.has(node))
              timers.set(
                node,
                setTimeout(() => {
                  timers.delete(node);
                  if (
                    !stopped &&
                    document.visibilityState === 'visible' &&
                    node.isConnected &&
                    key === `${root.dataset.merchKind}:${root.dataset.merchKey}`
                  ) {
                    sent.add(key);
                    send({ ...source(root), kind: 'VIEW' });
                  }
                }, 800),
              );
          } else {
            clearTimeout(timers.get(node));
            timers.delete(node);
          }
        }
      },
      { threshold: 0.25 },
    );
    const discover = () => {
      document.querySelectorAll('[data-merch-kind]').forEach((root) => {
        const node = root.querySelector('[data-merch-view]') || root,
          key = `${root.dataset.merchKind}:${root.dataset.merchKey}`;
        if (observed.get(node) !== key) {
          clearTimeout(timers.get(node));
          timers.delete(node);
          observer.unobserve(node);
          observed.set(node, key);
          observer.observe(node);
        }
      });
    };
    discover();
    const mutations = new MutationObserver(discover);
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-merch-key'],
    });
    const click = (event) => {
      if (!event.isTrusted || event.button > 1) return;
      const anchor = event.target.closest?.('a[href]'),
        root = anchor?.closest('[data-merch-kind]');
      if (!root) return;
      const url = new URL(anchor.href, location.origin);
      if (url.origin !== location.origin) return;
      const product = url.pathname.match(/^\/p\/([A-Za-z0-9_-]{1,320})$/);
      if (product)
        send({ ...source(root), kind: 'CLICK', productSlug: product[1] });
      else if (
        root.dataset.merchKind !== 'COLLECTION' &&
        /^\/collections\/[a-z0-9-]+$/.test(url.pathname)
      )
        send({ ...source(root), kind: 'OPEN' });
    };
    document.addEventListener('click', click, true);
    document.addEventListener('auxclick', click, true);
    const visibility = () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      if (document.visibilityState === 'visible')
        document.querySelectorAll('[data-merch-kind]').forEach((root) => {
          const node = root.querySelector('[data-merch-view]') || root;
          observer.unobserve(node);
          observer.observe(node);
        });
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true;
      active.current = false;
      observer.disconnect();
      mutations.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      document.removeEventListener('click', click, true);
      document.removeEventListener('auxclick', click, true);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled, pathname]);
  const value = useMemo(
    () => ({ ...state, enabled, error, save, refresh }),
    [state, enabled, error, save, refresh],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function MerchandisingConsent() {
 const {t: _uiText}=useUiLocalization();

  const context = useContext(Context),
    [hydrated, setHydrated] = useState(false),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  // The streamed footer may hydrate after its provider has already fetched settings.
  // Keep this component's server and first client render identical in that case.
  useEffect(() => setHydrated(true), []);
  useEffect(() => setChecked(Boolean(context?.enabled)), [context?.enabled]);
  if (!context) return null;
  if (!hydrated || !context.ready) return <p role="status" className={styles.consent}>Loading optional analytics preference…</p>;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const enabled = await context.save(checked);
      setNotice(
        enabled
          ? 'Optional analytics enabled for this browser for 24 hours.'
          : 'Optional analytics turned off.',
      );
    } catch {
      /* Context retains the error; commerce remains available. */
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className={styles.consent}>
      <summary>Optional store analytics</summary>
      <form onSubmit={submit}>
        <p>
          Help this store understand collection and campaign performance. Off by
          default. No names or email addresses are recorded; this does not
          follow you across devices. Consent lasts 24 hours.
        </p>
        <label>
          <input
            type="checkbox"
            checked={checked}
            disabled={busy || !context.ready || context.privacySignal}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>
            Allow collection views, product clicks and purchase attribution in
            this browser
          </span>
        </label>
        <p>
          Turn off at any time to stop new events and attribution. Already
          recorded aggregate report counts are retained. Separate from
          newsletter and shopping-reminder consent.
        </p>
        {context.privacySignal && (
          <p>Your browser’s privacy preference keeps analytics off.</p>
        )}
        {context.error && (
          <p role="alert">
            {context.error}{' '}
            <button type="button" onClick={() => void context.refresh()}>
              Retry preferences
            </button>
          </p>
        )}
        <button
          type="submit"
          disabled={
            busy ||
            !context.ready ||
            checked === context.enabled ||
            context.privacySignal
          }
        >
          {busy ? _uiText("Saving…") : 'Save analytics preference'}
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
  );
}
