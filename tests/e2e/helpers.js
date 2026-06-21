/**
 * Shared helpers for ReBalance E2E tests.
 */

/** Clear IndexedDB between tests so each starts with a clean slate. */
async function clearDB(page) {
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('rebalanceV1');
      req.onsuccess = resolve;
      req.onerror = reject;
      req.onblocked = resolve;
    });
  });
}

/**
 * Add a position via the modal form.
 * @param {import('@playwright/test').Page} page
 * @param {{ ticker: string, qty: number, price: number, sector?: string, region?: string }} opts
 */
async function addPosition(page, { ticker, qty, price, sector, region }) {
  await page.getByRole('button', { name: '+' }).click();
  await page.locator('#f-ticker').fill(ticker);

  // Pick first autocomplete match if present
  const firstAC = page.locator('#ac-list .ac-item').first();
  if (await firstAC.isVisible({ timeout: 800 }).catch(() => false)) {
    await firstAC.click();
  }

  await page.locator('#f-qty').fill(String(qty));
  await page.locator('#f-price').fill(String(price));

  // If manual classification is visible, fill sector / region
  const manualSection = page.locator('#manual-classification');
  if (await manualSection.isVisible()) {
    if (sector) {
      const chips = page.locator('#sector-chips .sector-row');
      if (await chips.count() === 0) {
        await page.locator('#sector-add-btn').click();
        await page.locator(`.sector-opt[data-sector="${sector}"]`).click();
        await page.locator('.sector-pct-input').first().fill('100');
        // Dismiss dropdown
        await page.locator('#f-qty').click();
      }
    }
    if (region) {
      await page.locator('#f-region').selectOption(region);
    }
  }

  await page.getByRole('button', { name: 'Save Position' }).click();
  await page.locator('#modal').waitFor({ state: 'hidden' }).catch(() => {});
}

/** Switch to a named tab. */
async function switchTab(page, tab) {
  await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
  await page.locator(`#view-${tab}`).waitFor({ state: 'visible' });
}

module.exports = { clearDB, addPosition, switchTab };
