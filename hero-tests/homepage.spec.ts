import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';

// UI fixtures only: never change tenant data or require stored credentials.
const tenantId = '018f47f2-6b6d-7c34-ae31-8f4f17b79b88';
const storeId = '018f47f2-6b6d-7c34-ae31-8f4f17b79b77';
const product = { id: 'p1', slug: 'test-shirt', name: 'Linen shirt', brand: 'Hornbook',
  productCode: 'SHIRT', category: 'Clothing', categorySlug: 'clothing', price: 799, mrp: 999,
  image: 'http://localhost:4108/image.png', description: 'Everyday comfort.', inStock: true,
  currency: 'INR', rating: '0', reviews: 0, tag: 'NEW', offerId: 'o1', sku: 'shirt-m',
  availableQuantity: 10, minimumOrderQuantity: 1, quantityStep: 1 };
const empty = { enabled: true, autoplay: true, intervalSeconds: 6, slides: [] };
const initialSections = { sections: [
  { key: 'DEALS', title: 'Blockbuster deals', subtitle: 'Prices drop.', enabled: true, rule: 'DISCOUNT', limit: 6, productSlugs: [] as string[], viewAllHref: '', viewAllLabel: 'View all' },
  { key: 'BANNER', title: 'Quiet confidence', subtitle: 'Everyday favourites', enabled: false, imageUrl: '', altText: '', eyebrow: 'STYLE EDIT', badgeText: '', href: '/', ctaLabel: 'Explore' },
  { key: 'DISCOVER', title: 'More to discover', subtitle: 'Explore', enabled: true, rule: 'REVIEWS', limit: 6, productSlugs: [] as string[], viewAllHref: '', viewAllLabel: 'View all' },
  { key: 'FRESH', title: 'Fresh arrivals', subtitle: 'Just landed', enabled: true, rule: 'NEWEST', limit: 6, productSlugs: [] as string[], viewAllHref: '', viewAllLabel: 'View all' },
] };
let sectionRecord: { draft: typeof initialSections; published: typeof initialSections | null; revision: number; publishedAt: string | null };
function sectionPreview(document: typeof initialSections) {
  return { sections: document.sections.filter((section) => section.enabled).map((section) => section.key === 'BANNER' ? section : { ...section, items: [product] }) };
}
let record = { draft: structuredClone(empty), published: null, revision: 0, publishedAt: null } as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let server: Server;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');

test.beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/image.png') { res.setHeader('Content-Type', 'image/png'); res.end(png); return; }
    const published = record.published;
    const hero = published ? { ...published, slides: published.enabled ? published.slides.filter((slide: { enabled: boolean }) => slide.enabled).map((slide: { productSlug: string; href: string; imageUrl: string; title: string }) => ({
      ...slide, product: slide.productSlug ? product : null,
      title: slide.title || product.name, imageUrl: slide.imageUrl || product.image,
      href: slide.productSlug ? '/p/test-shirt' : slide.href,
    })) : [] } : null;
    const data = req.url?.includes('/config') ? { store: { name: 'Main Store', tenantName: 'Hornbook Retail', code: 'MAIN', currency: 'INR' }, categories: [], brands: [], hero, homepageSections: sectionRecord?.published ? sectionPreview(sectionRecord.published) : null }
      : req.url?.includes('/products/test-shirt') ? { ...product, variants: [], images: [], specifications: {}, reviewsList: [] }
        : { items: [product], total: 1, totalPages: 1, page: 1, pageSize: 10 };
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data }));
  });
  await new Promise<void>((resolve) => server.listen(4108, '127.0.0.1', resolve));
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
test.beforeEach(() => {
  record = { draft: structuredClone(empty), published: null, revision: 0, publishedAt: null };
  sectionRecord = { draft: structuredClone(initialSections), published: null, revision: 0, publishedAt: null };
});

