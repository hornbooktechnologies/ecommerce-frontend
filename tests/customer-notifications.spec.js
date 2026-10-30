import { test, expect } from '@playwright/test';
import { inboxProxyRoute, customerNotificationDestination, customerNotificationTime } from '../src/lib/customer-inbox';

const customerId = '018f47f2-6b6d-7c34-ae31-8f4f17b79b79';
const orderId = '018f47f2-6b6d-7c34-ae31-8f4f17b79b80';
const notificationId = index => `018f47f2-6b6d-7c34-ae31-${String(index).padStart(12, '0')}`;
const notification = index => ({ id: notificationId(index), category: index === 2 ? 'RETURNS' : 'ORDERS', title: index === 2 ? 'Your return was approved' : `Order update ${index}`, message: index === 2 ? 'Your store approved the return. View your order for the next steps.' : 'Your order has a new update. Check the latest delivery information.', createdAt: '2026-10-29T07:30:00Z', readAt: null, target: { type: index === 2 ? 'RETURN' : 'ORDER', id: index === 2 ? notificationId(90) : orderId, orderId } });

test('proxy permits only scoped notification paths and bounded filters', () => {
  expect(inboxProxyRoute(['notifications'], 'GET', '')).toEqual({ query: '?filter=ALL&page=1&pageSize=10' });
  expect(inboxProxyRoute(['notifications', notificationId(1)], 'PATCH', '')).toEqual({ query: '' });
  expect(inboxProxyRoute(['notifications', 'read-all'], 'POST', '')).toEqual({ query: '' });
  for (const query of ['?customerId=other', '?tenantId=other', '?page=0', '?page=10001', '?pageSize=999', '?filter=ALL&filter=UNREAD', '?filter=INVALID']) expect(inboxProxyRoute(['notifications'], 'GET', query)).toBeNull();
  expect(inboxProxyRoute(['notifications', 'unread-count'], 'GET', '?recipientId=other')).toBeNull();
  expect(inboxProxyRoute(['notifications', 'read-all'], 'GET', '')).toBeNull();
  expect(inboxProxyRoute(['notifications', '../me'], 'PATCH', '')).toBeNull();
  expect(inboxProxyRoute(['notifications', notificationId(1), 'extra'], 'PATCH', '')).toBeNull();
});

test('destinations are allowlisted and invalid dates are safe', () => {
  expect(customerNotificationDestination(notification(1))).toBe(`/account/orders/${orderId}`);
  expect(customerNotificationDestination(notification(2))).toBe(`/account/orders/${orderId}#after-sales-heading`);
  for (const target of [{ type: 'ORDER', id: 'javascript:alert(1)' }, { type: 'SELLER_ORDER', id: orderId }, { type: 'RETURN', id: orderId }, { url: 'https://example.com' }]) expect(customerNotificationDestination({ target })).toBeNull();
  expect(customerNotificationTime('not-a-date')).toBe('Date unavailable');
  expect(customerNotificationTime(null)).toBe('Date unavailable');
  expect(customerNotificationTime('2026-10-29T07:30:00Z')).toContain('IST');
});

