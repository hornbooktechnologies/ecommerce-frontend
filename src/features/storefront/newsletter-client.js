export async function newsletterRequest(action, input, signal) {
  const response = await fetch(`/api/newsletter/${action}`, { method: 'POST', cache: 'no-store',
    credentials: 'omit', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Your request could not be completed. Please try again.');
  if (typeof payload.data?.message !== 'string') throw new Error('Unexpected newsletter response. Please try again.');
  return payload.data;
}
