import { NextResponse } from 'next/server';
const cookieName = 'commerce_merchandising',
  headers = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };
const error = (message, status) =>
  NextResponse.json({ error: { message } }, { status, headers });
async function handler(request, context) {
  const { action } = await context.params;
  if (
    !['settings', 'consent', 'events'].includes(action) ||
    request.method !== (action === 'settings' ? 'GET' : 'POST') ||
    request.nextUrl.search
  )
    return error('Not found.', 404);
  if (
    request.method === 'POST' &&
    (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('content-type')?.split(';')[0] !== 'application/json')
  )
    return error('Request could not be verified.', 403);
  let input;
  if (request.method === 'POST') {
    const chunks = [];
    let size = 0;
    const reader = request.body?.getReader();
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2048) {
          await reader.cancel();
          return error('Request too large.', 413);
        }
        chunks.push(value);
      }
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return error('Invalid request.', 400);
    }
  }
  const token = request.cookies.get(cookieName)?.value,
    blocked =
      request.headers.get('sec-gpc') === '1' ||
      request.headers.get('dnt') === '1';
  const origin = (
      process.env.STOREFRONT_API_URL ||
      'http://localhost:4000/api/storefront/v1'
    ).replace(/\/$/, ''),
    tenant = encodeURIComponent(
      process.env.STOREFRONT_TENANT_CODE || 'HORNBOOK_RETAIL',
    ),
    store = encodeURIComponent(process.env.STOREFRONT_STORE_CODE || 'MAIN');
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
  };
  if (!token && (action === 'settings' || action === 'events'))
    return NextResponse.json(
      { data: { enabled: false, recorded: false, privacySignal: blocked } },
      { headers },
    );
  try {
    const target = blocked ? 'consent' : action,
      method = blocked ? 'POST' : request.method;
    const upstream = await fetch(
      `${origin}/${tenant}/stores/${store}/merchandising/${target}`,
      {
        method,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'x-merchandising-token': token } : {}),
        },
        ...(method === 'POST'
          ? {
              body: JSON.stringify(
                blocked ? { enabled: false, consent: false } : input,
              ),
            }
          : {}),
      },
    );
    const payload = await upstream.json(),
      nextToken = payload.data?.sessionToken;
    if (payload.data) delete payload.data.sessionToken;
    if (blocked && payload.data) payload.data.privacySignal = true;
    const response = NextResponse.json(payload, {
      status: upstream.status,
      headers,
    });
    if (upstream.ok && /^[a-f0-9]{64}$/.test(nextToken || ''))
      response.cookies.set(cookieName, nextToken, { ...cookie, maxAge: 86400 });
    if (
      blocked ||
      (action === 'consent' && input?.enabled === false) ||
      (upstream.ok && payload.data?.enabled === false)
    )
      response.cookies.set(cookieName, '', { ...cookie, maxAge: 0 });
    return response;
  } catch {
    const response = error(
      'Optional analytics are temporarily unavailable.',
      503,
    );
    if (blocked || (action === 'consent' && input?.enabled === false))
      response.cookies.set(cookieName, '', { ...cookie, maxAge: 0 });
    return response;
  }
}
export const GET = handler;
export const POST = handler;
