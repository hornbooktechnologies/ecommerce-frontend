import { test, expect } from '@playwright/test';
import { randomUUID, createHmac, randomBytes } from 'node:crypto';

let connection, server, pool, dao, customerDao, scope, checkoutFixture;
let paymentService;
const gatewayOrders = new Map(), gatewayPayments = new Map();
const paymentSecret = 'browser-test-only-secret';
const mail = [];
test.beforeAll(async () => {
  process.env.LOG_LEVEL = 'silent';
  const backend = new URL('../../ecommerce-backend/', import.meta.url);
  const { config } = await import(new URL('node_modules/dotenv/lib/main.js', backend).href);
  config({ path: new URL('.env', backend), quiet: true });
  const { createApp } = await import(new URL('src/app.js', backend).href);
  const { createCustomerAccountsService } = await import(new URL('src/modules/customer-accounts/customer-accounts.service.js', backend).href);
  const { createStorefrontCartService } = await import(new URL('src/modules/storefront-cart/storefront-cart.service.js', backend).href);
  const { createStorefrontWishlistService } = await import(new URL('src/modules/storefront-wishlist/storefront-wishlist.service.js', backend).href);
  const { createStorefrontCheckoutService } = await import(new URL('src/modules/storefront-checkout/storefront-checkout.service.js', backend).href);
  const { createPaymentsService } = await import(new URL('src/modules/payments/payments.service.js', backend).href);
  const { createCredentialVault } = await import(new URL('src/modules/payments/razorpay.js', backend).href);
  const { createStorefrontService } = await import(new URL('src/modules/storefront/storefront.service.js', backend).href);
  const storefrontDao = await import(new URL('src/modules/storefront/storefront.dao.js', backend).href);
  const { checkDeliveryAvailability } = await import(new URL('src/modules/storefront/delivery-availability.service.js', backend).href);
  ({ checkoutFixture } = await import(new URL('test/helpers/storefront-checkout.fixture.js', backend).href));
  dao = await import(new URL('src/modules/customer-accounts/customer-accounts.dao.js', backend).href);
  customerDao = await import(new URL('src/modules/customers/customers.dao.js', backend).href);
  pool = await import(new URL('src/database/pool-factory.js', backend).href);
  connection = await pool.getPrimaryPool().getConnection();
  const [[clock]] = await connection.query('SELECT @@session.time_zone AS zone');
  expect(clock.zone).toBe('+00:00');
  const scopedDao = Object.fromEntries(Object.entries(dao).map(([name, fn]) => [name, (input) => fn({ ...input, connection })]));
  const service = createCustomerAccountsService({ dao: scopedDao, transaction: async (_id, fn) => fn(connection),
    mailer: { ready: () => {}, send: async (message) => mail.push(message) } });
  scope = await service.scope({ tenantCode: 'HORNBOOK_RETAIL', storeCode: 'MAIN' });
  const cartService = createStorefrontCartService({ accountDao: scopedDao, transaction: async (_id, fn) => fn(connection) });
  const wishlistService = createStorefrontWishlistService({ accountDao: scopedDao, transaction: async (_id, fn) => fn(connection) });
  paymentService = createPaymentsService({ transaction: async (_id, fn) => fn(connection), vault: createCredentialVault(randomBytes(32).toString('hex')), gateway: {
    validate: async () => {}, createOrder: async (_account, amount) => { const order = { id: `order_${randomUUID().replaceAll('-', '')}`, amount, currency: 'INR' }; gatewayOrders.set(order.id, order); return order; },
    payment: async (_account, paymentId) => gatewayPayments.get(paymentId),
    payments: async (_account, orderId) => ({ items: [...gatewayPayments.values()].filter((item) => item.order_id === orderId) })
  } });
  const checkout = createStorefrontCheckoutService({ accountDao: scopedDao, transaction: async (_id, fn) => fn(connection), payments: paymentService });
  const storefront = createStorefrontService({ dao: { ...storefrontDao, listReviews: (input) => storefrontDao.listReviews({ ...input, connection }) },
    delivery: (input) => checkDeliveryAvailability({ ...input, connection }) });
  const app = createApp({ storefrontService: storefront, customerAccountsService: service, storefrontCartService: cartService, storefrontWishlistService: wishlistService, storefrontCheckoutService: checkout });
  server = await new Promise((resolve) => { const listener = app.listen(4109, '127.0.0.1', () => resolve(listener)); });
});
test.beforeEach(async () => { mail.length = 0; await connection.beginTransaction(); });
test.afterEach(async () => { await connection.rollback(); });
test.afterAll(async () => { if (server) await new Promise((resolve) => server.close(resolve)); if (connection) connection.release(); if (pool) await pool.closePrimaryPool(); });

async function register(page) {
  const email = `browser-${randomUUID()}@example.invalid`;
  await page.goto('/account/register');
  await page.getByLabel('First name', { exact: false }).fill('Browser');
  await page.getByLabel('Last name', { exact: true }).fill('Customer');
  await page.getByLabel('Email address', { exact: false }).fill(email);
  await page.getByRole('button', { name: 'Send verification link' }).click();
  await expect(page.getByRole('status').first()).toContainText('link has been sent');
  const verification = mail.filter((message) => message.email === email && message.purpose === 'REGISTER');
  expect(verification).toHaveLength(1);
  await page.goto(`/account/verify#token=${verification[0].token}`);
  await page.getByLabel('New password', { exact: false }).fill('BrowserAccount-123!');
  await page.getByLabel('Confirm password', { exact: false }).fill('BrowserAccount-123!');
  await page.getByRole('button', { name: 'Verify and create account' }).click();
  await expect(page.getByRole('status').first()).toContainText('Email verified');
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await page.getByLabel('Email address', { exact: false }).fill(email);
  await page.locator('input[name="password"]').fill('BrowserAccount-123!');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/customer/login'));
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const response = await responsePromise;
  expect((await response.json()).data.sessionToken).toBeUndefined();
  await expect(page.getByRole('heading', { name: 'Personal details' })).toBeVisible();
  return email;
}

