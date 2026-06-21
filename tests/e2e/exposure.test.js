const { test, expect } = require('@playwright/test');
const { clearDB, addPosition, switchTab } = require('./helpers.js');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDB(page);
  await page.reload();
});

// ─── Sectors tab ─────────────────────────────────────────────────────────────

test('sectors tab shows empty state with no positions', async ({ page }) => {
  await switchTab(page, 'sectors');
  await expect(page.locator('#sector-table-wrap')).toContainText('Add positions');
});

test('sectors tab shows chart and table after adding a stock', async ({ page }) => {
  await addPosition(page, { ticker: 'AAPL', qty: 10, price: 200, sector: 'Technology', region: 'United States' });

  await switchTab(page, 'sectors');

  // Chart canvas should have rendered
  await expect(page.locator('#sector-chart')).toBeVisible();

  // Table should contain the sector
  await expect(page.locator('#sector-table-wrap')).toContainText('Technology');
  await expect(page.locator('#sector-table-wrap')).toContainText('100.0%');
});

test('sectors table shows multiple sectors for multi-sector positions', async ({ page }) => {
  // Add a position manually spread across two sectors
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

  await page.locator('#f-region').selectOption('United States');
  await page.getByRole('button', { name: 'Save Position' }).click();

  await switchTab(page, 'sectors');

  await expect(page.locator('#sector-table-wrap')).toContainText('Technology');
  await expect(page.locator('#sector-table-wrap')).toContainText('Healthcare');
});

test('sectors tab shows correct breakdown for a known ETF', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('SPY');
  await page.locator('#ac-list .ac-item').first().click();
  await page.locator('#f-qty').fill('1');
  await page.locator('#f-price').fill('500');
  await page.getByRole('button', { name: 'Save Position' }).click();

  await switchTab(page, 'sectors');

  // SPY has Technology as largest sector
  const rows = page.locator('.exposure-table tbody tr');
  await expect(rows.first()).toContainText('Technology');
});

test('sectors chart center value reflects total portfolio value', async ({ page }) => {
  await addPosition(page, { ticker: 'MSFT', qty: 2, price: 500, sector: 'Technology', region: 'United States' });

  await switchTab(page, 'sectors');
  await expect(page.locator('#sector-center-val')).toHaveText('$1.0K');
});

// ─── Regions tab ─────────────────────────────────────────────────────────────

test('regions tab shows empty state with no positions', async ({ page }) => {
  await switchTab(page, 'regions');
  await expect(page.locator('#region-table-wrap')).toContainText('Add positions');
});

test('regions tab shows chart and table after adding a position', async ({ page }) => {
  await addPosition(page, { ticker: 'AMZN', qty: 1, price: 3500, sector: 'Consumer Discretionary', region: 'United States' });

  await switchTab(page, 'regions');

  await expect(page.locator('#region-chart')).toBeVisible();
  await expect(page.locator('#region-table-wrap')).toContainText('United States');
  await expect(page.locator('#region-table-wrap')).toContainText('100.0%');
});

test('regions table shows multiple regions for international ETF', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('VXUS');
  await page.locator('#ac-list .ac-item').first().click();
  await page.locator('#f-qty').fill('10');
  await page.locator('#f-price').fill('60');
  await page.getByRole('button', { name: 'Save Position' }).click();

  await switchTab(page, 'regions');

  // VXUS is entirely international — should show Europe, Asia Pacific, etc.
  await expect(page.locator('#region-table-wrap')).toContainText('Europe');
  await expect(page.locator('#region-table-wrap')).toContainText('Asia Pacific');
  await expect(page.locator('#region-table-wrap')).toContainText('Emerging Markets');
});

test('top sector summary card on portfolio tab updates correctly', async ({ page }) => {
  await addPosition(page, { ticker: 'GS', qty: 1, price: 400, sector: 'Financials', region: 'United States' });

  await expect(page.locator('#top-sector')).toHaveText('Financials');
  await expect(page.locator('#top-sector-pct')).toHaveText('100.0%');
});
