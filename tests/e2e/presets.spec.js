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

test('applying preset with stored value marks field as changed', async ({ page }) => {
  // 1. Apply replicaCount = 5 so the in-memory value is 5
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '5');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });

  // 2. Re-select and save preset while value is 5 → preset stores value='5'
  await page.locator('.val-row.changed', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Value Preset');
  await page.click('#preset-save-btn');
  await page.click('#preset-modal-close');

  // 3. Undo the change → replicaCount back to original (2)
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toHaveCount(0);

  // 4. Apply the preset → should write 5 and mark replicaCount as changed again
  await page.click('#presets-btn');
  await page.locator('[data-apply-preset]').first().click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Applied' }).first()).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toBeVisible();
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

test('preset modal closes automatically after applying a preset', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#presets-btn');
  await page.fill('#preset-name-input', 'Auto-close Test');
  await page.click('#preset-save-btn');

  await page.click('#preset-modal-close');
  await page.click('#clear-sel-btn');

  await page.click('#presets-btn');
  await page.locator('[data-apply-preset]').first().click();
  await expect(page.locator('#toast-area .toast', { hasText: 'Applied' }).first()).toBeVisible({ timeout: 5000 });
  // Modal must be hidden after apply — no user action needed
  await expect(page.locator('#preset-modal-overlay')).toBeHidden();
});

test('applying preset to chart with no matching fields shows error toast', async ({ page }) => {
  // Save a preset with a field that definitely does not exist: "nonexistent.field"
  // We do this by directly manipulating localStorage since we can't create a fake field
  await page.evaluate(() => {
    const preset = {
      id: 'test-no-match',
      name: 'No Match Preset',
      entries: [{ chartKey: 'test-chart', dotPath: 'nonexistent.field.xyz', value: '42' }],
    };
    localStorage.setItem('helm-editor-presets', JSON.stringify([preset]));
  });

  await page.click('#presets-btn');
  await expect(page.locator('#preset-modal-body')).toContainText('No Match Preset');
  await page.locator('[data-apply-preset]').first().click();
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('no matching fields');
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
