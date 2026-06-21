const { test, expect } = require('@playwright/test');
const { clearDB, addPosition, switchTab } = require('./helpers.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDB(page);
  await page.reload();
});

// ─── Export ───────────────────────────────────────────────────────────────────

test('export triggers a file download with portfolio data', async ({ page }) => {
  await addPosition(page, { ticker: 'AAPL', qty: 10, price: 180, sector: 'Technology', region: 'United States' });

  await switchTab(page, 'settings');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export').click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^rebalance-\d{4}-\d{2}-\d{2}\.json$/);

  const content = await download.path().then(p => fs.readFileSync(p, 'utf8'));
  const data = JSON.parse(content);
  expect(Array.isArray(data)).toBe(true);
  expect(data).toHaveLength(1);
  expect(data[0].ticker).toBe('AAPL');
  expect(data[0].quantity).toBe(10);
});

test('export with empty portfolio produces an empty array', async ({ page }) => {
  await switchTab(page, 'settings');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btn-export').click(),
  ]);

  const content = await download.path().then(p => fs.readFileSync(p, 'utf8'));
  expect(JSON.parse(content)).toEqual([]);
});

// ─── Import ───────────────────────────────────────────────────────────────────

test('import restores positions from a JSON file', async ({ page }) => {
  const payload = JSON.stringify([
    { id: 'abc123', ticker: 'GOOGL', name: 'Alphabet Inc.', quantity: 3, price: 150, type: 'stock', sector: 'Communication Services', region: 'United States' },
    { id: 'def456', ticker: 'BND',   name: 'Vanguard Total Bond Market ETF', quantity: 20, price: 74, type: 'etf', sectorBreakdown: { 'Bonds/Fixed Income': 100 }, regionBreakdown: { 'United States': 100 } },
  ]);

  const tmpFile = path.join(os.tmpdir(), 'rebalance-test-import.json');
  fs.writeFileSync(tmpFile, payload);

  await switchTab(page, 'settings');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#btn-import-wrap').click(),
  ]);
  await fileChooser.setFiles(tmpFile);

  // Switch back to portfolio and verify
  await switchTab(page, 'portfolio');
  await expect(page.locator('.position-item')).toHaveCount(2);
  await expect(page.locator('.pos-ticker').first()).toHaveText('GOOGL');

  fs.unlinkSync(tmpFile);
});

test('import shows error toast for invalid JSON', async ({ page }) => {
  const tmpFile = path.join(os.tmpdir(), 'rebalance-bad.json');
  fs.writeFileSync(tmpFile, 'this is not json');

  await switchTab(page, 'settings');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#btn-import-wrap').click(),
  ]);
  await fileChooser.setFiles(tmpFile);

  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#toast')).toContainText('failed');

  fs.unlinkSync(tmpFile);
});

// ─── Clear ────────────────────────────────────────────────────────────────────

test('clear all data removes all positions', async ({ page }) => {
  await addPosition(page, { ticker: 'TSLA', qty: 5, price: 250, sector: 'Consumer Discretionary', region: 'United States' });
  await expect(page.locator('.position-item')).toHaveCount(1);

  await switchTab(page, 'settings');

  page.once('dialog', d => d.accept());
  await page.locator('#btn-clear').click();

  await switchTab(page, 'portfolio');
  await expect(page.locator('.position-item')).toHaveCount(0);
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#total-value')).toHaveText('$0.00');
});

test('clear all data is cancelled if user dismisses the confirm dialog', async ({ page }) => {
  await addPosition(page, { ticker: 'META', qty: 2, price: 500, sector: 'Communication Services', region: 'United States' });

  await switchTab(page, 'settings');

  page.once('dialog', d => d.dismiss());
  await page.locator('#btn-clear').click();

  await switchTab(page, 'portfolio');
  await expect(page.locator('.position-item')).toHaveCount(1);
});

// ─── Settings navigation (regression) ────────────────────────────────────────

test('tapping settings tab does NOT open the file picker', async ({ page }) => {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 1500 }).catch(() => null),
    page.locator('.tab-btn[data-tab="settings"]').click(),
  ]);
  expect(fileChooser).toBeNull();
});

test('can navigate away from settings without triggering file picker', async ({ page }) => {
  await switchTab(page, 'settings');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 1500 }).catch(() => null),
    page.locator('.tab-btn[data-tab="portfolio"]').click(),
  ]);
  expect(fileChooser).toBeNull();
  await expect(page.locator('#view-portfolio')).toBeVisible();
});