test('homepage order shortcuts use the existing customer session instead of a sign-in placeholder', async ({ page }) => {
  // The dedicated orders menu is desktop-only above the 1500px breakpoint.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await register(page);
  for (const shortcut of ['View all orders', 'Track a package']) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Hello, Browser Account' })).toBeVisible();
    await page.getByRole('button', { name: /Returns\s*&\s*Orders/ }).click();
    const link = page.getByRole('link', { name: shortcut, exact: true });
    await expect(link).toHaveAttribute('href', '/account/orders');
    await link.click();
    await expect(page).toHaveURL(/\/account\/orders$/);
    await expect(page.getByRole('heading', { name: 'Your story starts with your first order.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in to view your orders' })).toHaveCount(0);
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Sign in to view your orders' })).toHaveCount(0);
    expect((await page.request.get('/api/customer/me')).status()).toBe(200);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Hello, Browser Account' }).click();
  await page.getByRole('link', { name: 'My orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My orders.' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.locator('.detail-account-popover').getByRole('link', { name: 'My orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your story starts with your first order.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your story starts with your first order.' })).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/login$/);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page.getByRole('button', { name: /Returns\s*&\s*Orders/ }).click();
  await page.getByRole('link', { name: 'View all orders', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to view your orders' })).toBeVisible();
});

test('wishlist migrates guest items, syncs across devices and isolates sign-out and other accounts', async ({ page, browser }, testInfo) => {
  const headers = { Origin: 'http://localhost:3110' };
  const catalog = (await (await page.request.get('/api/storefront/products?pageSize=12')).json()).data.items;
  expect(catalog.length).toBe(12);
  await page.addInitScript((ids) => {
    if (!localStorage.getItem('wishlist-test-imported')) {
      localStorage.setItem('hornbook-retail-main-cart-v2', JSON.stringify({ state: { wishlist: ids, wishSnapshots: { secret: { name: 'UNTRUSTED SNAPSHOT' } } }, version: 0 }));
      localStorage.setItem('wishlist-test-imported', 'true');
    }
  }, catalog.map((product) => product.id));
  await page.goto('/wishlist');
  await expect(page.getByText('12 saved products', { exact: true })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(10);
  await expect(page.getByText('UNTRUSTED SNAPSHOT')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Wishlist pages' }).getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('navigation', { name: 'Wishlist pages' }).getByRole('button', { name: 'Previous', exact: true }).click();
  const guest = await page.request.post('/api/customer/wishlist/sync', { headers, data: {} });
  expect(guest.status()).toBe(200); expect((await guest.json()).data.guestToken).toBeUndefined();
  const cookie = (await page.context().cookies()).find((item) => item.name === 'commerce_guest_wishlist');
  expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Lax');
  const email = await register(page);
  await page.goto('/wishlist');
  await expect(page.getByText('Saved to your account.', { exact: false })).toBeVisible();
  await expect(page.getByText('12 saved products', { exact: true })).toBeVisible();
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('hornbook-retail-main-cart-v2')).state);
  expect(persisted.wishlist).toBeUndefined(); expect(persisted.wishSnapshots).toBeUndefined(); expect(persisted.legacyWishIds).toEqual([]);
  for (const [width, height] of [[1440, 1000], [768, 1024], [375, 812]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`wishlist-${width}.png`), fullPage: true });
  }
  const secondContext = await browser.newContext({ baseURL: 'http://localhost:3110', viewport: { width: 375, height: 812 } });
  try {
    expect((await secondContext.request.post('/api/customer/login', { headers, data: { email, password: 'BrowserAccount-123!' } })).status()).toBe(200);
    const secondPage = await secondContext.newPage(); await secondPage.goto('/wishlist');
    await expect(secondPage.getByText('12 saved products', { exact: true })).toBeVisible();
    const first = catalog[0];
    await secondPage.getByRole('button', { name: `Remove from wishlist: ${first.name}`, exact: true }).click();
    await expect(secondPage.getByText('11 saved products', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('11 saved products', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Remove from wishlist: ${first.name}`, exact: true })).toHaveCount(0);
    // Server remains authoritative when a saved product is unpublished. Test transaction rolls back.
    await connection.execute("UPDATE products SET publication_status = 'DRAFT' WHERE id = UNHEX(REPLACE(?, '-', '')) AND tenant_id = UNHEX(REPLACE(?, '-', ''))", [catalog[1].id, scope.tenantId]);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove unavailable product' }).click();
    await expect(page.getByText('10 saved products', { exact: true })).toBeVisible();
    await page.goto('/account'); await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.goto('/wishlist');
    await expect(page.getByText('0 saved products', { exact: true })).toBeVisible();
    await register(page); await page.goto('/wishlist');
    await expect(page.getByText('0 saved products', { exact: true })).toBeVisible();
    await secondPage.reload(); await expect(secondPage.getByText('10 saved products', { exact: true })).toBeVisible();
    expect((await page.request.put('/api/customer/wishlist', { data: {} })).status()).toBe(403);
    await page.route('**/api/customer/wishlist/sync', (route) => route.abort());
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
    await page.unroute('**/api/customer/wishlist/sync');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    await page.goto('/');
    await page.getByRole('link', { name: /Wishlist, \d+ saved products/ }).click();
    await expect(page).toHaveURL(/\/wishlist$/);
  } finally { await secondContext.close(); }
});

test('delivery checker uses live PIN rules, schedule cutoffs and capacity on desktop and mobile', async ({ page }, testInfo) => {
  const fixture = await checkoutFixture(connection, scope);
  await connection.execute("UPDATE delivery_zone_postal_codes SET postal_code = '561991' WHERE delivery_zone_id = UNHEX(REPLACE(?, '-', ''))", [fixture.zoneId]);
  const check = async (expected) => {
    const response = await page.request.get('/api/storefront/delivery-availability?postalCode=561991');
    expect(response.ok()).toBe(true);
    expect(response.headers()['cache-control']).toBe('no-store');
    const data = (await response.json()).data;
    expect(data.status).toBe(expected);
    expect(data).not.toHaveProperty('zoneId');
    return data;
  };
  await check('AVAILABLE');
  expect((await page.request.get('/api/storefront/delivery-availability?postalCode=001')).status()).toBe(422);
  await page.goto('/');
  await page.getByRole('button', { name: 'Check delivery', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Do we deliver to you?' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('alert')).toContainText('six-digit');
  await modal.getByLabel('Delivery PIN code').fill('561991');
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('status')).toContainText('Delivery available');
  await page.screenshot({ path: testInfo.outputPath('delivery-desktop.png') });
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Check delivery', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await connection.execute("UPDATE delivery_slot_instances SET reserved_orders = order_capacity WHERE id = UNHEX(REPLACE(?, '-', ''))", [fixture.slotId]);
  await check('FULL');
  await connection.execute("UPDATE delivery_slot_instances SET reserved_orders = 0, weight_capacity = 5, reserved_weight = 5 WHERE id = UNHEX(REPLACE(?, '-', ''))", [fixture.slotId]);
  await check('FULL');
  await connection.execute("UPDATE delivery_slot_templates SET cutoff_minutes = 6000 WHERE id = UNHEX(REPLACE(?, '-', ''))", [fixture.templateId]);
  await check('BOOKING_CLOSED');
  await connection.execute("UPDATE delivery_slot_templates SET status = 'INACTIVE' WHERE id = UNHEX(REPLACE(?, '-', ''))", [fixture.templateId]);
  await check('NOT_SCHEDULED');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/products');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Check delivery', exact: true }).click();
  await modal.getByLabel('Delivery PIN code').fill('561991');
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('status')).toContainText('no delivery slots are scheduled');
  await page.screenshot({ path: testInfo.outputPath('delivery-mobile.png') });
  await connection.execute("UPDATE delivery_zones SET status = 'INACTIVE' WHERE id = UNHEX(REPLACE(?, '-', ''))", [fixture.zoneId]);
  await check('UNSUPPORTED');
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('status')).toContainText('Outside our delivery area');
  await modal.getByLabel('Delivery PIN code').fill('561992');
  await expect(modal.getByRole('status')).not.toContainText('561991');
  await page.route('**/api/storefront/delivery-availability?*', (route) => route.abort());
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('alert')).toContainText('Please try again');
  await modal.getByRole('button', { name: 'Close delivery checker' }).click();
  await page.unroute('**/api/storefront/delivery-availability?*');
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Check delivery', exact: true }).click();
  await expect(modal).toBeVisible();
  await page.setViewportSize({ width: 812, height: 375 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await modal.getByLabel('Delivery PIN code').fill('561991');
  await modal.getByRole('button', { name: 'Check availability' }).click();
  await expect(modal.getByRole('status')).toContainText('Outside our delivery area');
  await modal.getByRole('button', { name: 'Close delivery checker' }).click();
});

test('View all products opens a live product listing with pagination and responsive filters', async ({ page }, testInfo) => {
  const response = await page.request.get('/api/storefront/products?pageSize=10&inStock=false&sort=featured');
  expect(response.ok()).toBe(true);
  const catalog = (await response.json()).data;
  await page.goto('/');
  const link = page.getByRole('link', { name: 'View all products', exact: true });
  await expect(link).toHaveAttribute('href', '/products');
  await link.click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: 'All products.', exact: true })).toBeVisible();
  await expect(page.locator('.category-results .product-card')).toHaveCount(Math.min(10, catalog.total));
  await expect(page.locator('.category-results .product-title').first()).toHaveText(catalog.items[0].name);
  if (catalog.totalPages > 1) {
    await page.getByRole('navigation', { name: 'Product pages' }).getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.catalog-pagination')).toContainText('Page 2');
    await page.getByRole('navigation', { name: 'Product pages' }).getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(page.locator('.catalog-pagination')).toContainText('Page 1');
  }
  await page.getByLabel('Sort by', { exact: false }).selectOption('price_asc');
  const sorted = (await (await page.request.get('/api/storefront/products?pageSize=10&inStock=false&sort=price_asc')).json()).data;
  await expect(page.locator('.category-results .product-title').first()).toHaveText(sorted.items[0].name);
  await page.getByLabel('In stock only').check();
  await expect(page.locator('.category-results .product-card').first()).toBeVisible();
  for (const [width, height] of [[1440, 1000], [768, 1024], [375, 812]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`products-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByLabel('Brand', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close filters' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'All products.' })).toBeVisible();
  await expect(page.locator('.category-results .product-card')).toHaveCount(Math.min(10, catalog.total));
});

test('collection shortcuts and legacy search open the live catalogue without a 404', async ({ page }) => {
  await register(page);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, name] of [['/account/orders', 'Explore the collection'], ['/cart', 'Explore products'], ['/cart', 'Continue exploring'], ['/checkout', 'Explore products']]) {
      await page.goto(path);
      const link = page.getByRole('link', { name, exact: false });
      await expect(link).toHaveAttribute('href', '/#discover');
      await link.click();
      await expect(page).toHaveURL(/\/#discover$/);
      await expect(page.locator('#discover .product-card').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: '404', exact: true })).toHaveCount(0);
    }
  }
  await page.goto('/search');
  await expect(page).toHaveURL(/\/#discover$/);
  await expect(page.locator('#discover .product-card').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('#discover .product-card').first()).toBeVisible();
});

test('checkout displays saved and previous-order addresses with default selection and safe reuse', async ({ page }, testInfo) => {
  await checkoutFixture(connection, scope);
  const email = await register(page);
  const headers = { Origin: 'http://localhost:3110' };
  const home = { label: 'Home', contactName: 'Browser Customer', phone: '+919876543210', line1: '10 Saved Home Road', line2: 'Apartment 2', landmark: 'Near the park', city: 'Bengaluru', stateCode: 'KA', postalCode: '560001', isDefault: true };
  expect((await page.request.post('/api/customer/addresses', { headers, data: home })).status()).toBe(200);
  const work = { ...home, label: 'Work', line1: '20 Saved Office Road', isDefault: false };
  expect((await page.request.post('/api/customer/addresses', { headers, data: work })).status()).toBe(200);
  const account = await dao.findAccount({ tenantId: scope.tenantId, email, connection });
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const previous = { ...home, line1: '30 Previous Order Road', line2: 'Floor 3', landmark: 'Near the library', stateName: 'Karnataka', phone: '' };
  const previousOrderId = randomUUID();
  const insertOrder = async (id, address) => connection.execute(`INSERT INTO customer_orders
    (id, tenant_id, store_id, customer_id, order_number, status, billing_address_snapshot, shipping_address_snapshot, customer_snapshot, internal_notes)
    VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, 'PRIVATE_ADDRESS_TEST')`,
  [binary(id), binary(scope.tenantId), binary(scope.storeId), binary(account.customerId), `ADDR-${id}`, JSON.stringify(address), JSON.stringify(address), JSON.stringify({ name: 'Browser Customer', phone: home.phone })]);
  await insertOrder(previousOrderId, previous);
  await insertOrder(randomUUID(), previous);
  await insertOrder(randomUUID(), { ...home, stateName: 'Karnataka' });
  const historyDao = await import('../../ecommerce-backend/src/modules/storefront-checkout/storefront-checkout.dao.js');
  for (const key of ['tenantId', 'storeId', 'customerId']) {
    expect(await historyDao.previousAddresses({ ...scope, customerId: account.customerId, [key]: randomUUID(), connection })).toEqual([]);
  }
  const product = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data.items[0];
  await page.goto(`/p/${product.slug}`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Added to bag', exact: true })).toBeVisible();
  await page.goto('/checkout');
  const saved = page.getByRole('group', { name: 'Saved delivery addresses' });
  await expect(saved.getByRole('radio')).toHaveCount(2);
  await expect(saved.getByRole('radio', { name: /Deliver to Home/ })).toBeChecked();
  await expect(saved).toContainText('Apartment 2, Near the park');
  await expect(page.getByLabel('Delivery slot')).toBeEnabled();
  await saved.getByRole('radio', { name: /Deliver to Work/ }).check();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(saved.getByRole('radio', { name: /Deliver to Work/ })).toBeChecked();
  const history = page.getByRole('region', { name: 'Previous order addresses' });
  await expect(history.getByRole('button', { name: /Use address from order/ })).toHaveCount(1);
  await expect(history).toContainText('30 Previous Order Road');
  await expect(page.getByRole('main')).not.toContainText('PRIVATE_ADDRESS_TEST');
  for (const [width, height] of [[1440, 1000], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`checkout-addresses-${width}.png`), fullPage: true });
  }
  await history.getByRole('button', { name: /Use address from order/ }).click();
  await expect(page.getByLabel('Address line 1', { exact: false })).toHaveValue(previous.line1);
  await expect(page.getByLabel('Phone number')).toHaveValue(home.phone);
  await page.getByLabel('Landmark', { exact: true }).fill('Near the library');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Landmark', { exact: true })).toHaveValue('Near the library');
  await page.getByRole('button', { name: 'Save delivery address' }).click();
  await expect(saved.getByRole('radio')).toHaveCount(3);
  await expect(saved.getByRole('radio', { name: /Deliver to Previous delivery/ })).toBeChecked();
  await expect(history).toHaveCount(0);
  await page.reload();
  await expect(saved.getByRole('radio')).toHaveCount(3);
  await expect(saved.getByRole('radio', { name: /Deliver to Home/ })).toBeChecked();
  const options = await page.request.post('/api/customer/checkout/options', { headers, data: {} });
  const result = (await options.json()).data;
  expect(result.addresses).toHaveLength(3); expect(result.previousAddresses).toEqual([]);
  expect((await page.request.post('/api/customer/checkout/options', { headers, data: { addressId: randomUUID() } })).status()).toBe(404);
});

test('checkout saves an address, validates a coupon, creates one unpaid order and recovers a lost response', async ({ page }, testInfo) => {
  const fixture = await checkoutFixture(connection, scope);
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const email = await register(page);
  const list = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data;
  const product = list.items[0];
  await page.goto(`/p/${product.slug}`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Added to bag', exact: true })).toBeVisible();
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Add delivery address', exact: true }).click();
  await page.getByLabel('Address label', { exact: true }).fill('Checkout home');
  await page.getByLabel('Recipient name').fill('Test Recipient');
  await page.getByLabel('Phone number').fill('+919876543210');
  await page.getByLabel('Address line 1').fill('123 Browser Rollback Road');
  await page.getByLabel('City', { exact: false }).fill('Bengaluru');
  await page.getByRole('textbox', { name: 'PIN code', exact: false }).fill('560001');
  await page.getByLabel('State / union territory').selectOption('KA');
  await page.getByRole('button', { name: 'Save delivery address' }).click();
  await expect(page.getByLabel('Delivery slot')).toBeEnabled();
  await page.getByLabel('Delivery slot').selectOption(fixture.slotId);
  await page.getByLabel('Coupon code').fill('INVALID-CHECKOUT-TEST');
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('coupon');
  await page.getByLabel('Coupon code').fill(fixture.couponCode);
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Everything in its place.' })).toBeVisible();
  const attempt = new URL(page.url()).searchParams.get('attempt');
  expect(attempt).toBeTruthy();
  await expect(page.getByText('Included item GST', { exact: true })).toBeVisible();
  for (const [width, height] of [[1440, 1000], [768, 1024], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`checkout-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  let firstReceipt; let dropped = false;
  await page.route('**/api/customer/checkout/place', async (route) => {
    const response = await route.fetch();
    if (!dropped && response.ok()) { firstReceipt = (await response.json()).data.receipt; dropped = true; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Place COD order', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Place COD order', exact: true }).click();
  await expect(page.getByRole('heading', { name: firstReceipt.orderNumber, exact: true })).toBeVisible();
  await expect(page.getByText('Cash on delivery', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/#discover');
  await page.reload();
  await expect(page.getByRole('heading', { name: firstReceipt.orderNumber, exact: true })).toBeVisible();
  const account = await dao.findAccount({ tenantId: scope.tenantId, email, connection });
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM customer_orders WHERE tenant_id = ? AND customer_id = ?', [binary(scope.tenantId), binary(account.customerId)]);
  expect(Number(count.total)).toBe(1);
  const [[order]] = await connection.execute('SELECT source, status, payment_status FROM customer_orders WHERE id = ?', [binary(firstReceipt.id)]);
  expect(order.source).toBe('STOREFRONT'); expect(order.payment_status).toBe('UNPAID'); expect(order.status).toBe('PLACED');
  const [[coupon]] = await connection.execute('SELECT usage_count FROM coupons WHERE id = ?', [binary(fixture.couponId)]); expect(coupon.usage_count).toBe(1);
  // Read the actual checkout order through the customer proxy and MariaDB DAO.
  await page.getByRole('link', { name: 'Track your order' }).click();
  await expect(page.getByRole('heading', { name: firstReceipt.orderNumber, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items in your order' })).toBeVisible();
  await expect(page.getByText('123 Browser Rollback Road', { exact: false })).toBeVisible();
  await expect(page.getByText('Selected delivery slot', { exact: true })).toBeVisible();
  await expect(page.getByText('No invoice has been issued yet.', { exact: false })).toBeVisible();
  // Test-only invoice fixture in this test's rollback transaction. No live invoice is issued.
  const invoiceId = randomUUID(), invoiceNumber = `TEST-${invoiceId}`;
  const registrationId = randomUUID(), sellerAddressId = randomUUID();
  await connection.execute(`INSERT INTO addresses (id, tenant_id, line1, city, state_code, state_name, postal_code)
    VALUES (?, ?, '1 Rollback Vendor Road', 'Bengaluru', 'KA', 'Karnataka', '560001')`, [binary(sellerAddressId), binary(scope.tenantId)]);
  await connection.execute(`INSERT INTO gst_registrations
    (id, tenant_id, store_id, merchant_id, gstin, legal_name, trade_name, registration_type, state_code, address_id)
    SELECT ?, so.tenant_id, ?, so.merchant_id, ?, 'Invoice Test Vendor Pvt Ltd', 'Invoice Test Vendor', 'REGULAR', '29', ?
    FROM seller_orders so WHERE so.customer_order_id = ? LIMIT 1`,
  [binary(registrationId), binary(scope.storeId), `TEST${registrationId.replaceAll('-', '').slice(0, 11)}`, binary(sellerAddressId), binary(firstReceipt.id)]);
  const [inserted] = await connection.execute(`INSERT INTO tax_documents
    (id, tenant_id, customer_order_id, seller_order_id, merchant_id, gst_registration_id,
     document_type, document_number, document_date, financial_year, status, place_of_supply_state_code,
     currency, taxable_total, cgst_total, sgst_total, igst_total, cess_total, grand_total)
    SELECT ?, so.tenant_id, so.customer_order_id, so.id, so.merchant_id, gr.id,
     'TAX_INVOICE', ?, UTC_DATE(), '2026-27', 'ISSUED', '29', 'INR',
     so.grand_total, 0, 0, 0, 0, so.grand_total
    FROM seller_orders so JOIN gst_registrations gr ON gr.tenant_id = so.tenant_id AND gr.merchant_id = so.merchant_id
      AND gr.id = ?
    WHERE so.customer_order_id = ? LIMIT 1`, [binary(invoiceId), invoiceNumber, binary(registrationId), binary(firstReceipt.id)]);
  expect(inserted.affectedRows).toBe(1);
  await connection.execute(`INSERT INTO tax_document_items
    (id, tax_document_id, line_number, description, quantity, uom_code, unit_price, taxable_amount, line_total)
    SELECT ?, id, 1, 'Rollback invoice download verification', 1, 'NOS', grand_total, grand_total, grand_total
    FROM tax_documents WHERE id = ?`, [binary(randomUUID()), binary(invoiceId)]);
  const invoiceDao = await import('../../ecommerce-backend/src/modules/customer-accounts/customer-orders.dao.js');
  const owned = { ...scope, orderId: firstReceipt.id, documentId: invoiceId, customerId: account.customerId, connection };
  for (const key of ['tenantId', 'storeId', 'customerId', 'orderId', 'documentId']) {
    expect(await invoiceDao.readInvoice({ ...owned, [key]: randomUUID() })).toBeNull();
  }
  for (const status of ['DRAFT', 'CANCELLED']) {
    await connection.execute('UPDATE tax_documents SET status = ? WHERE id = ?', [status, binary(invoiceId)]);
    expect(await invoiceDao.readInvoice(owned)).toBeNull();
    expect((await invoiceDao.readOrder(owned)).invoices).toHaveLength(0);
  }
  await connection.execute("UPDATE tax_documents SET status = 'ISSUED' WHERE id = ?", [binary(invoiceId)]);
  await page.getByRole('button', { name: 'Refresh updates' }).click();
  const downloadButton = page.getByRole('button', { name: `Download invoice ${invoiceNumber}`, exact: true });
  await expect(downloadButton).toBeVisible();
  // Failed downloads retain the order and can be retried.
  await page.route('**/api/customer/orders/invoice', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Temporary invoice outage. Try again.' } }) }), { times: 1 });
  await downloadButton.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Temporary invoice outage');
  const downloaded = page.waitForEvent('download');
  await downloadButton.click();
  const pdf = await downloaded;
  expect(pdf.suggestedFilename()).toBe(`tax-invoice-${invoiceNumber}.pdf`);
  await pdf.saveAs(testInfo.outputPath('customer-invoice.pdf'));
  const { readFile } = await import('node:fs/promises');
  expect((await readFile(testInfo.outputPath('customer-invoice.pdf'))).subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  for (const [width, height] of [[1440, 1000], [768, 1024], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`order-${width}.png`), fullPage: true });
  }
  await connection.execute("UPDATE customer_orders SET status = 'CONFIRMED', internal_notes = 'PRIVATE_STAFF_NOTE' WHERE id = ?", [binary(firstReceipt.id)]);
  await connection.execute("INSERT INTO order_status_history (id, tenant_id, customer_order_id, status_type, previous_status, new_status, notes) VALUES (?, ?, ?, 'ORDER', 'PLACED', 'CONFIRMED', 'PRIVATE_STAFF_NOTE')", [binary(randomUUID()), binary(scope.tenantId), binary(firstReceipt.id)]);
  await page.getByRole('button', { name: 'Refresh updates' }).click();
  await expect(page.getByText('Order · Confirmed', { exact: true })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('PRIVATE_STAFF_NOTE');
  await page.getByRole('link', { name: 'All orders', exact: true }).click();
  await expect(page.getByRole('link', { name: `View order ${firstReceipt.orderNumber}` })).toBeVisible();
  const post = (path, data) => page.request.post(`/api/customer/orders/${path}`, { headers: { Origin: 'http://localhost:3110' }, data });
  const invoiceResponse = await post('invoice', { orderId: firstReceipt.id, documentId: invoiceId });
  expect(invoiceResponse.status()).toBe(200);
  expect(invoiceResponse.headers()['content-type']).toContain('application/pdf');
  expect(invoiceResponse.headers()['cache-control']).toBe('no-store');
  expect((await invoiceResponse.body()).subarray(0, 5).toString()).toBe('%PDF-');
  expect((await post('invoice', { orderId: randomUUID(), documentId: invoiceId })).status()).toBe(404);
  expect((await post('invoice', { orderId: firstReceipt.id, documentId: invoiceId, customerId: account.customerId })).status()).toBe(422);
  expect((await page.request.post('/api/customer/orders/invoice', { headers: { Origin: 'https://untrusted.example' }, data: { orderId: firstReceipt.id, documentId: invoiceId } })).status()).toBe(403);
  const listOrders = await post('list', {});
  expect((await listOrders.json()).data.pagination.pageSize).toBe(10);
  expect((await (await post('list', { page: 2 })).json()).data.items).toEqual([]);
  expect((await post('read', { orderId: randomUUID() })).status()).toBe(404);
  expect((await post('read', { orderId: firstReceipt.id, customerId: randomUUID() })).status()).toBe(422);
  // A valid order ID is not sufficient: wrong store/customer both return 404.
  const orderDao = await import(new URL('../../ecommerce-backend/src/modules/customer-accounts/customer-orders.dao.js', import.meta.url).href);
  expect(await orderDao.readOrder({ ...scope, customerId: randomUUID(), orderId: firstReceipt.id, connection })).toBeNull();
  expect(await orderDao.readOrder({ ...scope, storeId: randomUUID(), customerId: account.customerId, orderId: firstReceipt.id, connection })).toBeNull();
  expect(await orderDao.readOrder({ ...scope, tenantId: randomUUID(), customerId: account.customerId, orderId: firstReceipt.id, connection })).toBeNull();
  await page.goto('/account/orders?page=2');
  await expect(page.getByRole('heading', { name: 'No orders on this page.' })).toBeVisible();
  await page.getByRole('link', { name: 'First page', exact: true }).click();
  await expect(page.getByRole('link', { name: `View order ${firstReceipt.orderNumber}` })).toBeVisible();
  const [[sellerOrder]] = await connection.execute('SELECT id FROM seller_orders WHERE customer_order_id = ? LIMIT 1', [binary(firstReceipt.id)]);
  const [[warehouse]] = await connection.execute('SELECT id FROM warehouses WHERE tenant_id = ? LIMIT 1', [binary(scope.tenantId)]);
  const fulfillmentId = randomUUID();
  await connection.execute("INSERT INTO fulfillments (id, tenant_id, seller_order_id, warehouse_id, fulfillment_number, status, picking_started_at, packed_at, dispatched_at, notes) VALUES (?, ?, ?, ?, ?, 'DISPATCHED', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), 'PRIVATE_WAREHOUSE_NOTE')", [binary(fulfillmentId), binary(scope.tenantId), sellerOrder.id, warehouse.id, `TEST-${fulfillmentId}`]);
  await connection.execute("INSERT INTO shipments (id, tenant_id, fulfillment_id, shipment_number, provider_code, tracking_number, status, shipped_at, metadata) VALUES (?, ?, ?, ?, 'MANUAL', 'TEST-TRACK-123', 'IN_TRANSIT', UTC_TIMESTAMP(6), ?)", [binary(randomUUID()), binary(scope.tenantId), binary(fulfillmentId), `SHIP-${fulfillmentId}`, JSON.stringify({ private: 'PRIVATE_PROVIDER_DATA' })]);
  await page.getByRole('link', { name: `View order ${firstReceipt.orderNumber}` }).click();
  await expect(page.getByText('TEST-TRACK-123', { exact: false })).toBeVisible();
  await expect(page.getByText('Shipment: In transit', { exact: true })).toBeVisible();
  await expect(page.getByText('Picking started', { exact: true })).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('PRIVATE_WAREHOUSE_NOTE');
  await expect(page.getByRole('main')).not.toContainText('PRIVATE_PROVIDER_DATA');
  await page.screenshot({ path: testInfo.outputPath('order-shipment-mobile.png'), fullPage: true });
  const sibling = await page.context().newPage();
  await sibling.goto('/account');
  await sibling.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to view your orders' })).toBeVisible();
  await sibling.close();
  expect((await post('read', { orderId: firstReceipt.id })).status()).toBe(401);
  expect((await post('invoice', { orderId: firstReceipt.id, documentId: invoiceId })).status()).toBe(401);
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your bag has room for something good.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('API bag survives reload, merges on login, isolates sign-out and responds on small screens', async ({ page, context }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const list = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data;
  const detail = (await (await page.request.get(`/api/storefront/products/${list.items[0].slug}`)).json()).data;
  const variant = detail.variants.find((item) => item.availableQuantity >= item.minimumOrderQuantity + item.quantityStep && (!item.maximumOrderQuantity || item.maximumOrderQuantity >= item.minimumOrderQuantity + item.quantityStep));
  expect(variant).toBeTruthy();
  await page.goto(`/p/${detail.slug}`);
  await page.getByLabel('Select colour, size and seller').selectOption(variant.offerId);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Added to bag', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View your bag' }).click();
  const items = page.getByRole('region', { name: 'Bag items' });
  await expect(items.locator('article')).toHaveCount(1);
  await expect(items).toContainText(variant.sku);
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(items.getByRole('spinbutton')).toHaveValue(String(variant.minimumOrderQuantity + variant.quantityStep));
  await page.reload();
  await expect(items.getByRole('spinbutton')).toHaveValue(String(variant.minimumOrderQuantity + variant.quantityStep));
  const guest = (await context.cookies('http://localhost:3110/api/customer/cart')).find((cookie) => cookie.name === 'commerce_guest_cart');
  expect(guest.httpOnly).toBe(true); expect(guest.sameSite).toBe('Lax');
  const sync = await page.request.post('/api/customer/cart/sync', { data: {}, headers: { Origin: 'http://localhost:3110' } });
  expect(sync.ok()).toBe(true); expect((await sync.json()).data.guestToken).toBeUndefined();
  const csrf = await page.request.put('/api/customer/cart', { data: {}, headers: { Origin: 'https://untrusted.invalid' } });
  expect(csrf.status()).toBe(403);
  const email = await register(page);
  await page.goto('/cart');
  await expect(page.getByText('Saved to your customer account.')).toBeVisible();
  await expect(items.getByRole('spinbutton')).toHaveValue(String(variant.minimumOrderQuantity + variant.quantityStep));
  await page.reload();
  await expect(items.getByRole('spinbutton')).toHaveValue(String(variant.minimumOrderQuantity + variant.quantityStep));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hornbook-retail-main-cart-v2')).state);
  expect(stored.cart).toBeUndefined(); expect(stored.snapshots).toBeUndefined();
  for (const [width, height] of [[1440, 1000], [768, 1024], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole('button', { name: 'Increase quantity' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`cart-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your bag has room for something good.' })).toBeVisible();
  await page.goto('/account/login');
  await page.getByLabel('Email address', { exact: false }).fill(email);
  await page.locator('input[name="password"]').fill('BrowserAccount-123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Personal details' })).toBeVisible();
  await page.goto('/cart');
  await expect(items.locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: /^Remove / }).click();
  await expect(page.getByRole('heading', { name: 'Your bag has room for something good.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('verified accounts, profiles, addresses, secure cookies and password recovery work end to end', async ({ page, context }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const email = await register(page);
  const cookies = await context.cookies('http://localhost:3110/api/customer/me');
  const session = cookies.find((cookie) => cookie.name === 'commerce_customer');
  expect(session.httpOnly).toBe(true); expect(session.secure).toBe(true); expect(session.sameSite).toBe('Lax');
  expect(await page.evaluate(() => document.cookie)).not.toContain(session.value);
  const personal = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal details' }) });
  await personal.getByLabel('First name', { exact: false }).fill('Updated');
  await personal.getByRole('button', { name: 'Save details' }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Profile saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Add address' }).click();
  await page.getByLabel('Address label', { exact: true }).fill('Home');
  await page.getByLabel('Address line 1', { exact: false }).fill('123 Rollback Road');
  await page.getByLabel('City', { exact: false }).fill('Bengaluru');
  await page.getByLabel('State / union territory').selectOption('KA');
  await page.getByRole('textbox', { name: 'PIN code', exact: false }).fill('560001');
  await page.getByLabel('Delivery phone').fill('+919876543210');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.locator('article')).toContainText('123 Rollback Road');
  await page.reload();
  await expect(page.locator('article')).toContainText('Karnataka');
  const me = await (await page.request.get('/api/customer/me')).json();
  const account = await dao.findAccount({ tenantId: scope.tenantId, email, connection });
  expect(account).not.toBeNull();
  const admin = await customerDao.getCustomerDetails({ tenantId: scope.tenantId, customerId: account.customerId, connection });
  expect(admin.customer.firstName).toBe('Updated'); expect(admin.addresses[0].line1).toBe('123 Rollback Road');
  const csrf = await page.request.put('/api/customer/profile', { data: { firstName: 'Attack' }, headers: { Origin: 'https://untrusted.invalid' } });
  expect(csrf.status()).toBe(403);
  const foreign = await page.request.delete(`/api/customer/addresses/${randomUUID()}`, { data: {}, headers: { Origin: 'http://localhost:3110' } });
  expect(foreign.status()).toBe(404);
  expect((await (await page.request.get('/api/customer/me')).json()).data.addresses[0].id).toBe(me.data.addresses[0].id);
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`account-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('City', { exact: false }).fill('Mysuru');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(page.locator('article')).toContainText('Mysuru');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(0);
  const security = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Password & security' }) });
  await security.getByLabel('Current password', { exact: false }).fill('BrowserAccount-123!');
  await security.getByLabel('New password', { exact: false }).fill('BrowserAccount-456!');
  await security.getByLabel('Confirm password', { exact: false }).fill('BrowserAccount-456!');
  await security.getByRole('button', { name: 'Change password' }).click();
  await expect(page).toHaveURL(/account\/login/);
  expect((await page.request.get('/api/customer/me')).status()).toBe(401);
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email address', { exact: false }).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status').first()).toContainText('link has been sent');
  await page.goto(`/account/reset-password#token=${mail.at(-1).token}`);
  await page.getByLabel('New password', { exact: false }).fill('BrowserAccount-789!');
  await page.getByLabel('Confirm password', { exact: false }).fill('BrowserAccount-789!');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Password reset');
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await page.getByLabel('Email address', { exact: false }).fill(email);
  await page.locator('input[name="password"]').fill('BrowserAccount-789!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/account\/login/);
  expect(errors).toEqual([]);
});

test('mobile account access, validation, error focus and invalid recovery links', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Your account', exact: true }).click();
  await expect(page).toHaveURL(/account\/login/);
  await page.getByLabel('Email address', { exact: false }).fill('unknown@example.invalid');
  await page.locator('input[name="password"]').fill('IncorrectPassword-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('email or password');
  await expect(page.locator('main [role="alert"]')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('login-mobile.png'), fullPage: true });
  await page.goto(`/account/reset-password#token=${'a'.repeat(64)}`);
  await page.getByLabel('New password', { exact: false }).fill('PasswordNew-123!');
  await page.getByLabel('Confirm password', { exact: false }).fill('DifferentNew-123!');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByLabel('Confirm password', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Confirm password', { exact: false }).fill('PasswordNew-123!');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.locator('main [role="alert"]')).toContainText('invalid or expired');
});
test('online test checkout resumes one order, waits for capture and recovers without a callback', async ({ page }, testInfo) => {
  gatewayOrders.clear(); gatewayPayments.clear();
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const [[actor]] = await connection.execute('SELECT LOWER(CONCAT(SUBSTR(HEX(id),1,8),"-",SUBSTR(HEX(id),9,4),"-",SUBSTR(HEX(id),13,4),"-",SUBSTR(HEX(id),17,4),"-",SUBSTR(HEX(id),21))) AS id FROM users WHERE deleted_at IS NULL LIMIT 1');
  await paymentService.saveSettings({ ...scope, actorUserId: actor.id }, { codEnabled: true, onlineEnabled: true, keyId: 'rzp_test_browser', keySecret: paymentSecret });
  const fixture = await checkoutFixture(connection, scope);
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.Razorpay = class {
      constructor(options) { window.__testCheckout = options; }
      on() {}
      open() {}
    };
  });
  await register(page);
  const headers = { Origin: 'http://localhost:3110' };
  const list = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data;
  const product = list.items.find((item) => !item.soldByWeight);
  expect(product).toBeTruthy();
  const bag = (await (await page.request.post('/api/customer/cart/sync', { headers, data: {} })).json()).data;
  const added = await page.request.put('/api/customer/cart', { headers, data: { offerId: product.offerId, quantity: product.minimumOrderQuantity || 1, cartKey: bag.cartKey, revision: bag.revision } });
  expect(added.ok()).toBe(true);
  const address = await page.request.post('/api/customer/addresses', { headers, data: { label: 'Test delivery', contactName: 'Payment Browser', phone: '+919876543210', line1: '123 Payment Test Road', line2: '', landmark: '', city: 'Bengaluru', stateCode: 'KA', postalCode: '560001', isDefault: true } });
  expect(address.ok()).toBe(true);
  await page.goto('/checkout');
  await expect(page.getByLabel('Delivery slot')).toBeEnabled();
  await page.getByLabel('Delivery slot').selectOption(fixture.slotId);
  await page.getByRole('radio', { name: /Pay online/ }).check();
  for (const [width, height] of [[1440, 1000], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`payment-selection-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await page.getByRole('button', { name: 'Save order & continue to test payment', exact: true }).click();
  await page.getByRole('button', { name: 'Pay online — test mode', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__testCheckout))).toBe(true);
  await page.evaluate(() => window.__testCheckout.modal.ondismiss());
  await page.getByRole('button', { name: 'Pay online — test mode', exact: true }).click();
  await expect.poll(() => gatewayOrders.size).toBe(1);
  const order = [...gatewayOrders.values()][0];
  const payment = { id: 'pay_browser', order_id: order.id, amount: order.amount, currency: 'INR', status: 'authorized', captured: false };
  gatewayPayments.set(payment.id, payment);
  const signature = createHmac('sha256', paymentSecret).update(`${order.id}|${payment.id}`).digest('hex');
  await page.evaluate(async ({ orderId, paymentId, signature }) => window.__testCheckout.handler({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }), { orderId: order.id, paymentId: payment.id, signature });
  await expect(page.getByText('Awaiting test payment', { exact: true })).toBeVisible();
  payment.status = 'captured'; payment.captured = true;
  await page.getByRole('button', { name: 'Refresh payment status', exact: true }).click();
  await expect(page.getByText('Test payment verified', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay online — test mode', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Test payment verified', { exact: true })).toBeVisible();
  const [[ledger]] = await connection.execute('SELECT COUNT(*) AS total FROM payments WHERE tenant_id = ? AND provider_reference = ?', [binary(scope.tenantId), payment.id]);
  expect(Number(ledger.total)).toBe(1);
  await page.getByRole('link', { name: 'Track your order' }).click();
  await expect(page.getByRole('link', { name: 'View test payment' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('customer cancels before dispatch, releases reservations once and cannot cancel dispatched orders', async ({ page }) => {
  const email = await register(page);
  const account = await dao.findAccount({ ...scope, email, connection });
  const { afterSalesFixture } = await import('../../ecommerce-backend/test/helpers/customer-after-sales.fixture.js');
  const fixture = await afterSalesFixture(connection, scope, account.customerId, 'PACKED');
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const headers = { Origin: 'http://localhost:3110' };
  await connection.execute(`INSERT INTO inventory_balances (id, tenant_id, warehouse_id, offer_id, on_hand_quantity, reserved_quantity)
    VALUES (?, ?, ?, ?, 2, 2) ON DUPLICATE KEY UPDATE reserved_quantity = reserved_quantity + 2`,
  [binary(randomUUID()), binary(scope.tenantId), binary(fixture.warehouseId), binary(fixture.offerId)]);
  const [[balance]] = await connection.execute('SELECT id, reserved_quantity FROM inventory_balances WHERE warehouse_id = ? AND offer_id = ?', [binary(fixture.warehouseId), binary(fixture.offerId)]);
  await connection.execute(`INSERT INTO stock_reservations (id, tenant_id, inventory_balance_id, reference_type, reference_id, quantity, status)
    VALUES (?, ?, ?, 'FULFILLMENT', ?, 2, 'ACTIVE')`, [binary(randomUUID()), binary(scope.tenantId), balance.id, binary(fixture.fulfillmentId)]);
  const delivery = await checkoutFixture(connection, scope);
  await connection.execute('UPDATE delivery_slot_instances SET reserved_orders = 1 WHERE id = ?', [binary(delivery.slotId)]);
  await connection.execute(`INSERT INTO delivery_slot_reservations (id, tenant_id, customer_order_id, delivery_slot_instance_id, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')`, [binary(randomUUID()), binary(scope.tenantId), binary(fixture.orderId), binary(delivery.slotId)]);
  await page.goto(`/account/orders/${fixture.orderId}`);
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cancel this entire order?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep order' }).click();
  await expect(page.getByRole('button', { name: 'Cancel order', exact: true })).toBeFocused();
  const [[before]] = await connection.execute('SELECT status FROM customer_orders WHERE id = ?', [binary(fixture.orderId)]); expect(before.status).toBe('PROCESSING');
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await page.getByLabel('Reason for cancellation').fill('Delivery address changed.');
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await expect(page.getByText('This order is cancelled. Any payment already collected needs separate refund review.')).toBeVisible();
  const cancel = { orderId: fixture.orderId, reason: 'Retry after a lost response' };
  expect((await page.request.post('/api/customer/orders/cancel', { headers, data: cancel })).status()).toBe(200);
  const [[after]] = await connection.execute('SELECT reserved_quantity FROM inventory_balances WHERE id = ?', [balance.id]);
  expect(Number(after.reserved_quantity)).toBe(Number(balance.reserved_quantity) - 2);
  const [[slot]] = await connection.execute('SELECT reserved_orders FROM delivery_slot_instances WHERE id = ?', [binary(delivery.slotId)]); expect(slot.reserved_orders).toBe(0);
  const [[history]] = await connection.execute("SELECT COUNT(*) AS total FROM order_status_history WHERE customer_order_id = ? AND new_status = 'CANCELLED'", [binary(fixture.orderId)]); expect(Number(history.total)).toBe(1);
  const [[audit]] = await connection.execute("SELECT actor_type, actor_user_id FROM audit_logs WHERE entity_id = ? AND action = 'ORDER_STATUS_CHANGED'", [binary(fixture.orderId)]);
  expect(audit.actor_type).toBe('CUSTOMER'); expect(audit.actor_user_id).toBeNull();
  const shipped = await afterSalesFixture(connection, scope, account.customerId, 'DISPATCHED');
  expect((await page.request.post('/api/customer/orders/cancel', { headers, data: { ...cancel, orderId: shipped.orderId } })).status()).toBe(409);
  expect((await page.request.post('/api/customer/orders/cancel', { headers, data: { ...cancel, orderId: randomUUID() } })).status()).toBe(404);
});

test('customer requests a clothing exchange, retries safely and tracks admin approval without staff notes', async ({ page }, testInfo) => {
  const email = await register(page);
  const account = await dao.findAccount({ ...scope, email, connection });
  const { afterSalesFixture } = await import('../../ecommerce-backend/test/helpers/customer-after-sales.fixture.js');
  const fixture = await afterSalesFixture(connection, scope, account.customerId);
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const headers = { Origin: 'http://localhost:3110' };
  const requestInput = { orderId: fixture.orderId, orderItemId: fixture.itemId, requestId: randomUUID(), returnType: 'RETURN', quantity: 1, reasonCode: 'QUALITY', customerComments: '', serialIds: [] };
  const afterDao = await import('../../ecommerce-backend/src/modules/customer-accounts/customer-after-sales.dao.js');
  for (const key of ['tenantId', 'storeId', 'customerId', 'orderId']) {
    expect(await afterDao.ownedOrder({ ...scope, customerId: account.customerId, orderId: fixture.orderId, [key]: randomUUID(), connection })).toBeNull();
  }
  expect((await page.request.post('/api/customer/orders/return', { headers, data: { ...requestInput, quantity: 3 } })).status()).toBe(422);
  expect((await page.request.post('/api/customer/orders/return', { headers, data: { ...requestInput, serialIds: [randomUUID()] } })).status()).toBe(409);
  await connection.execute('UPDATE products SET return_window_days = 0 WHERE id = ?', [binary(fixture.productId)]);
  expect((await page.request.post('/api/customer/orders/return', { headers, data: requestInput })).status()).toBe(409);
  await connection.execute('UPDATE products SET return_window_days = 7 WHERE id = ?', [binary(fixture.productId)]);
  await page.goto(`/account/orders/${fixture.orderId}`);
  await page.getByRole('button', { name: 'Return / exchange', exact: true }).click();
  await page.getByLabel('Request type').selectOption('EXCHANGE');
  await page.getByLabel('Quantity (required)').fill('2');
  await page.getByLabel('Reason (required)', { exact: true }).selectOption('SIZE_FIT');
  await page.getByLabel('Details / preferred exchange').fill('Please exchange for a larger size in the same colour.');
  for (const [width, height] of [[1440, 1000], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('form', { name: `Return ${fixture.name}` }).screenshot({ path: testInfo.outputPath(`return-form-${width}.png`) });
  }
  let dropped = false;
  await page.route('**/api/customer/orders/return', async (route) => {
    const response = await route.fetch();
    if (!dropped && response.ok()) { dropped = true; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('will not be duplicated');
  await page.getByRole('button', { name: 'Submit request', exact: true }).click();
  await expect(page.getByText('All eligible units already have a return or exchange request.')).toBeVisible();
  const [[record]] = await connection.execute('SELECT id, status, return_type, customer_comments, created_by FROM return_requests WHERE customer_order_id = ?', [binary(fixture.orderId)]);
  expect(record.status).toBe('REQUESTED'); expect(record.return_type).toBe('EXCHANGE'); expect(record.created_by).toBeNull();
  expect(record.customer_comments).toContain('larger size');
  const [[refunds]] = await connection.execute('SELECT COUNT(*) AS total FROM refunds WHERE customer_order_id = ?', [binary(fixture.orderId)]); expect(Number(refunds.total)).toBe(0);
  const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM return_requests WHERE customer_order_id = ?', [binary(fixture.orderId)]); expect(Number(count.total)).toBe(1);
  expect((await page.request.post('/api/customer/orders/return', { headers, data: requestInput })).status()).toBe(409);
  const returnsDao = await import('../../ecommerce-backend/src/modules/returns/returns.dao.js');
  const { createReturnsService } = await import('../../ecommerce-backend/src/modules/returns/returns.service.js');
  const { bufferToUuid } = await import('../../ecommerce-backend/src/core/identifiers/uuid.js');
  const returns = createReturnsService({ dao: Object.fromEntries(Object.entries(returnsDao).map(([name, fn]) => [name, (args) => fn({ ...args, connection })])), transaction: async (_tenant, fn) => fn(connection) });
  const [[actor]] = await connection.execute('SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1');
  await returns.approveReturn(scope.tenantId, bufferToUuid(record.id), { notes: 'PRIVATE_STAFF_RETURN_NOTE' },
    { actorUserId: bufferToUuid(actor.id), requestId: randomUUID(), ipAddress: '127.0.0.1', userAgent: 'Rollback browser test' });
  await page.reload();
  const history = page.getByRole('region', { name: 'Your return and exchange requests' });
  await expect(history).toContainText('Approved');
  await expect(page.getByRole('main')).not.toContainText('PRIVATE_STAFF_RETURN_NOTE');
  const result = (await (await page.request.post('/api/customer/orders/after-sales', { headers, data: { orderId: fixture.orderId } })).json()).data;
  expect(JSON.stringify(result)).not.toContain('PRIVATE_STAFF_RETURN_NOTE');
  await page.request.post('/api/customer/logout', { headers, data: {} });
  expect((await page.request.post('/api/customer/orders/return', { headers, data: requestInput })).status()).toBe(401);
});

test('delivered purchases accept one moderated review and keep customer ownership private', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const email = await register(page);
  const account = await dao.findAccount({ ...scope, email, connection });
  const binary = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
  const product = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data.items[0];
  const [[offer]] = await connection.execute('SELECT merchant_id, variant_id FROM seller_offers WHERE id = ? AND tenant_id = ?', [binary(product.offerId), binary(scope.tenantId)]);
  const [[warehouse]] = await connection.execute('SELECT id FROM warehouses WHERE tenant_id = ? AND deleted_at IS NULL LIMIT 1', [binary(scope.tenantId)]);
  const orderId = randomUUID(), sellerId = randomUUID(), orderItemId = randomUUID(), fulfillmentId = randomUUID();
  // All fixtures and review/moderation writes are rolled back by afterEach.
  await connection.execute(`INSERT INTO customer_orders (id, tenant_id, store_id, customer_id, order_number, status, billing_address_snapshot, shipping_address_snapshot, customer_snapshot)
    VALUES (?, ?, ?, ?, ?, 'PROCESSING', '{}', '{}', '{}')`, [binary(orderId), binary(scope.tenantId), binary(scope.storeId), binary(account.customerId), `REVIEW-${orderId}`]);
  await connection.execute(`INSERT INTO seller_orders (id, tenant_id, customer_order_id, merchant_id, seller_order_number)
    VALUES (?, ?, ?, ?, ?)`, [binary(sellerId), binary(scope.tenantId), binary(orderId), offer.merchant_id, `REVIEW-${sellerId}`]);
  await connection.execute(`INSERT INTO order_items (id, tenant_id, customer_order_id, seller_order_id, offer_id, variant_id, product_name, variant_name, sku, quantity, unit_price, list_price, line_total, product_snapshot, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Review test variant', ?, 1, 100, 100, 100, '{}', 'SHIPPED')`,
  [binary(orderItemId), binary(scope.tenantId), binary(orderId), binary(sellerId), binary(product.offerId), offer.variant_id, product.name, product.sku]);
  await connection.execute(`INSERT INTO fulfillments (id, tenant_id, seller_order_id, warehouse_id, fulfillment_number, status)
    VALUES (?, ?, ?, ?, ?, 'DISPATCHED')`, [binary(fulfillmentId), binary(scope.tenantId), binary(sellerId), warehouse.id, `REVIEW-${fulfillmentId}`]);
  await connection.execute('INSERT INTO fulfillment_items (id, fulfillment_id, order_item_id, requested_quantity) VALUES (?, ?, ?, 1)', [binary(randomUUID()), binary(fulfillmentId), binary(orderItemId)]);
  const headers = { Origin: 'http://localhost:3110' };
  const input = { orderId, orderItemId, rating: 4, title: 'Browser verified review', review: 'The quality is good and the product matches its description.' };
  expect((await page.request.post('/api/customer/orders/review', { headers, data: input })).status()).toBe(422);
  const reviewDao = await import('../../ecommerce-backend/src/modules/customer-accounts/customer-reviews.dao.js');
  for (const key of ['tenantId', 'storeId', 'customerId', 'orderId', 'orderItemId']) {
    expect(await reviewDao.purchase({ ...scope, customerId: account.customerId, orderId, orderItemId, [key]: randomUUID(), connection })).toBeNull();
  }
  await page.goto(`/account/orders/${orderId}`);
  await expect(page.getByText('You can review your products here once their delivery is completed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Write a review' })).toHaveCount(0);
  await connection.execute("UPDATE fulfillments SET status = 'COMPLETED', completed_at = UTC_TIMESTAMP(6) WHERE id = ?", [binary(fulfillmentId)]);
  await page.getByRole('button', { name: 'Refresh updates' }).click();
  await page.getByRole('button', { name: 'Write a review' }).click();
  await expect(page.getByLabel('Rating (required)')).toBeFocused();
  await page.getByLabel('Rating (required)').selectOption('4');
  await page.getByLabel('Review title').fill(input.title);
  await page.getByLabel('Your experience').fill(input.review);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10000 });
  for (const [width, height] of [[1440, 1000], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('form', { name: `Review ${product.name}` }).screenshot({ path: testInfo.outputPath(`review-form-${width}.png`) });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let dropped = false;
  await page.route('**/api/customer/orders/review', async (route) => {
    const response = await route.fetch();
    if (!dropped && response.ok()) { dropped = true; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('will not be duplicated');
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByRole('region', { name: 'Review your purchases' }).getByRole('status')).toContainText('Awaiting moderation');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Review your purchases' }).getByRole('status')).toContainText('Awaiting moderation');
  await expect(page.getByRole('button', { name: 'Write a review' })).toHaveCount(0);
  const [[rating]] = await connection.execute('SELECT id, status, verified_purchase, source FROM product_ratings WHERE tenant_id = ? AND order_item_id = ?', [binary(scope.tenantId), binary(orderItemId)]);
  expect(rating.status).toBe('PENDING'); expect(rating.verified_purchase).toBe(1); expect(rating.source).toBe('STOREFRONT');
  const [[count]] = await connection.execute('SELECT COUNT(*) AS total FROM product_ratings WHERE tenant_id = ? AND order_item_id = ?', [binary(scope.tenantId), binary(orderItemId)]);
  expect(Number(count.total)).toBe(1);
  await page.goto(`/p/${product.slug}`);
  await expect(page.locator('#reviews')).not.toContainText(input.title);
  const ratingsDao = await import('../../ecommerce-backend/src/modules/ratings/ratings.dao.js');
  const { createRatingsService } = await import('../../ecommerce-backend/src/modules/ratings/ratings.service.js');
  const { bufferToUuid } = await import('../../ecommerce-backend/src/core/identifiers/uuid.js');
  const ratings = createRatingsService({ dao: Object.fromEntries(Object.entries(ratingsDao).map(([name, fn]) => [name, (args) => fn({ ...args, connection })])), transaction: async (_tenant, fn) => fn(connection) });
  const reviewId = bufferToUuid(rating.id);
  expect((await ratings.getRating(scope.tenantId, reviewId)).customerEmail).toBe(email);
  const [[actor]] = await connection.execute('SELECT id FROM users WHERE deleted_at IS NULL LIMIT 1');
  await ratings.moderateRating(scope.tenantId, reviewId, { status: 'PUBLISHED', notes: 'Approved in rollback browser test.' },
    { actorUserId: bufferToUuid(actor.id), requestId: randomUUID(), userAgent: 'Browser test' });
  await page.reload();
  await expect(page.locator('#reviews')).toContainText(input.title);
  await expect(page.locator('#reviews')).toContainText('Verified purchase');
  await expect(page.locator('#reviews')).not.toContainText(email);
  await page.goto(`/account/orders/${orderId}`);
  await expect(page.getByRole('region', { name: 'Review your purchases' }).getByRole('status')).toContainText('Published');
  await page.request.post('/api/customer/logout', { headers, data: {} });
  expect((await page.request.post('/api/customer/orders/review', { headers, data: input })).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('cart replaces an in-flight guest response after login instead of showing a stale sign-in prompt', async ({ page }) => {
  const email = await register(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  const list = (await (await page.request.get('/api/storefront/products?inStock=true')).json()).data;
  const product = list.items[0];
  await page.goto(`/p/${product.slug}`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Added to bag', exact: true })).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('link', { name: 'Sign in to save across devices' })).toBeVisible();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  let guestCaptured = false, intercepted = false;
  await page.route('**/api/customer/cart/sync', async (route) => {
    if (intercepted) return route.continue();
    intercepted = true;
    const response = await route.fetch();
    expect((await response.json()).data.mode).toBe('guest');
    guestCaptured = true;
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.getByRole('button', { name: 'Refresh bag', exact: true }).click();
    await expect.poll(() => guestCaptured).toBe(true);
    // Another tab can replace the HttpOnly session cookie while this tab has an old request in flight.
    const login = await page.request.post('/api/customer/login', { headers: { Origin: 'http://localhost:3110' }, data: { email, password: 'BrowserAccount-123!' } });
    expect(login.ok()).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    release();
    await expect(page.getByText('Saved to your customer account.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to save across devices' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Bag items' }).locator('article')).toHaveCount(1);
    await page.reload();
    await expect(page.getByText('Saved to your customer account.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to save across devices' })).toHaveCount(0);
  } finally { release(); }
});
