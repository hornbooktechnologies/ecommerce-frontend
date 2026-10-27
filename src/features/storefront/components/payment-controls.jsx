'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import styles from './checkout-page.module.css';

let checkoutScript;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const timeout = window.setTimeout(() => failed(), 15000);
    function failed() { clearTimeout(timeout); script.remove(); checkoutScript = null; reject(new Error('The payment window could not load. Check your connection and try again.')); }
    script.onload = () => { clearTimeout(timeout); if (window.Razorpay) resolve(); else failed(); };
    script.onerror = failed; document.head.appendChild(script);
  });
  return checkoutScript;
}
async function paymentRequest(operation, body) {
  const response = await fetch(`/api/customer/checkout/${operation}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Payment status could not be verified. Try refreshing this same order.');
  return payload.data;
}
export default function PaymentControls({ receipt, onUpdated, onBusyChange }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  function working(value) { lock.current = value; setBusy(value); onBusyChange?.(value); }
  async function refresh() {
    if (lock.current) return;
    working(true); setError('');
    try {
      const data = await paymentRequest('read', { quoteId: receipt.quoteId }); onUpdated(data.receipt);
      if (data.receipt.paymentStatus === 'PAID') toast.success('Test payment verified. No real money collected.');
      else toast.info('Payment is not confirmed yet. You can safely retry this same order.');
    } catch (cause) { setError(cause.message); } finally { working(false); }
  }
  async function pay() {
    if (lock.current) return;
    working(true); setError('');
    try {
      await loadCheckout();
      const result = await paymentRequest('pay', { quoteId: receipt.quoteId }); onUpdated(result.receipt);
      if (!result.checkout) { working(false); return; }
      let verifying = false;
      const checkout = new window.Razorpay({ ...result.checkout,
        handler: async (response) => {
          verifying = true;
          try {
            const verified = await paymentRequest('verify', { quoteId: receipt.quoteId, razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
            onUpdated(verified.receipt);
            if (verified.receipt.paymentStatus === 'PAID') toast.success('Test payment verified. No real money collected.');
            else toast.info('Payment is awaiting capture. Refresh payment status shortly.');
          } catch (cause) { setError(`${cause.message} Use “Refresh payment status” before trying again.`); }
          finally { working(false); }
        }, modal: { ondismiss: () => { if (!verifying) { working(false); toast.info('Payment window closed. Your order is saved; resume here anytime.'); } } }
      });
      checkout.on('payment.failed', () => setError('The test payment failed. Retry in the payment window, or close it and refresh payment status.'));
      checkout.open();
    } catch (cause) { setError(cause.message || 'Unable to start payment. Retry this same order.'); working(false); }
  }
  return <section className={styles.paymentPanel} aria-label="Online test payment" aria-busy={busy}>
    <strong>Razorpay Test Mode — no real money</strong>
    <p>{receipt.paymentStatus === 'PAID' ? 'The backend has verified this simulated payment.' : 'Use test payment details only. Closing this window does not cancel your saved order.'}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}>
      {receipt.canPay && <button className={styles.primary} disabled={busy} onClick={pay}>{busy ? 'Checking payment…' : 'Pay online — test mode'}</button>}
      {receipt.paymentStatus !== 'PAID' && <button className={styles.secondary} disabled={busy} onClick={refresh}>Refresh payment status</button>}
    </div>
  </section>;
}
