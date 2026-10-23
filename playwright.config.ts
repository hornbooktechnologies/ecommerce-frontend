import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/storefront',
  timeout: 60000,
  workers: 1,
  webServer: {
    command: 'npm run start -- --port 3106',
    url: 'http://localhost:3106',
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:3106',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
