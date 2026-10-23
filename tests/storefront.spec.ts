import { test, expect } from '@playwright/test';

test('marketplace deals lead the homepage and visitors can publish a review', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: 'Featured offers' }),
  ).toBeVisible();
  await expect(page.getByText('OCTOBER TECH EVENT')).toBeVisible();
  await page.getByRole('button', { name: /Account/ }).click();
  await expect(page.getByText('Welcome to AURA')).toBeVisible();
  await page.getByRole('button', { name: /Account/ }).click();
  await page.getByRole('button', { name: /All categories/ }).click();
  await expect(
    page.locator('.category-menu').getByRole('button', { name: /Electronics/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: /All categories/ }).click();
  await page.getByLabel('5 stars').click();
  await page.getByLabel('Your name').fill('Test Shopper');
  await page.getByLabel('Review title').fill('A store worth exploring');
  await page
    .getByLabel('Your experience')
    .fill('The monthly edit made it easy and fun to find something new.');
  await page.getByRole('button', { name: 'Share my review' }).click();
  await expect(page.getByText('“A store worth exploring”')).toBeVisible();
  await expect(
    page.getByText('Thank you — your review is now live.'),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('“A store worth exploring”')).toBeVisible();
});

test('products open dedicated pages with specifications and reviews', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const productLink = page
    .locator('#deal-zone')
    .getByRole('link', { name: 'View Studio Wireless Headphones' });
  await expect(productLink).toHaveAttribute(
    'href',
    '/p/studio-wireless-headphones',
  );
  await page.goto('/p/studio-wireless-headphones');
  await expect(
    page.getByRole('heading', { name: 'Studio Wireless Headphones' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Specifications' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Shoppers have spoken' }),
  ).toBeVisible();
  await expect(page.getByText('Bluetooth 5.3')).toBeVisible();
  await page
    .locator('.purchase-panel')
    .getByRole('button', { name: 'Add to cart', exact: true })
    .click();
  await expect(page.getByLabel('1 cart items')).toBeVisible();
  await page.getByLabel('Delivery PIN code').fill('400001');
  await page
    .locator('.delivery-check')
    .getByRole('button', { name: 'CHECK', exact: true })
    .click();
  await expect(page.getByText('Delivery available in 3–5 days')).toBeVisible();
  expect(errors).toEqual([]);
});

test('cart is a dedicated page for multiple products', async ({ page }) => {
  await page.goto('/p/studio-wireless-headphones');
  await page
    .locator('.purchase-panel')
    .getByRole('button', { name: 'Add to cart', exact: true })
    .click();
  await page.goto('/p/nordic-accent-chair');
  await page
    .locator('.purchase-panel')
    .getByRole('button', { name: 'Add to cart', exact: true })
    .click();
  const cartLink = page.getByLabel('2 cart items');
  await expect(cartLink).toHaveAttribute('href', '/cart');
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'My cart' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByLabel('Coupon code').fill('AURA10');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByText('Coupon discount')).toBeVisible();
  await page.getByRole('button', { name: 'Proceed to checkout' }).click();
  await expect(
    page.getByRole('heading', { name: 'Where should we send it?' }),
  ).toBeVisible();
});

test('search provides grouped category and product suggestions', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search category' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Electronics' }),
  ).toBeVisible();
  await page.getByRole('menuitemradio', { name: 'Electronics' }).click();
  await page
    .locator('.commerce-search')
    .getByLabel('Search all products')
    .fill('headphones');
  await expect(page.getByText('TOP PRODUCT MATCHES')).toBeVisible();
  await expect(
    page
      .locator('.product-suggestions')
      .getByText('Studio Wireless Headphones'),
  ).toBeVisible();
  await expect(
    page.locator('.category-suggestions').getByText('in Electronics'),
  ).toBeVisible();
  await page.locator('.campaign-copy').click();
  await expect(page.locator('.search-panel')).toBeHidden();
  await page
    .locator('.commerce-search')
    .getByLabel('Search all products')
    .focus();
  await page
    .locator('.product-suggestions')
    .getByRole('link', { name: /Studio Wireless Headphones/ })
    .click();
  await expect(page).toHaveURL(/studio-wireless-headphones/);
});

test('homepage never creates horizontal page scroll', async ({ page }) => {
  await page.goto('/');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('each category card opens a specific category page with filters', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('.quick-categories')
    .getByRole('link', { name: 'Electronics Upgrade your everyday' })
    .click();
  await expect(page).toHaveURL(/\/c\/electronics$/);
  await expect(
    page.getByRole('heading', { name: 'Electronics', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Refine your finds' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'View Studio Wireless Headphones' }),
  ).toBeVisible();
  await expect(page.getByText('4 products')).toBeVisible();
  await page.getByRole('checkbox', { name: '4.8 stars & above' }).check();
  await expect(page.getByText('2 products')).toBeVisible();
});

test('mobile category and product pages do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/c/home-living');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'View Nordic Accent Chair' }).click();
  await expect(
    page.getByRole('heading', { name: 'Specifications' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
