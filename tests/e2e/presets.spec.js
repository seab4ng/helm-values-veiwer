const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  // Clear any leftover presets from a previous test run
  await page.evaluate(() => localStorage.removeItem('helm-editor-presets'));
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('Presets button opens preset modal', async ({ page }) => {
  await page.click('#presets-btn');
  await expect(page.locator('#preset-modal-overlay')).toBeVisible();
});

test('preset modal shows empty state when no presets saved', async ({ page }) => {
  await page.click('#presets-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('No presets saved yet');
});

test('preset save button disabled when no fields selected', async ({ page }) => {
  await page.click('#presets-btn');
  await expect(page.locator('#preset-save-btn')).toBeDisabled();
});

test('preset save button enabled when fields are selected', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await expect(page.locator('#preset-save-btn')).toBeEnabled();
});

test('saving a preset with a name shows it in the list', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'My Preset');
  await page.click('#preset-save-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('My Preset');
});

test('saved preset shows correct field count', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'One Field');
  await page.click('#preset-save-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('1 field');
});

test('saved preset with two fields shows correct count', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Two Fields');
  await page.click('#preset-save-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('2 fields');
});

test('detail button (magnifying glass) toggles field list', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Detail Test');
  await page.click('#preset-save-btn');

  // Click the magnifying glass icon
  await page.locator('[data-detail-preset]').first().click();
  await expect(page.locator('#preset-modal-body')).toContainText('replicaCount');
});

test('detail button toggle hides field list on second click', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Toggle Test');
  await page.click('#preset-save-btn');

  const detailBtn = page.locator('[data-detail-preset]').first();
  await detailBtn.click();
  // Detail open — dotPath visible in inline block
  await expect(page.locator('#preset-modal-body')).toContainText('replicaCount');
  await detailBtn.click();
  // Detail closed — dotPath no longer present (preset name is "Toggle Test", not "replicaCount")
  await expect(page.locator('#preset-modal-body')).not.toContainText('replicaCount');
});

test('applying a preset writes fields and shows Applied toast', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Apply Test');
  await page.click('#preset-save-btn');

  await page.click('#preset-modal-close');
  await page.click('#clear-sel-btn');

  await page.click('#presets-btn');
  await page.locator('[data-apply-preset]').first().click();
  // applyPreset writes to disk and shows "Applied" toast

  await expect(page.locator('#toast-area .toast', { hasText: 'Applied' }).first()).toBeVisible({ timeout: 5000 });
});

test('applying preset with prefilled value fills new-val input', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '10');
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Value Preset');
  await page.click('#preset-save-btn');

  await page.click('#preset-modal-close');
  await page.click('#clear-sel-btn');

  await page.click('#presets-btn');
  await page.locator('[data-apply-preset]').first().click();
  // applyPreset fills #new-val with saved value and auto-closes modal

  // batch bar visible (fields selected) → #new-val accessible
  await expect(page.locator('#new-val')).toHaveValue('10');
});

test('deleting a preset removes it from list', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Delete Me');
  await page.click('#preset-save-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('Delete Me');

  await page.locator('[data-del-preset]').first().click();
  await expect(page.locator('#preset-modal-body')).not.toContainText('Delete Me');
});

test('deleting last preset shows empty state', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Solo');
  await page.click('#preset-save-btn');

  await page.locator('[data-del-preset]').first().click();
  await expect(page.locator('#preset-modal-body')).toContainText('No presets saved yet');
});

test('preset modal closes on X click', async ({ page }) => {
  await page.click('#presets-btn');
  await expect(page.locator('#preset-modal-overlay')).toBeVisible();
  await page.click('#preset-modal-close');
  await expect(page.locator('#preset-modal-overlay')).toBeHidden();
});

test('multiple presets can coexist in the list', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Alpha');
  await page.click('#preset-save-btn');

  await page.click('#preset-modal-close');
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Beta');
  await page.click('#preset-save-btn');

  await expect(page.locator('#preset-modal-body')).toContainText('Alpha');
  await expect(page.locator('#preset-modal-body')).toContainText('Beta');
  await expect(page.locator('.preset-item')).toHaveCount(2);
});
