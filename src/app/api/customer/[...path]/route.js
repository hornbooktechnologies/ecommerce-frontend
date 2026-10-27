import { NextResponse } from 'next/server';

const cookieName = 'commerce_customer';
const cartCookieName = 'commerce_guest_cart';
const wishlistCookieName = 'commerce_guest_wishlist';
const noStore = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };
const routes = {
  me: ['GET'], register: ['POST'], login: ['POST'], logout: ['POST'],
  'forgot-password': ['POST'], verify: ['POST'], 'reset-password': ['POST'],
  profile: ['PUT'], password: ['POST'], addresses: ['POST'],
  cart: ['PUT', 'DELETE'],
  wishlist: ['PUT'],
};
const jsonError = (message, status) => NextResponse.json({ error: { message } }, { status, headers: noStore });

async function handler(request, context) {
  const { path } = await context.params;
  const key = path.join('/');
  const isCheckout = path.length === 2 && path[0] === 'checkout' && ['options', 'quote', 'place', 'read', 'pay', 'verify'].includes(path[1]);
  const isOrders = path.length === 2 && path[0] === 'orders' && ['list', 'read', 'invoice', 'review', 'after-sales', 'cancel', 'return'].includes(path[1]);
  const isInvoice = key === 'orders/invoice';
  const methods = isOrders || isCheckout || key === 'cart/sync' || key === 'wishlist/sync' ? ['POST'] : path.length === 1 ? routes[key] : path.length === 2 && path[0] === 'addresses' && /^[0-9a-f-]{36}$/i.test(path[1]) ? ['PUT', 'DELETE'] : null;
  const isCart = path[0] === 'cart';
  const isWishlist = path[0] === 'wishlist';
  if (!methods?.includes(request.method) || request.nextUrl.search) return jsonError('Not found.', 404);
  if (request.method !== 'GET' && (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('content-type')?.split(';')[0] !== 'application/json')) {
    return jsonError('This request could not be verified. Reload the page and try again.', 403);
  }
  let body;
  if (request.method !== 'GET') {
    const chunks = []; let bytes = 0;
    const reader = request.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 16384) { await reader.cancel(); return jsonError('The request is too large.', 413); }
        chunks.push(value);
      }
    }
    body = Buffer.concat(chunks).toString('utf8');
    try { JSON.parse(body); } catch { return jsonError('Invalid request.', 400); }
  }
  const origin = (process.env.STOREFRONT_API_URL || 'http://localhost:4000/api/storefront/v1').replace(/\/$/, '');
  const tenant = encodeURIComponent(process.env.STOREFRONT_TENANT_CODE || 'HORNBOOK_RETAIL');
  const store = encodeURIComponent(process.env.STOREFRONT_STORE_CODE || 'MAIN');
  try {
    const token = request.cookies.get(cookieName)?.value;
    const guestToken = request.cookies.get(cartCookieName)?.value;
    const wishlistToken = request.cookies.get(wishlistCookieName)?.value;
    const upstream = await fetch(`${origin}/${tenant}/stores/${store}/${isCart || isCheckout || isWishlist ? '' : 'account/'}${path.map(encodeURIComponent).join('/')}`, {
      method: request.method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isCart && guestToken ? { 'x-cart-token': guestToken } : {}), ...(isWishlist && wishlistToken ? { 'x-wishlist-token': wishlistToken } : {}) }, body,
    });
    if (isInvoice && upstream.ok) {
      if (upstream.headers.get('content-type')?.split(';')[0] !== 'application/pdf') return jsonError('The invoice could not be downloaded. Please try again.', 502);
      const filename = upstream.headers.get('content-disposition')?.match(/filename="([A-Za-z0-9_-]+\.pdf)"/)?.[1] || 'tax-invoice.pdf';
      return new NextResponse(upstream.body, { headers: { ...noStore, 'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`, 'X-Content-Type-Options': 'nosniff' } });
    }
    const payload = await upstream.json();
    const sessionToken = payload.data?.sessionToken;
    const nextGuestToken = payload.data?.guestToken;
    if (payload.data) delete payload.data.sessionToken;
    if (payload.data) delete payload.data.guestToken;
    const response = NextResponse.json(payload, { status: upstream.status, headers: noStore });
    const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/customer' };
    if (isCart && upstream.ok) {
      if (/^[a-f0-9]{64}$/.test(nextGuestToken || '')) response.cookies.set(cartCookieName, nextGuestToken, { ...cookie, maxAge: 30 * 86400 });
      else response.cookies.set(cartCookieName, '', { ...cookie, maxAge: 0 });
    }
    if (isCart && upstream.status === 410) response.cookies.set(cartCookieName, '', { ...cookie, maxAge: 0 });
    if (isWishlist && upstream.ok) {
      if (/^[a-f0-9]{64}$/.test(nextGuestToken || '')) response.cookies.set(wishlistCookieName, nextGuestToken, { ...cookie, maxAge: 30 * 86400 });
      else response.cookies.set(wishlistCookieName, '', { ...cookie, maxAge: 0 });
    }
    if (isWishlist && upstream.status === 410) response.cookies.set(wishlistCookieName, '', { ...cookie, maxAge: 0 });
    if (upstream.ok && ['logout', 'password', 'reset-password'].includes(key)) response.cookies.set(wishlistCookieName, '', { ...cookie, maxAge: 0 });
    if (upstream.ok && ['logout', 'password', 'reset-password'].includes(key)) response.cookies.set(cartCookieName, '', { ...cookie, maxAge: 0 });
    if (upstream.ok && key === 'login' && /^[a-f0-9]{64}$/.test(sessionToken || '')) response.cookies.set(cookieName, sessionToken, { ...cookie, maxAge: 3600 });
    if ((upstream.ok && ['logout', 'password', 'reset-password'].includes(key)) || (upstream.status === 401 && key !== 'login')) response.cookies.set(cookieName, '', { ...cookie, maxAge: 0 });
    return response;
  } catch { return jsonError('Store services are temporarily unavailable. Please try again.', 503); }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
