import { test, expect } from '@playwright/test';

// Regression: the absolutely positioned search used to cover Check delivery.
for (const width of [320, 390, 768, 900, 1024, 1100, 1280, 1440]) {
  test(`homepage header controls remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const header = page.locator('header.header');
    const delivery = header.getByRole('button', { name: 'Check delivery', exact: true });
    const search = header.getByRole('textbox', { name: 'Search all products', exact: true });
    await expect(search).toBeVisible();
    await delivery.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close delivery checker' }).click();
    await expect(dialog).not.toBeVisible();
    await search.fill('headphones');
    await expect(header.locator('.search-panel')).toBeVisible();
    await header.getByRole('button', { name: 'Submit search', exact: true }).click({ trial: true });
    const bounds = await header.locator('.search-panel').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await header.getByRole('button', { name: 'Clear search', exact: true }).click();
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(width);
  });
}
