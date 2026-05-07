const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

async function applyChange(page, fieldText, value) {
  await page.locator('.val-row', { hasText: fieldText }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', value);
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('history button appears in DOM after applying a change', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  // Button is in DOM when field is changed AND has fieldHistory entries
  await expect(page.locator('.history-btn').first()).toBeAttached();
});

test('history button not present on unchanged fields', async ({ page }) => {
  // No changes applied yet — no history buttons at all
  await expect(page.locator('.history-btn')).toHaveCount(0);
});

test('history button label shows entry count', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('.history-btn').first()).toContainText('1');
});

test('clicking history button opens popup', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup')).not.toHaveClass(/hidden/);
});

test('history popup shows "current" label', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup')).toContainText('current');
});

test('history popup shows current value', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup .is-current')).toContainText('5');
});

test('history popup shows original value section', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup .is-original')).toBeVisible();
  await expect(page.locator('#field-history-popup .is-original')).toContainText('original');
});

test('history popup original entry shows original value', async ({ page }) => {
  // Mock original replicaCount is 2
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup .is-original .fhpop-val')).toContainText('2');
});

test('clicking "Use" on original entry restores original value', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await page.locator('#field-history-popup .is-original .fhpop-use').click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // Field no longer shows as changed
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toHaveCount(0);
});

test('restoring original removes history button', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await page.locator('#field-history-popup .is-original .fhpop-use').click();
  await page.waitForTimeout(200);
  await expect(page.locator('.history-btn')).toHaveCount(0);
});

test('history popup closes on X button', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await page.locator('#fhpop-close-btn').click();
  await expect(page.locator('#field-history-popup')).toHaveClass(/hidden/);
});

test('history popup closes on Escape key', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await page.keyboard.press('Escape');
  await expect(page.locator('#field-history-popup')).toHaveClass(/hidden/);
});

test('history popup closes on outside click', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });
  await expect(page.locator('#field-history-popup')).not.toHaveClass(/hidden/);
  // Click somewhere outside the popup
  await page.locator('#val-name').click();
  await expect(page.locator('#field-history-popup')).toHaveClass(/hidden/);
});

test('applying twice adds second history entry visible in popup', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'replicaCount', '9');
  // history button now shows 2 entries
  await expect(page.locator('.history-btn').first()).toContainText('2');
});

test('clicking "Use" on intermediate history entry restores that value', async ({ page }) => {
  // Apply 5 then 9 — field is now 9, history has two entries
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'replicaCount', '9');

  // Open popup
  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });

  // The popup shows the intermediate entry (value=5). Click "Use" on it.
  // The intermediate entry has a fhpop-use button that is NOT inside is-original.
  const nonOriginalUse = page.locator('#field-history-popup .fhpop-entry:not(.is-current):not(.is-original) .fhpop-use').first();
  await nonOriginalUse.click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Restored' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // Field should show value 5 now — still changed (5 ≠ original 2), but visible
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toBeVisible();
});

test('intermediate "Use" entry does not clear history (field still shows history btn)', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'replicaCount', '9');

  const row = page.locator('.val-row.changed', { hasText: 'replicaCount' });
  await row.hover();
  await page.locator('.history-btn').first().click({ force: true });

  const nonOriginalUse = page.locator('#field-history-popup .fhpop-entry:not(.is-current):not(.is-original) .fhpop-use').first();
  await nonOriginalUse.click();
  await page.waitForTimeout(200);

  // History is NOT cleared (only restoring to original clears history)
  await expect(page.locator('.history-btn').first()).toBeAttached();
});
