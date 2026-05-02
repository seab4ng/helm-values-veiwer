const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
});

test('load chart dir renders chart name in tree', async ({ page }) => {
  await page.click('#add-chart-btn');
  await expect(page.locator('.tree-node').filter({ hasText: 'test-chart' })).toBeVisible({ timeout: 5000 });
});

test('load chart dir renders value rows', async ({ page }) => {
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('load chart dir shows expected field names', async ({ page }) => {
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.val-row', { hasText: 'replicaCount' })).toBeVisible();
  await expect(page.locator('.val-row', { hasText: 'image.repository' })).toBeVisible();
});

test('load standalone values file renders value rows', async ({ page }) => {
  await page.click('#add-yaml-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.val-row', { hasText: 'replicaCount' })).toBeVisible();
});