async function mockAdmin(page: import('@playwright/test').Page, manage = true) {
  const capabilities = ['settings.store.read', ...(manage ? ['settings.store.manage'] : [])];
  await page.route('**/api/admin/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url());
    let data: unknown;
    if (url.pathname.endsWith('/auth/refresh')) data = { accessToken: 'ui-fixture', user: {
      firstName: 'Hero', lastName: 'Editor', defaultArea: 'admin', areas: ['admin'],
      assignments: [{ roleLevel: 'TENANT', tenantId, tenantName: 'Hornbook Retail', roleName: 'Owner', permissions: capabilities }],
      ui: { capabilities: { admin: { [tenantId]: capabilities } }, navigation: { admin: { [tenantId]: [{ label: 'Homepage hero', href: '/admin/homepage', icon: 'homepage' }] } } },
    } };
    else if (url.pathname.endsWith('/stores')) data = { items: [{ id: storeId, name: 'Main Store', code: 'MAIN' }], total: 1 };
    else if (url.pathname.endsWith('/products')) data = { items: [product] };
    else if (url.pathname.endsWith('/images')) data = { url: 'http://localhost:4108/image.png' };
    else if (url.pathname.includes('/homepage-sections')) {
      if (url.pathname.endsWith('/preview')) data = sectionPreview(request.postDataJSON());
      else if (url.pathname.endsWith('/publish')) {
        expect(request.postDataJSON().revision).toBe(sectionRecord.revision);
        sectionRecord = { ...sectionRecord, published: structuredClone(sectionRecord.draft), revision: sectionRecord.revision + 1, publishedAt: new Date().toISOString() }; data = sectionRecord;
      } else if (request.method() === 'PUT') {
        const input = request.postDataJSON(); expect(input.revision).toBe(sectionRecord.revision);
        sectionRecord = { ...sectionRecord, draft: input.document, revision: sectionRecord.revision + 1 }; data = sectionRecord;
      } else data = sectionRecord;
    }
    else if (url.pathname.endsWith('/publish')) {
      expect(request.postDataJSON().revision).toBe(record.revision);
      record = { ...record, published: structuredClone(record.draft), revision: record.revision + 1, publishedAt: new Date().toISOString() }; data = record;
    } else if (request.method() === 'PUT') {
      const input = request.postDataJSON(); expect(input.revision).toBe(record.revision);
      record = { ...record, draft: input.document, revision: record.revision + 1 }; data = record;
    } else data = record;
    await route.fulfill({ json: { data }, headers: { 'Access-Control-Allow-Origin': 'http://localhost:3107', 'Access-Control-Allow-Credentials': 'true' } });
  });
}

