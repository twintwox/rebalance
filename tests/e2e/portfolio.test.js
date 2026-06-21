const { test, expect } = require('@playwright/test');
const { clearDB, addPosition, switchTab } = require('./helpers.js');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDB(page);
  await page.reload();
});

// ─── Add position ─────────────────────────────────────────────────────────────

test('empty state is shown when no positions exist', async ({ page }) => {
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#position-list')).toBeEmpty();
});

test('can add a stock from the pre-built database', async ({ page }) => {
  await addPosition(page, { ticker: 'AAPL', qty: 10, price: 180 });

  const item = page.locator('.position-item').first();
  await expect(item).toBeVisible();
  await expect(item.locator('.pos-ticker')).toHaveText('AAPL');
  await expect(item.locator('.pos-value')).toHaveText('$1.8K');
  await expect(page.locator('#empty-state')).not.toBeVisible();
});

test('can add an ETF — breakdown card is shown in modal', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('SPY');

  // Pick autocomplete
  const firstAC = page.locator('#ac-list .ac-item').first();
  await expect(firstAC).toBeVisible();
  await firstAC.click();

  // ETF breakdown info card should appear
  await expect(page.locator('#etf-breakdown-info')).toBeVisible();
  await expect(page.locator('#manual-classification')).not.toBeVisible();

  await page.locator('#f-qty').fill('5');
  await page.locator('#f-price').fill('500');
  await page.getByRole('button', { name: 'Save Position' }).click();

  const item = page.locator('.position-item').first();
  await expect(item).toBeVisible();
  await expect(item.locator('.pos-ticker')).toHaveText('SPY');
  await expect(item.locator('.tag.etf')).toBeVisible();
});

test('can add a position with multiple sectors', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('MYSTOCK');
  await page.locator('#f-name').fill('My Custom Stock');
  await page.locator('#f-qty').fill('100');
  await page.locator('#f-price').fill('50');

  // Add Technology sector (60%)
  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Technology"]').click();
  await page.locator('.sector-pct-input').first().fill('60');

  // Add Financials sector (40%)
  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Financials"]').click();
  await page.locator('.sector-pct-input').last().fill('40');

  // Sum hint should show 100%
  await expect(page.locator('#pct-sum-hint')).toHaveText(/100%/);
  await expect(page.locator('#pct-sum-hint')).toHaveClass(/pct-ok/);

  await page.locator('#f-region').selectOption('United States');
  await page.getByRole('button', { name: 'Save Position' }).click();

  // Multi-sector label in the portfolio list
  const item = page.locator('.position-item').first();
  await expect(item.locator('.tag', { hasText: 'Multi-sector' })).toBeVisible();
});

test('save is blocked when sector percentages do not sum to 100', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill('TEST');
  await page.locator('#f-qty').fill('1');
  await page.locator('#f-price').fill('100');

  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Technology"]').click();
  await page.locator('.sector-pct-input').first().fill('60');

  await page.locator('#sector-add-btn').click();
  await page.locator('.sector-opt[data-sector="Financials"]').click();
  await page.locator('.sector-pct-input').last().fill('20');
  // Total = 80%, not 100%

  await page.locator('#f-region').selectOption('United States');
  await page.getByRole('button', { name: 'Save Position' }).click();

  // Toast error should appear, modal stays open
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#modal')).toHaveClass(/open/);
});

// ─── Edit position ────────────────────────────────────────────────────────────

test('can edit a position quantity', async ({ page }) => {
  await addPosition(page, { ticker: 'MSFT', qty: 5, price: 400, sector: 'Technology', region: 'United States' });

  await page.locator('.position-item').first().click();
  await expect(page.locator('#modal')).toHaveClass(/open/);
  await expect(page.locator('#modal-title')).toHaveText('Edit Position');

  await page.locator('#f-qty').fill('20');
  await page.getByRole('button', { name: 'Save Position' }).click();

  // 20 × 400 = $8K
  await expect(page.locator('.pos-value').first()).toHaveText('$8.0K');
});

test('can edit a position price', async ({ page }) => {
  await addPosition(page, { ticker: 'NVDA', qty: 2, price: 800, sector: 'Technology', region: 'United States' });

  await page.locator('.position-item').first().click();
  await page.locator('#f-price').fill('1000');
  await page.getByRole('button', { name: 'Save Position' }).click();

  // 2 × 1000 = $2.0K
  await expect(page.locator('.pos-value').first()).toHaveText('$2.0K');
});

// ─── Delete position ──────────────────────────────────────────────────────────

test('can delete a position', async ({ page }) => {
  await addPosition(page, { ticker: 'TSLA', qty: 3, price: 250, sector: 'Consumer Discretionary', region: 'United States' });
  await expect(page.locator('.position-item')).toHaveCount(1);

  await page.locator('.position-item').first().click();
  page.once('dialog', d => d.accept());
  await page.locator('#btn-delete').click();

  await expect(page.locator('.position-item')).toHaveCount(0);
  await expect(page.locator('#empty-state')).toBeVisible();
});

// ─── Header summary ──────────────────────────────────────────────────────────

test('total value updates after adding a position', async ({ page }) => {
  await expect(page.locator('#total-value')).toHaveText('$0.00');
  await addPosition(page, { ticker: 'JPM', qty: 4, price: 200, sector: 'Financials', region: 'United States' });
  await expect(page.locator('#total-value')).toHaveText('$800.00');
});

test('position count updates in summary card', async ({ page }) => {
  await expect(page.locator('#count-positions')).toHaveText('0');
  await addPosition(page, { ticker: 'KO', qty: 10, price: 60, sector: 'Consumer Staples', region: 'United States' });
  await expect(page.locator('#count-positions')).toHaveText('1');
  await addPosition(page, { ticker: 'V', qty: 5, price: 280, sector: 'Financials', region: 'United States' });
  await expect(page.locator('#count-positions')).toHaveText('2');
});

// ─── Modal ────────────────────────────────────────────────────────────────────

test('modal closes when tapping the × button', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await expect(page.locator('#modal')).toHaveClass(/open/);
  await page.locator('#modal-close').click();
  await expect(page.locator('#modal')).not.toHaveClass(/open/);
});

test('modal closes when tapping the backdrop', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#modal').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#modal')).not.toHaveClass(/open/);
});

test('save is blocked when ticker is empty', async ({ page }) => {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-qty').fill('10');
  await page.locator('#f-price').fill('100');
  await page.getByRole('button', { name: 'Save Position' }).click();
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#modal')).toHaveClass(/open/);
});