async function fixture(page, size = 12) {
  const state = { items: Array.from({ length: size }, (_, index) => notification(index + 1)), customer: { id: customerId, firstName: 'Aarav', email: 'test@example.invalid' }, fail: false, expired: false, mutations: [], requests: [], delayList: null };
  await page.route('**/api/customer/**', async route => {
    const url = new URL(route.request().url()), method = route.request().method();
    const json = data => route.fulfill({ json: { data } });
    if (url.pathname === '/api/customer/me') return state.customer ? json({ customer: state.customer, addresses: [] }) : route.fulfill({ status: 401, json: { error: { message: 'Sign in.' } } });
    if (url.pathname.includes('/notifications')) {
      state.requests.push({ path: url.pathname, query: url.search, method });
      if (state.expired || state.fail) return route.fulfill({ status: state.expired ? 401 : 503, json: { error: { message: state.expired ? 'Please sign in again.' : 'Notifications temporarily unavailable.' } } });
      const unreadCount = () => state.items.filter(item => !item.readAt).length;
      if (url.pathname.endsWith('/unread-count')) return json({ unreadCount: unreadCount() });
      if (method !== 'GET') {
        const body = route.request().postDataJSON(); state.mutations.push(body);
        if (url.pathname.endsWith('/read-all')) { const boundary = state.items.findIndex(item => item.id === body.throughId); state.items.forEach((item, index) => { if (index >= boundary) item.readAt = '2026-10-29T08:00:00Z'; }); }
        else { const item = state.items.find(item => url.pathname.endsWith(item.id)); item.readAt = body.read ? '2026-10-29T08:00:00Z' : null; }
        return json({ read: body.read ?? true });
      }
      const items = state.items.filter(item => url.searchParams.get('filter') !== 'UNREAD' || !item.readAt), number = Number(url.searchParams.get('page') || 1);
      const response = { items: items.slice((number - 1) * 10, number * 10).map(item => ({ ...item })), total: items.length, page: number, pageSize: 10, totalPages: Math.max(1, Math.ceil(items.length / 10)), readThroughId: state.items[0]?.id || null, unreadCount: unreadCount() };
      if (state.delayList) await state.delayList;
      return json(response);
    }
    if (url.pathname.endsWith('/orders/list')) return json({ items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } });
    if (url.pathname.endsWith('/orders/read')) return route.fulfill({ status: 404, json: { error: { message: 'This test order is unavailable.' } } });
    return json({ items: [], cart: [], wishlist: [], customer: state.customer });
  });
  return state;
}

const bell = page => page.getByRole('button', { name: /^Notifications/ });
const panel = page => page.getByRole('dialog', { name: 'Your updates' });

