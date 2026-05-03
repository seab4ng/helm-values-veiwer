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
