const { test, expect } = require('@playwright/test');
const { clearDB, addPosition, switchTab } = require('./helpers.js');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDB(page);
  await page.reload();
});

// ─── Rebalance tab — sector exposure ─────────────────────────────────────────

test('rebalance tab shows no data with no positions', async ({ page }) => {
  await switchTab(page, 'rebalance');
  await expect(page.locator('#rb-exp-table')).toContainText('No data');
});

test('rebalance tab shows sector chart and table after adding a stock', async ({ page }) => {
  await addPosition(page, { ticker: 'AAPL', qty: 10, price: 200, sector: 'Technology', region: 'United States' });

  await switchTab(page, 'rebalance');

  await expect(page.locator('#rb-chart-main')).toBeVisible();
  await expect(page.locator('#rb-exp-table')).toContainText('Technology');
  await expect(page.locator('#rb-exp-table')).toContainText('100.0%');
});

test('rebalance sector table shows multiple sectors for multi-sector positions', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('HYBRID');
  await page.locator('#f-name').fill('Hybrid Co');
  await page.locator('#f-qty').fill('10');
  await page.locator('#f-price').fill('100');

  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Technology"]').click();
  await page.locator('.sector-pct-input').first().fill('70');

  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Healthcare"]').click();
  await page.locator('.sector-pct-input').last().fill('30');

  await page.locator('#region-add-btn').click();
  await page.locator('#region-dropdown .sector-opt[data-region="United States"]').click();
  await page.getByRole('button', { name: 'Save Position' }).click();

  await switchTab(page, 'rebalance');

  await expect(page.locator('#rb-exp-table')).toContainText('Technology');
  await expect(page.locator('#rb-exp-table')).toContainText('Healthcare');
});

test('rebalance regions tab shows region breakdown', async ({ page }) => {
  await addPosition(page, { ticker: 'AMZN', qty: 1, price: 3500, sector: 'Consumer Discretionary', region: 'United States' });

  await switchTab(page, 'rebalance');
  await page.locator('.rb-exp-tab[data-exp="regions"]').click();

  await expect(page.locator('#rb-exp-table')).toContainText('United States');
  await expect(page.locator('#rb-exp-table')).toContainText('100.0%');
});

test('rebalance chart center value reflects simulated portfolio value', async ({ page }) => {
  await addPosition(page, { ticker: 'MSFT', qty: 2, price: 500, sector: 'Technology', region: 'United States' });

  await switchTab(page, 'rebalance');
  await expect(page.locator('#rb-center-val')).toHaveText('$1.0K');
});

// ─── Portfolio summary card ───────────────────────────────────────────────────

test('top sector summary card on portfolio tab updates correctly', async ({ page }) => {
  await addPosition(page, { ticker: 'GS', qty: 1, price: 400, sector: 'Financials', region: 'United States' });

  await expect(page.locator('#top-sector')).toHaveText('Financials');
  await expect(page.locator('#top-sector-pct')).toHaveText('100.0%');
});
