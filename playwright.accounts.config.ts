import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './account-tests', outputDir: 'test-results/accounts', workers: 1, timeout: 90000,
  webServer: { command: 'npm run start -- --port 3110', url: 'http://localhost:3110/robots.txt', reuseExistingServer: false,
    env: { STOREFRONT_API_URL: 'http://localhost:4109/api/storefront/v1' } },
  use: { baseURL: 'http://localhost:3110', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: 'list',
});
