'use client';

import { useEffect, useState } from 'react';

const guest = { id: '', firstName: '', email: '' };
export function useCustomerSummary() {
  const [customer, setCustomer] = useState(guest);
  useEffect(() => {
    let cancelled = false, controller;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController(); controller = request;
      try {
        const response = await fetch('/api/customer/me', { cache: 'no-store', credentials: 'same-origin', signal: request.signal });
        const result = response.ok ? await response.json() : null;
        if (!cancelled && !request.signal.aborted) setCustomer(result?.data?.customer || guest);
      } catch { if (!cancelled && !request.signal.aborted) setCustomer(guest); }
    };
    const changed = () => { setCustomer(guest); void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hornbook-bag') : null;
    if (channel) channel.onmessage = event => { if (event.data === 'account') changed(); };
    refresh();
    window.addEventListener('customer-account-changed', changed);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { cancelled = true; controller?.abort(); channel?.close(); window.removeEventListener('customer-account-changed', changed); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return customer;
}
