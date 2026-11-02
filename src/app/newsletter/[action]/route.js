// A document Route Handler intentionally bypasses the catalog-dependent root
// layout. Unsubscribe must remain available when a store/catalog is inactive.
const copy = {
  confirm: { title: 'Confirm your subscription.', detail: 'Confirm that you want to receive new arrivals, collections and offers. Opening this page alone does not subscribe you.', button: 'Confirm subscription' },
  unsubscribe: { title: 'Stop newsletter emails?', detail: 'This stops the newsletter for this store, including any pending subscription request. It does not affect order or account emails.', button: 'Unsubscribe from newsletter' },
};
export async function GET(_request, { params }) {
  const { action } = await params; const content = copy[action];
  if (!Object.hasOwn(copy, action)) return new Response('Not found.', { status: 404 });
  return new Response(`<!doctype html><html lang="en-IN"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
    <title>Newsletter preferences | Hornbook Retail</title><link rel="stylesheet" href="/newsletter-preferences.css">
    <script src="/newsletter-preferences.js" defer></script></head><body>
    <header><a href="/" aria-label="Hornbook Retail home">HORNBOOK <span>RETAIL</span></a></header>
    <main><section aria-labelledby="heading" data-newsletter-action="${action}">
      <p class="eyebrow">Newsletter preferences</p><h1 id="heading">${content.title}</h1>
      <p class="description">${content.detail}</p>
      <form id="preferences-form" hidden><button id="submit" type="submit" class="${action === 'unsubscribe' ? 'danger' : ''}">${content.button}</button></form>
      <p id="feedback" role="status" tabindex="-1">Checking your email link…</p>
      <noscript><p>Enable JavaScript to use the complete link from your email, or contact the store to manage your subscription.</p></noscript>
      <a class="back" href="/#newsletter">Back to the store</a>
    </section></main></body></html>`, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', Pragma: 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    } });
}
