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

test('badge hidden before any changes', async ({ page }) => {
  await expect(page.locator('#diff-badge')).toBeHidden();
});

test('badge appears after applying a change', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#diff-badge')).toBeVisible();
  await expect(page.locator('#diff-badge')).toContainText('1 change');
});

test('badge count increments with multiple changed fields', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'image.tag', 'v2.0');
  await expect(page.locator('#diff-badge')).toContainText('2 change');
});

test('re-applying same field does not double-count badge', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'replicaCount', '7');
  await expect(page.locator('#diff-badge')).toContainText('1 change');
});

test('clicking badge opens diff modal', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  await expect(page.locator('#diff-modal-overlay')).toBeVisible();
});

test('diff modal shows changed field name', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  await expect(page.locator('#diff-modal-body')).toContainText('replicaCount');
});

test('diff modal shows new value', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  await expect(page.locator('#diff-modal-body')).toContainText('5');
});

test('diff modal shows original value', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  // original replicaCount is 2 in the mock
  await expect(page.locator('#diff-modal-body')).toContainText('2');
});

test('diff modal closes on X click', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  await expect(page.locator('#diff-modal-overlay')).toBeVisible();
  await page.click('#diff-modal-close');
  await expect(page.locator('#diff-modal-overlay')).toBeHidden();
});

test('diff modal closes on overlay click', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#diff-badge');
  await expect(page.locator('#diff-modal-overlay')).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.locator('#diff-modal-overlay')).toBeHidden();
});

test('badge hides after undoing all changes', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#diff-badge')).toBeVisible();
  await page.click('#undo-btn'); // Undo all
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('#diff-badge')).toBeHidden();
});

test('badge updates after reverting one of two changed fields', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'image.tag', 'v2');
  await expect(page.locator('#diff-badge')).toContainText('2 change');

  // Revert only replicaCount
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('#diff-badge')).toContainText('1 change');
});
