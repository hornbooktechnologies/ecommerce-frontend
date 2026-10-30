const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only these inbox routes can pass through the customer session proxy.
export function inboxProxyRoute(path, method, search) {
  if (path[0] !== 'notifications') return null;
  const params = new URLSearchParams(search);
  if (path.length === 1 && method === 'GET') {
    if ([...params.keys()].some(key => !['filter', 'page', 'pageSize', 'category', 'search'].includes(key) || params.getAll(key).length !== 1)) return null;
    const filter = params.get('filter') || 'ALL', page = params.get('page') || '1', pageSize = params.get('pageSize') || '10';
    if (!['ALL', 'UNREAD'].includes(filter) || !/^[1-9]\d{0,4}$/.test(page) || Number(page) > 10000 || !['10', '20', '50'].includes(pageSize)) return null;
    const category = params.get('category') || 'ALL', search = (params.get('search') || '').trim();
    if (!['ALL', 'ORDERS', 'RETURNS', 'PAYMENTS', 'WARRANTIES'].includes(category) || search.length > 100) return null;
    const query = new URLSearchParams({ filter, page, pageSize });
    if (category !== 'ALL') query.set('category', category);
    if (search) query.set('search', search);
    return { query: `?${query}` };
  }
  if (params.size || path.length !== 2) return null;
  if ((path[1] === 'unread-count' && method === 'GET') || (path[1] === 'read-all' && method === 'POST') || (uuid.test(path[1]) && method === 'PATCH')) return { query: '' };
  return null;
}

export function customerNotificationDestination(item) {
  const target = item?.target;
  if (target?.type === 'ORDER' && uuid.test(target.id || '')) return `/account/orders/${target.id}`;
  if (target?.type === 'RETURN' && uuid.test(target.orderId || '')) return `/account/orders/${target.orderId}#after-sales-heading`;
  if (target?.type === 'WARRANTY_CLAIM' && uuid.test(target.id || '') && uuid.test(target.orderId || '')) return `/account/orders/${target.orderId}`;
  return null;
}

const formatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
export function customerNotificationTime(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? `${formatter.format(parsed)} IST` : 'Date unavailable';
}