test('signed-in inbox supports pagination, persisted reads, unread filter and safe mark-all', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/account/orders');
  await expect(bell(page)).toHaveAccessibleName('Notifications, 12 unread');
  await bell(page).click();
  const dialog = panel(page);
  await expect(dialog.locator('ol > li')).toHaveCount(10);
  await expect(dialog.getByText('1–10 of 12')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close notifications' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Next notifications page' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close notifications' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Next notifications page' }).click();
  await expect(dialog.getByText('11–12 of 12')).toBeVisible();
  await dialog.getByRole('button', { name: 'Previous notifications page' }).click();
  await dialog.getByRole('button', { name: 'Mark Order update 1 read', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Mark Order update 1 unread', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(bell(page)).toBeFocused();
  await page.reload(); await bell(page).click();
  await expect(panel(page).getByRole('button', { name: 'Mark Order update 1 unread', exact: true })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(panel(page).getByText('Order update 1', { exact: true })).toHaveCount(0);
  state.items.unshift(notification(20)); // New arrival after the displayed snapshot.
  await panel(page).getByRole('button', { name: 'Mark all read' }).click();
  await expect(panel(page).getByText('Order update 20', { exact: true })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
  expect(state.mutations.at(-1)).toEqual({ throughId: notificationId(1) });
  expect(state.requests.filter(request => request.query).every(request => request.query.includes('pageSize=10'))).toBe(true);
});

test('return update links to its order after-sales section', async ({ page }) => {
  await fixture(page, 2); await page.goto('/account/orders'); await bell(page).click();
  await panel(page).getByRole('button', { name: 'View return update' }).click();
  await expect(page).toHaveURL(new RegExp(`/account/orders/${orderId}#after-sales-heading$`));
  await expect(panel(page)).not.toBeVisible();
});

test('errors can be retried, empty state is honest, expired session hides content', async ({ page }) => {
  const state = await fixture(page, 0); state.fail = true;
  await page.goto('/account/orders'); await bell(page).click();
  await expect(panel(page).getByText('Updates unavailable')).toBeVisible();
  state.fail = false; await panel(page).getByRole('button', { name: 'Try again' }).click();
  await expect(panel(page).getByText('No updates yet')).toBeVisible();
  state.items.push(notification(1)); await panel(page).getByRole('button', { name: 'Refresh notifications' }).click();
  await expect(panel(page).getByText('Order update 1', { exact: true })).toBeVisible();
  state.expired = true; await panel(page).getByRole('button', { name: 'Refresh notifications' }).click();
  await expect(panel(page).getByRole('link', { name: 'Sign in again' })).toBeVisible();
  await expect(panel(page).getByText('Order update 1', { exact: true })).toHaveCount(0);
});

test('logout clears the inbox and aborts a late response before a different account signs in', async ({ page }) => {
  const state = await fixture(page, 1); let release;
  await page.goto('/account/orders'); await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
  state.delayList = new Promise(resolve => { release = resolve; });
  await bell(page).click(); await expect(panel(page).getByRole('status', { name: 'Loading notifications' })).toBeVisible();
  state.customer = null; await page.evaluate(() => window.dispatchEvent(new Event('customer-account-changed')));
  await expect(bell(page)).toHaveCount(0); await expect(panel(page)).toHaveCount(0);
  release(); state.delayList = null; state.items = []; state.customer = { id: notificationId(80), firstName: 'Second', email: 'second@example.invalid' };
  await page.evaluate(() => window.dispatchEvent(new Event('customer-account-changed')));
  await bell(page).click(); await expect(panel(page).getByText('No updates yet')).toBeVisible();
  await expect(page.getByText('Order update 1', { exact: true })).toHaveCount(0);
});

for (const [width, height] of [[320, 740], [375, 812], [768, 1024], [844, 390], [1440, 1000]]) {
  test(`homepage and notification panel fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await fixture(page); await page.goto('/'); await bell(page).click();
    await expect(panel(page).getByText('Order update 1', { exact: true })).toBeVisible();
    const box = await panel(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width); expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/storefront/notifications-${width}.png` });
    await panel(page).getByRole('button', { name: 'Close notifications' }).click();
    await expect(panel(page)).toHaveCount(0); await expect(bell(page)).toBeFocused();
    await page.getByRole('button', { name: 'Check delivery', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close delivery checker' }).click();
    await page.goto('/account/orders'); await bell(page).click();
    await expect(panel(page).getByText('Order update 1', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `test-results/storefront/notifications-header-${width}.png` });
  });
}

test('normal motion, visible toast and hidden-tab polling', async ({ page }) => {
  const state = await fixture(page, 1); await page.goto('/account/orders');
  await bell(page).click();
  await panel(page).getByRole('button', { name: 'Mark Order update 1 read', exact: true }).click();
  const toast = panel(page).locator('[data-sonner-toast]'); await expect(toast).toBeVisible();
  const outer = await panel(page).boundingBox(), inner = await toast.boundingBox();
  expect(inner.x).toBeGreaterThanOrEqual(outer.x); expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
  await page.keyboard.press('Escape'); await expect(panel(page)).not.toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const before = state.requests.length;
  await page.clock.install(); await page.clock.fastForward(31000);
  expect(state.requests.length).toBe(before);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => state.requests.length).toBeGreaterThan(before);
});

test('guest has no inbox; actual proxy rejects unapproved routes and cross-origin mutations', async ({ page, request }) => {
  const state = await fixture(page); state.customer = null;
  await page.goto('/account/orders'); await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  await expect(bell(page)).toHaveCount(0);
  for (const path of ['notifications?customerId=other', 'notifications?page=0', 'notifications/unread-count?storeId=other']) expect((await request.get(`/api/customer/${path}`)).status()).toBe(404);
  expect((await request.patch(`/api/customer/notifications/${notificationId(1)}`, { headers: { Origin: 'https://untrusted.invalid' }, data: { read: true } })).status()).toBe(403);
});
