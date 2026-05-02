const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('search filters visible rows', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await page.fill('#search', 'image');
  await page.waitForTimeout(150);
  const filteredRows = await page.locator('.val-row:visible').count();
  expect(filteredRows).toBeLessThan(allRows);
  await expect(page.locator('.val-row:visible', { hasText: 'image' }).first()).toBeVisible();
});

test('search shows no results for non-existent key', async ({ page }) => {
  await page.fill('#search', 'xyznonexistentkey123');
  await page.waitForTimeout(150);
  const visible = await page.locator('.val-row:visible').count();
  expect(visible).toBe(0);
});

test('clearing search restores all rows', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await page.fill('#search', 'image');
  await page.waitForTimeout(150);
  await page.fill('#search', '');
  await page.waitForTimeout(150);
  const restoredRows = await page.locator('.val-row:visible').count();
  expect(restoredRows).toBe(allRows);
});