test('editor uploads, previews, orders, saves and publishes without changing the live hero early', async ({ page, context }, testInfo) => {
  await mockAdmin(page);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:3107/admin/homepage');
  await page.getByRole('button', { name: 'Create first slide' }).click();
  await page.getByRole('textbox', { name: 'Headline *', exact: true }).fill('Quiet confidence for every day');
  await page.getByLabel('Description', { exact: true }).fill('Discover thoughtfully selected essentials for your wardrobe.');
  await page.getByLabel('Upload hero image').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Replace image', { exact: true })).toBeVisible();
  await page.getByLabel('Image description').fill('A linen shirt in natural light');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  expect(record.published).toBeNull();
  const shop = await context.newPage();
  shop.on('pageerror', (error) => errors.push(error.message));
  await shop.goto('http://localhost:3106');
  await expect(shop.locator('.campaign-copy h1')).toHaveText('Linen shirt');
  await page.getByRole('button', { name: 'Publish hero', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Hero published');
  await shop.reload();
  await expect(shop.locator('.campaign-copy h1')).toHaveText('Quiet confidence for every day');
  await expect(shop.locator('.campaign-image img')).toHaveAttribute('alt', 'A linen shirt in natural light');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Linked product', { exact: true }).selectOption('test-shirt');
  await page.getByRole('button', { name: 'Move slide 2 up' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('button', { name: 'Publish hero', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Publish hero', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Hero published');
  await shop.reload();
  await expect(shop.locator('.campaign-copy h1')).toHaveText('Linen shirt');
  await expect(shop.locator('.campaign-price')).toContainText('799');
  await expect(shop.locator('.campaign-copy > a')).toHaveAttribute('href', '/p/test-shirt');
  await shop.getByRole('button', { name: 'Next slide' }).click();
  await expect(shop.locator('.campaign-copy h1')).toHaveText('Quiet confidence for every day');
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 }); await shop.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    for (const surface of [page, shop]) {
      expect(await surface.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
    await shop.screenshot({ path: testInfo.outputPath(`hero-${width}.png`), fullPage: false });
  }
  await page.getByLabel('Show hero on homepage').uncheck();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('button', { name: 'Publish hero', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Publish hero', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Hero published');
  await shop.reload(); await expect(shop.locator('.campaign-carousel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('store-read users cannot add, upload or publish hero content', async ({ page }) => {
  await mockAdmin(page, false);
  await page.goto('http://localhost:3107/admin/homepage');
  await expect(page.getByRole('button', { name: 'Create first slide' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Publish hero', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Show hero on homepage')).toBeDisabled();
  await page.getByRole('tab', { name: 'Homepage sections' }).click();
  await expect(page.getByRole('button', { name: 'Save sections draft' })).toBeDisabled();
  await expect(page.getByLabel('Section title', { exact: true })).toBeDisabled();
});

test('homepage sections support manual products, banner upload, ordering and independent publication', async ({ page, context }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await mockAdmin(page);
  await page.goto('http://localhost:3107/admin/homepage');
  await page.getByRole('tab', { name: 'Homepage sections' }).click();
  await page.getByLabel('Section title', { exact: true }).fill('Handpicked Hornbook deals');
  await page.getByLabel('Product selection').selectOption('MANUAL');
  await page.getByLabel('Add a product').selectOption('test-shirt');
  await page.getByRole('button', { name: /2 Campaign banner Disabled/ }).click();
  await page.getByLabel('Enabled', { exact: true }).check();
  await page.getByLabel('Upload banner image').setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Replace banner image', { exact: true })).toBeVisible();
  await page.getByLabel('Image description').fill('Linen essentials in natural light');
  await page.getByLabel('Section title', { exact: true }).fill('Quiet confidence, curated by Hornbook');
  await page.getByRole('button', { name: 'Move Campaign banner up' }).click();
  await page.getByRole('button', { name: 'Preview sections', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Homepage sections preview' })).toContainText('Handpicked Hornbook deals');
  await page.getByRole('button', { name: 'Save sections draft' }).click();
  await expect(page.getByRole('status')).toContainText('Sections draft saved');
  expect(sectionRecord.published).toBeNull(); expect(record.published).toBeNull();
  const shop = await context.newPage(); shop.on('pageerror', (error) => errors.push(error.message));
  await shop.goto('http://localhost:3106');
  await expect(shop.getByText('Handpicked Hornbook deals', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Publish sections', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Homepage sections published');
  await shop.reload();
  await expect(shop.locator('[data-homepage-section]').first()).toHaveAttribute('data-homepage-section', 'BANNER');
  await expect(shop.locator('[data-homepage-section="DEALS"]')).toContainText('Handpicked Hornbook deals');
  await expect(shop.getByAltText('Linen essentials in natural light')).toBeVisible();
  for (const width of [1440, 768, 375]) {
    for (const surface of [page, shop]) {
      await surface.setViewportSize({ width, height: 900 });
      await surface.evaluate(() => window.scrollTo(0, 0));
      expect(await surface.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.screenshot({ path: testInfo.outputPath(`sections-editor-${width}.png`), fullPage: true });
    await shop.screenshot({ path: testInfo.outputPath(`sections-storefront-${width}.png`), fullPage: true });
  }
  await page.getByLabel('Enabled', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save sections draft' }).click();
  await expect(page.getByRole('button', { name: 'Publish sections', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Publish sections', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Homepage sections published');
  await shop.reload();
  await expect(shop.locator('[data-homepage-section="BANNER"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
