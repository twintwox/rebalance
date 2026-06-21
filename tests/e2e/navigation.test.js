const { test, expect } = require('@playwright/test');
const { clearDB } = require('./helpers.js');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDB(page);
  await page.reload();
});

test('page loads with Portfolio tab active', async ({ page }) => {
  await expect(page).toHaveTitle('ReBalance');
  await expect(page.locator('#view-portfolio')).toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="portfolio"]')).toHaveClass(/active/);
});

test('can navigate to Sectors tab', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="sectors"]').click();
  await expect(page.locator('#view-sectors')).toBeVisible();
  await expect(page.locator('#view-portfolio')).not.toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="sectors"]')).toHaveClass(/active/);
});

test('can navigate to Regions tab', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="regions"]').click();
  await expect(page.locator('#view-regions')).toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="regions"]')).toHaveClass(/active/);
});

test('can navigate to Settings tab', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="settings"]').click();
  await expect(page.locator('#view-settings')).toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="settings"]')).toHaveClass(/active/);
});

test('can exit Settings tab by tapping another tab', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="settings"]').click();
  await expect(page.locator('#view-settings')).toBeVisible();

  await page.locator('.tab-btn[data-tab="portfolio"]').click();
  await expect(page.locator('#view-portfolio')).toBeVisible();
  await expect(page.locator('#view-settings')).not.toBeVisible();
});

test('settings tab does not auto-open file picker', async ({ page }) => {
  // Regression: hidden file input used to cover the whole app
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 1000 }).catch(() => null),
    page.locator('.tab-btn[data-tab="settings"]').click(),
  ]);
  expect(fileChooser).toBeNull();
});

test('file picker only opens when Import row is tapped', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="settings"]').click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#btn-import-wrap').click(),
  ]);
  expect(fileChooser).not.toBeNull();
  await fileChooser.cancel?.().catch(() => {}); // dismiss without selecting
});
