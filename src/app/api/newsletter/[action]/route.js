import { NextResponse } from 'next/server';

const noStore = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };
const failure = (message, status) => NextResponse.json({ error: { message } }, { status, headers: noStore });

export async function POST(request, context) {
  const { action } = await context.params;
  if (!['subscribe', 'confirm', 'unsubscribe'].includes(action) || request.nextUrl.search) return failure('Not found.', 404);
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return failure('This request could not be verified. Reload the page and try again.', 403);
  }
  let body;
  try {
    const chunks = []; let bytes = 0; const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) { await reader.cancel(); return failure('The request is too large.', 413); }
        chunks.push(value);
      }
    }
    body = Buffer.concat(chunks).toString('utf8'); JSON.parse(body);
  } catch { return failure('Invalid request. Please check the form.', 400); }
  const origin = (process.env.STOREFRONT_API_URL || 'http://localhost:4000/api/storefront/v1').replace(/\/$/, '');
  const tenant = encodeURIComponent(process.env.STOREFRONT_TENANT_CODE || 'HORNBOOK_RETAIL');
  const store = encodeURIComponent(process.env.STOREFRONT_STORE_CODE || 'MAIN');
  try {
    // Browser-supplied tenant IDs, cookies and forwarding headers are never sent.
    const upstream = await fetch(`${origin}/${tenant}/stores/${store}/newsletter/${action}`, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body,
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      // Return only safe form errors, never backend traces, IDs, email state or tokens.
      const message = upstream.status === 422
        ? action === 'subscribe' ? 'Enter a valid email address and agree to receive the newsletter.' : 'This newsletter link is invalid. Open the complete link from your latest email.'
        : upstream.status < 500 ? payload.error?.message || 'Please check your request.' : 'Newsletter services are temporarily unavailable. Please try again later.';
      return failure(message, upstream.status >= 500 ? 503 : upstream.status);
    }
    if (typeof payload.data?.message !== 'string') return failure('Newsletter services are temporarily unavailable.', 502);
    return NextResponse.json({ data: { message: payload.data.message } }, { status: upstream.status, headers: noStore });
  } catch { return failure('Newsletter services are temporarily unavailable. Please try again later.', 503); }
}
