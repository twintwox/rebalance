const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // IndexedDB state is per-browser, keep sequential
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  // Spin up a local static server before running tests
  webServer: {
    command: 'npx serve . -p 5000 -s',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
