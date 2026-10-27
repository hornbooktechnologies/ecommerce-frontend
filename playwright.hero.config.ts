import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './hero-tests', outputDir: 'test-results/hero', workers: 1, timeout: 60000,
  webServer: [
    { command: 'npm --prefix ../ecommerce-admin-panel run start -- --port 3107', url: 'http://localhost:3107', reuseExistingServer: false },
    { command: 'npm run start -- --port 3106', url: 'http://localhost:3106/robots.txt', reuseExistingServer: false,
      env: { STOREFRONT_API_URL: 'http://localhost:4108/api/storefront/v1' } },
  ],
  use: { channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: 'list',
});
