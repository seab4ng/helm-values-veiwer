const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

async function applyChange(page, fieldText, value) {
  await page.locator('.val-row', { hasText: fieldText }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', value);
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('undo button hidden before any changes', async ({ page }) => {
  await expect(page.locator('#undo-btn')).toBeHidden();
});

test('undo button shows "Revert selected" when a changed field is selected', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  // replicaCount checkbox is still checked after apply
  await expect(page.locator('#undo-btn')).toBeVisible();
  await expect(page.locator('#undo-btn')).toContainText('Revert selected');
});

test('undo button shows "Undo all" when no fields selected but changes exist', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await expect(page.locator('#undo-btn')).toBeVisible();
  await expect(page.locator('#undo-btn')).toContainText('Undo all');
});

test('undo button hidden when unchanged field is selected', async ({ page }) => {
  // Select a field but do not apply any change
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await expect(page.locator('#undo-btn')).toBeHidden();
});

test('Revert selected restores field to original value and removes changed class', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toBeVisible();

  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' })).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toHaveCount(0);
});

test('Revert selected shows success toast', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' })).toBeVisible({ timeout: 3000 });
});

test('Revert selected does not revert unselected changed fields', async ({ page }) => {
  // Change two fields
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await applyChange(page, 'image.tag', 'v2');
  await page.click('#clear-sel-btn');

  // Select only replicaCount and revert
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' })).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // image.tag still changed, replicaCount reverted
  await expect(page.locator('.val-row.changed', { hasText: 'image.tag' })).toBeVisible();
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toHaveCount(0);
});

test('Revert selected updates badge count', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await applyChange(page, 'image.tag', 'v2');
  await expect(page.locator('#diff-badge')).toContainText('2 change');

  await page.click('#clear-sel-btn');
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('#diff-badge')).toContainText('1 change');
});

test('Undo all reverts all changed fields', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await applyChange(page, 'image.tag', 'v2');
  await page.click('#clear-sel-btn');

  await page.click('#undo-btn'); // Undo all
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted all' })).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed')).toHaveCount(0);
});

test('Undo all shows success toast with count', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await applyChange(page, 'image.tag', 'v2');
  await page.click('#clear-sel-btn');

  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted all 2' })).toBeVisible({ timeout: 3000 });
});

test('Undo all hides badge after completion', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#diff-badge')).toBeVisible();
  await page.click('#clear-sel-btn');

  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('#diff-badge')).toBeHidden();
});

test('Undo all hides undo button after completion', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#clear-sel-btn');
  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('#undo-btn')).toBeHidden();
});

test('Undo all hides Changed button after completion', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#changed-only-btn')).toBeVisible();
  await page.click('#clear-sel-btn');

  await page.click('#undo-btn');
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('#changed-only-btn')).toBeHidden();
});

test('applying same value twice then reverting removes changed class', async ({ page }) => {
  // Apply once, apply again with a different value, then revert
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'replicaCount', '9');

  await page.click('#undo-btn'); // Revert selected (replicaCount still checked)
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toHaveCount(0);
  await expect(page.locator('#diff-badge')).toBeHidden();
});
