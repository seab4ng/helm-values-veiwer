const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('selecting one field shows batch bar', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
});

test('selecting two string fields and applying succeeds', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row', { hasText: 'image.tag' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'testvalue');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
});

test('mixing string and list fields shows Mixed selection error', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'anything');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Mixed selection');
});

test('mixing string and map fields shows Mixed selection error', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.locator('.val-row', { hasText: 'nodeSelector' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'anything');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Mixed selection');
});

test('deselecting all fields hides batch bar', async ({ page }) => {
  const cb = page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]');
  await cb.check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
  await page.click('#clear-sel-btn');
  await expect(page.locator('#batch-bar')).toHaveClass(/hidden/);
});

test('applying value "0" succeeds (special-cased empty check)', async ({ page }) => {
  // The apply-btn empty guard is: if (!newValStr && newValStr !== '0')
  // So "0" must always be accepted, not rejected as "empty".
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '0');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
});

test('apply clears #new-val input after success', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '99');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#new-val')).toHaveValue('');
});

test('apply shows error when no value entered (empty string)', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  // #new-val is empty by default
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Enter a new value');
});
