import { test, expect } from '@playwright/test';
import type {
  ProductList,
  ProductDetail,
} from '../src/features/storefront/data/live-catalog';

// Uses the configured Hornbook catalog API. Cart writes use an anonymous test bag; no orders are created.
test('homepage renders API products, ten per page, and pagination loads another page', async ({
  page,
  request,
}) => {
  const response = await request.get('/api/storefront/products?pageSize=10');
  expect(response.ok()).toBe(true);
  const data: ProductList = (await response.json()).data;
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: 'Featured campaigns' }),
  ).toBeVisible();
  await expect(page.locator('#discover .product-card')).toHaveCount(
    Math.min(10, data.total),
  );
  await expect(
    page.locator('#discover .product-card').first().locator('.product-title'),
  ).toHaveText(data.items[0].name);
  if (data.totalPages > 1) {
    await page
      .locator('#discover')
      .getByRole('button', { name: 'Next', exact: true })
      .click();
    await expect(page.locator('#discover .catalog-pagination')).toContainText(
      'Page 2',
    );
    await expect(
      page.locator('#discover .product-card').first().locator('.product-title'),
    ).not.toHaveText(data.items[0].name);
  }
});

test('product details show API images, specifications, variants and published reviews only', async ({
  page,
  request,
}) => {
  const list: ProductList = (
    await (await request.get('/api/storefront/products?inStock=true')).json()
  ).data;
  const product: ProductDetail = (
    await (
      await request.get(`/api/storefront/products/${list.items[0].slug}`)
    ).json()
  ).data;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/p/${product.slug}`);
  await expect(
    page.getByRole('heading', { name: product.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Product specifications' }),
  ).toBeVisible();
  await expect(page.locator('#product-variant option')).toHaveCount(
    product.variants.length,
  );
  await expect(page.locator('.product-main-image img')).toHaveAttribute(
    'src',
    product.images[0].url,
  );
  expect(
    await page
      .locator('.product-main-image img')
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBe(true);
  if (!product.reviews)
    await expect(page.getByText('No published reviews yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]'),
  ).toContainText('Added to your bag');
  await expect(
    page.getByRole('button', { name: 'Added to bag' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View your bag' }).click();
  await expect(page.getByRole('region', { name: 'Bag items' }).locator('article')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Bag items' }).locator('article')).toContainText(
    product.variants[0].sku,
  );
  await expect(page.getByText('Ready to review your order?')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Bag items' }).locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear bag', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your bag has room for something good.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Sonner notifications are global, dismissible and mobile-friendly', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Deliver to/ }).click();
  await page.getByLabel('Six digit PIN code').fill('560001');
  await page.getByRole('button', { name: 'Save location' }).click();
  const notice = page.locator('[data-sonner-toast]');
  await expect(notice).toContainText(
    'Location saved. Availability is confirmed at checkout.',
  );
  await expect(notice).toHaveAttribute('data-type', 'success');
  await expect(page.locator('[data-sonner-toaster]')).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 844 });
  const box = await notice.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  await notice.getByRole('button', { name: 'Close toast' }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('search uses the catalog API and canonical product links', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('.commerce-search')
    .getByLabel('Search all products')
    .fill('headphones');
  await expect(
    page
      .locator('.product-suggestions')
      .getByText('Studio Wireless Headphones'),
  ).toBeVisible();
  await page
    .locator('.product-suggestions')
    .getByRole('link', { name: /Studio Wireless Headphones/ })
    .click();
  await expect(page).toHaveURL(/studio-wireless-headphones-aura-00001/);
});

test('category filter is remote and empty results are explicit', async ({
  page,
}) => {
  await page.goto('/c/electronics');
  await expect(
    page.getByRole('heading', { name: 'Electronics', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.category-product-grid .product-card'),
  ).toHaveCount(4);
  await page.getByLabel('Maximum price (₹)').fill('1');
  await expect(
    page.getByRole('heading', { name: 'No products match these filters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(
    page.locator('.category-product-grid .product-card'),
  ).toHaveCount(4);
});

test('catalog failure has a retry state, never silently substitutes demo products', async ({
  page,
}) => {
  await page.route('**/api/storefront/products?**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { message: 'The store is temporarily unavailable.' },
      }),
    }),
  );
  await page.goto('/');
  await expect(page.locator('#discover').getByRole('alert')).toContainText(
    'temporarily unavailable',
  );
  await expect(page.locator('#discover .product-card')).toHaveCount(0);
  await page.unroute('**/api/storefront/products?**');
  await page
    .locator('#discover')
    .getByRole('button', { name: 'Try again' })
    .click();
  await expect(page.locator('#discover .product-card')).toHaveCount(10);
});

test('same-origin proxy rejects tenant overrides and non-catalog paths', async ({
  request,
}) => {
  expect(
    (await request.get('/api/storefront/products?tenantCode=OTHER')).status(),
  ).toBe(422);
  expect((await request.get('/api/storefront/admin')).status()).toBe(404);
  expect(
    (await request.get('/api/storefront/products/not-a-real-product')).status(),
  ).toBe(404);
});

test('home, category and detail fit small mobile, tablet and desktop screens', async ({
  page,
}, testInfo) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/c/electronics',
      '/p/studio-wireless-headphones-aura-00001',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const cards = page.locator(
        path === '/'
          ? '#discover .category-product-grid .product-card'
          : '.category-product-grid .product-card',
      );
      await expect(cards.first()).toBeVisible();
      const cardSize = await cards.first().boundingBox();
      expect(cardSize?.width).toBeGreaterThanOrEqual(140);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(
          `${width}-${path === '/' ? 'home' : path.startsWith('/c/') ? 'category' : 'product'}.png`,
        ),
        fullPage: true,
      });
    }
  }
});
