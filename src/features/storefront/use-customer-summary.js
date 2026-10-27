'use client';

import { useEffect, useState } from 'react';

const guest = { firstName: '', email: '' };
export function useCustomerSummary() {
  const [customer, setCustomer] = useState(guest);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch('/api/customer/me', { cache: 'no-store', credentials: 'same-origin' });
        const result = response.ok ? await response.json() : null;
        if (!cancelled) setCustomer(result?.data?.customer || guest);
      } catch { if (!cancelled) setCustomer(guest); }
    };
    refresh();
    window.addEventListener('customer-account-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { cancelled = true; window.removeEventListener('customer-account-changed', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  return customer;
}
